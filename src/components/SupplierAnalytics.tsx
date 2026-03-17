import React, { useEffect, useState, useMemo } from 'react';
import {
    DollarSign,
    TrendingUp,
    Package,
    Percent,
    Loader2,
    BarChart3,
} from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
} from 'recharts';
import { api } from '../services/api';
import { Trade, TradeStatus } from '../types';
import { useNamespace } from '../hooks/useNamespace';

type OrderItem = Trade;

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

const formatCompact = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
};

const CHART_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

const STATUS_COLORS: Record<string, string> = {
    PENDING_CONFIRMATION: '#eab308',
    CONFIRMED: '#3b82f6',
    DELIVERED: '#10b981',
    PAID: '#22c55e',
    DECLINED: '#ef4444',
    CANCELLED: '#94a3b8',
};

const darkTooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e2e8f0',
};

export const SupplierAnalytics: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await api.trades.myTrades();
                setOrders(data);
            } catch (err: any) {
                console.error('Failed to load orders for analytics:', err);
                const message = err.message || '';
                if (message.toLowerCase().includes('not found') || message.includes('404')) {
                    setOrders([]);
                } else {
                    setError(message || 'Failed to load analytics data');
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadOrders();
    }, []);

    const completedOrders = useMemo(
        () => orders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID'),
        [orders]
    );

    const totalRevenue = useMemo(
        () => completedOrders.reduce((sum, o) => sum + (Number(o.final_total_usd) || 0), 0),
        [completedOrders]
    );

    const totalVolume = useMemo(
        () => completedOrders.reduce((sum, o) => sum + (Number(o.final_quantity_mt) || 0), 0),
        [completedOrders]
    );

    const avgDealSize = useMemo(
        () => (completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0),
        [completedOrders, totalRevenue]
    );

    const conversionRate = useMemo(
        () => (orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0),
        [orders, completedOrders]
    );

    const revenueByMonth = useMemo(() => {
        const map = new Map<string, number>();
        completedOrders.forEach((o) => {
            const d = new Date(o.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            map.set(key, (map.get(key) || 0) + (Number(o.final_total_usd) || 0));
        });
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, revenue]) => {
                const [y, m] = month.split('-');
                const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', {
                    month: 'short',
                    year: '2-digit',
                });
                return { month: label, revenue };
            });
    }, [completedOrders]);

    const revenueByFuel = useMemo(() => {
        const map = new Map<string, number>();
        completedOrders.forEach((o) => {
            const ft = o.fuel_type || 'Unknown';
            map.set(ft, (map.get(ft) || 0) + (Number(o.final_total_usd) || 0));
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([fuelType, revenue], idx) => ({
                fuelType,
                revenue,
                fill: CHART_COLORS[idx % CHART_COLORS.length],
            }));
    }, [completedOrders]);

    const volumeByRegion = useMemo(() => {
        const map = new Map<string, number>();
        completedOrders.forEach((o) => {
            const region = o.region || 'Unknown';
            map.set(region, (map.get(region) || 0) + (Number(o.final_quantity_mt) || 0));
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([region, volume]) => ({ region, volume }));
    }, [completedOrders]);

    const statusBreakdown = useMemo(() => {
        const map = new Map<string, number>();
        orders.forEach((o) => {
            const status = o.status || 'UNKNOWN';
            map.set(status, (map.get(status) || 0) + 1);
        });
        return Array.from(map.entries()).map(([status, count]) => ({
            status,
            count,
            fill: STATUS_COLORS[status] || '#94a3b8',
        }));
    }, [orders]);

    if (!ready || isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24 dark:bg-slate-900 min-h-full">
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                        {ready ? t('supplierAnalytics.title') : ''}
                    </h1>
                </div>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                    <span className="ml-3 text-slate-500 dark:text-slate-400">{ready ? t('supplierAnalytics.loading') : ''}</span>
                </div>
            </div>
        );
    }

    const header = (
        <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                {t('supplierAnalytics.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">
                {t('supplierAnalytics.subtitle')}
            </p>
        </div>
    );

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24 dark:bg-slate-900 min-h-full">
                {header}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <BarChart3 size={28} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('supplierAnalytics.error.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('supplierAnalytics.error.body')}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{error}</p>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24 dark:bg-slate-900 min-h-full">
                {header}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                        <TrendingUp size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#334155] dark:text-white mb-2">{t('supplierAnalytics.emptyState.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t('supplierAnalytics.emptyState.body')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24 dark:bg-slate-900 min-h-full">
            {header}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('supplierAnalytics.kpi.totalRevenue')}</span>
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        {completedOrders.length !== 1
                            ? t('supplierAnalytics.kpi.completedOrdersPlural', { count: completedOrders.length })
                            : t('supplierAnalytics.kpi.completedOrders', { count: completedOrders.length })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('supplierAnalytics.kpi.volumeSold')}</span>
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Package size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{totalVolume.toLocaleString()} MT</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('supplierAnalytics.kpi.deliveredAndPaid')}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('supplierAnalytics.kpi.avgDealSize')}</span>
                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{formatCurrency(avgDealSize)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('supplierAnalytics.kpi.perCompletedOrder')}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('supplierAnalytics.kpi.conversionRate')}</span>
                        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Percent size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-[#334155] dark:text-white">{conversionRate.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('supplierAnalytics.kpi.ordersCompleted', { completed: completedOrders.length, total: orders.length })}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 className="font-bold text-[#334155] dark:text-white mb-1">{t('supplierAnalytics.charts.revenueOverTime')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('supplierAnalytics.charts.revenueOverTimeSubtitle')}</p>
                    {revenueByMonth.length === 0 ? (
                        <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-slate-500">
                            {t('supplierAnalytics.charts.noCompletedOrders')}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={revenueByMonth}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} />
                                <RechartsTooltip contentStyle={darkTooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Revenue']} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 className="font-bold text-[#334155] dark:text-white mb-1">{t('supplierAnalytics.charts.revenueByFuel')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('supplierAnalytics.charts.revenueByFuelSubtitle')}</p>
                    {revenueByFuel.length === 0 ? (
                        <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-slate-500">
                            {t('supplierAnalytics.charts.noCompletedOrders')}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={revenueByFuel} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                                <XAxis dataKey="fuelType" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} />
                                <RechartsTooltip contentStyle={darkTooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Revenue']} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} />
                                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                    {revenueByFuel.map((entry, idx) => <Cell key={`fuel-${idx}`} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 className="font-bold text-[#334155] dark:text-white mb-1">{t('supplierAnalytics.charts.volumeByRegion')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('supplierAnalytics.charts.volumeByRegionSubtitle')}</p>
                    {volumeByRegion.length === 0 ? (
                        <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-slate-500">
                            {t('supplierAnalytics.charts.noCompletedOrders')}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={volumeByRegion} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toLocaleString()}`} />
                                <YAxis type="category" dataKey="region" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={100} />
                                <RechartsTooltip contentStyle={darkTooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} MT`, 'Volume']} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} />
                                <Bar dataKey="volume" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 className="font-bold text-[#334155] dark:text-white mb-1">{t('supplierAnalytics.charts.orderStatusBreakdown')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('supplierAnalytics.charts.orderStatusSubtitle')}</p>
                    {statusBreakdown.length === 0 ? (
                        <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-slate-500">
                            {t('supplierAnalytics.charts.noOrders')}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} stroke="none">
                                    {statusBreakdown.map((entry, idx) => <Cell key={`status-${idx}`} fill={entry.fill} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={darkTooltipStyle} formatter={(value: number, name: string) => [value, name]} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} />
                                <Legend verticalAlign="bottom" height={36} formatter={(value: string) => (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{value}</span>
                                )} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};
