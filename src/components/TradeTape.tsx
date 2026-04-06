import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { TradeTapeEntry } from '../types';
import { useNamespace } from '../hooks/useNamespace';

const FUEL_DOT_COLORS: Record<string, string> = {
    methanol: 'bg-violet-500',
    ethanol: 'bg-orange-500',
    biofuel: 'bg-green-500',
    ammonia: 'bg-teal-500',
};

function getDotColor(fuelType: string): string {
    return FUEL_DOT_COLORS[fuelType.toLowerCase()] ?? 'bg-slate-400';
}

function shortFuel(fuelType: string): string {
    const map: Record<string, string> = {
        methanol: 'Methanol',
        ethanol: 'Ethanol',
        biofuel: 'Biofuel',
        ammonia: 'Ammonia',
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
    region?: string;
}

export const TradeTape: React.FC<TradeTapeProps> = ({ fuelType, region }) => {
    const { t, ready } = useNamespace('trading');
    const [trades, setTrades] = useState<TradeTapeEntry[]>([]);
    const [marketOpen, setMarketOpen] = useState(false);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.tradeTape.list({
                fuel_type: fuelType && fuelType !== 'All' ? fuelType : undefined,
                region: region || undefined,
                limit: 20,
            });
            // Handle both response shapes
            const items: TradeTapeEntry[] = data.items ?? [];
            setTrades(Array.isArray(items) ? items : []);
            setMarketOpen(data.market_hours ?? false);
            setTotal(data.total ?? items.length ?? 0);
        } catch {
            // Silently fail — tape is informational
            if (!silent) setTrades([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [fuelType, region]);

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
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col">
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
                    <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-[10px] text-slate-400 font-medium">
                        {marketOpen ? t('tradeTape.market.open') : t('tradeTape.market.closed')}
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
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(t2.fuel_type)}`} />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {shortFuel(t2.fuel_type)}
                                    {t2.fuel_grade && (
                                        <span className="ml-1 text-slate-400 text-[10px]">{gradeTag(t2.fuel_grade)}</span>
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
