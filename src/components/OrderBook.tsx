import React, { useState, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, TrendingUp, TrendingDown, Loader2, Zap } from 'lucide-react';
import { OrderBookOrder } from '../types';
import { api } from '../services/api';
import { useNamespace } from '../hooks/useNamespace';
import { formatMarketProduct } from '../utils/marketProduct';
import { formatAvailabilityWindow } from '../utils/availabilityWindow';
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
        .filter(order => !order.is_demo_listing)
        .sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd);
    const realAsks = asks
        .filter(order => !order.is_demo_listing)
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
    };
}

function formatPrice(price: number, locale = 'en'): string {
    return `$${price.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatQty(qty: number, locale = 'en'): string {
    return qty.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, marketProduct, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade }) => {
    const { t, ready } = useNamespace('trading');
    const [bids, setBids] = useState<OrderBookRow[]>([]);
    const [asks, setAsks] = useState<OrderBookRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoverTooltip, setHoverTooltip] = useState<{ order: OrderBookOrder; x: number; y: number } | null>(null);
    const tooltipId = useId();

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = {
                fuel_type: fuelType,
                market_product: marketProduct as any,
                region: deliveryPointId ? undefined : region,
                delivery_point_id: deliveryPointId,
                availability,
            };
            const [rawBids, rawAsks] = await Promise.all([
                api.orderbook.listBids(params),
                api.orderbook.listAsks(params),
            ]);

            // Bids: highest price first (best bid at top)
            const sortedBids: OrderBookRow[] = [...rawBids]
                .sort((a: OrderBookOrder, b: OrderBookOrder) => b.price_per_mt_usd - a.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            // Asks: lowest price first (best ask at top)
            const sortedAsks: OrderBookRow[] = [...rawAsks]
                .sort((a: OrderBookOrder, b: OrderBookOrder) => a.price_per_mt_usd - b.price_per_mt_usd)
                .slice(0, MAX_ROWS);

            const crossState = getExecutableCrossState(sortedBids, sortedAsks);

            setBids(sortedBids.map(order => ({ ...order, is_crossed: crossState.bidIds.has(order.id) })));
            setAsks(sortedAsks.map(order => ({ ...order, is_crossed: crossState.askIds.has(order.id) })));
        } catch (err: any) {
            if (!silent) setError(i18n.language.startsWith('zh') ? t('orderBook.error') : err?.message || t('orderBook.error'));
        } finally {
            if (!silent) setLoading(false);
        }
    }, [fuelType, marketProduct, region, deliveryPointId, availability, t]);

    // Initial load + re-fetch when filters change
    useEffect(() => {
        setLoading(true);
        fetchData(false);
    }, [fetchData]);

    // 10-second polling
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Scale depth bars against the largest visible resting order so large positions still render proportionally.
    const maxQty = React.useMemo(() => {
        const allQtys = [...bids, ...asks].map(o => o.remaining_quantity_mt);
        return allQtys.length > 0 ? Math.max(...allQtys) : 1;
    }, [bids, asks]);

    const maxRows = Math.max(bids.length, asks.length);

    const showTooltipFromElement = useCallback((order: OrderBookOrder, element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeight = order.is_demo_listing ? 196 : 152;
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

    if (loading) {
        return (
            <div className="v-glass p-6 mb-0 flex items-center justify-center gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">{t('orderBook.loading')}</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="v-glass p-4 mb-0 text-center text-sm text-red-500 dark:text-red-400">
                {error}
            </div>
        );
    }

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
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-medium">{t('orderBook.live')}</span>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('orderBook.bids')}</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-medium">{t('orderBook.buyPressure')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/20">
                    <TrendingDown size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('orderBook.asks')}</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-medium">{t('orderBook.sellOffers')}</span>
                </div>
            </div>

            {/* Sub-headers */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('orderBook.qtyMt')}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-right">{t('orderBook.pricePerMt')}</span>
                </div>
                <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('orderBook.pricePerMt')}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-right">{t('orderBook.qtyMt')}</span>
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
                        const bidDepth = bid ? (bid.remaining_quantity_mt / maxQty) * 100 : 0;
                        const askDepth = ask ? (ask.remaining_quantity_mt / maxQty) * 100 : 0;
                        const bidCrossed = bid ? (bid as any).is_crossed === true : false;
                        const askCrossed = ask ? (ask as any).is_crossed === true : false;

                        const bidInteractive = actionableSide === 'BID';
                        const askInteractive = actionableSide === 'ASK';

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
                                            if (!bidInteractive) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onLevelClick?.(bid);
                                            }
                                        }}
                                        role={bidInteractive ? 'button' : undefined}
                                        tabIndex={bidInteractive ? 0 : undefined}
                                        aria-label={bidInteractive ? t('orderBook.openBid', { price: formatPrice(bid.price_per_mt_usd, locale), quantity: formatQty(bid.remaining_quantity_mt, locale) }) : undefined}
                                        aria-describedby={hoverTooltip?.order.id === bid.id ? tooltipId : undefined}
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors ${bidInteractive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70' : 'cursor-default'} ${
                                            bidCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                    >
                                        {bid.is_demo_listing && (
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
                                                className="relative z-10 mr-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
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
                                                <span className="mr-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
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
                                            if (!askInteractive) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onLevelClick?.(ask);
                                            }
                                        }}
                                        role={askInteractive ? 'button' : undefined}
                                        tabIndex={askInteractive ? 0 : undefined}
                                        aria-label={askInteractive ? t('orderBook.openAsk', { price: formatPrice(ask.price_per_mt_usd, locale), quantity: formatQty(ask.remaining_quantity_mt, locale) }) : undefined}
                                        aria-describedby={hoverTooltip?.order.id === ask.id ? tooltipId : undefined}
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors ${askInteractive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70' : 'cursor-default'} ${
                                            askCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                    >
                                        <div
                                            className={`absolute inset-y-0 left-0 pointer-events-none ${
                                                askCrossed ? 'bg-amber-200/40 dark:bg-amber-700/20' : 'bg-red-100/60 dark:bg-red-900/20'
                                            }`}
                                            style={{ width: `${askDepth}%` }}
                                        />
                                        {ask.is_demo_listing && (
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
                                                <span className="ml-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />{t('orderBook.cross')}
                                                </span>
                                            )}
                                            {ask.carbon_intensity_gco2_mj != null && (
                                                <span className={`ml-1.5 inline-flex items-center text-[9px] font-bold px-1 py-0.5 rounded-full ${
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
                                                className="relative z-10 ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/90 hover:bg-emerald-500 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
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
                        role="tooltip"
                        className="pointer-events-none fixed z-[140] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/18 dark:border-slate-700 dark:bg-slate-950"
                        style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {formatMarketProduct(hoverTooltip.order.market_product || marketProduct || 'BIO_METHANOL')}
                            </span>
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                {hoverTooltip.order.side}
                            </span>
                        </div>
                        {hoverTooltip.order.is_demo_listing && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-200">
                                {t('marketplace.demo.tooltip')}
                            </div>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('marketplace.modal.certification')}</span>
                                <span>{hoverTooltip.order.certification_scheme || hoverTooltip.order.certifications?.[0] || t('orderPlaceModal.option.anyCertifiedScheme')}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.origin')}</span>
                                <span>{hoverTooltip.order.origin || t('common.notSpecified')}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.feedstock')}</span>
                                <span>{hoverTooltip.order.feedstock || t('common.notSpecified')}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('orderBook.ci')}</span>
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

            {/* Spread footer */}
            {bids.length > 0 && asks.length > 0 && (() => {
                const bestBid = bids[0].price_per_mt_usd;
                const bestAsk = asks[0].price_per_mt_usd;
                const spread = bestAsk - bestBid;
                const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;
                return (
                    <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{t('orderBook.spread')}</span>
                        <span className={`text-xs font-mono font-bold ${spread <= 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {spread <= 0 ? (
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
