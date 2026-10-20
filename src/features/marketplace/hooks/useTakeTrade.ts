import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import type { OrderBookOrder, Trade, TradeCreateInput } from '../../../types';
import type { FameOrderBidTerms } from '../../../types/fameOrder';
import type { LngOrderTerms } from '../../../types/lngOrder';
import { ApiError, ApiOutcomeUnknownError, isKycRequiredError } from '../../../services/api';
import { analytics } from '../../../services/analytics';
import { getAuthGeneration } from '../../../services/authToken';
import { getMarketSupportContextId } from '../../../services/marketSupportContextStore';
import { createIdempotencyKey } from '../../../utils/idempotencyKey';
import { getBiofuelSpecification } from '../../../utils/biofuelSpecification';
import { isOrderbookMarketProduct } from '../../../utils/marketProduct';
import { readFameOrderTerms, readFameOrderAcknowledgements, validateFameOrderTerms } from '../../../components/fame/FameOrderFields';
import { initialLngTakerTerms, readLngOrderTerms, readLngOrderAcknowledgements, validateLngOrderTerms } from '../../../components/lng/LngOrderFields';
import i18n from '../../../i18n';
import { marketplaceApi } from '../api/marketplaceApi';

export type TradeState = 'idle' | 'confirming' | 'reviewing' | 'submitting' | 'success' | 'outcome_unknown' | 'error';

type TradeDeclaration = Pick<TradeCreateInput, 'fame_terms' | 'certification_declared' | 'msds_available'>;
type LngDeclaration = Pick<TradeCreateInput, 'lng_terms' | 'msds_available'>;

interface FrozenTradeRequest {
    signature: string;
    payload: TradeCreateInput;
    authGeneration: number;
    supportContextId: string | null;
    reviewedOrder: OrderBookOrder;
}

interface UseTakeTradeOptions {
    userId?: string | null;
    organizationId?: string | null;
    isMarketSupportActive: boolean;
    isHistorySelected: boolean;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    b100TradingEnabled: boolean;
    bioLngTradingEnabled: boolean;
    t: TFunction;
    tRfq: TFunction;
    fetchProductCounts: (force?: boolean) => Promise<void>;
    fetchListings: (silent?: boolean, skip?: number, force?: boolean) => Promise<void>;
    currentSkip: number;
    /** Opens the external order window as an ASK declaration. */
    prefillAskOrder: (order: OrderBookOrder) => void;
}

export function useTakeTrade({
    userId, organizationId, isMarketSupportActive, isHistorySelected, marketTab,
    b100TradingEnabled, bioLngTradingEnabled, t, tRfq, fetchProductCounts, fetchListings,
    currentSkip, prefillAskOrder,
}: UseTakeTradeOptions) {
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradeState, setTradeState] = useState<TradeState>('idle');
    const [tradeError, setTradeError] = useState('');
    const [tradeKycBlocked, setTradeKycBlocked] = useState(false);
    const [tradeNeedsRefresh, setTradeNeedsRefresh] = useState(false);
    const [tradeResult, setTradeResult] = useState<Trade | null>(null);
    const [tradeFameInput, setTradeFameInput] = useState<TradeDeclaration | null>(null);
    const [tradeLngInput, setTradeLngInput] = useState<LngDeclaration | null>(null);
    const tradeRequestRef = useRef<FrozenTradeRequest | null>(null);
    const tradeInFlightRef = useRef(false);
    const tradeTermsForm = useRef<HTMLFormElement>(null);
    const tradeLngTermsForm = useRef<HTMLFormElement>(null);

    // A sent write applies its result only to the scope that sent it. The
    // epoch advances on every account or assisted-workspace change, including
    // changes that keep support active.
    const tradeScope = `${userId ?? ''}:${organizationId ?? ''}:${getMarketSupportContextId() ?? 'direct'}`;
    const tradeScopeRef = useRef(tradeScope);
    const tradeEpochRef = useRef(0);
    if (tradeScopeRef.current !== tradeScope) {
        tradeScopeRef.current = tradeScope;
        tradeEpochRef.current += 1;
    }

    // One attempt per recorded request. React Query must never retry a
    // financial write; an unknown outcome is retried explicitly with the
    // frozen payload and idempotency key below.
    const tradeMutation = useMutation({
        mutationFn: (payload: TradeCreateInput) => marketplaceApi.takeTrade(payload),
        retry: false,
    });

    const initialBuyerTerms = useMemo<FameOrderBidTerms | undefined>(() => {
        const terms = selectedOrder?.fame_terms;
        if (terms?.side !== 'ASK') return undefined;
        return {
            side: 'BID', schema_version: 1, neat_fame: true,
            standard: terms.standard, standard_edition: terms.standard_edition,
            astm_grade: terms.astm_grade, en_climate_class: terms.en_climate_class,
            max_cfpp_c: null, max_cloud_point_c: null, max_ci_gco2e_mj: null,
            sustainability_scheme: terms.sustainability_scheme,
            require_quality_evidence: false, require_sustainability_evidence: false,
            evidence_due: terms.evidence_due,
        };
    }, [selectedOrder]);
    const initialLngTaker = useMemo<LngOrderTerms | undefined>(() => {
        const terms = selectedOrder?.lng_terms;
        return terms ? initialLngTakerTerms(terms) : undefined;
    }, [selectedOrder]);

    const closeTradeModal = useCallback(() => {
        if (tradeInFlightRef.current) return;
        setSelectedOrder(null);
        setTradeState('idle');
        setTradeError('');
        setTradeKycBlocked(false);
        setTradeFameInput(null);
        setTradeNeedsRefresh(false);
        setTradeResult(null);
        tradeRequestRef.current = null;
    }, []);

    useEffect(() => {
        setSelectedOrder(null);
        setTradeState('idle');
        setTradeFameInput(null);
        setTradeNeedsRefresh(false);
        setTradeResult(null);
        tradeRequestRef.current = null;
    }, [userId, organizationId, isMarketSupportActive]);

    useEffect(() => {
        if (!isHistorySelected) return;
        setSelectedOrder(null);
        setTradeState('idle');
    }, [isHistorySelected]);

    useEffect(() => {
        if (tradeState !== 'success') return;
        // Keep the success message visible briefly. The write's settlement
        // invalidation is the only refresh; a read here would repeat it.
        const timer = setTimeout(closeTradeModal, 2000);
        return () => clearTimeout(timer);
    }, [tradeState, closeTradeModal]);

    const openTradeModal = (order: OrderBookOrder) => {
        if (!isOrderbookMarketProduct(order.market_product) || (isMarketSupportActive && !order.is_demo_listing)) return;
        if (order.market_product === 'UCOME_B100' && !b100TradingEnabled) return;
        if (order.market_product === 'BIO_LNG' && !bioLngTradingEnabled) return;
        if (order.market_product && order.delivery_point_id && order.availability_window) {
            analytics.track('listing_opened', {
                product: order.market_product,
                delivery_point: order.delivery_point_id,
                window: order.availability_window,
                side: order.side,
                demo_status: order.is_demo_listing ? 'DEMO' : 'LIVE',
            });
        }
        if (order.side === 'BID' && getBiofuelSpecification(order.market_product) && !order.is_demo_listing) {
            // A scalar biofuel supplier must declare an ASK. This does not target the BID.
            prefillAskOrder(order);
            return;
        }
        setTradeFameInput(null);
        setTradeLngInput(null);
        setTradeNeedsRefresh(false);
        setTradeResult(null);
        setSelectedOrder(order);
        // The order boundary already converted `remaining_quantity_mt` to a number.
        setTradeQuantity(order.remaining_quantity_mt);
        setTradeState('confirming');
        setTradeError('');
        setTradeKycBlocked(false);
        tradeRequestRef.current = null;
    };

    const validateTradeQuantity = () => {
        if (!selectedOrder || tradeState === 'submitting') return null;
        const normalizedTradeQuantity = Number.isFinite(tradeQuantity) ? tradeQuantity : NaN;
        if (!Number.isFinite(normalizedTradeQuantity) || normalizedTradeQuantity <= 0 || normalizedTradeQuantity > selectedOrder.remaining_quantity_mt) {
            setTradeError(t('marketplace.modal.invalidQuantity'));
            setTradeState('error');
            return null;
        }
        return normalizedTradeQuantity;
    };

    const reviewTrade = () => {
        if (!selectedOrder) return;
        if (selectedOrder.is_demo_listing) {
            setTradeError(t('marketplace.demo.blocked'));
            setTradeState('error');
            return;
        }
        if (validateTradeQuantity() == null) return;
        if (!selectedOrder.terms_digest) {
            tradeRequestRef.current = null;
            setTradeNeedsRefresh(true);
            setTradeError(t('marketplace.modal.reviewRequired'));
            setTradeState('error');
            return;
        }
        if (selectedOrder.market_product === 'UCOME_B100') {
            if (!b100TradingEnabled || !selectedOrder.fame_terms || !tradeTermsForm.current
                || !Number.isInteger(selectedOrder.version) || (selectedOrder.version ?? 0) < 1) {
                setTradeError(t('marketplace.b100.missingTerms'));
                return;
            }
            if (!tradeTermsForm.current.reportValidity()) return;
            const side = selectedOrder.side === 'ASK' ? 'BID' : 'ASK';
            const data = new FormData(tradeTermsForm.current);
            const terms = readFameOrderTerms(data, side);
            const validationError = validateFameOrderTerms(terms);
            if (validationError) { setTradeError(tRfq(validationError)); return; }
            const declarations = side === 'ASK' ? readFameOrderAcknowledgements(data) : undefined;
            if (declarations && (!declarations.certification_declared || !declarations.msds_available)) {
                setTradeError(tRfq('validation.orderAcknowledgements'));
                return;
            }
            setTradeFameInput({ fame_terms: terms, ...declarations });
        }
        if (selectedOrder.market_product === 'BIO_LNG') {
            if (!bioLngTradingEnabled || !selectedOrder.lng_terms || !tradeLngTermsForm.current) {
                setTradeError(t('marketplace.bioLng.missingTerms'));
                return;
            }
            if (!tradeLngTermsForm.current.reportValidity()) return;
            const side = selectedOrder.side === 'ASK' ? 'BID' : 'ASK';
            const data = new FormData(tradeLngTermsForm.current);
            const terms = readLngOrderTerms(data, side);
            const validationError = validateLngOrderTerms(terms);
            if (validationError) { setTradeError(t(validationError)); return; }
            // A supplier taking a BIO_LNG bid declares the ask side, which keeps
            // the MSDS acknowledgement required.
            const declarations = side === 'ASK' ? readLngOrderAcknowledgements(data) : undefined;
            if (declarations && !declarations.msds_available) {
                setTradeError(t('lngTerms.validation.msdsRequired'));
                return;
            }
            setTradeLngInput({ lng_terms: terms, ...declarations });
        }
        analytics.track('trade_confirmation_opened', {
            side: selectedOrder.side,
            demo_status: selectedOrder.is_demo_listing ? 'DEMO' : 'LIVE',
        });
        setTradeError('');
        setTradeKycBlocked(false);
        setTradeState('reviewing');
    };

    const confirmTrade = async () => {
        if (!selectedOrder || !isOrderbookMarketProduct(selectedOrder.market_product) || tradeState === 'submitting' || tradeInFlightRef.current) return;
        if (selectedOrder.is_demo_listing) {
            setTradeError(t('marketplace.demo.blocked'));
            setTradeState('error');
            return;
        }
        const retainedRequest = tradeState === 'outcome_unknown' ? tradeRequestRef.current : null;
        if (retainedRequest && (
            retainedRequest.authGeneration !== getAuthGeneration()
            || retainedRequest.supportContextId !== getMarketSupportContextId()
        )) {
            tradeRequestRef.current = null;
            setTradeNeedsRefresh(true);
            setTradeError(t('marketplace.modal.contextChanged'));
            setTradeState('error');
            return;
        }
        const normalizedTradeQuantity = retainedRequest ? retainedRequest.payload.quantity_mt : validateTradeQuantity();
        if (normalizedTradeQuantity == null) return;
        if (!retainedRequest && !selectedOrder.terms_digest) {
            tradeRequestRef.current = null;
            setTradeNeedsRefresh(true);
            setTradeError(t('marketplace.modal.reviewRequired'));
            setTradeState('error');
            return;
        }
        if (!retainedRequest && selectedOrder.market_product === 'UCOME_B100' && (!b100TradingEnabled || !tradeFameInput?.fame_terms
            || !Number.isInteger(selectedOrder.version) || (selectedOrder.version ?? 0) < 1)) return;
        if (!retainedRequest && selectedOrder.market_product === 'BIO_LNG'
            && (!bioLngTradingEnabled || !tradeLngInput?.lng_terms)) return;
        const executionEpoch = tradeEpochRef.current;
        setTradeState('submitting');
        tradeInFlightRef.current = true;
        let executionIsCurrent = () => false;
        try {
            const requestPayload = {
                order_id: selectedOrder.id,
                quantity_mt: normalizedTradeQuantity,
                expected_terms_digest: selectedOrder.terms_digest!,
                ...(selectedOrder.market_product === 'UCOME_B100'
                    ? { ...tradeFameInput, expected_order_version: selectedOrder.version } : {}),
                ...(selectedOrder.market_product === 'BIO_LNG' ? { ...tradeLngInput } : {}),
            };
            const signature = JSON.stringify(requestPayload);
            if (!retainedRequest && (!tradeRequestRef.current || tradeRequestRef.current.signature !== signature)) {
                tradeRequestRef.current = {
                    signature,
                    payload: { ...requestPayload, idempotency_key: createIdempotencyKey('trade') },
                    authGeneration: getAuthGeneration(),
                    supportContextId: getMarketSupportContextId(),
                    reviewedOrder: { ...selectedOrder, certifications: [...selectedOrder.certifications] },
                };
            }
            const request = tradeRequestRef.current!;
            executionIsCurrent = () => (
                executionEpoch === tradeEpochRef.current
                && request.authGeneration === getAuthGeneration()
                && request.supportContextId === getMarketSupportContextId()
            );
            const result = await tradeMutation.mutateAsync(request.payload);
            // The scope changed while the write was in flight. Its result belongs
            // to the old workspace; never show it on the current one.
            if (!executionIsCurrent()) return;
            setTradeResult(result);
            setTradeState('success');
        } catch (err: unknown) {
            if (!executionIsCurrent()) return;
            if (err instanceof ApiOutcomeUnknownError) {
                setTradeError(t('marketplace.modal.outcomeUnknown.body'));
                setTradeState('outcome_unknown');
            } else if (err instanceof ApiError && err.code === 'ORDER_TERMS_REVIEW_REQUIRED') {
                tradeRequestRef.current = null;
                setTradeNeedsRefresh(true);
                setTradeError(t('marketplace.modal.reviewRequired'));
                setTradeState('error');
            } else if (isKycRequiredError(err)) {
                tradeRequestRef.current = null;
                setTradeKycBlocked(true);
                setTradeError('');
                setTradeState('error');
            } else if (err instanceof ApiError && err.code === 'LNG_TERMS_INCOMPATIBLE') {
                tradeRequestRef.current = null;
                setTradeError(t('marketplace.bioLng.incompatible'));
                setTradeState('error');
            } else {
                tradeRequestRef.current = null;
                setTradeError(i18n.language.startsWith('zh') ? t('marketplace.modal.tradeFailedFallback') : err instanceof Error ? err.message : t('marketplace.modal.tradeFailedFallback'));
                setTradeState('error');
            }
        } finally {
            tradeInFlightRef.current = false;
        }
    };

    const backToConfirming = useCallback(() => setTradeState('confirming'), []);

    return {
        selectedOrder, tradeState, tradeError, tradeKycBlocked, tradeNeedsRefresh, tradeResult,
        tradeQuantity, setTradeQuantity, tradeTermsForm, tradeLngTermsForm,
        tradeFameInput, tradeLngInput, initialBuyerTerms, initialLngTaker,
        openTradeModal, reviewTrade, confirmTrade, closeTradeModal,
        setTradeState: backToConfirming,
        refreshReview: () => {
            closeTradeModal();
            void fetchProductCounts(true);
            if (marketTab === 'market') void fetchListings(false, currentSkip, true);
        },
    };
}
