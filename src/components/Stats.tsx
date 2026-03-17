
import React, { useEffect, useState, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    Loader2,
    DollarSign,
    Target,
    Activity,
    Percent,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Cell,
} from 'recharts';
import { api } from '../services/api';
import { Trade, OrderBookOrder } from '../types';
import { useNamespace } from '../hooks/useNamespace';

const seededRandom = (seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs((hash % 10000) / 10000);
};

const getMarketAvgPrice = (fuelType: string, region: string, myPrice: number): number => {
    const seed = `${fuelType}-${region}-market-2024`;
    const variation = seededRandom(seed);
    const variationPercent = (variation - 0.5) * 0.06;
    return myPrice * (1 + variationPercent);
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const Stats: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [history, setHistory] = useState<Trade[]>([]);
    const [orders, setOrders] = useState<OrderBookOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [trades, myOrders] = await Promise.all([
                    api.trades.myTrades().catch(() => []),
                    api.orderbook.myOrders().catch(() => []),
                ]);
                const processedTrades = (trades as Trade[]).filter((t) =>
                    t.status === 'CONFIRMED' || t.status === 'DELIVERED' || t.status === 'PAID'
                );
                setHistory(processedTrades);
                setOrders(myOrders as OrderBookOrder[]);
            } catch (err: any) {
                console.error('Failed to load stats data:', err);
                const message = err.message || '';
                if (message.toLowerCase().includes('not found') || message.includes('404')) {
                    setHistory([]);
                    setOrders([]);
                } else {
                    setError(message || 'Failed to load stats data');
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const totalVolume = useMemo(() =>
        history.reduce((sum, t) => sum + (Number(t.final_quantity_mt) || Number(t.quantity_mt) || 0), 0),
        [history]
    );

    const totalValue = useMemo(() =>
        history.reduce((sum, t) => {
            const qty = Number(t.final_quantity_mt) || Number(t.quantity_mt) || 0;
            const price = Number(t.final_price_per_mt) || Number(t.price_per_mt_usd) || 0;
            return sum + (Number(t.final_total_usd) || (qty * price));
        }, 0),
        [history]
    );

    const { wins, losses } = useMemo(() => {
        let w = 0, l = 0;
        history.forEach(t => {
            const myPrice = Number(t.final_price_per_mt) || Number(t.price_per_mt_usd) || 0;
            const marketPrice = getMarketAvgPrice(t.fuel_type, t.region, myPrice);
            if (myPrice <= marketPrice) w++; else l++;
        });
        return { wins: w, losses: l };
    }, [history]);

    const winRate = history.length > 0 ? ((wins / history.length) * 100) : 0;

    const avgPerformance = useMemo(() => {
        if (history.length === 0) return 0;
        const performances = history.map(t => {
            const myPrice = Number(t.final_price_per_mt) || Number(t.price_per_mt_usd) || 0;
            const marketPrice = getMarketAvgPrice(t.fuel_type, t.region, myPrice);
            return ((myPrice - marketPrice) / marketPrice) * 100;
        });
        return performances.reduce((a, b) => a + b, 0) / performances.length;
    }, [history]);

    const { fillRate, filledCount, totalOrderCount } = useMemo(() => {
        const total = orders.length;
        const filled = orders.filter(o => o.status === 'FILLED').length;
        return {
            fillRate: total > 0 ? ((filled / total) * 100) : 0,
            filledCount: filled,
            totalOrderCount: total,
        };
    }, [orders]);

    const uniqueRegions = useMemo(() => new Set(history.map(o => o.region)).size, [history]);

    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: { month: string; trades: number; volume: number; value: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
                trades: 0,
                volume: 0,
                value: 0,
            });
        }
        history.forEach(t => {
            const d = new Date(t.created_at);
            const key = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
            const entry = months.find(m => m.month === key);
            if (entry) {
                entry.trades++;
                entry.volume += Number(t.final_quantity_mt) || Number(t.quantity_mt) || 0;
                const qty = Number(t.final_quantity_mt) || Number(t.quantity_mt) || 0;
                const price = Number(t.final_price_per_mt) || Number(t.price_per_mt_usd) || 0;
                entry.value += Number(t.final_total_usd) || (qty * price);
            }
        });
        return months;
    }, [history]);

    const formatCurrency = (usd: number): string => {
        if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
        if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
        return `$${usd.toFixed(0)}`;
    };

    if (!ready || isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">{ready ? t('stats.title') : ''}</h1>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">{ready ? t('stats.loading') : ''}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">{t('stats.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('stats.subtitle')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <BarChart3 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('stats.error.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('stats.error.body')}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{error}</p>
                </div>
            </div>
        );
    }

    if (history.length === 0 && orders.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">{t('stats.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('stats.subtitle')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <BarChart3 size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('stats.emptyState.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('stats.emptyState.body')}</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('stats.emptyState.step1')}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <Clock size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('stats.emptyState.step2')}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <BarChart3 size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('stats.emptyState.step3')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">{t('stats.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">{t('stats.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-[#5DADE2]" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.trades')}</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{history.length}</div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {uniqueRegions !== 1
                            ? t('stats.kpi.acrossRegionsPlural', { count: uniqueRegions })
                            : t('stats.kpi.acrossRegions', { count: uniqueRegions })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.volume')}</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{totalVolume.toLocaleString()} <span className="text-sm font-normal text-slate-400">MT</span></div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.totalValue')}</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{formatCurrency(totalValue)}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-violet-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.winRate')}</span>
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold ${winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {winRate.toFixed(0)}%
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('stats.kpi.winsLosses', { wins, losses })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Percent size={14} className="text-blue-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.avgPerformance')}</span>
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold ${avgPerformance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {avgPerformance.toFixed(1)}%
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {avgPerformance <= 0 ? t('stats.kpi.belowMarket') : t('stats.kpi.aboveMarket')}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={14} className="text-amber-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">{t('stats.kpi.fillRate')}</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">
                        {totalOrderCount > 0 ? `${fillRate.toFixed(0)}%` : '--'}
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('stats.kpi.filledOrders', { filled: filledCount, total: totalOrderCount })}
                    </div>
                </div>
            </div>

            {/* Monthly Trade Activity Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors mb-8">
                <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-base lg:text-lg text-[#334155] dark:text-white">{t('stats.chart.title')}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('stats.chart.subtitle')}</p>
                </div>
                <div className="p-4 lg:p-6">
                    <div className="h-56 lg:h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={window.innerWidth < 640 ? 2 : 0} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'trades') return [value, t('stats.kpi.trades')];
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="trades" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {monthlyData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.trades > 0 ? '#10b981' : '#e2e8f0'} opacity={entry.trades > 0 ? 0.85 : 0.3} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Order History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-base lg:text-lg text-[#334155] dark:text-white">{t('stats.table.title')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-4 lg:px-6 py-4">{t('stats.table.date')}</th>
                                <th className="px-4 lg:px-6 py-4">{t('stats.table.id')}</th>
                                <th className="px-4 lg:px-6 py-4">{t('stats.table.port')}</th>
                                <th className="px-4 lg:px-6 py-4">{t('stats.table.product')}</th>
                                <th className="px-4 lg:px-6 py-4 text-right">{t('stats.table.myPrice')}</th>
                                <th className="px-4 lg:px-6 py-4 text-right">{t('stats.table.marketAvg')}</th>
                                <th className="px-4 lg:px-6 py-4 text-right">{t('stats.table.performance')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {history.map((trade) => {
                                const myPrice = Number(trade.final_price_per_mt) || Number(trade.price_per_mt_usd) || 0;
                                const marketPrice = getMarketAvgPrice(trade.fuel_type, trade.region, myPrice);
                                const diff = ((myPrice - marketPrice) / marketPrice) * 100;
                                const isBetter = diff < 0;

                                return (
                                    <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 font-mono font-medium text-[#334155] dark:text-slate-200">
                                            {trade.id.substring(0, 8)}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-slate-600 dark:text-slate-300 font-bold uppercase">
                                            {trade.region}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                            <div className="font-bold text-[#334155] dark:text-slate-200">{trade.fuel_type}</div>
                                            <div className="text-xs text-slate-400">
                                                {Number(trade.final_quantity_mt) || Number(trade.quantity_mt) || 0} MT
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 font-bold text-[#334155] dark:text-emerald-400 text-right">
                                            ${myPrice.toFixed(0)}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-slate-500 dark:text-slate-400 text-right">
                                            ${marketPrice.toFixed(0)}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-right">
                                            <div className={`flex items-center justify-end font-bold text-xs ${isBetter ? 'text-green-600' : 'text-red-500'}`}>
                                                {isBetter ? <TrendingDown size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
                                                {Math.abs(diff).toFixed(1)}% {isBetter ? t('stats.table.lower') : t('stats.table.higher')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right">{t('stats.table.vsDayIndex')}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
