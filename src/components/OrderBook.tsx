import React, { useState, useEffect, useCallback, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, TrendingUp, TrendingDown, Loader2, RefreshCw, Zap } from 'lucide-react';
import { OrderBookOrder } from '../types';
import { api } from '../services/api';
import { useNamespace } from '../hooks/useNamespace';
import { formatMarketProduct } from '../utils/marketProduct';
import { getBiofuelSpecification } from '../utils/biofuelSpecification';
import { formatAvailabilityWindow } from '../utils/availabilityWindow';
import { isDemoMarketActivity } from '../utils/marketActivity';
import i18n from '../i18n';

interface OrderBookProps {
    fuelType?: string;
    marketProduct?: string;
    region?: string;
    deliveryPointId?: string;
    availability?: string;
    actionableSide?: 'BID' | 'ASK';
    onLevelClick?: (order: OrderBookOrder) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
}

interface OrderBookRow extends OrderBookOrder {
    is_crossed?: boolean;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_ROWS = 15;

export function getExecutableCrossState(bids: OrderBookOrder[], asks: OrderBookOrder[]) {
    const realBids = bids
        .filter(order => !isDemoMarketActivity(order))
        .sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd);
    const realAsks = asks
        .filter(order => !isDemoMarketActivity(order))
        .sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd);

    const bestBid = realBids[0];
    const bestAsk = realAsks[0];
    const hasCross = Boolean(bestBid && bestAsk && bestBid.price_per_mt_usd >= bestAsk.price_per_mt_usd);
    const bidIds = new Set<string>();
    const askIds = new Set<string>();

    if (hasCross && bestBid && bestAsk) {
        realBids
            .filter(order => order.price_per_mt_usd >= bestAsk.price_per_mt_usd)
            .forEach(order => bidIds.add(order.id));
        realAsks
            .filter(order => order.price_per_mt_usd <= bestBid.price_per_mt_usd)
            .forEach(order => askIds.add(order.id));
    }

    return {
        hasCross,
        bidIds,
        askIds,
        spread: bestBid && bestAsk ? bestAsk.price_per_mt_usd - bestBid.price_per_mt_usd : null,
        bestBidPrice: bestBid?.price_per_mt_usd ?? null,
    };
}

function formatPrice(price: number, locale = 'en'): string {
    return `$${price.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatQty(qty: number, locale = 'en'): string {
    const value = Number(qty);
    return Number.isFinite(value) ? value.toLocaleString(locale, { maximumFractionDigits: 2 }) : '—';
}

export const OrderBook: React.FC<OrderBookProps> = ({ marketProduct, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade }) => {
    const { t, ready } = useNamespace('trading');
    const [bids, setBids] = useState<OrderBookRow[]>([]);
    const [asks, setAsks] = useState<OrderBookRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [clock, setClock] = useState(() => Date.now());
    const [hoverTooltip, setHoverTooltip] = useState<{ order: OrderBookOrder; x: number; y: number } | null>(null);
    const tooltipId = useId();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const requestGeneration = useRef(0);
    const latestRequest = useRef(0);
    const requestsInFlight = useRef(new Map<string, { token: symbol; forced: boolean }>());
    const hasSnapshot = useRef(false);
    const requestScope = JSON.stringify([marketProduct, deliveryPointId, availability]);
    const currentRequestScope = useRef(requestScope);
    currentRequestScope.current = requestScope;

    const fetchData = useCallback(async (force = false) => {
        if (!marketProduct || !deliveryPointId || !availability) return;
        const activeRequest = requestsInFlight.current.get(requestScope);
        if (activeRequest && (!force || activeRequest.forced)) return;
        const requestToken = Symbol(requestScope);
        requestsInFlight.current.set(requestScope, { token: requestToken, forced: force });
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
            if (generation !== requestGeneration.current || requestId !== latestRequest.current || requestScope !== currentRequestScope.current) return;

            // Bids: highest price first (best bid at top)
            const sortedBids: OrderBookRow[] = [...snapshot.bids]
                .sort((a: OrderBookOrder, b: OrderBookOrder) => b.price_per_mt_usd - a.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            // Asks: lowest price first (best ask at top)
            const sortedAsks: OrderBookRow[] = [...snapshot.asks]
                .sort((a: OrderBookOrder, b: OrderBookOrder) => a.price_per_mt_usd - b.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            const crossState = getExecutableCrossState(sortedBids, sortedAsks);

            setBids(sortedBids.map(order => ({ ...order, is_crossed: crossState.bidIds.has(order.id) })));
            setAsks(sortedAsks.map(order => ({ ...order, is_crossed: crossState.askIds.has(order.id) })));
            setGeneratedAt(snapshot.generated_at);
            setClock(Date.now());
            hasSnapshot.current = true;
        } catch {
            if (generation === requestGeneration.current && requestId === latestRequest.current && requestScope === currentRequestScope.current) {
                setError(t('orderBook.error'));
            }
        } finally {
            if (requestsInFlight.current.get(requestScope)?.token === requestToken) requestsInFlight.current.delete(requestScope);
            if (generation === requestGeneration.current && requestId === latestRequest.current && requestScope === currentRequestScope.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [availability, deliveryPointId, marketProduct, requestScope, t]);

    // Initial load + re-fetch when filters change
    useEffect(() => {
        requestGeneration.current += 1;
        hasSnapshot.current = false;
        setBids([]);
        setAsks([]);
        setGeneratedAt(null);
        setError(null);
        setLoading(true);
        if (!marketProduct || !deliveryPointId || !availability) {
            setLoading(false);
            setError(t('orderBook.error'));
        } else if (!document.hidden) {
            void fetchData();
        }
        return () => {
            requestGeneration.current += 1;
            requestsInFlight.current.delete(requestScope);
        };
    }, [availability, deliveryPointId, fetchData, marketProduct, requestScope, t]);

    // Poll through the 10-second cache. A visibility/network resume bypasses it.
    useEffect(() => {
        const pollWhenVisible = () => {
            if (!document.hidden) void fetchData();
        };
        const refreshAfterResume = () => {
            if (!document.hidden) void fetchData(true);
        };
        const interval = window.setInterval(pollWhenVisible, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', refreshAfterResume);
        window.addEventListener('online', refreshAfterResume);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshAfterResume);
            window.removeEventListener('online', refreshAfterResume);
        };
    }, [fetchData]);

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
    const liveCrossState = getExecutableCrossState(bids, asks);
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

    // Supplier specifications vary by fuel and language; clamp the rendered tooltip.
    useLayoutEffect(() => {
        if (!hoverTooltip || !tooltipRef.current) return;
        const { width, height } = tooltipRef.current.getBoundingClientRect();
        const padding = 16;
        const x = Math.max(padding, Math.min(hoverTooltip.x, window.innerWidth - width - padding));
        const y = Math.max(padding, Math.min(hoverTooltip.y, window.innerHeight - height - padding));
        if (x !== hoverTooltip.x || y !== hoverTooltip.y) {
            setHoverTooltip(current => current ? { ...current, x, y } : null);
        }
    }, [hoverTooltip, t]);

    if (!ready) return null;
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

    if (loading) {
        return (
            <div className="v-glass p-6 mb-0 flex items-center justify-center gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">{t('orderBook.loading')}</span>
            </div>
        );
    }

    if (error && generatedAt === null) {
        return (
            <div className="v-glass p-4 mb-0 text-center text-sm text-red-500 dark:text-red-400" role="alert">
                <p>{t('orderBook.unavailable')}</p>
                <button
                    type="button"
                    onClick={() => void fetchData(true)}
                    className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
                >
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    {t('orderBook.title')}
                    {marketProduct && (
                        <span className="ml-2 text-xs font-semibold text-slate-400 normal-case">
                            — {formatMarketProduct(marketProduct)}
                        </span>
                    )}
                    {region && (
                        <span className="ml-1 text-xs font-semibold text-slate-400 normal-case">
                            · {region}
                        </span>
                    )}
                    {availability && (
                        <span className="ml-1 text-xs font-semibold text-slate-400 normal-case">
                            · {formatAvailabilityWindow(availability, locale)}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    <span
                        role={error ? 'alert' : 'status'}
                        data-testid="orderbook-freshness"
                        className={`text-[11px] font-medium ${freshnessTone}`}
                    >
                        {freshnessText}
                    </span>
                    <button
                        type="button"
                        aria-label={t('orderBook.refresh')}
                        onClick={() => void fetchData(true)}
                        disabled={refreshing}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-wait dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                        <RefreshCw size={13} className={refreshing ? 'animate-spin' : undefined} />
                    </button>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('orderBook.bids')}</span>
                    <span className="ml-auto text-[11px] text-slate-400 font-medium">{t('orderBook.buyPressure')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/20">
                    <TrendingDown size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('orderBook.asks')}</span>
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
                        const bidCrossed = bid ? (bid as any).is_crossed === true : false;
                        const askCrossed = ask ? (ask as any).is_crossed === true : false;

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
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${bidInteractive ? 'cursor-pointer' : 'cursor-default'} ${
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
                                        <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400">
                                            {formatQty(bid.remaining_quantity_mt, locale)}
                                        </span>
                                        <span className={`relative z-10 text-xs font-mono font-bold text-right ${
                                            bidCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            {bidCrossed && (
                                                <span className="mr-1 inline-flex items-center text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />{t('orderBook.cross')}
                                                </span>
                                            )}
                                            {formatPrice(bid.price_per_mt_usd, locale)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="px-4 py-1.5" />
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
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 ${askInteractive ? 'cursor-pointer' : 'cursor-default'} ${
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
                                        <span className={`relative z-10 text-xs font-mono font-bold ${
                                            askCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatPrice(ask.price_per_mt_usd, locale)}
                                            {askCrossed && (
                                                <span className="ml-1 inline-flex items-center text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />{t('orderBook.cross')}
                                                </span>
                                            )}
                                            {ask.carbon_intensity_gco2_mj != null && (
                                                <span className={`ml-1.5 inline-flex items-center text-[11px] font-bold px-1 py-0.5 rounded-full ${
                                                    ask.carbon_intensity_gco2_mj < 30
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                                        : ask.carbon_intensity_gco2_mj <= 60
                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                                }`}>
                                                    {t('orderBook.ci')} {Math.round(ask.carbon_intensity_gco2_mj)}
                                                </span>
                                            )}
                                        </span>
                                        <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400 text-right">
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
                                    <div className="px-4 py-1.5" />
                                )}
                            </div>
                        );
                    })
                )}

                {hoverTooltip && createPortal(
                    <div
                        id={tooltipId}
                        ref={tooltipRef}
                        role="tooltip"
                        className="pointer-events-none fixed z-[140] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/18 dark:border-slate-700 dark:bg-slate-950"
                        style={{ left: hoverTooltip.x, top: hoverTooltip.y, maxWidth: 'calc(100vw - 32px)' }}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {formatMarketProduct(hoverTooltip.order.market_product || marketProduct || 'BIO_METHANOL')}
                            </span>
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                {hoverTooltip.order.side}
                            </span>
                        </div>
                        {getBiofuelSpecification(hoverTooltip.order.market_product || marketProduct) && (
                            <p className="mt-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{t(`${(hoverTooltip.order.market_product || marketProduct)?.toLowerCase()}.contract`)}</p>
                        )}
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
                                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t(getBiofuelSpecification(hoverTooltip.order.market_product || marketProduct) ? `${(hoverTooltip.order.market_product || marketProduct)?.toLowerCase()}.wholeBlendCiLabel` : 'orderBook.ci')}</span>
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

            {/* Only executable orders define the spread, never demo liquidity. */}
            {liveCrossState.spread !== null && liveCrossState.bestBidPrice !== null && (() => {
                const spread = liveCrossState.spread;
                const spreadPct = liveCrossState.bestBidPrice > 0
                    ? (spread / liveCrossState.bestBidPrice) * 100
                    : 0;
                return (
                    <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('orderBook.spread')}</span>
                        <span className={`text-xs font-mono font-bold ${liveCrossState.hasCross ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {liveCrossState.hasCross ? (
                                <span className="flex items-center gap-1">
                                    <Zap size={10} className="text-amber-500" />
                                    {t('orderBook.crossed')}
                                </span>
                            ) : (
                                `${formatPrice(spread, locale)} (${spreadPct.toFixed(2)}%)`
                            )}
                        </span>
                    </div>
                );
            })()}
        </div>
    );
};
