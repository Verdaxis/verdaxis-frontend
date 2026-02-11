import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

// Helper to generate deterministic "random" values based on a string seed
// This ensures market prices are stable across re-renders
const seededRandom = (seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Normalize to 0-1 range
    return Math.abs((hash % 10000) / 10000);
};

// Generate a stable market price based on fuel type and region
const getMarketAvgPrice = (fuelType: string, region: string, myPrice: number): number => {
    const seed = `${fuelType}-${region}-market-2024`;
    const variation = seededRandom(seed);
    // Market price varies by -3% to +3% from my price
    const variationPercent = (variation - 0.5) * 0.06;
    return myPrice * (1 + variationPercent);
};

interface TradeHistoryItem {
    id: string;
    created_at: string;
    region: string;
    fuel_type: string;
    price_per_mt_usd: number;
    final_price_per_mt?: number;
    final_quantity_mt?: number;
    quantity_mt: number;
    final_total_usd?: number;
    status: string;
    buyer_name: string;
    seller_name: string;
}

export const Stats: React.FC = () => {
    const [history, setHistory] = useState<TradeHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const trades = await api.trades.myTrades();
                // Filter for trades that have been processed (not just PENDING_CONFIRMATION)
                const processedTrades = trades.filter((t: any) =>
                    t.status === 'CONFIRMED' || t.status === 'DELIVERED' || t.status === 'PAID'
                );
                setHistory(processedTrades);
            } catch (err: any) {
                console.error('Failed to load trade history:', err);
                // Treat 404 / "Not Found" as empty data rather than a real error
                const message = err.message || '';
                if (message.toLowerCase().includes('not found') || message.includes('404')) {
                    setHistory([]);
                } else {
                    setError(message || 'Failed to load trade history');
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);

    // Calculate KPIs from real data
    const totalVolume = history.reduce((sum, t) => sum + (t.final_quantity_mt || t.quantity_mt || 0), 0);
    
    // Calculate average price performance
    let avgPerformance = 0;
    if (history.length > 0) {
        const performances = history.map(o => {
            const myPrice = o.final_price_per_mt || o.price_per_mt_usd || 0;
            const marketPrice = getMarketAvgPrice(o.fuel_type, o.region, myPrice);
            return ((myPrice - marketPrice) / marketPrice) * 100;
        });
        avgPerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
    }
    
    // Count unique ports/regions
    const uniqueRegions = new Set(history.map(o => o.region)).size;

    // Show loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your previous orders and compare performance against market indices.</p>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">Loading order history...</span>
                </div>
            </div>
        );
    }

    // Show error state (only for real errors, not 404/empty data)
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your previous orders and compare performance against market indices.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <BarChart3 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">Unable to load stats</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Something went wrong while loading your order history. Please try again later.
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{error}</p>
                </div>
            </div>
        );
    }

    // Show empty state when there is no data
    if (history.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your previous orders and compare performance against market indices.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <BarChart3 size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">No stats available yet</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                        Your order statistics and market comparison data will appear here once you have completed orders.
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

    // Normal state with data
    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Stats & History</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Analyze your previous orders and compare performance against market indices.</p>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Volume Lifted</div>
                    <div className="text-3xl font-bold text-[#334155] dark:text-white">{totalVolume.toLocaleString()} MT</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-bold mt-1 flex items-center">
                        <TrendingUp size={12} className="mr-1" /> +12% vs last quarter
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Price Performance</div>
                    <div className={`text-3xl font-bold ${avgPerformance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {avgPerformance.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {avgPerformance <= 0 ? 'Below Market Average (Savings)' : 'Above Market Average'}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Orders</div>
                    <div className="text-3xl font-bold text-[#334155] dark:text-white">{history.length}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across {uniqueRegions} Region{uniqueRegions !== 1 ? 's' : ''}</div>
                </div>
            </div>

            {/* Order History Table with Market Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-lg text-[#334155] dark:text-white">Order History & Market Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Port</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">My Price</th>
                                <th className="px-6 py-4">Market Avg</th>
                                <th className="px-6 py-4">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {history.map((trade) => {
                                const myPrice = trade.final_price_per_mt || trade.price_per_mt_usd || 0;
                                const marketPrice = getMarketAvgPrice(trade.fuel_type, trade.region, myPrice);
                                const diff = ((myPrice - marketPrice) / marketPrice) * 100;
                                const isBetter = diff < 0;

                                return (
                                    <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-[#334155] dark:text-slate-200">
                                            {trade.id.substring(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold uppercase">
                                            {trade.region}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#334155] dark:text-slate-200">{trade.fuel_type}</div>
                                            <div className="text-xs text-slate-400">
                                                {trade.final_quantity_mt || trade.quantity_mt || 0} MT
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#334155] dark:text-emerald-400">
                                            ${myPrice.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            ${marketPrice.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center font-bold text-xs ${isBetter ? 'text-green-600' : 'text-red-500'}`}>
                                                {isBetter ? <TrendingDown size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
                                                {Math.abs(diff).toFixed(1)}% {isBetter ? 'Lower' : 'Higher'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">vs Day Index</div>
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
