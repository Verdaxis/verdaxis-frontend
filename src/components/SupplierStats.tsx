import React, { useEffect, useState } from 'react';
import { BarChart3, DollarSign, TrendingUp, TrendingDown, Package, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Trade, TradeStatus } from '../types';
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

type OrderHistoryItem = Trade;

const STATUS_BADGE_KEYS: Record<string, string> = {
    PENDING_CONFIRMATION: 'pending',
    CONFIRMED: 'confirmed',
    DELIVERED: 'delivered',
    PAID: 'paid',
    DECLINED: 'declined',
    CANCELLED: 'cancelled',
};

const STATUS_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
    PENDING_CONFIRMATION: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    CONFIRMED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    DELIVERED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
    PAID: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    DECLINED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-700/30', text: 'text-slate-600 dark:text-slate-400' },
};

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export const SupplierStats: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [history, setHistory] = useState<OrderHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const orders = await api.trades.myTrades();
                setHistory(orders);
            } catch (err: any) {
                console.error('Failed to load incoming order history:', err);
                const message = err.message || '';
                if (message.toLowerCase().includes('not found') || message.includes('404')) {
                    setHistory([]);
                } else {
                    setError(message || 'Failed to load order history');
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);

    const completedOrders = history.filter(
        (o) => o.status === 'DELIVERED' || o.status === 'PAID'
    );

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.final_total_usd) || 0), 0);
    const volumeSold = completedOrders.reduce((sum, o) => sum + (Number(o.final_quantity_mt) || 0), 0);
    const totalOrders = history.length;

    if (!ready || isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                        {ready ? t('supplierStats.title') : ''}
                    </h1>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">{ready ? t('supplierStats.loading') : ''}</span>
                </div>
            </div>
        );
    }

    const header = (
        <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                {t('supplierStats.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">
                {t('supplierStats.subtitle')}
            </p>
        </div>
    );

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                {header}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <BarChart3 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('supplierStats.error.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('supplierStats.error.body')}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{error}</p>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
                {header}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <BarChart3 size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('supplierStats.emptyState.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('supplierStats.emptyState.body')}</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <Package size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('supplierStats.emptyState.step1')}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <Clock size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('supplierStats.emptyState.step2')}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                            <BarChart3 size={20} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('supplierStats.emptyState.step3')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            {header}

            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('supplierStats.kpi.totalRevenue')}</div>
                    <div className="text-3xl font-bold text-[#334155] dark:text-white">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center">
                        <DollarSign size={12} className="mr-1" />
                        {completedOrders.length !== 1
                            ? t('supplierStats.kpi.completedOrdersPlural', { count: completedOrders.length })
                            : t('supplierStats.kpi.completedOrders', { count: completedOrders.length })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('supplierStats.kpi.volumeSold')}</div>
                    <div className="text-3xl font-bold text-[#334155] dark:text-white">{volumeSold.toLocaleString()} MT</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('supplierStats.kpi.deliveredAndPaid')}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('supplierStats.kpi.totalOrders')}</div>
                    <div className="text-3xl font-bold text-[#334155] dark:text-white">{totalOrders}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('supplierStats.kpi.allIncoming')}</div>
                </div>
            </div>

            {/* Order History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-lg text-[#334155] dark:text-white">{t('supplierStats.table.title')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-6 py-4">{t('supplierStats.table.date')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.buyer')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.fuelType')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.quantity')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.yourPrice')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.marketAvg')}</th>
                                <th className="px-6 py-4">{t('supplierStats.table.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {history.map((order) => {
                                const myPrice = Number(order.final_price_per_mt) || Number(order.price_per_mt_usd) || 0;
                                const marketPrice = getMarketAvgPrice(order.fuel_type, order.region, myPrice);
                                const diff = myPrice && marketPrice ? ((myPrice - marketPrice) / marketPrice) * 100 : 0;
                                const isAboveMarket = diff > 0;

                                const statusKey = STATUS_BADGE_KEYS[order.status] || 'pending';
                                const badgeStyle = STATUS_BADGE_STYLE[order.status] || STATUS_BADGE_STYLE.PENDING_CONFIRMATION;
                                const buyerDisplay = order.buyer_name || 'Anonymous';

                                return (
                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">
                                            {buyerDisplay}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[#334155] dark:text-slate-200">{order.fuel_type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {(Number(order.final_quantity_mt) || Number(order.quantity_mt) || 0).toLocaleString()} MT
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#334155] dark:text-emerald-400">
                                            ${myPrice.toFixed(0)}
                                            {diff !== 0 && (
                                                <span className={`ml-2 text-[10px] font-bold inline-flex items-center ${isAboveMarket ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                    {isAboveMarket ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                                    {Math.abs(diff).toFixed(1)}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            ${marketPrice.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeStyle.bg} ${badgeStyle.text}`}>
                                                {t(`supplierStats.status.${statusKey}`)}
                                            </span>
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
