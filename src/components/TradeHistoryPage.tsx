import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ArrowLeftRight,
    TrendingUp,
    Bell,
    Package,
    DollarSign,
    BarChart3,
    Loader2,
    Plus,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    X,
} from 'lucide-react';
import { api } from '../services/api';
import { Trade, Product, DeliveryPoint, PriceAlert } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { MyTrades } from './MyTrades';

// ─── Types ───────────────────────────────────────────────────────
type TabId = 'blotter' | 'performance' | 'alerts';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'blotter', label: 'Blotter', icon: ArrowLeftRight },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: Bell },
];

// ─── Performance Tab ─────────────────────────────────────────────
const PerformanceTab: React.FC = () => {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.trades.myTrades();
                setTrades(data);
            } catch {
                setTrades([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const completedTrades = useMemo(
        () => trades.filter(t => ['CONFIRMED', 'DELIVERED', 'PAID'].includes(t.status)),
        [trades]
    );

    // ─── KPIs ──────────────────────────────────────────────
    const totalTrades = completedTrades.length;
    const totalVolume = completedTrades.reduce(
        (sum, t) => sum + (t.final_quantity_mt || t.quantity_mt),
        0
    );
    const avgPrice = totalTrades > 0
        ? completedTrades.reduce((sum, t) => sum + (t.final_price_per_mt || t.price_per_mt_usd), 0) / totalTrades
        : 0;

    // P&L estimate: for buys, P&L = (market_avg - paid_price) * qty; simplified as total spend
    const getUserSide = (trade: Trade) => {
        if (trade.buyer_id === user?.organization_id) return 'BUYER';
        if (trade.seller_id === user?.organization_id) return 'SELLER';
        return null;
    };

    const pnlEstimate = completedTrades.reduce((sum, t) => {
        const side = getUserSide(t);
        const qty = t.final_quantity_mt || t.quantity_mt;
        const price = t.final_price_per_mt || t.price_per_mt_usd;
        const total = qty * price;
        // Simplified: buyers have negative cash flow, sellers positive
        return sum + (side === 'SELLER' ? total : -total);
    }, 0);

    // ─── Volume by fuel type ───────────────────────────────
    const volumeByFuel = useMemo(() => {
        const map: Record<string, number> = {};
        completedTrades.forEach(t => {
            const fuel = t.product_name || t.fuel_type || 'Unknown';
            map[fuel] = (map[fuel] || 0) + (t.final_quantity_mt || t.quantity_mt);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [completedTrades]);

    const maxVolume = volumeByFuel.length > 0 ? Math.max(...volumeByFuel.map(([, v]) => v)) : 1;

    // ─── Monthly trade count ───────────────────────────────
    const monthlyTrades = useMemo(() => {
        const months = ['Jan 2026', 'Feb 2026', 'Mar 2026'];
        const counts = [0, 0, 0];
        completedTrades.forEach(t => {
            const d = new Date(t.created_at);
            if (d.getFullYear() === 2026) {
                const m = d.getMonth(); // 0=Jan, 1=Feb, 2=Mar
                if (m >= 0 && m <= 2) counts[m]++;
            }
        });
        return months.map((label, i) => ({ label, count: counts[i] }));
    }, [completedTrades]);

    const maxMonthly = Math.max(...monthlyTrades.map(m => m.count), 1);

    // ─── Avg exec price vs market mid per fuel ─────────────
    const priceComparison = useMemo(() => {
        const fuelPrices: Record<string, { exec: number[]; }> = {};
        completedTrades.forEach(t => {
            const fuel = t.product_name || t.fuel_type || 'Unknown';
            if (!fuelPrices[fuel]) fuelPrices[fuel] = { exec: [] };
            fuelPrices[fuel].exec.push(t.final_price_per_mt || t.price_per_mt_usd);
        });
        // Market mid approximation: avg of all exec prices (both sides) + 2% spread
        return Object.entries(fuelPrices).map(([fuel, data]) => {
            const avgExec = data.exec.reduce((a, b) => a + b, 0) / data.exec.length;
            const marketMid = avgExec * (1 + (Math.random() * 0.04 - 0.02)); // +/-2% simulated
            return { fuel, avgExec, marketMid };
        });
    }, [completedTrades]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <span className="ml-3 text-slate-500 dark:text-slate-400">Loading performance data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Trades', value: totalTrades.toString(), icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Total Volume', value: `${totalVolume.toLocaleString()} MT`, icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Avg Price', value: `$${avgPrice.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'P&L Estimate', value: `${pnlEstimate >= 0 ? '+' : ''}$${Math.abs(pnlEstimate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: BarChart3, color: pnlEstimate >= 0 ? 'text-emerald-500' : 'text-red-500', bg: pnlEstimate >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20' },
                ].map(kpi => (
                    <div key={kpi.label} className="v-card p-4 lg:p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                                <kpi.icon size={18} className={kpi.color} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                        </div>
                        <p className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white font-['Montserrat']">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume by Fuel Type */}
                <div className="v-card p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Volume by Fuel Type</h3>
                    {volumeByFuel.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">No trade data available</p>
                    ) : (
                        <div className="space-y-3">
                            {volumeByFuel.map(([fuel, vol]) => (
                                <div key={fuel}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{fuel}</span>
                                        <span className="text-slate-500 dark:text-slate-400">{vol.toLocaleString()} MT</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#5DADE2] to-[#48C9B0] rounded-full transition-all duration-500"
                                            style={{ width: `${(vol / maxVolume) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Monthly Trade Count */}
                <div className="v-card p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Monthly Trade Count</h3>
                    <div className="flex items-end gap-4 h-40">
                        {monthlyTrades.map(m => (
                            <div key={m.label} className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-slate-700 dark:text-white mb-1">{m.count}</span>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                                    <div
                                        className="w-full bg-gradient-to-t from-[#5DADE2] to-[#85D4F2] rounded-t-lg transition-all duration-500"
                                        style={{
                                            height: `${maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0}%`,
                                            marginTop: `${maxMonthly > 0 ? (1 - m.count / maxMonthly) * 100 : 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Avg Execution vs Market Mid */}
            <div className="v-card p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Avg Execution Price vs Market Mid</h3>
                {priceComparison.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No comparison data available</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                                    <th className="text-left py-2 font-bold">Fuel Type</th>
                                    <th className="text-right py-2 font-bold">Avg Execution</th>
                                    <th className="text-right py-2 font-bold">Market Mid</th>
                                    <th className="text-right py-2 font-bold">Difference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {priceComparison.map(row => {
                                    const diff = row.avgExec - row.marketMid;
                                    const pct = row.marketMid > 0 ? (diff / row.marketMid) * 100 : 0;
                                    return (
                                        <tr key={row.fuel} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="py-3 font-bold text-slate-700 dark:text-slate-200">{row.fuel}</td>
                                            <td className="py-3 text-right font-medium text-slate-600 dark:text-slate-300">${row.avgExec.toFixed(2)}</td>
                                            <td className="py-3 text-right font-medium text-slate-500 dark:text-slate-400">${row.marketMid.toFixed(2)}</td>
                                            <td className={`py-3 text-right font-bold ${diff <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {diff <= 0 ? '' : '+'}{diff.toFixed(2)} ({pct.toFixed(1)}%)
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Alerts Tab ──────────────────────────────────────────────────
const AlertsTab: React.FC = () => {
    const { addToast } = useToast();
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Form state
    const [formProductId, setFormProductId] = useState('');
    const [formDpId, setFormDpId] = useState('');
    const [formDirection, setFormDirection] = useState<'above' | 'below'>('above');
    const [formThreshold, setFormThreshold] = useState<number>(0);

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await api.alerts.list();
            setAlerts(data);
        } catch {
            setAlerts([]);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [alertsData, productsData, dpsData] = await Promise.all([
                    api.alerts.list(),
                    api.catalog.products(),
                    api.catalog.deliveryPoints(),
                ]);
                setAlerts(alertsData);
                setProducts(productsData);
                setDeliveryPoints(dpsData);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleCreate = async () => {
        if (!formProductId || formThreshold <= 0) return;
        setCreating(true);
        try {
            await api.alerts.create({
                product_id: formProductId,
                delivery_point_id: formDpId || undefined,
                direction: formDirection,
                threshold_usd: formThreshold,
            });
            addToast({ type: 'success', title: 'Alert Created', message: 'Price alert has been set.' });
            setShowForm(false);
            setFormProductId('');
            setFormDpId('');
            setFormDirection('above');
            setFormThreshold(0);
            await fetchAlerts();
        } catch (err: any) {
            addToast({ type: 'warning', title: 'Failed', message: err.message || 'Could not create alert.' });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            await api.alerts.delete(id);
            addToast({ type: 'info', title: 'Deleted', message: 'Alert removed.' });
            await fetchAlerts();
        } catch (err: any) {
            addToast({ type: 'warning', title: 'Failed', message: err.message || 'Could not delete alert.' });
        } finally {
            setDeleting(null);
        }
    };

    const getProductName = (id: string) => products.find(p => p.id === id)?.name || id.slice(0, 8);
    const getDpName = (id?: string) => id ? (deliveryPoints.find(d => d.id === id)?.name || 'Any') : 'Any';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <span className="ml-3 text-slate-500 dark:text-slate-400">Loading alerts...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Set price triggers to get notified when market prices cross your thresholds.
                </p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD9] text-white text-sm font-bold rounded-lg transition-colors"
                >
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? 'Cancel' : 'Create Alert'}
                </button>
            </div>

            {/* Inline Create Form */}
            {showForm && (
                <div className="v-card p-5 border-2 border-[#5DADE2]/30">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">New Price Alert</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Fuel Type</label>
                            <select
                                value={formProductId}
                                onChange={e => setFormProductId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                            >
                                <option value="">Select fuel...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Port</label>
                            <select
                                value={formDpId}
                                onChange={e => setFormDpId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                            >
                                <option value="">Any port</option>
                                {deliveryPoints.map(dp => (
                                    <option key={dp.id} value={dp.id}>{dp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Direction</label>
                            <select
                                value={formDirection}
                                onChange={e => setFormDirection(e.target.value as 'above' | 'below')}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                            >
                                <option value="above">Above</option>
                                <option value="below">Below</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Target Price (USD/MT)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={formThreshold || ''}
                                    onChange={e => setFormThreshold(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={1}
                                    placeholder="e.g. 850"
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={!formProductId || formThreshold <= 0 || creating}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Set
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="v-card p-12 text-center border-dashed">
                    <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">No Alerts Set</h3>
                    <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">Create a price alert to get notified when market conditions match your criteria.</p>
                </div>
            ) : (
                <div className="v-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                    <th className="px-4 lg:px-6 py-3">Fuel Type</th>
                                    <th className="px-4 lg:px-6 py-3">Port</th>
                                    <th className="px-4 lg:px-6 py-3">Direction</th>
                                    <th className="px-4 lg:px-6 py-3 text-right">Target Price</th>
                                    <th className="px-4 lg:px-6 py-3">Status</th>
                                    <th className="px-4 lg:px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {alerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 lg:px-6 py-3">
                                            <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded border border-blue-100 dark:border-blue-800">
                                                {getProductName(alert.product_id)}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">
                                            {getDpName(alert.delivery_point_id)}
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                                                alert.direction === 'above' ? 'text-red-500' : 'text-emerald-500'
                                            }`}>
                                                {alert.direction === 'above' ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                                                {alert.direction.charAt(0).toUpperCase() + alert.direction.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                                            ${alert.threshold_usd.toLocaleString()}
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            {alert.triggered_at ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
                                                    <AlertTriangle size={10} />
                                                    Triggered
                                                </span>
                                            ) : alert.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 size={10} />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            <button
                                                onClick={() => handleDelete(alert.id)}
                                                disabled={deleting === alert.id}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                title="Delete alert"
                                            >
                                                {deleting === alert.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main TradeHistoryPage ───────────────────────────────────────
export const TradeHistoryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('blotter');

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">Trade History</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">
                    Review your trade blotter, track performance, and manage price alerts.
                </p>
            </div>

            {/* Tab Switcher — sliding glass indicator matching Marketplace */}
            <div className="relative flex mb-6 bg-white/30 dark:bg-slate-800/30 rounded-lg p-0.5 backdrop-blur-sm border border-white/20 dark:border-slate-700/40 w-fit">
                {/* Sliding glass indicator */}
                <div
                    className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out"
                    style={{
                        left: activeTab === 'blotter'
                            ? '2px'
                            : activeTab === 'performance'
                                ? 'calc(33.33%)'
                                : 'calc(66.66%)',
                        width: 'calc(33.33% - 2px)',
                    }}
                />
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative z-10 px-5 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 w-28 flex items-center justify-center gap-1.5 ${
                            activeTab === tab.id
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <tab.icon size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'blotter' && <MyTrades />}
            {activeTab === 'performance' && <PerformanceTab />}
            {activeTab === 'alerts' && <AlertsTab />}
        </div>
    );
};
