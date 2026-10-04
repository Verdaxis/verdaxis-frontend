import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, TrendingUp, TrendingDown, Loader2, RefreshCw, Zap } from 'lucide-react';
import { OrderBookOrder, ProductExecutionMode } from '../types';
import { api } from '../services/api';
import { useNamespace } from '../hooks/useNamespace';
import { usePublicMarketRefresh } from '../hooks/usePublicMarketRefresh';
import { formatMarketProduct, isOrderbookMarketProduct } from '../utils/marketProduct';
import { formatAvailabilityWindow } from '../utils/availabilityWindow';
import { isDemoMarketActivity } from '../utils/marketActivity';
import i18n from '../i18n';

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

export function getLivePriceCrossState(bids: OrderBookOrder[], asks: OrderBookOrder[]) {
    // This is a provenance-scoped public price signal, not execution authority.
    // API decimal fields can arrive as strings despite the frontend order type.
    const hasLivePrice = (order: OrderBookOrder) => isOrderbookOrder(order) && !isDemoMarketActivity(order)
        && Number.isFinite(Number(order.price_per_mt_usd)) && Number(order.price_per_mt_usd) > 0;
    const realBids = bids
        .filter(hasLivePrice)
        .sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd);
    const realAsks = asks
        .filter(hasLivePrice)
        .sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd);

    const products = new Set([...realBids, ...realAsks].map(order => order.market_product || order.fuel_type.trim().toLowerCase()));
    // A combined product view has no meaningful common price spread.
    if (products.size > 1) {
        return { hasCross: false, bidIds: new Set<string>(), askIds: new Set<string>(), spread: null };
    }

    const bestBid = realBids[0];
    const bestAsk = realAsks[0];
    const hasCross = Boolean(bestBid && bestAsk && Number(bestBid.price_per_mt_usd) >= Number(bestAsk.price_per_mt_usd));
    const bidIds = new Set<string>();
    const askIds = new Set<string>();

    if (hasCross && bestBid && bestAsk) {
        realBids
            .filter(order => Number(order.price_per_mt_usd) >= Number(bestAsk.price_per_mt_usd))
            .forEach(order => bidIds.add(order.id));
        realAsks
            .filter(order => Number(order.price_per_mt_usd) <= Number(bestBid.price_per_mt_usd))
            .forEach(order => askIds.add(order.id));
    }

    return {
        hasCross,
        bidIds,
        askIds,
        spread: bestBid && bestAsk ? bestAsk.price_per_mt_usd - bestBid.price_per_mt_usd : null,
    };
}

function formatPrice(price: number, locale = 'en'): string {
    const value = Number(price);
    return Number.isFinite(value) ? `$${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—';
}

function formatQty(qty: number, locale = 'en'): string {
    const value = Number(qty);
    return Number.isFinite(value) ? value.toLocaleString(locale, { maximumFractionDigits: 2 }) : '—';
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, marketProduct, executionMode, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade }) => {
    const { t, ready } = useNamespace('trading');
    const [bids, setBids] = useState<OrderBookOrder[]>([]);
    const [asks, setAsks] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [clock, setClock] = useState(() => Date.now());
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
            setClock(Date.now());
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

    useEffect(() => {
        const interval = window.setInterval(() => setClock(Date.now()), 1_000);
        return () => window.clearInterval(interval);
    }, []);

    // Scale depth bars against the largest visible resting order so large positions still render proportionally.
    const maxQty = React.useMemo(() => {
        const allQtys = [...bids, ...asks].map(o => o.remaining_quantity_mt);
        return allQtys.length > 0 ? Math.max(...allQtys) : 1;
    }, [bids, asks]);

    const maxRows = Math.max(bids.length, asks.length);
    const livePriceCrossState = React.useMemo(
        () => getLivePriceCrossState(bids, asks),
        [bids, asks],
    );
    const liveSpread = livePriceCrossState.spread;
    const b100Visible = b100Selected || [...bids, ...asks].some(order => order.market_product === 'UCOME_B100');
    const generatedAtMs = generatedAt ? Date.parse(generatedAt) : Number.NaN;
    const snapshotAgeSeconds = Number.isFinite(generatedAtMs)
        ? Math.max(0, Math.floor((clock - generatedAtMs) / 1_000))
        : null;
    const snapshotIsStale = snapshotAgeSeconds !== null
        && snapshotAgeSeconds * 1_000 > POLL_INTERVAL_MS * 2;

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

    const age = snapshotAgeSeconds ?? 0;
    const freshnessText = refreshing
        ? t('orderBook.refreshing', { age })
        : error
            ? t('orderBook.refreshFailed', { age })
            : snapshotIsStale
                ? t('orderBook.stale', { age })
                : t('orderBook.updated', { age });
    const freshnessTone = error
        ? 'text-red-600 dark:text-red-400'
        : snapshotIsStale
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-400';

    return (
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col" data-tour="orderbook-panel">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {marketProduct ? formatMarketProduct(marketProduct) : t('orderBook.title')}
                    {region && <span> · {region}</span>}
                    {availability && <span> · {formatAvailabilityWindow(availability, locale)}</span>}
                </h2>
                <div className="flex items-center gap-2">
                    <span
                        role={error ? 'alert' : 'status'}
                        data-testid="orderbook-freshness"
                        className={`text-[11px] font-medium ${freshnessTone}`}
                    >
                        {freshnessText}
                    </span>
                    <button type="button" onClick={() => void fetchData(true)} aria-label={t('orderBook.refresh')}
                        disabled={refreshing}
                        className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:cursor-wait dark:text-slate-400 dark:hover:bg-slate-800">
                        <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} />
                    </button>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t('orderBook.bids')} ({bids.length})</span>
                    <span className="ml-auto text-[11px] text-slate-400 font-medium">{t('orderBook.buyPressure')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/20">
                    <TrendingDown size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('orderBook.asks')} ({asks.length})</span>
                    <span className="ml-auto text-[11px] text-slate-400 font-medium">{t('orderBook.sellOffers')}</span>
                </div>
            </div>

            {/* Sub-headers */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">{t('orderBook.qtyMt')}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase text-right">{t('orderBook.pricePerMt')}</span>
                </div>
                <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">{t('orderBook.pricePerMt')}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase text-right">{t('orderBook.qtyMt')}</span>
                </div>
            </div>

            {/* Unified rows — bid and ask per row for perfect vertical alignment */}
            <div className="relative flex-1 overflow-y-auto" onMouseLeave={() => setHoverTooltip(null)}>
                {maxRows === 0 ? (
                    <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                        <div className="px-4 py-8 text-center text-xs text-slate-400">{t('orderBook.noBids')}</div>
                        <div className="px-4 py-8 text-center text-xs text-slate-400">{t('orderBook.noAsks')}</div>
                    </div>
                ) : (
                    Array.from({ length: maxRows }).map((_, i) => {
                        const bid = bids[i] ?? null;
                        const ask = asks[i] ?? null;
                        const bidIsDemo = isDemoMarketActivity(bid);
                        const askIsDemo = isDemoMarketActivity(ask);
                        const bidDepth = bid ? (bid.remaining_quantity_mt / maxQty) * 100 : 0;
                        const askDepth = ask ? (ask.remaining_quantity_mt / maxQty) * 100 : 0;
                        const bidCrossed = bid ? livePriceCrossState.bidIds.has(bid.id) : false;
                        const askCrossed = ask ? livePriceCrossState.askIds.has(ask.id) : false;

                        const bidInteractive = actionableSide === 'BID' && Boolean(onLevelClick);
                        const askInteractive = actionableSide === 'ASK' && Boolean(onLevelClick);

                        return (
                            <div key={i} className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                                {/* BID cell */}
                                {bid ? (
                                    <div
                                        onMouseEnter={(event) => showTooltipFromElement(bid, event.currentTarget)}
                                        onFocus={(event) => showTooltipFromElement(bid, event.currentTarget)}
                                        onBlur={() => setHoverTooltip(null)}
                                        onClick={() => { if (bidInteractive) onLevelClick?.(bid); }}
                                        data-tour={bidInteractive ? 'orderbook-actionable-level' : undefined}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') setHoverTooltip(null);
                                            if (event.target !== event.currentTarget) return;
                                            if (!bidInteractive) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onLevelClick?.(bid);
                                            }
                                        }}
                                        role={bidInteractive ? 'button' : 'group'}
                                        tabIndex={0}
                                        aria-label={t(bidInteractive ? 'orderBook.openBid' : 'orderBook.inspectBid', { price: formatPrice(bid.price_per_mt_usd, locale), quantity: formatQty(bid.remaining_quantity_mt, locale) })}
                                        aria-describedby={hoverTooltip?.order.id === bid.id ? tooltipId : undefined}
                                        className={`relative flex items-center justify-between min-h-11 px-4 py-3 border-b border-slate-100 dark:border-slate-800 group hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${bidInteractive ? 'cursor-pointer' : 'cursor-default'} ${
                                            bidCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                    >
                                        {bidIsDemo && (
                                            <span
                                                className="absolute left-1 top-1/2 z-20 inline-flex -translate-y-1/2 text-amber-500 dark:text-amber-400"
                                                aria-hidden="true"
                                            >
                                                <AlertTriangle size={10} />
                                            </span>
                                        )}
                                        <div
                                            className={`absolute inset-y-0 right-0 pointer-events-none ${
                                                bidCrossed ? 'bg-amber-200/40 dark:bg-amber-700/20' : 'bg-emerald-100/60 dark:bg-emerald-900/20'
                                            }`}
                                            style={{ width: `${bidDepth}%` }}
                                        />
                                        {onInstantTrade && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onInstantTrade(bid.id, 'ASK', bid.price_per_mt_usd, bid.remaining_quantity_mt); }}
                                                className="relative z-10 mr-1 px-1.5 py-0.5 text-[11px] font-bold uppercase rounded bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                {t('orderBook.sell')}
                                            </button>
                                        )}
                                        <span className="relative z-10 text-sm tabular-nums font-mono text-slate-500 dark:text-slate-400">
                                            {formatQty(bid.remaining_quantity_mt, locale)}
                                        </span>
                                        <span className={`relative z-10 text-sm tabular-nums font-mono font-bold text-right ${
                                            bidCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                                        }`}>
                                            {bidCrossed && (
                                                <span className="mr-1 inline-flex items-center text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />{t(bid.market_product === 'UCOME_B100' ? 'orderBook.priceOverlap' : 'orderBook.cross')}
                                                </span>
                                            )}
                                            {formatPrice(bid.price_per_mt_usd, locale)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="min-h-11 px-4 py-3" />
                                )}

                                {/* ASK cell */}
                                {ask ? (
                                    <div
                                        onMouseEnter={(event) => showTooltipFromElement(ask, event.currentTarget)}
                                        onFocus={(event) => showTooltipFromElement(ask, event.currentTarget)}
                                        onBlur={() => setHoverTooltip(null)}
                                        onClick={() => { if (askInteractive) onLevelClick?.(ask); }}
                                        data-tour={askInteractive ? 'orderbook-actionable-level' : undefined}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') setHoverTooltip(null);
                                            if (event.target !== event.currentTarget) return;
                                            if (!askInteractive) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onLevelClick?.(ask);
                                            }
                                        }}
                                        role={askInteractive ? 'button' : 'group'}
                                        tabIndex={0}
                                        aria-label={t(askInteractive ? 'orderBook.openAsk' : 'orderBook.inspectAsk', { price: formatPrice(ask.price_per_mt_usd, locale), quantity: formatQty(ask.remaining_quantity_mt, locale) })}
                                        aria-describedby={hoverTooltip?.order.id === ask.id ? tooltipId : undefined}
                                        className={`relative flex items-center justify-between min-h-11 px-4 py-3 border-b border-slate-100 dark:border-slate-800 group hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${askInteractive ? 'cursor-pointer' : 'cursor-default'} ${
                                            askCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                    >
                                        <div
                                            className={`absolute inset-y-0 left-0 pointer-events-none ${
                                                askCrossed ? 'bg-amber-200/40 dark:bg-amber-700/20' : 'bg-red-100/60 dark:bg-red-900/20'
                                            }`}
                                            style={{ width: `${askDepth}%` }}
                                        />
                                        {askIsDemo && (
                                            <span
                                                className="absolute right-1 top-1/2 z-20 inline-flex -translate-y-1/2 text-amber-500 dark:text-amber-400"
                                                aria-hidden="true"
                                            >
                                                <AlertTriangle size={10} />
                                            </span>
                                        )}
                                        <span className={`relative z-10 text-sm tabular-nums font-mono font-bold ${
                                            askCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatPrice(ask.price_per_mt_usd, locale)}
                                            {askCrossed && (
                                                <span className="ml-1 inline-flex items-center text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />{t(ask.market_product === 'UCOME_B100' ? 'orderBook.priceOverlap' : 'orderBook.cross')}
                                                </span>
                                            )}
                                            {ask.carbon_intensity_gco2_mj != null && (
                                                <span className={`ml-1.5 inline-flex items-center text-[11px] font-bold px-1 py-0.5 rounded-full ${
                                                    ask.carbon_intensity_gco2_mj < 30
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                                        : ask.carbon_intensity_gco2_mj <= 60
                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                                }`}>
                                                    {t('orderBook.ci')} {Math.round(ask.carbon_intensity_gco2_mj)}
                                                </span>
                                            )}
                                        </span>
                                        <span className="relative z-10 text-sm tabular-nums font-mono text-slate-500 dark:text-slate-400 text-right">
                                            {formatQty(ask.remaining_quantity_mt, locale)}
                                        </span>
                                        {onInstantTrade && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onInstantTrade(ask.id, 'BID', ask.price_per_mt_usd, ask.remaining_quantity_mt); }}
                                                className="relative z-10 ml-1 px-1.5 py-0.5 text-[11px] font-bold uppercase rounded bg-emerald-500/90 hover:bg-emerald-500 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                {t('orderBook.buy')}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="min-h-11 px-4 py-3" />
                                )}
                            </div>
                        );
                    })
                )}

                {hoverTooltip && createPortal(
                    <div
                        id={tooltipId}
                        role="tooltip"
                        className="pointer-events-none fixed z-[140] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/18 dark:border-slate-700 dark:bg-slate-950"
                        style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {formatMarketProduct(hoverTooltip.order.market_product || marketProduct || 'BIO_METHANOL')}
                            </span>
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                {hoverTooltip.order.side}
                            </span>
                        </div>
                        {isDemoMarketActivity(hoverTooltip.order) && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-200">
                                {t('marketplace.demo.tooltip')}
                            </div>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('marketplace.modal.certification')}</span>
                                <span>{hoverTooltip.order.certification_scheme || hoverTooltip.order.certifications?.[0] || t('orderPlaceModal.option.anyCertifiedScheme')}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.origin')}</span>
                                <span>{hoverTooltip.order.origin || t('common.notSpecified')}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.feedstock')}</span>
                                <span>{hoverTooltip.order.feedstock || t('common.notSpecified')}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderBook.ci')}</span>
                                <span>{hoverTooltip.order.carbon_intensity_gco2_mj != null ? Math.round(hoverTooltip.order.carbon_intensity_gco2_mj).toString() : t('common.notAvailable')}</span>
                            </div>
                        </div>
                        <div className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            {hoverTooltip.order.delivery_point_name || hoverTooltip.order.region} · {formatAvailabilityWindow(hoverTooltip.order.availability_window, locale)}
                        </div>
                    </div>,
                    document.body,
                )}
            </div>

            {/* Only live prices define the spread; demo liquidity and API cross metadata do not. */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800/30">
                <span className="text-slate-500 dark:text-slate-400">{t('orderBook.visibleRows', { count: MAX_ROWS })}</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                    {t('orderBook.liveSpread')}{' '}
                    <span className="font-mono font-bold tabular-nums">
                        {liveSpread == null ? '—' : liveSpread <= 0 ? t(b100Visible ? 'orderBook.priceOverlap' : 'orderBook.crossed') : `${formatPrice(liveSpread, locale)} / MT`}
                    </span>
                </span>
                {b100Visible && <p className="w-full text-slate-500 dark:text-slate-400">{t('orderBook.b100Compatibility')}</p>}
            </div>
        </div>
    );
};
