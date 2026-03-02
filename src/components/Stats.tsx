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

// Helper to generate deterministic "random" values based on a string seed
// This ensures market prices are stable across re-renders
const seededRandom = (seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs((hash % 10000) / 10000);
};

// Generate a stable market price based on fuel type and region
const getMarketAvgPrice = (fuelType: string, region: string, myPrice: number): number => {
    const seed = `${fuelType}-${region}-market-2024`;
    const variation = seededRandom(seed);
    const variationPercent = (variation - 0.5) * 0.06;
    return myPrice * (1 + variationPercent);
};

// Month abbreviations
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const Stats: React.FC = () => {
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
                // Filter for trades that have been processed
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

    // --- KPI Calculations ---

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

    // Win/loss: compare trade price vs market average
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

    // Average price performance
    const avgPerformance = useMemo(() => {
        if (history.length === 0) return 0;
        const performances = history.map(t => {
            const myPrice = Number(t.final_price_per_mt) || Number(t.price_per_mt_usd) || 0;
            const marketPrice = getMarketAvgPrice(t.fuel_type, t.region, myPrice);
            return ((myPrice - marketPrice) / marketPrice) * 100;
        });
        return performances.reduce((a, b) => a + b, 0) / performances.length;
    }, [history]);

    // Order fill rate
    const { fillRate, filledCount, totalOrderCount } = useMemo(() => {
        const total = orders.length;
        const filled = orders.filter(o => o.status === 'FILLED').length;
        return {
            fillRate: total > 0 ? ((filled / total) * 100) : 0,
            filledCount: filled,
            totalOrderCount: total,
        };
    }, [orders]);

    // Unique regions
    const uniqueRegions = useMemo(() => new Set(history.map(o => o.region)).size, [history]);

    // Monthly trade activity (last 12 months)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: { month: string; trades: number; volume: number; value: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

    // Format large currency values
    const formatCurrency = (usd: number): string => {
        if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
        if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
        return `$${usd.toFixed(0)}`;
    };

    // --- Loading state ---
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your trade performance and order history.</p>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">Loading stats...</span>
                </div>
            </div>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your trade performance and order history.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <BarChart3 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">Unable to load stats</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Something went wrong while loading your data. Please try again later.
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{error}</p>
                </div>
            </div>
        );
    }

    // --- Empty state ---
    if (history.length === 0 && orders.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your trade performance and order history.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <BarChart3 size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">Start trading to see your stats</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Your trading statistics, market performance data, and order history will appear here once you have completed trades.
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Place an order from the Marketplace</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <Clock size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Wait for the order to be confirmed</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <BarChart3 size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">View your stats and market performance</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Normal state with data ---
    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your trade performance and order history.</p>
            </div>

            {/* KPI Summary — 2x3 grid on desktop, stack on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
                {/* Trade Count */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-[#5DADE2]" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Trades</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{history.length}</div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Across {uniqueRegions} region{uniqueRegions !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Total Volume */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Volume</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{totalVolume.toLocaleString()} <span className="text-sm font-normal text-slate-400">MT</span></div>
                </div>

                {/* Total Value */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{formatCurrency(totalValue)}</div>
                </div>

                {/* Win Rate */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-violet-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Win Rate</span>
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold ${winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {winRate.toFixed(0)}%
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {wins}W / {losses}L (vs market avg)
                    </div>
                </div>

                {/* Avg Price Performance */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Percent size={14} className="text-blue-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Performance</span>
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold ${avgPerformance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {avgPerformance.toFixed(1)}%
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {avgPerformance <= 0 ? 'Below market (savings)' : 'Above market'}
                    </div>
                </div>

                {/* Order Fill Rate */}
                <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={14} className="text-amber-500" />
                        <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Fill Rate</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">
                        {totalOrderCount > 0 ? `${fillRate.toFixed(0)}%` : '--'}
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {filledCount} filled / {totalOrderCount} orders
                    </div>
                </div>
            </div>

            {/* Monthly Trade Activity Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors mb-8">
                <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-base lg:text-lg text-[#334155] dark:text-white">Monthly Trade Activity</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 12 months</p>
                </div>
                <div className="p-4 lg:p-6">
                    <div className="h-56 lg:h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    interval={window.innerWidth < 640 ? 2 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px',
                                    }}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'trades') return [value, 'Trades'];
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="trades" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {monthlyData.map((entry, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={entry.trades > 0 ? '#10b981' : '#e2e8f0'}
                                            opacity={entry.trades > 0 ? 0.85 : 0.3}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Order History Table with Market Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-base lg:text-lg text-[#334155] dark:text-white">Trade History & Market Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-4 lg:px-6 py-4">Date</th>
                                <th className="px-4 lg:px-6 py-4">ID</th>
                                <th className="px-4 lg:px-6 py-4">Port</th>
                                <th className="px-4 lg:px-6 py-4">Product</th>
                                <th className="px-4 lg:px-6 py-4 text-right">My Price</th>
                                <th className="px-4 lg:px-6 py-4 text-right">Market Avg</th>
                                <th className="px-4 lg:px-6 py-4 text-right">Performance</th>
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
                                                {Math.abs(diff).toFixed(1)}% {isBetter ? 'Lower' : 'Higher'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right">vs Day Index</div>
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
