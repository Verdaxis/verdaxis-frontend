import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import type { OrderBookOrder, OwnedOrderBookOrder } from '../../../types';
import type { QueryScope } from '../../../lib/query/keys';
import { ApiError, ApiOutcomeUnknownError } from '../../../services/api';
import { getAuthGeneration } from '../../../services/authToken';
import { getMarketSupportContextId } from '../../../services/marketSupportContextStore';
import { createIdempotencyKey } from '../../../utils/idempotencyKey';
import i18n from '../../../i18n';
import { marketplaceApi } from '../api/marketplaceApi';
import { marketplaceKeys } from '../api/marketplaceKeys';

interface FrozenCancelRequest {
    orderId: string;
    reason: string;
    etag?: string | null;
    idempotencyKey: string;
    authGeneration: number;
    supportContextId: string | null;
    /** The my-orders key that showed the row when the write started. */
    scope: QueryScope;
}

interface UseCancelOrderOptions {
    userId?: string | null;
    organizationId?: string | null;
    marketSupportContextId?: string | null;
    scope: QueryScope;
    isMarketSupportActive: boolean;
    isHistorySelected: boolean;
    readError: unknown;
    t: TFunction;
    fetchMyOrders: (force?: boolean) => Promise<void>;
}

export function useCancelOrder({
    userId, organizationId, marketSupportContextId, scope, isMarketSupportActive,
    isHistorySelected, readError, t, fetchMyOrders,
}: UseCancelOrderOptions) {
    const client = useQueryClient();
    const [pendingCancellation, setPendingCancellation] = useState<OrderBookOrder | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellationLoading, setCancellationLoading] = useState(false);
    const [cancellationOutcomeUnknown, setCancellationOutcomeUnknown] = useState(false);
    const [myOrdersError, setMyOrdersError] = useState<string | null>(null);
    const cancellationRequestRef = useRef<FrozenCancelRequest | null>(null);

    const cancellationScope = `${userId ?? ''}:${organizationId ?? ''}:${marketSupportContextId ?? 'direct'}`;
    const cancellationScopeRef = useRef(cancellationScope);
    const cancellationEpochRef = useRef(0);
    if (cancellationScopeRef.current !== cancellationScope) {
        cancellationScopeRef.current = cancellationScope;
        cancellationEpochRef.current += 1;
    }

    // One attempt per recorded request. An unknown outcome is retried only by
    // the user, with the frozen reason, version, and idempotency key.
    const cancelMutation = useMutation({
        mutationFn: (request: FrozenCancelRequest) => marketplaceApi.cancelOrder(request.orderId, {
            reason: request.reason, etag: request.etag, idempotencyKey: request.idempotencyKey,
        }),
        retry: false,
    });

    useEffect(() => {
        setMyOrdersError(readError ? (i18n.language.startsWith('zh') ? t('marketplace.myOrders.error')
            : readError instanceof Error ? readError.message : t('marketplace.myOrders.error')) : null);
    }, [readError, t]);

    useEffect(() => {
        cancellationRequestRef.current = null;
        setCancellationOutcomeUnknown(false);
        setCancellationLoading(false);
        setPendingCancellation(null);
    }, [userId, organizationId, marketSupportContextId]);

    useEffect(() => {
        if (!isHistorySelected) return;
        setPendingCancellation(null);
    }, [isHistorySelected]);

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
        const request: FrozenCancelRequest = retainedRequest ?? {
            orderId: pendingCancellation.id,
            reason: cancellationReason.trim(),
            etag: pendingCancellation.etag,
            idempotencyKey: createIdempotencyKey('order-cancel'),
            authGeneration: getAuthGeneration(),
            supportContextId: getMarketSupportContextId(),
            scope,
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
            await cancelMutation.mutateAsync(request);
            if (!executionIsCurrent()) {
                if (executionEpoch === cancellationEpochRef.current) {
                    cancellationRequestRef.current = null;
                    setCancellationOutcomeUnknown(false);
                    setPendingCancellation(null);
                }
                return;
            }
            // Immediate feedback on the key that showed the row; the write's
            // settlement invalidation reconciles it with the server.
            client.setQueryData(marketplaceKeys.myOrders(request.scope), (previous: OwnedOrderBookOrder[] | undefined) =>
                previous ? previous.filter(order => order.id !== request.orderId) : previous);
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

    return {
        pendingCancellation, cancellationReason, setCancellationReason,
        cancellationLoading, cancellationOutcomeUnknown, myOrdersError,
        handleCancelOrder, confirmCancelOrder, closeCancellationModal,
    };
}
