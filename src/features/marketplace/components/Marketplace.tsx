import { ListingsTable } from './ListingsTable';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MarketplaceTabs } from './MarketplaceTabs';
import { MarketplaceFilters } from './MarketplaceFilters';
import { TakeTradeDialog } from './TakeTradeDialog';
import { MarketDepthPanel } from './MarketDepthPanel';
import { MyListingsPanel } from './MyListingsPanel';
import { CancelOrderDialog } from './CancelOrderDialog';
import { MarketplaceHistory } from './MarketplaceHistory';
import { useMarketplaceSelection } from '../hooks/useMarketplaceSelection';
import { getBiofuelSpecification } from '../../../utils/biofuelSpecification';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ApiError, ApiOutcomeUnknownError, api, isKycRequiredError } from '../../../services/api';
import type { PaginatedResult } from '../../../services/api';
import { Port, OrderBookOrder, MarketProduct, ViewMode, DeliveryPoint, ListingComplianceOverlay, ComplianceOverlayAssumptions, Product, Trade, TradeCreateInput } from '../../../types';
import { getAuthGeneration } from '../../../services/authToken';
import { getMarketSupportContextId } from '../../../services/marketSupportContextStore';
import { createIdempotencyKey } from '../../../utils/idempotencyKey';
import { OrderPlaceModal } from '../../../components/OrderPlaceModal';
import { useNamespace } from '../../../hooks/useNamespace';
import { useDashboardContentReady } from '../../../hooks/useDashboardContentReady';
import { usePublicMarketRefresh } from '../../../hooks/usePublicMarketRefresh';
import { formatMarketProduct, isOrderbookMarketProduct, isOrderbookProduct } from '../../../utils/marketProduct';
import { type MarketSlice } from '../../../utils/sliceUrl';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { getWatchlistSliceKeyFromParts } from '../../../utils/watchlist';
import i18n from '../../../i18n';
import { analytics } from '../../../services/analytics';
import { useMarketSupport } from '../../../context/MarketSupportContext';
import type { FameOrderBidTerms } from '../../../types/fameOrder';
import { readFameOrderTerms, validateFameOrderTerms, readFameOrderAcknowledgements } from '../../../components/fame/FameOrderFields';
import type { LngOrderTerms } from '../../../types/lngOrder';
import { initialLngTakerTerms, readLngOrderTerms, validateLngOrderTerms, readLngOrderAcknowledgements } from '../../../components/lng/LngOrderFields';

// ─── Role Config ──────────────────────────────────────────────────
export type MarketplaceColumnId = 'fuel' | 'grade' | 'volume' | 'price' | 'window' | 'expiry' | 'cert' | 'status' | 'action';

type ColumnId = MarketplaceColumnId;

export interface MarketplaceRolePresentation {
    subtitleKey: string;
    primaryAction: { labelKey: string; side: 'BID' | 'ASK' };
    counterAction: { labelKey: string };
    columns: ColumnId[];
}

interface RoleConfigEntry extends MarketplaceRolePresentation {
    fetchOrders: (params?: {
        region?: string;
        delivery_point_id?: string;
        fuel_type?: string;
        market_product?: string;
        availability?: string;
        sort_by?: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest';
        skip?: number;
        limit?: number;
    }, cacheOptions?: { force?: boolean }) => Promise<PaginatedResult<any>>;
    defaultSort: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest';
}

const ROLE_CONFIG_BASE: Record<string, RoleConfigEntry> = {
    BUYER: {
        fetchOrders: api.orderbook.listAsksPaged,
        subtitleKey: 'marketplace.subtitle.buyer',
        primaryAction: { labelKey: 'marketplace.btn.placeBid', side: 'BID' as const },
        counterAction: { labelKey: 'marketplace.btn.hitAsk' },
        defaultSort: 'price_asc',
        columns: ['fuel', 'grade', 'volume', 'price', 'window', 'expiry', 'cert', 'action'],
    },
    SUPPLIER: {
        fetchOrders: api.orderbook.listBidsPaged,
        subtitleKey: 'marketplace.subtitle.supplier',
        primaryAction: { labelKey: 'marketplace.btn.placeAsk', side: 'ASK' as const },
        counterAction: { labelKey: 'marketplace.btn.hitBid' },
        defaultSort: 'price_desc',
        columns: ['fuel', 'volume', 'price', 'window', 'status', 'action'],
    },
};

// ─── Product chip options ─────────────────────────────────────────
const ALL_MARKET_PRODUCTS = 'All';
const PAGE_SIZE = 8;
const REFRESH_INTERVAL_MS = 60_000;

// ─── Props ────────────────────────────────────────────────────────
interface MarketplaceProps {
    initialPort?: Port | null;
    viewMode?: ViewMode;
    initialSlice?: MarketSlice | null;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort, viewMode, initialSlice }) => {
    const { user } = useAuth();
    const { t, ready } = useNamespace('trading');
    const { t: tRfq } = useNamespace('rfq');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const { trackedSliceKeys, pinnedOrderIds, toggleSlice, togglePin } = useWatchlist();

    // ─── Data state ───────────────────────────────────────────────
    const [listings, setListings] = useState<OrderBookOrder[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoadedListings, setHasLoadedListings] = useState(false);
    const listingRequestsInFlight = useRef(new Map<string, symbol>());
    const countRequestsInFlight = useRef(new Map<string, symbol>());
    const currentListingsRequest = useRef('');
    const currentCountsRequest = useRef('');
    const [complianceOverlays, setComplianceOverlays] = useState<Record<string, ListingComplianceOverlay | null>>({});
    const [overlayAssumptions, setOverlayAssumptions] = useState<ComplianceOverlayAssumptions | null>(null);

    // ─── Filter state ─────────────────────────────────────────────
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [deliveryPointsStatus, setDeliveryPointsStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
    const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
    const [catalogError, setCatalogError] = useState(false);
    const latestCatalogRequest = useRef(0);
    const loadCatalogProducts = useCallback(async (force = false) => {
        const requestId = ++latestCatalogRequest.current;
        try {
            const products = await api.catalog.products(force ? { force: true } : undefined);
            if (requestId !== latestCatalogRequest.current) return;
            setCatalogProducts(products);
            setCatalogError(false);
        } catch {
            if (requestId !== latestCatalogRequest.current) return;
            setCatalogProducts([]);
            setCatalogError(true);
        }
    }, []);
    const b100Product = catalogProducts.find(product => product.market_product === 'UCOME_B100');
    const b100TradingEnabled = Boolean(b100Product && isOrderbookProduct(b100Product));
    const bioLngProduct = catalogProducts.find(product => product.market_product === 'BIO_LNG');
    const bioLngTradingEnabled = Boolean(bioLngProduct && isOrderbookProduct(bioLngProduct));
    const {
        role, marketTab, isHistorySelected, fameTab, setMarketTab,
        portInput, resolvedPort, resolvedDeliveryPointId, marketProduct, availability,
        availabilityOptions, filtersExpanded, setFiltersExpanded, currentSkip, setCurrentSkip,
        sortBy, setAvailability, portOptions, sliceSummary, clearMarketFilters,
        handlePortChange, handleProductChipClick, handleSortChange,
    } = useMarketplaceSelection({
        initialPort, initialSlice, viewMode, userRole: user?.role, ready, locale, t,
        deliveryPoints, deliveryPointsStatus, catalogProducts,
    });
    const configBase = ROLE_CONFIG_BASE[role] ?? ROLE_CONFIG_BASE.BUYER;
    useDashboardContentReady('MARKETPLACE', !isHistorySelected && ready && (marketTab !== 'market' || (!loading && hasLoadedListings)));

    const currentSliceTarget = useMemo(() => {
        if (marketProduct === ALL_MARKET_PRODUCTS || !resolvedPort || !availability) return null;

        const matchingOrder = listings.find((order) => (
            order.market_product === marketProduct
            && order.availability_window === availability
            && order.delivery_point_id
            && (resolvedDeliveryPointId
                ? order.delivery_point_id === resolvedDeliveryPointId
                : (order.delivery_point_name === resolvedPort || order.region === resolvedPort))
        ));

        if (!matchingOrder?.delivery_point_id) return null;

        return {
            marketProductCode: marketProduct,
            deliveryPointId: matchingOrder.delivery_point_id,
            availabilityWindowCode: matchingOrder.availability_window,
        };
    }, [availability, listings, marketProduct, resolvedDeliveryPointId, resolvedPort]);

    const currentSliceKey = currentSliceTarget
        ? getWatchlistSliceKeyFromParts(
            currentSliceTarget.marketProductCode,
            currentSliceTarget.deliveryPointId,
            currentSliceTarget.availabilityWindowCode,
        )
        : '';
    const isCurrentSliceTracked = Boolean(currentSliceTarget) && trackedSliceKeys.has(currentSliceKey);
    const marketScopeReadyCopyKey = resolvedDeliveryPointId
        ? 'marketScope.ready'
        : 'marketScope.readyRegionTape';

    // ─── Server-side sorting ──────────────────────────────────────
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

    // ─── Trade modal state ────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = useState<OrderBookOrder | null>(null);
    const [myOrders, setMyOrders] = useState<OrderBookOrder[]>([]);
    const [myOrdersLoading, setMyOrdersLoading] = useState(false);
    const [myOrdersError, setMyOrdersError] = useState<string | null>(null);
    const latestMyOrdersRequest = useRef(0);
    const { context: marketSupportContext, isActive: isMarketSupportActive } = useMarketSupport();
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradeState, setTradeState] = useState<'idle' | 'confirming' | 'reviewing' | 'submitting' | 'success' | 'outcome_unknown' | 'error'>('idle');
    const [tradeError, setTradeError] = useState('');
    const [tradeKycBlocked, setTradeKycBlocked] = useState(false);
    const [tradeNeedsRefresh, setTradeNeedsRefresh] = useState(false);
    const [tradeResult, setTradeResult] = useState<Trade | null>(null);
    const tradeRequestRef = useRef<{
        signature: string;
        payload: TradeCreateInput;
        authGeneration: number;
        supportContextId: string | null;
        reviewedOrder: OrderBookOrder;
    } | null>(null);
    const tradeTermsForm = useRef<HTMLFormElement>(null);
    const tradeLngTermsForm = useRef<HTMLFormElement>(null);
    const [tradeFameInput, setTradeFameInput] = useState<Pick<TradeCreateInput, 'fame_terms' | 'certification_declared' | 'msds_available'> | null>(null);
    const [tradeLngInput, setTradeLngInput] = useState<Pick<TradeCreateInput, 'lng_terms' | 'msds_available'> | null>(null);
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
    const tradeInFlightRef = useRef(false);
    const [pendingCancellation, setPendingCancellation] = useState<OrderBookOrder | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellationLoading, setCancellationLoading] = useState(false);
    const [cancellationOutcomeUnknown, setCancellationOutcomeUnknown] = useState(false);
    const cancellationRequestRef = useRef<{
        orderId: string;
        reason: string;
        etag?: string | null;
        idempotencyKey: string;
        authGeneration: number;
        supportContextId: string | null;
    } | null>(null);
    const cancellationScope = `${user?.id ?? ''}:${user?.organization_id ?? ''}:${marketSupportContext?.id ?? 'direct'}`;
    const cancellationScopeRef = useRef(cancellationScope);
    const cancellationEpochRef = useRef(0);
    if (cancellationScopeRef.current !== cancellationScope) {
        cancellationScopeRef.current = cancellationScope;
        cancellationEpochRef.current += 1;
    }

    // ─── News panel toggle ──────────────────────────────────────

    // ─── Order placement modal ────────────────────────────────────
    const [orderModalPrefill, setOrderModalPrefill] = useState<OrderBookOrder | null>(null);
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    useEffect(() => {
        setOrderModalSide(null);
        setSelectedOrder(null);
        setTradeState('idle');
        setTradeFameInput(null);
        setTradeNeedsRefresh(false);
        setTradeResult(null);
        tradeRequestRef.current = null;
        setMyOrders([]);
        latestMyOrdersRequest.current += 1;
    }, [user?.id, user?.organization_id, isMarketSupportActive]);


    useEffect(() => {
        if (!isHistorySelected) return;
        setOrderModalSide(null);
        setSelectedOrder(null);
        setTradeState('idle');
        setPendingCancellation(null);
    }, [isHistorySelected]);

    // ─── Fuel counts for chips ────────────────────────────────────
    const [marketProductCounts, setMarketProductCounts] = useState<Record<string, number>>({});

    const filteredListings = listings;

    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        const loadDeliveryPoints = async () => {
            try {
                const response = await api.catalog.deliveryPoints();
                if (!cancelled) {
                    setDeliveryPoints(response.filter(point => point.is_active !== false));
                    setDeliveryPointsStatus('ready');
                }
            } catch (error) {
                console.warn('Marketplace delivery points unavailable', error);
                if (!cancelled) {
                    setDeliveryPoints([]);
                    setDeliveryPointsStatus('failed');
                }
            }
        };

        void loadCatalogProducts();
        loadDeliveryPoints();
        return () => {
            cancelled = true;
            latestCatalogRequest.current += 1;
        };
    }, [ready, loadCatalogProducts]);


    // ─── Data fetching ────────────────────────────────────────────
    const marketScopeKey = `${role}:${resolvedPort}:${resolvedDeliveryPointId}:${marketProduct}:${availability}:${sortBy}`;
    const countScopeKey = `${role}:${resolvedPort}:${resolvedDeliveryPointId}:${availability}`;
    const currentMarketScope = useRef(marketScopeKey);
    const currentCountScope = useRef(countScopeKey);
    currentMarketScope.current = marketScopeKey;
    currentCountScope.current = countScopeKey;
    const isCatalogScopeResolving = Boolean(resolvedPort) && deliveryPointsStatus === 'loading';

    const fetchListings = useCallback(async (silent = false, skip = 0, force = false) => {
        if (!ready || isHistorySelected || isCatalogScopeResolving) return;
        const requestScope = `${marketScopeKey}:${skip}`;
        currentListingsRequest.current = requestScope;
        if (!force && listingRequestsInFlight.current.has(requestScope)) return;
        const requestToken = Symbol(requestScope);
        listingRequestsInFlight.current.set(requestScope, requestToken);
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const orderParams = {
                region: resolvedDeliveryPointId ? undefined : resolvedPort || undefined,
                delivery_point_id: resolvedDeliveryPointId || undefined,
                market_product: marketProduct === ALL_MARKET_PRODUCTS ? undefined : marketProduct,
                availability: availability || undefined,
                sort_by: sortBy,
                skip,
                limit: PAGE_SIZE,
            };
            const data = await (force
                ? configBase.fetchOrders(orderParams, { force: true })
                : configBase.fetchOrders(orderParams));
            if (listingRequestsInFlight.current.get(requestScope) !== requestToken || requestScope !== currentListingsRequest.current || marketScopeKey !== currentMarketScope.current) return;
            setListings(data.items.filter((order) => isOrderbookMarketProduct(order.market_product)));
            setTotalCount(data.total);
            setCurrentSkip(data.skip);
            setHasLoadedListings(true);
        } catch (err: any) {
            console.error('Marketplace fetch error:', err);
            if (listingRequestsInFlight.current.get(requestScope) !== requestToken || requestScope !== currentListingsRequest.current || marketScopeKey !== currentMarketScope.current) return;
            setError(err instanceof Error ? err.message : '');
        } finally {
            const isCurrentRequest = listingRequestsInFlight.current.get(requestScope) === requestToken;
            if (isCurrentRequest) listingRequestsInFlight.current.delete(requestScope);
            if (isCurrentRequest && requestScope === currentListingsRequest.current && marketScopeKey === currentMarketScope.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [availability, configBase, isCatalogScopeResolving, isHistorySelected, marketProduct, marketScopeKey, ready, resolvedDeliveryPointId, resolvedPort, sortBy]);

    const fetchProductCounts = useCallback(async (force = false) => {
        if (!ready || isHistorySelected || isCatalogScopeResolving) return;
        const requestScope = countScopeKey;
        currentCountsRequest.current = requestScope;
        if (!force && countRequestsInFlight.current.has(requestScope)) return;
        const requestToken = Symbol(requestScope);
        countRequestsInFlight.current.set(requestScope, requestToken);
        try {
            const countParams = {
                side: role === 'BUYER' ? 'ASK' as const : 'BID' as const,
                region: resolvedDeliveryPointId ? undefined : resolvedPort || undefined,
                delivery_point_id: resolvedDeliveryPointId || undefined,
                availability_window: availability || undefined,
                include_off_spec: false,
            };
            const counts = await (force
                ? api.orderbook.productCounts(countParams, { force: true })
                : api.orderbook.productCounts(countParams));
            if (countRequestsInFlight.current.get(requestScope) !== requestToken || requestScope !== currentCountsRequest.current || countScopeKey !== currentCountScope.current) return;
            setMarketProductCounts(counts.counts ?? {});
        } catch {
            // Preserve the last good counts only while the selected scope is unchanged.
        } finally {
            if (countRequestsInFlight.current.get(requestScope) === requestToken) countRequestsInFlight.current.delete(requestScope);
        }
    }, [availability, countScopeKey, isCatalogScopeResolving, isHistorySelected, ready, resolvedDeliveryPointId, resolvedPort, role]);

    const refreshFromPublicEvent = useCallback(() => {
        if (document.hidden) return Promise.resolve();
        const requests: Promise<void>[] = [fetchProductCounts(true)];
        if (marketTab === 'market') requests.push(fetchListings(true, currentSkip, true));
        return Promise.all(requests).then(() => undefined);
    }, [currentSkip, fetchListings, fetchProductCounts, marketTab]);
    usePublicMarketRefresh(refreshFromPublicEvent, ready && !isHistorySelected);

    useEffect(() => {
        setHasLoadedListings(false);
        setTotalCount(0);
    }, [marketScopeKey]);

    useEffect(() => {
        setMarketProductCounts({});
    }, [countScopeKey]);

    // Fetch on mount + whenever filters change (marketProduct, portInput, availability, role)
    useEffect(() => {
        if (!ready || isHistorySelected || marketTab !== 'market' || document.hidden) return;
        void fetchListings(false, 0);
        return () => {
            listingRequestsInFlight.current.clear();
            currentListingsRequest.current = '';
        };
    }, [fetchListings, isHistorySelected, marketTab, ready]);

    useEffect(() => {
        if (!ready || isHistorySelected) return;
        if (!document.hidden) void fetchProductCounts();
        return () => {
            countRequestsInFlight.current.clear();
            currentCountsRequest.current = '';
        };
    }, [fetchProductCounts, isHistorySelected, ready]);

    // Refresh only while the page is visible, including an immediate refresh when it resumes.
    useEffect(() => {
        if (!ready || isHistorySelected) return;
        const refreshWhenVisible = () => {
            if (document.hidden) return;
            void fetchProductCounts();
            if (marketTab === 'market') void fetchListings(hasLoadedListings, currentSkip);
        };
        const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [currentSkip, fetchListings, fetchProductCounts, hasLoadedListings, isHistorySelected, marketTab, ready]);

    // ─── FuelEU pricing overlay (H1.2) ─────────────────────────────
    // One batched authenticated fetch per distinct set of visible ASK ids.
    // The cancelled guard drops stale responses when filters/pages change
    // mid-flight; failures degrade to no-hint and never break the table.
    const askIdSignature = useMemo(
        () => listings.filter((order) => order.side === 'ASK').map((order) => order.id).sort().join(','),
        [listings],
    );
    // Deps are primitives on purpose: a `user` object identity here would
    // re-run the effect on every auth-context render and loop via the
    // new-object setState below.
    const hasAuthedUser = !!user;
    useEffect(() => {
        if (!ready) return;
        if (isHistorySelected || !hasAuthedUser || !askIdSignature) {
            setComplianceOverlays({});
            return;
        }
        let cancelled = false;
        api.compliance.pricingOverlay(askIdSignature.split(','))
            .then((response) => {
                if (cancelled) return;
                setComplianceOverlays(response.overlays);
                setOverlayAssumptions(response.assumptions);
            })
            .catch(() => {
                if (!cancelled) setComplianceOverlays({});
            });
        return () => {
            cancelled = true;
        };
    }, [hasAuthedUser, askIdSignature, ready, isHistorySelected]);

    const totalMarketProductCount = useMemo(
        () => Object.values(marketProductCounts).reduce((sum, count) => sum + count, 0),
        [marketProductCounts],
    );
    const currentSliceCount = marketTab === 'market'
        ? totalCount
        : marketProduct === ALL_MARKET_PRODUCTS
            ? totalMarketProductCount
            : marketProductCounts[marketProduct] || 0;
    const hasActiveSliceFilters = marketProduct !== ALL_MARKET_PRODUCTS || Boolean(resolvedPort) || Boolean(availability);

    const handlePageChange = (newSkip: number) => {
        setHasLoadedListings(false);
        void fetchListings(false, newSkip);
    };

    const hasExactProduct = marketProduct !== ALL_MARKET_PRODUCTS;
    const hasExactPort = Boolean(resolvedDeliveryPointId);
    const hasExactAvailability = Boolean(availability);
    const orderbookRequiresExactSlice = !hasExactProduct || !hasExactPort || !hasExactAvailability;
    const selectedAvailabilityLabel = availabilityOptions.find(option => option.value === availability)?.label || availability;
    const orderbookSliceRequirements = [
        {
            key: 'product',
            label: t('orderBook.requirement.product'),
            value: hasExactProduct ? formatMarketProduct(marketProduct) : t('orderBook.requirement.anyProduct'),
            complete: hasExactProduct,
        },
        {
            key: 'port',
            label: t('orderBook.requirement.port'),
            value: hasExactPort ? resolvedPort : t('orderBook.requirement.anyPort'),
            complete: hasExactPort,
        },
        {
            key: 'window',
            label: t('orderBook.requirement.window'),
            value: hasExactAvailability ? selectedAvailabilityLabel : t('orderBook.requirement.anyWindow'),
            complete: hasExactAvailability,
        },
    ];

    // Market product changes are handled by the listing callback dependencies.

    const handleOrderbookLevelClick = useCallback((order: OrderBookOrder) => {
        setHighlightedOrderId(order.id);
        setMarketTab('market');
    }, [setMarketTab]);

    useEffect(() => {
        if (marketTab !== 'market' || !highlightedOrderId) return;
        const node = document.querySelector(`[data-order-id="${highlightedOrderId}"]`);
        if (!(node instanceof HTMLElement)) return;
        requestAnimationFrame(() => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [filteredListings, highlightedOrderId, marketTab]);

    // ─── Trade modal handlers ─────────────────────────────────────
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
            setOrderModalPrefill(order);
            setOrderModalSide('ASK');
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

    /* ---- My Orders fetch ---- */
    const fetchMyOrders = useCallback(async (force = false) => {
        if (!ready) return;
        const requestId = ++latestMyOrdersRequest.current;
        setMyOrdersLoading(true);
        setMyOrdersError(null);
        try {
            const data = force
                ? await api.orderbook.myOrders({ force: true })
                : await api.orderbook.myOrders();
            if (requestId !== latestMyOrdersRequest.current) return;
            // `/orderbook/my` answers with a bare array; `data.items` is the
            // paginated fallback for an older backend and never resolves to `never`
            // at runtime.
            setMyOrders(Array.isArray(data) ? data : ((data as { items?: OrderBookOrder[] }).items ?? []));
        } catch (error) {
            if (requestId !== latestMyOrdersRequest.current) return;
            if (!force) setMyOrders([]);
            setMyOrdersError(i18n.language.startsWith('zh') ? t('marketplace.myOrders.error') : error instanceof Error ? error.message : t('marketplace.myOrders.error'));
        } finally {
            if (requestId === latestMyOrdersRequest.current) setMyOrdersLoading(false);
        }
    }, [ready, t, user?.id, user?.organization_id, isMarketSupportActive]);

    useEffect(() => {
        if (!isHistorySelected && marketTab === 'my_orders') fetchMyOrders();
        return () => {
            latestMyOrdersRequest.current += 1;
        };
    }, [marketTab, fetchMyOrders, isHistorySelected]);

    const outstandingMyOrders = useMemo(() => myOrders.filter((order) => (
        order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'
    )), [myOrders]);

    const filteredMyOrders = useMemo(() => outstandingMyOrders.filter((order) => {
        if (marketProduct !== ALL_MARKET_PRODUCTS && order.market_product !== marketProduct) {
            return false;
        }

        if (availability && order.availability_window !== availability) {
            return false;
        }

        if (resolvedPort) {
            const matchesPort = resolvedDeliveryPointId
                ? order.delivery_point_id === resolvedDeliveryPointId
                : (order.delivery_point_name || order.region || '') === resolvedPort;
            if (!matchesPort) {
                return false;
            }
        }

        return true;
    }), [availability, marketProduct, outstandingMyOrders, resolvedDeliveryPointId, resolvedPort]);

    const handleCancelOrder = async (order: OrderBookOrder) => {
        cancellationRequestRef.current = null;
        setCancellationOutcomeUnknown(false);
        setPendingCancellation(order);
        setCancellationReason(isMarketSupportActive ? t('marketplace.cancel.reason.assisted') : t('marketplace.cancel.reason.user'));
        setMyOrdersError(null);
    };

    const confirmCancelOrder = async () => {
        if (!pendingCancellation || !cancellationReason.trim()) return;
        const retainedRequest = cancellationOutcomeUnknown ? cancellationRequestRef.current : null;
        if (retainedRequest && (
            retainedRequest.authGeneration !== getAuthGeneration()
            || retainedRequest.supportContextId !== getMarketSupportContextId()
        )) {
            cancellationRequestRef.current = null;
            setCancellationOutcomeUnknown(false);
            setPendingCancellation(null);
            setMyOrdersError(t('marketplace.cancel.contextChanged'));
            return;
        }
        if (isMarketSupportActive && pendingCancellation.creation_method === 'MARKET_SUPPORT' && !pendingCancellation.etag) {
            setMyOrdersError(t('marketplace.cancel.missingVersion'));
            await fetchMyOrders();
            setPendingCancellation(null);
            return;
        }
        const request = retainedRequest ?? {
            orderId: pendingCancellation.id,
            reason: cancellationReason.trim(),
            etag: pendingCancellation.etag,
            idempotencyKey: createIdempotencyKey('order-cancel'),
            authGeneration: getAuthGeneration(),
            supportContextId: getMarketSupportContextId(),
        };
        const executionEpoch = cancellationEpochRef.current;
        const executionIsCurrent = () => (
            executionEpoch === cancellationEpochRef.current
            && request.authGeneration === getAuthGeneration()
            && request.supportContextId === getMarketSupportContextId()
        );
        cancellationRequestRef.current = request;
        setCancellationLoading(true);
        try {
            await api.orderbook.cancel(request.orderId, { reason: request.reason, etag: request.etag, idempotencyKey: request.idempotencyKey });
            if (!executionIsCurrent()) {
                if (executionEpoch === cancellationEpochRef.current) {
                    cancellationRequestRef.current = null;
                    setCancellationOutcomeUnknown(false);
                    setPendingCancellation(null);
                }
                return;
            }
            setMyOrders(prev => prev.filter(o => o.id !== request.orderId));
            cancellationRequestRef.current = null;
            setCancellationOutcomeUnknown(false);
            setPendingCancellation(null);
        } catch (error) {
            if (!executionIsCurrent()) {
                if (executionEpoch === cancellationEpochRef.current) {
                    cancellationRequestRef.current = null;
                    setCancellationOutcomeUnknown(false);
                    setPendingCancellation(null);
                }
                return;
            }
            if (error instanceof ApiOutcomeUnknownError) {
                setCancellationOutcomeUnknown(true);
                setMyOrdersError(null);
                return;
            }
            cancellationRequestRef.current = null;
            setCancellationOutcomeUnknown(false);
            if (error instanceof ApiError && (error.status === 412 || error.status === 428)) {
                await fetchMyOrders(true);
                setMyOrdersError(t('marketplace.cancel.stale'));
                setPendingCancellation(null);
            } else {
                setMyOrdersError(i18n.language.startsWith('zh') ? t('marketplace.cancel.error') : error instanceof Error ? error.message : t('marketplace.cancel.error'));
            }
        } finally {
            if (executionEpoch === cancellationEpochRef.current) setCancellationLoading(false);
        }
    };

    const closeCancellationModal = () => {
        if (cancellationLoading) return;
        cancellationRequestRef.current = null;
        setCancellationOutcomeUnknown(false);
        setPendingCancellation(null);
    };

    useEffect(() => {
        cancellationRequestRef.current = null;
        setCancellationOutcomeUnknown(false);
        setCancellationLoading(false);
        setPendingCancellation(null);
    }, [user?.id, user?.organization_id, marketSupportContext?.id]);

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
        if (tradeState !== 'success') return;
        // Keep the success message visible briefly, then reload current quotes.
        const timer = setTimeout(() => {
            closeTradeModal();
            void fetchProductCounts(true);
            if (marketTab === 'market') void fetchListings(true, currentSkip, true);
        }, 2000);
        return () => clearTimeout(timer);
    }, [tradeState, closeTradeModal, currentSkip, fetchListings, fetchProductCounts, marketTab]);

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
        setTradeState('submitting');
        tradeInFlightRef.current = true;
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
            const result = await api.trades.initiate(tradeRequestRef.current!.payload);
            setTradeResult(result);
            setTradeState('success');
        } catch (err: unknown) {
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

    if (!ready) return null;

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div
            className={isHistorySelected ? 'min-h-full flex flex-col' : 'h-full min-h-0 flex flex-col overflow-hidden'}
            data-tour-market-product={isHistorySelected ? 'UCOME_B100' : marketProduct === ALL_MARKET_PRODUCTS ? '' : marketProduct}
            data-tour-port={isHistorySelected ? 'Singapore' : resolvedPort}
            data-tour-window={isHistorySelected ? '' : availability}
            data-tour-tab={marketTab}
        >
            <MarketplaceHeader
                isHistorySelected={isHistorySelected}
                t={t}
                configBase={configBase}
                setOrderModalSide={setOrderModalSide}
                marketProduct={marketProduct}
                setMarketTab={setMarketTab}
                marketTab={marketTab}
                loadCatalogProducts={loadCatalogProducts}
                fetchProductCounts={fetchProductCounts}
                fetchListings={fetchListings}
                currentSkip={currentSkip}
                refreshing={refreshing}
                isMarketSupportActive={isMarketSupportActive}
                currentSliceTarget={currentSliceTarget}
                toggleSlice={toggleSlice}
                isCurrentSliceTracked={isCurrentSliceTracked}
            >
            <MarketplaceFilters
                t={t}
                isHistorySelected={isHistorySelected}
                marketProduct={marketProduct}
                marketProductCounts={marketProductCounts}
                handleProductChipClick={handleProductChipClick}
                filtersExpanded={filtersExpanded}
                setFiltersExpanded={setFiltersExpanded}
                portInput={portInput}
                handlePortChange={handlePortChange}
                portOptions={portOptions}
                availability={availability}
                setAvailability={setAvailability}
                availabilityOptions={availabilityOptions}
                sortBy={sortBy}
                handleSortChange={handleSortChange}
                currentSliceCount={currentSliceCount}
                sliceSummary={sliceSummary}
            />

            <MarketplaceTabs
                isHistorySelected={isHistorySelected}
                isMarketSupportActive={isMarketSupportActive}
                t={t}
                setMarketTab={setMarketTab}
                user={user}
                fameTab={fameTab}
                marketTab={marketTab}
                role={role}
            />

            </MarketplaceHeader>

            <MarketplaceHistory
                isHistorySelected={isHistorySelected}
                isMarketSupportActive={isMarketSupportActive}
                fameTab={fameTab}
                user={user}
                t={t}
            />

            {/* Error state */}
            {!isHistorySelected && marketTab === 'market' && error && !loading && !hasLoadedListings && (
                <div className="flex-1 min-h-0 overflow-auto px-4 lg:px-10 pb-4">
                    <div className="max-w-7xl mx-auto">
                        <div role="alert" className="v-card p-8 flex flex-col items-center text-center">
                            <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">{t('marketplace.error.title')}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md">
                                {locale.startsWith('zh') ? t('marketplace.error.message') : error || t('marketplace.error.message')}
                            </p>
                            <button
                                onClick={() => { void fetchListings(false, 0); }}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                {t('marketplace.btn.tryAgain')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isHistorySelected && marketTab === 'market' && error && hasLoadedListings && (
                <div role="alert" className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:mx-10">
                    {locale.startsWith('zh') ? t('marketplace.error.message') : error || t('marketplace.error.message')}
                </div>
            )}

            <MarketDepthPanel
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                t={t}
                orderbookRequiresExactSlice={orderbookRequiresExactSlice}
                marketScopeReadyCopyKey={marketScopeReadyCopyKey}
                orderbookSliceRequirements={orderbookSliceRequirements}
                isCatalogScopeResolving={isCatalogScopeResolving}
                marketProduct={marketProduct}
                resolvedDeliveryPointId={resolvedDeliveryPointId}
                availability={availability}
                resolvedPort={resolvedPort}
                role={role}
                b100Product={b100Product}
                bioLngProduct={bioLngProduct}
                handleOrderbookLevelClick={handleOrderbookLevelClick}
            />

            <MyListingsPanel
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                myOrdersError={myOrdersError}
                myOrdersLoading={myOrdersLoading}
                outstandingMyOrders={outstandingMyOrders}
                filteredMyOrders={filteredMyOrders}
                role={role}
                setOrderModalSide={setOrderModalSide}
                sliceSummary={sliceSummary}
                hasActiveSliceFilters={hasActiveSliceFilters}
                clearMarketFilters={clearMarketFilters}
                locale={locale}
                t={t}
                isMarketSupportActive={isMarketSupportActive}
                handleCancelOrder={handleCancelOrder}
                fetchMyOrders={fetchMyOrders}
            />

            <ListingsTable
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                error={error}
                hasLoadedListings={hasLoadedListings}
                configBase={configBase}
                loading={loading}
                filteredListings={filteredListings}
                highlightedOrderId={highlightedOrderId}
                t={t}
                role={role}
                locale={locale}
                complianceOverlays={complianceOverlays}
                overlayAssumptions={overlayAssumptions}
                b100TradingEnabled={b100TradingEnabled}
                bioLngTradingEnabled={bioLngTradingEnabled}
                pinnedOrderIds={pinnedOrderIds}
                isMarketSupportActive={isMarketSupportActive}
                openTradeModal={openTradeModal}
                catalogError={catalogError}
                togglePin={togglePin}
                totalCount={totalCount}
                currentSkip={currentSkip}
                handlePageChange={handlePageChange}
            />

            <TakeTradeDialog
                isHistorySelected={isHistorySelected}
                selectedOrder={selectedOrder}
                tradeState={tradeState}
                tradeResult={tradeResult}
                t={t}
                locale={locale}
                role={role}
                tradeError={tradeError}
                confirmTrade={confirmTrade}
                closeTradeModal={closeTradeModal}
                tradeKycBlocked={tradeKycBlocked}
                tradeNeedsRefresh={tradeNeedsRefresh}
                fetchProductCounts={fetchProductCounts}
                marketTab={marketTab}
                fetchListings={fetchListings}
                currentSkip={currentSkip}
                configBase={configBase}
                tradeQuantity={tradeQuantity}
                setTradeQuantity={setTradeQuantity}
                tradeTermsForm={tradeTermsForm}
                tradeLngTermsForm={tradeLngTermsForm}
                reviewTrade={reviewTrade}
                initialBuyerTerms={initialBuyerTerms}
                initialLngTaker={initialLngTaker}
                tradeFameInput={tradeFameInput}
                tradeLngInput={tradeLngInput}
                setTradeState={setTradeState}
            />

            {/* ─── Order Placement Modal ────────────────────────────── */}
            <CancelOrderDialog
                isHistorySelected={isHistorySelected}
                pendingCancellation={pendingCancellation}
                closeCancellationModal={closeCancellationModal}
                confirmCancelOrder={confirmCancelOrder}
                t={t}
                cancellationOutcomeUnknown={cancellationOutcomeUnknown}
                cancellationLoading={cancellationLoading}
                cancellationReason={cancellationReason}
                setCancellationReason={setCancellationReason}
            />

            <OrderPlaceModal
                isOpen={orderModalSide !== null && !isHistorySelected}
                onClose={() => {
                    setOrderModalSide(null);
                    setOrderModalPrefill(null);
                    if (!isHistorySelected) {
                        void fetchProductCounts(true);
                        if (marketTab === 'market') void fetchListings(true, currentSkip, true);
                        if (marketTab === 'my_orders') void fetchMyOrders(true);
                    }
                }}
                side={orderModalSide || configBase.primaryAction.side}
                prefillFuelType={marketProduct !== ALL_MARKET_PRODUCTS ? formatMarketProduct(marketProduct) : undefined}
                prefillRegion={orderModalPrefill?.region || portInput || undefined}
                prefillMarketProduct={orderModalPrefill?.market_product || (marketProduct !== ALL_MARKET_PRODUCTS ? marketProduct : undefined)}
                prefillDeliveryPointId={orderModalPrefill?.delivery_point_id || currentSliceTarget?.deliveryPointId}
                prefillAvailabilityWindow={orderModalPrefill?.availability_window || availability || undefined}
                prefillQuantity={orderModalPrefill?.remaining_quantity_mt}
                prefillPrice={orderModalPrefill?.price_per_mt_usd}
            />
        </div>
    );
};
