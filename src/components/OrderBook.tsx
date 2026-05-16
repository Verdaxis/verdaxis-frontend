import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Loader2, Zap } from 'lucide-react';
import { OrderBookOrder } from '../types';
import { api } from '../services/api';
import { useNamespace } from '../hooks/useNamespace';
import { Tooltip } from './ui/Tooltip';

interface OrderBookProps {
    fuelType?: string;
    marketProduct?: string;
    availability?: string;
    productLabel?: string;
    region?: string;
    actionableSide?: 'BID' | 'ASK';
    onPriceClick?: (side: 'BID' | 'ASK', price: number, fuelType?: string) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
    onLevelClick?: (order: OrderBookOrder) => void;
}

interface OrderBookRow extends OrderBookOrder {
    is_crossed?: boolean;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_ROWS = 15;

function formatPrice(price: number): string {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatQty(qty: number): string {
    return qty.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function getExecutableCrossState(bids: OrderBookRow[], asks: OrderBookRow[]) {
    const realBids = bids.filter(order => !order.is_demo_listing);
    const realAsks = asks.filter(order => !order.is_demo_listing);
    const bidIds = new Set<string>();
    const askIds = new Set<string>();

    for (const bid of realBids) {
        for (const ask of realAsks) {
            if (bid.price_per_mt_usd >= ask.price_per_mt_usd) {
                bidIds.add(bid.id);
                askIds.add(ask.id);
            }
        }
    }

    const bestRealBid = realBids[0] ?? null;
    const bestRealAsk = realAsks[0] ?? null;
    const spread = bestRealBid && bestRealAsk
        ? bestRealAsk.price_per_mt_usd - bestRealBid.price_per_mt_usd
        : null;
    const spreadPct = bestRealBid && spread != null && bestRealBid.price_per_mt_usd > 0
        ? (spread / bestRealBid.price_per_mt_usd) * 100
        : null;

    return {
        bidIds,
        askIds,
        hasCross: bidIds.size > 0 && askIds.size > 0,
        spread,
        spreadPct,
    };
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, marketProduct, availability, productLabel, region, actionableSide, onPriceClick, onInstantTrade, onLevelClick }) => {
    const { t, ready } = useNamespace('trading');
    const [bids, setBids] = useState<OrderBookRow[]>([]);
    const [asks, setAsks] = useState<OrderBookRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = {
                fuel_type: fuelType,
                market_product: marketProduct,
                availability,
                region,
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

            setBids(sortedBids);
            setAsks(sortedAsks);
        } catch (err: any) {
            if (!silent) setError(err?.message || 'Failed to load orderbook');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [availability, fuelType, marketProduct, region]);

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

    // Max quantity across both sides for depth bar scaling
    const maxQty = React.useMemo(() => {
        const allQtys = [...bids, ...asks].map(o => o.remaining_quantity_mt);
        return allQtys.length > 0 ? Math.max(...allQtys) : 1;
    }, [bids, asks]);

    const maxRows = Math.max(bids.length, asks.length);
    const executableCross = React.useMemo(() => getExecutableCrossState(bids, asks), [bids, asks]);

    if (!ready) return null;

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
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    {t('orderBook.title')}
                    {(productLabel || fuelType) && (
                        <span className="ml-2 text-xs font-semibold text-slate-400 normal-case">
                            — {productLabel || fuelType}
                        </span>
                    )}
                    {region && (
                        <span className="ml-1 text-xs font-semibold text-slate-400 normal-case">
                            · {region}
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
            <div className="flex-1 overflow-y-auto">
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
                        const bidCrossed = bid ? executableCross.bidIds.has(bid.id) : false;
                        const askCrossed = ask ? executableCross.askIds.has(ask.id) : false;

                        return (
                            <div key={i} className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                                {/* BID cell */}
                                {bid ? (
                                    <div
                                        onClick={() => {
                                            onPriceClick?.('ASK', bid.price_per_mt_usd, fuelType);
                                            if (!actionableSide || actionableSide === 'BID') onLevelClick?.(bid);
                                        }}
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer ${
                                            bidCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                        title={t('orderBook.clickToSell')}
                                    >
                                        {bid.is_demo_listing && (
                                            <Tooltip
                                                content={t('orderBook.demoListing.tooltip')}
                                                position="left"
                                                portal
                                                className="absolute left-1 top-1/2 z-20 -translate-y-1/2"
                                            >
                                                <span aria-label="Demo bid listing" className="text-amber-500 dark:text-amber-400">
                                                    <AlertTriangle size={10} />
                                                </span>
                                            </Tooltip>
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
                                                className="relative z-10 mr-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                Sell
                                            </button>
                                        )}
                                        <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400">
                                            {formatQty(bid.remaining_quantity_mt)}
                                        </span>
                                        <span className={`relative z-10 text-xs font-mono font-bold text-right ${
                                            bidCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            {bidCrossed && (
                                                <span className="mr-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />CROSS
                                                </span>
                                            )}
                                            {formatPrice(bid.price_per_mt_usd)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="px-4 py-1.5" />
                                )}

                                {/* ASK cell */}
                                {ask ? (
                                    <div
                                        onClick={() => {
                                            onPriceClick?.('BID', ask.price_per_mt_usd, fuelType);
                                            if (!actionableSide || actionableSide === 'ASK') onLevelClick?.(ask);
                                        }}
                                        className={`relative flex items-center justify-between px-4 py-1.5 border-b border-transparent dark:border-transparent group hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors cursor-pointer ${
                                            askCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                        }`}
                                        title={t('orderBook.clickToBuy')}
                                    >
                                        <div
                                            className={`absolute inset-y-0 left-0 pointer-events-none ${
                                                askCrossed ? 'bg-amber-200/40 dark:bg-amber-700/20' : 'bg-red-100/60 dark:bg-red-900/20'
                                            }`}
                                            style={{ width: `${askDepth}%` }}
                                        />
                                        {ask.is_demo_listing && (
                                            <Tooltip
                                                content={t('orderBook.demoListing.tooltip')}
                                                position="right"
                                                portal
                                                className="absolute right-1 top-1/2 z-20 -translate-y-1/2"
                                            >
                                                <span aria-label="Demo ask listing" className="text-amber-500 dark:text-amber-400">
                                                    <AlertTriangle size={10} />
                                                </span>
                                            </Tooltip>
                                        )}
                                        <span className={`relative z-10 text-xs font-mono font-bold ${
                                            askCrossed ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatPrice(ask.price_per_mt_usd)}
                                            {askCrossed && (
                                                <span className="ml-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                    <Zap size={8} className="mr-0.5" />CROSS
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
                                                    CI {Math.round(ask.carbon_intensity_gco2_mj)}
                                                </span>
                                            )}
                                        </span>
                                        <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400 text-right">
                                            {formatQty(ask.remaining_quantity_mt)}
                                        </span>
                                        {onInstantTrade && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onInstantTrade(ask.id, 'BID', ask.price_per_mt_usd, ask.remaining_quantity_mt); }}
                                                className="relative z-10 ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/90 hover:bg-emerald-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                Buy
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
            </div>

            {/* Spread footer */}
            {bids.length > 0 && asks.length > 0 && (() => {
                const spread = executableCross.spread ?? (asks[0].price_per_mt_usd - bids[0].price_per_mt_usd);
                const spreadPct = executableCross.spreadPct ?? (bids[0].price_per_mt_usd > 0 ? (spread / bids[0].price_per_mt_usd) * 100 : 0);
                const isExecutableCross = executableCross.hasCross;
                return (
                    <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{t('orderBook.spread')}</span>
                        <span className={`text-xs font-mono font-bold ${isExecutableCross ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {isExecutableCross ? (
                                <span className="flex items-center gap-1">
                                    <Zap size={10} className="text-amber-500" />
                                    {t('orderBook.crossed')}
                                </span>
                            ) : (
                                `${formatPrice(Math.max(spread, 0))} (${Math.max(spreadPct, 0).toFixed(2)}%)`
                            )}
                        </span>
                    </div>
                );
            })()}
        </div>
    );
};
