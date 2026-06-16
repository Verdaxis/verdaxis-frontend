import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock3, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { TradeTapeEntry } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import { formatMarketProduct } from '../utils/marketProduct';

const FUEL_DOT_COLORS: Record<string, string> = {
    BIO_METHANOL: 'bg-violet-500',
    E_METHANOL: 'bg-cyan-500',
    BIO_ETHANOL: 'bg-orange-500',
    SYNTHETIC_ETHANOL: 'bg-amber-500',
    methanol: 'bg-violet-500',
    ethanol: 'bg-orange-500',
};

function getDotColor(entry: TradeTapeEntry): string {
    if (entry.market_product && FUEL_DOT_COLORS[entry.market_product]) return FUEL_DOT_COLORS[entry.market_product];
    return FUEL_DOT_COLORS[entry.fuel_type.toLowerCase()] ?? 'bg-slate-400';
}

function shortFuel(fuelType: string): string {
    const map: Record<string, string> = {
        methanol: 'Methanol',
        ethanol: 'Ethanol',
    };
    return map[fuelType.toLowerCase()] ?? fuelType;
}

function gradeTag(grade?: string): string {
    if (!grade) return '';
    const g = grade.toLowerCase();
    if (g === 'green') return 'Grn';
    if (g === 'bio') return 'Bio';
    if (g === 'conventional') return 'Conv';
    return grade.slice(0, 4);
}

function isDemoTapeEntry(entry: TradeTapeEntry): boolean {
    return entry.is_demo_trade === true || entry.provenance_kind === 'DEMO_SEED';
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

interface TradeTapeProps {
    fuelType?: string;
    marketProduct?: string;
    availability?: string;
    region?: string;
    deliveryPointId?: string;
}

export const TradeTape: React.FC<TradeTapeProps> = ({ fuelType, marketProduct, availability, region, deliveryPointId }) => {
    const { t, ready } = useNamespace('trading');
    const [trades, setTrades] = useState<TradeTapeEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.tradeTape.list({
                fuel_type: fuelType && fuelType !== 'All' ? fuelType : undefined,
                market_product: marketProduct,
                delivery_point_id: deliveryPointId || undefined,
                region: deliveryPointId ? undefined : region || undefined,
                availability_window: availability || undefined,
                limit: 20,
            });
            // Handle both response shapes
            const items: TradeTapeEntry[] = data.items ?? [];
            setTrades(Array.isArray(items) ? items : []);
            setTotal(data.total ?? items.length ?? 0);
        } catch {
            // Silently fail — tape is informational
            if (!silent) setTrades([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [availability, deliveryPointId, fuelType, marketProduct, region]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // 30s auto-refresh
    useEffect(() => {
        const iv = setInterval(() => fetchData(true), 30_000);
        return () => clearInterval(iv);
    }, [fetchData]);

    if (!ready) return null;

    if (loading) {
        return (
            <div className="v-glass px-4 py-2 mb-0 flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                {t('tradeTape.loading')}
            </div>
        );
    }

    return (
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col" data-tour="trade-tape">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        {t('tradeTape.title')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {total} {total !== 1 ? 'trades' : 'trade'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock3 size={11} className="text-slate-400" aria-hidden="true" />
                    <span className="text-[10px] text-slate-400 font-medium">
                        {deliveryPointId ? t('tradeTape.status.deliveryPointHistory') : t('tradeTape.status.regionHistory')}
                    </span>
                </div>
            </div>

            {/* Trade entries */}
            {trades.length === 0 ? (
                <div className="px-4 py-3 text-center text-xs text-slate-400">
                    {t('tradeTape.empty')}
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 flex-1 overflow-y-auto">
                    {trades.map(t2 => (
                        <div key={t2.id} className="flex items-center justify-between px-4 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(t2)}`} />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {t2.market_product ? formatMarketProduct(t2.market_product) : shortFuel(t2.fuel_type)}
                                    {t2.fuel_grade && (
                                        <span className="ml-1 text-slate-400 text-[10px]">{gradeTag(t2.fuel_grade)}</span>
                                    )}
                                    {isDemoTapeEntry(t2) && (
                                        <span
                                            className="ml-1 rounded border border-amber-300/60 bg-amber-50 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                                            aria-label="Demo trade seeded for platform preview. Not user-posted liquidity."
                                            title="Demo trade seeded for platform preview. Not user-posted liquidity."
                                        >
                                            Demo
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                    {t2.quantity_mt.toLocaleString()} MT
                                </span>
                                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    ${t2.price_per_mt_usd.toLocaleString()}/MT
                                </span>
                                <span className="text-[10px] text-slate-400 w-8 text-right">
                                    {relativeTime(t2.confirmed_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
