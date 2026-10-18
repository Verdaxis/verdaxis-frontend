import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { OrderBookOrder, ProductExecutionMode } from '../../../types';
import { api } from '../../../services/api';
import { useNamespace } from '../../../hooks/useNamespace';
import { usePublicMarketRefresh } from '../../../hooks/usePublicMarketRefresh';
import { isOrderbookMarketProduct } from '../../../utils/marketProduct';
import { isDemoMarketActivity } from '../../../utils/marketActivity';
import i18n from '../../../i18n';

import { OrderBookLadder } from './OrderBookLadder';

interface OrderBookProps {
    fuelType?: string;
    marketProduct?: string;
    executionMode?: ProductExecutionMode;
    region?: string;
    deliveryPointId?: string;
    availability?: string;
    actionableSide?: 'BID' | 'ASK';
    onLevelClick?: (order: OrderBookOrder) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_ROWS = 15;

function isOrderbookFuelType(fuelType: string | undefined): boolean {
    return fuelType != null && ['methanol', 'ethanol', 'fame'].includes(fuelType.trim().toLowerCase());
}

function isOrderbookOrder(order: OrderBookOrder): boolean {
    // B100 rows need a canonical code. Only legacy alcohol rows use fuel labels.
    return order.market_product
        ? isOrderbookMarketProduct(order.market_product)
        : ['methanol', 'ethanol'].includes(order.fuel_type?.trim().toLowerCase());
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, marketProduct, executionMode, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade }) => {
    const { t, ready } = useNamespace('trading');
    const [bids, setBids] = useState<OrderBookOrder[]>([]);
    const [asks, setAsks] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [hoverTooltip, setHoverTooltip] = useState<{ order: OrderBookOrder; x: number; y: number } | null>(null);
    const tooltipId = useId();
    const requestGeneration = useRef(0);
    const latestRequest = useRef(0);
    const latestAppliedRequest = useRef(0);
    const requestsInFlight = useRef(new Map<string, { token: symbol; forced: boolean; completion: Promise<void> }>());
    const hasSnapshot = useRef(false);
    const b100Selected = marketProduct === 'UCOME_B100' || fuelType?.trim().toLowerCase() === 'fame';
    const orderbookAvailable = executionMode !== 'RFQ_ONLY'
        && (!b100Selected || executionMode === 'ORDERBOOK')
        && (!marketProduct || isOrderbookMarketProduct(marketProduct))
        && (!fuelType || isOrderbookFuelType(fuelType));
    const requestScope = JSON.stringify([fuelType, marketProduct, executionMode, region, deliveryPointId, availability]);
    const currentRequestScope = useRef(requestScope);
    currentRequestScope.current = requestScope;

    const fetchData = useCallback(async (force = false) => {
        if (!orderbookAvailable) {
            hasSnapshot.current = false;
            setBids([]);
            setAsks([]);
            setHoverTooltip(null);
            setError(null);
            setGeneratedAt(null);
            setLoading(false);
            return;
        }
        if (!marketProduct || !isOrderbookMarketProduct(marketProduct) || !deliveryPointId || !availability) return;
        const activeRequest = requestsInFlight.current.get(requestScope);
        if (activeRequest && (!force || activeRequest.forced)) return activeRequest.completion;
        const requestToken = Symbol(requestScope);
        let completeRequest!: () => void;
        const completion = new Promise<void>((resolve) => { completeRequest = resolve; });
        requestsInFlight.current.set(requestScope, { token: requestToken, forced: force, completion });
        const generation = requestGeneration.current;
        const requestId = ++latestRequest.current;
        if (hasSnapshot.current) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const snapshot = await api.orderbook.snapshot({
                market_product: marketProduct,
                delivery_point_id: deliveryPointId,
                availability_window: availability,
            }, { force });

            if (
                generation !== requestGeneration.current
                || requestScope !== currentRequestScope.current
                || requestId < latestAppliedRequest.current
            ) return;

            // Bids: highest price first (best bid at top)
            const sortedBids: OrderBookOrder[] = [...snapshot.bids]
                .filter(isOrderbookOrder)
                .sort((a: OrderBookOrder, b: OrderBookOrder) => b.price_per_mt_usd - a.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            // Asks: lowest price first (best ask at top)
            const sortedAsks: OrderBookOrder[] = [...snapshot.asks]
                .filter(isOrderbookOrder)
                .sort((a: OrderBookOrder, b: OrderBookOrder) => a.price_per_mt_usd - b.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            latestAppliedRequest.current = requestId;
            setBids(sortedBids);
            setAsks(sortedAsks);
            setGeneratedAt(snapshot.generated_at);
            hasSnapshot.current = true;
            setError(null);
            setLoading(false);
            const activeRequestAfterSnapshot = requestsInFlight.current.get(requestScope);
            setRefreshing(Boolean(
                activeRequestAfterSnapshot
                && activeRequestAfterSnapshot.token !== requestToken
            ));
        } catch {
            if (generation === requestGeneration.current && requestId === latestRequest.current && requestScope === currentRequestScope.current) {
                setError(t('orderBook.error'));
            }
        } finally {
            if (requestsInFlight.current.get(requestScope)?.token === requestToken) requestsInFlight.current.delete(requestScope);
            completeRequest();
            if (generation === requestGeneration.current && requestId === latestRequest.current && requestScope === currentRequestScope.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [availability, deliveryPointId, fuelType, marketProduct, orderbookAvailable, region, requestScope, t]);

    // Initial load + re-fetch when filters change
    useEffect(() => {
        requestGeneration.current += 1;
        hasSnapshot.current = false;
        setBids([]);
        setAsks([]);
        setGeneratedAt(null);
        setError(null);
        setLoading(true);
        setHoverTooltip(null);
        if (!orderbookAvailable) {
            setLoading(false);
        } else if (!marketProduct || !isOrderbookMarketProduct(marketProduct) || !deliveryPointId || !availability) {
            setLoading(false);
            setError(t('orderBook.error'));
        } else if (!document.hidden) {
            void fetchData();
        }
        return () => {
            requestGeneration.current += 1;
            requestsInFlight.current.delete(requestScope);
        };
    }, [availability, deliveryPointId, fetchData, marketProduct, orderbookAvailable, requestScope, t]);

    // Poll through the 10-second cache. A visibility/network resume bypasses it.
    useEffect(() => {
        const pollWhenVisible = () => {
            if (!document.hidden && orderbookAvailable) void fetchData();
        };
        const refreshAfterResume = () => {
            if (!document.hidden && orderbookAvailable) void fetchData(true);
        };
        const interval = window.setInterval(pollWhenVisible, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', refreshAfterResume);
        window.addEventListener('online', refreshAfterResume);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshAfterResume);
            window.removeEventListener('online', refreshAfterResume);
        };
    }, [fetchData, orderbookAvailable]);

    const refreshFromPublicEvent = useCallback(async () => {
        if (document.hidden || !orderbookAvailable) return;
        const refreshGeneration = requestGeneration.current;
        const activeRequest = requestsInFlight.current.get(requestScope);
        if (activeRequest?.forced) await activeRequest.completion;
        if (
            document.hidden
            || !orderbookAvailable
            || refreshGeneration !== requestGeneration.current
            || requestScope !== currentRequestScope.current
        ) return;
        await fetchData(true);
    }, [fetchData, orderbookAvailable, requestScope]);
    usePublicMarketRefresh(
        refreshFromPublicEvent,
        Boolean(orderbookAvailable && marketProduct && deliveryPointId && availability),
    );

    const showTooltipFromElement = useCallback((order: OrderBookOrder, element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeight = isDemoMarketActivity(order) ? 196 : 152;
        const padding = 16;
        const preferredX = rect.right + 14;
        const fallbackX = rect.left - tooltipWidth - 14;
        const x = preferredX + tooltipWidth <= window.innerWidth - padding
            ? preferredX
            : Math.max(padding, fallbackX);
        const y = Math.max(padding, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding));
        setHoverTooltip({ order, x, y });
    }, []);

    if (!ready) return null;
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

    if (!orderbookAvailable) {
        return (
            <div role="status" className="v-glass h-full p-6 flex items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                {t('orderBook.rfqOnly')}
            </div>
        );
    }

    if (loading) {
        return (
            <div role="status" className="v-glass h-full p-6 mb-0 flex items-center justify-center gap-3 text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">{t('orderBook.loading')}</span>
            </div>
        );
    }

    if (error && generatedAt === null) {
        return (
            <div role="alert" className="v-glass p-4 mb-0 text-center text-sm text-red-600 dark:text-red-400">
                <p>{t('orderBook.unavailable')}</p>
                <button type="button" onClick={() => void fetchData(true)}
                    className="mt-3 min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t('orderBook.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col" data-tour="orderbook-panel">
            <OrderBookLadder
                bids={bids} asks={asks} marketProduct={marketProduct} region={region} availability={availability}
                b100Selected={b100Selected} generatedAt={generatedAt} refreshing={refreshing} error={error}
                actionableSide={actionableSide} onLevelClick={onLevelClick} onInstantTrade={onInstantTrade}
                hoverTooltip={hoverTooltip} tooltipId={tooltipId} setHoverTooltip={setHoverTooltip}
                showTooltipFromElement={showTooltipFromElement} fetchData={fetchData} locale={locale} t={t}
            />
        </div>
    );
};
