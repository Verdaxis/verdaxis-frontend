import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';
import type { TFunction } from 'i18next';
import { OrderBookOrder } from '../../../types';
import { formatMarketProduct } from '../../../utils/marketProduct';
import { formatAvailabilityWindow } from '../../../utils/availabilityWindow';
import { isDemoMarketActivity } from '../../../utils/marketActivity';
import { getLivePriceCrossState } from '../api/livePriceCrossState';
import { SnapshotFreshness } from './SnapshotFreshness';
import { OrderBookTooltip, type OrderBookHoverTooltip } from './OrderBookTooltip';

const MAX_ROWS = 15;

interface OrderBookLadderProps {
    bids: OrderBookOrder[];
    asks: OrderBookOrder[];
    marketProduct?: string;
    region?: string;
    availability?: string;
    b100Selected: boolean;
    generatedAt: string | null;
    refreshing: boolean;
    error: string | null;
    actionableSide?: 'BID' | 'ASK';
    onLevelClick?: (order: OrderBookOrder) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
    hoverTooltip: OrderBookHoverTooltip | null;
    tooltipId: string;
    setHoverTooltip: (tooltip: OrderBookHoverTooltip | null) => void;
    showTooltipFromElement: (order: OrderBookOrder, element: HTMLDivElement) => void;
    fetchData: (force?: boolean) => Promise<void>;
    locale: string;
    t: TFunction<'trading'>;
}

function formatPrice(price: number, locale = 'en'): string {
    return Number.isFinite(price) ? `$${price.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—';
}

function formatQty(qty: number, locale = 'en'): string {
    return Number.isFinite(qty) ? qty.toLocaleString(locale, { maximumFractionDigits: 2 }) : '—';
}

export const OrderBookLadder = ({ bids, asks, marketProduct, region, availability, b100Selected, generatedAt, refreshing, error, actionableSide, onLevelClick, onInstantTrade, hoverTooltip, tooltipId, setHoverTooltip, showTooltipFromElement, fetchData, locale, t }: OrderBookLadderProps) => {
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
    const bioLngVisible = marketProduct === 'BIO_LNG' || [...bids, ...asks].some(order => order.market_product === 'BIO_LNG');
    return (
        <>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {marketProduct ? formatMarketProduct(marketProduct) : t('orderBook.title')}
                    {region && <span> · {region}</span>}
                    {availability && <span> · {formatAvailabilityWindow(availability, locale)}</span>}
                </h2>
                <div className="flex items-center gap-2">
                    <SnapshotFreshness generatedAt={generatedAt} refreshing={refreshing} error={error} />
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

                {hoverTooltip && <OrderBookTooltip hoverTooltip={hoverTooltip} tooltipId={tooltipId} marketProduct={marketProduct} locale={locale} t={t} />}
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
                {bioLngVisible && <p className="w-full text-sky-600 dark:text-sky-400">{t('orderBook.bioLngCompatibility')}</p>}
            </div>
        </>
    );
};
