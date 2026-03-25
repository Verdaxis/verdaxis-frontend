import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader2, Zap } from 'lucide-react';
import { OrderBookOrder } from '../types';
import { api } from '../services/api';
import { useNamespace } from '../hooks/useNamespace';

interface OrderBookProps {
    fuelType?: string;
    region?: string;
    onPriceClick?: (side: 'BID' | 'ASK', price: number, fuelType?: string) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
}

interface OrderBookRow extends OrderBookOrder {
    is_crossed?: boolean;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_ROWS = 10;

function formatPrice(price: number): string {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatQty(qty: number): string {
    return qty.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, region, onPriceClick, onInstantTrade }) => {
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
    }, [fuelType, region]);

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
                    {fuelType && fuelType !== 'All' && (
                        <span className="ml-2 text-xs font-semibold text-slate-400 normal-case">
                            — {fuelType}
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

            {/* Two-column grid */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 flex-1 overflow-y-auto">
                {/* === BIDS === */}
                <div>
                    {/* Column header */}
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 border-b border-slate-200 dark:border-slate-700">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('orderBook.bids')}</span>
                        <span className="ml-auto text-[10px] text-slate-400 font-medium">{t('orderBook.buyPressure')}</span>
                    </div>

                    {/* Column sub-header */}
                    <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{t('orderBook.pricePerMt')}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase text-right">{t('orderBook.qtyMt')}</span>
                    </div>

                    {/* Rows */}
                    {bids.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-400">
                            {t('orderBook.noBids')}
                        </div>
                    ) : (
                        bids.map((bid) => {
                            const depthPct = maxQty > 0 ? (bid.remaining_quantity_mt / maxQty) * 100 : 0;
                            const isCrossed = (bid as any).is_crossed === true;
                            return (
                                <div
                                    key={bid.id}
                                    onClick={() => onPriceClick?.('ASK', bid.price_per_mt_usd, fuelType)}
                                    className={`relative flex items-center justify-between px-4 py-1.5 border-b border-slate-100/60 dark:border-slate-700/30 last:border-b-0 group hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer ${
                                        isCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                    }`}
                                    title={t('orderBook.clickToSell')}
                                >
                                    {/* Depth bar behind row */}
                                    <div
                                        className={`absolute inset-y-0 left-0 pointer-events-none ${
                                            isCrossed
                                                ? 'bg-amber-200/40 dark:bg-amber-700/20'
                                                : 'bg-emerald-100/60 dark:bg-emerald-900/20'
                                        }`}
                                        style={{ width: `${depthPct}%` }}
                                    />
                                    {/* Price */}
                                    <span className={`relative z-10 text-xs font-mono font-bold ${
                                        isCrossed
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                        {formatPrice(bid.price_per_mt_usd)}
                                        {isCrossed && (
                                            <span className="ml-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                <Zap size={8} className="mr-0.5" />
                                                CROSS
                                            </span>
                                        )}
                                    </span>
                                    {/* Quantity */}
                                    <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400 text-right">
                                        {formatQty(bid.remaining_quantity_mt)}
                                    </span>
                                    {/* Sell Now button */}
                                    {onInstantTrade && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onInstantTrade(bid.id, 'ASK', bid.price_per_mt_usd, bid.remaining_quantity_mt); }}
                                            className="relative z-10 ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            title={`Sell ${formatQty(bid.remaining_quantity_mt)} MT at ${formatPrice(bid.price_per_mt_usd)}`}
                                        >
                                            Sell
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* === ASKS === */}
                <div>
                    {/* Column header */}
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/20 border-b border-slate-200 dark:border-slate-700">
                        <TrendingDown size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('orderBook.asks')}</span>
                        <span className="ml-auto text-[10px] text-slate-400 font-medium">{t('orderBook.sellOffers')}</span>
                    </div>

                    {/* Column sub-header */}
                    <div className="grid grid-cols-2 px-4 py-1 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{t('orderBook.pricePerMt')}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase text-right">{t('orderBook.qtyMt')}</span>
                    </div>

                    {/* Rows */}
                    {asks.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-400">
                            {t('orderBook.noAsks')}
                        </div>
                    ) : (
                        asks.map((ask) => {
                            const depthPct = maxQty > 0 ? (ask.remaining_quantity_mt / maxQty) * 100 : 0;
                            const isCrossed = (ask as any).is_crossed === true;
                            return (
                                <div
                                    key={ask.id}
                                    onClick={() => onPriceClick?.('BID', ask.price_per_mt_usd, fuelType)}
                                    className={`relative flex items-center justify-between px-4 py-1.5 border-b border-slate-100/60 dark:border-slate-700/30 last:border-b-0 group hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors cursor-pointer ${
                                        isCrossed ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                    }`}
                                    title={t('orderBook.clickToBuy')}
                                >
                                    {/* Depth bar behind row */}
                                    <div
                                        className={`absolute inset-y-0 left-0 pointer-events-none ${
                                            isCrossed
                                                ? 'bg-amber-200/40 dark:bg-amber-700/20'
                                                : 'bg-red-100/60 dark:bg-red-900/20'
                                        }`}
                                        style={{ width: `${depthPct}%` }}
                                    />
                                    {/* Price */}
                                    <span className={`relative z-10 text-xs font-mono font-bold ${
                                        isCrossed
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {formatPrice(ask.price_per_mt_usd)}
                                        {isCrossed && (
                                            <span className="ml-1 inline-flex items-center text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">
                                                <Zap size={8} className="mr-0.5" />
                                                CROSS
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
                                    {/* Quantity */}
                                    <span className="relative z-10 text-xs font-mono text-slate-500 dark:text-slate-400 text-right">
                                        {formatQty(ask.remaining_quantity_mt)}
                                    </span>
                                    {/* Buy Now button */}
                                    {onInstantTrade && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onInstantTrade(ask.id, 'BID', ask.price_per_mt_usd, ask.remaining_quantity_mt); }}
                                            className="relative z-10 ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/90 hover:bg-emerald-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            title={`Buy ${formatQty(ask.remaining_quantity_mt)} MT at ${formatPrice(ask.price_per_mt_usd)}`}
                                        >
                                            Buy
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
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
                                `${formatPrice(spread)} (${spreadPct.toFixed(2)}%)`
                            )}
                        </span>
                    </div>
                );
            })()}
        </div>
    );
};
