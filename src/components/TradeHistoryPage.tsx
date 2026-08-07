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
import { useToast } from './Toast';
import { MyTrades } from './MyTrades';
import { buildTradePerformanceModel, tradeSliceKey } from '../utils/tradeAnalytics';
import { getProductDisplayName, getProductDisplayNameFromReference } from '../utils/marketProduct';
import { useNamespace } from '../hooks/useNamespace';
import i18n from '../i18n';

// ─── Types ───────────────────────────────────────────────────────
type TabId = 'blotter' | 'performance' | 'alerts';

const TABS: { id: TabId; labelKey: string; icon: React.ElementType }[] = [
    { id: 'blotter', labelKey: 'tradeHistory.tab.blotter', icon: ArrowLeftRight },
    { id: 'performance', labelKey: 'tradeHistory.tab.performance', icon: TrendingUp },
    { id: 'alerts', labelKey: 'tradeHistory.tab.alerts', icon: Bell },
];

const SELECT_CLASS = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]';

// ─── Performance Tab ─────────────────────────────────────────────
const PerformanceTab: React.FC = () => {
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const [trades, setTrades] = useState<Trade[]>([]);
    const [referenceBySlice, setReferenceBySlice] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const data = await api.trades.myTrades();
                if (cancelled) return;
                setTrades(data);

                const slices = new Map<string, { product_id: string; delivery_point_id: string; availability_window?: string; fuel_type?: string; region?: string }>();
                for (const trade of data) {
                    const key = tradeSliceKey(trade);
                    if (!key || !trade.product_id || !trade.delivery_point_id) {
                        continue;
                    }
                    slices.set(key, {
                        product_id: trade.product_id,
                        delivery_point_id: trade.delivery_point_id,
                        availability_window: trade.availability_window,
                        fuel_type: trade.fuel_type,
                        region: trade.region,
                    });
                }

                const entries = await Promise.all(
                    Array.from(slices.entries()).map(async ([key, slice]) => {
                        try {
                            const response = await api.prices.getReference({
                                product_id: slice.product_id,
                                delivery_point_id: slice.delivery_point_id,
                                fuel_type: slice.fuel_type,
                                region: slice.region,
                                visibility: 'internal',
                            });
                            const vwap = Number(response.prices?.[0]?.vwap_usd || 0);
                            return [key, vwap > 0 ? vwap : 0] as const;
                        } catch {
                            return [key, 0] as const;
                        }
                    })
                );

                if (!cancelled) {
                    setReferenceBySlice(Object.fromEntries(entries.filter(([, value]) => value > 0)));
                }
            } catch {
                if (!cancelled) {
                    setTrades([]);
                    setReferenceBySlice({});
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const model = useMemo(
        () => buildTradePerformanceModel(trades, referenceBySlice, {
            locale,
            unknownFuelLabel: t('tradeHistory.unknownFuel'),
        }),
        [locale, referenceBySlice, t, trades]
    );

    const maxVolume = model.volumeByFuel.length > 0
        ? Math.max(...model.volumeByFuel.map((entry) => entry.volumeMt))
        : 1;
    const maxMonthly = model.monthlyTradeCounts.length > 0
        ? Math.max(...model.monthlyTradeCounts.map((entry) => entry.count), 1)
        : 1;

    if (!ready) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <span className="ml-3 text-slate-500 dark:text-slate-400">{t('tradeHistory.performance.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t('tradeHistory.performance.totalTrades'), value: model.totalTrades.toString(), icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: t('tradeHistory.performance.totalVolume'), value: `${model.totalVolumeMt.toLocaleString(locale)} MT`, icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: t('tradeHistory.performance.weightedPrice'), value: `$${model.weightedAveragePriceUsd.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: t('tradeHistory.performance.grossNotional'), value: `$${model.grossNotionalUsd.toLocaleString(locale, { maximumFractionDigits: 0 })}`, icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                ].map((kpi) => (
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="v-card p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">{t('tradeHistory.performance.volumeByFuel')}</h3>
                    {model.volumeByFuel.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">{t('tradeHistory.performance.noVolume')}</p>
                    ) : (
                        <div className="space-y-3">
                            {model.volumeByFuel.map((entry) => (
                                <div key={entry.fuel}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{entry.fuel}</span>
                                        <span className="text-slate-500 dark:text-slate-400">{entry.volumeMt.toLocaleString(locale)} MT</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#5DADE2] to-[#48C9B0] rounded-full transition-all duration-500"
                                            style={{ width: `${(entry.volumeMt / maxVolume) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="v-card p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">{t('tradeHistory.performance.monthlyCount')}</h3>
                    <div className="flex items-end gap-4 h-40">
                        {model.monthlyTradeCounts.map((entry) => (
                            <div key={entry.label} className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-slate-700 dark:text-white mb-1">{entry.count}</span>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                                    <div
                                        className="w-full bg-gradient-to-t from-[#5DADE2] to-[#85D4F2] rounded-t-lg transition-all duration-500"
                                        style={{
                                            height: `${maxMonthly > 0 ? (entry.count / maxMonthly) * 100 : 0}%`,
                                            marginTop: `${maxMonthly > 0 ? (1 - entry.count / maxMonthly) * 100 : 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{entry.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="v-card p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">{t('tradeHistory.performance.executionVsReference')}</h3>
                {model.fuelComparisons.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">{t('tradeHistory.performance.noReference')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                                    <th className="text-left py-2 font-bold">{t('tradeHistory.col.fuel')}</th>
                                    <th className="text-right py-2 font-bold">{t('tradeHistory.col.avgExecution')}</th>
                                    <th className="text-right py-2 font-bold">{t('tradeHistory.col.internalReference')}</th>
                                    <th className="text-right py-2 font-bold">{t('tradeHistory.col.difference')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {model.fuelComparisons.map((row) => (
                                    <tr key={row.fuel} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="py-3 font-bold text-slate-700 dark:text-slate-200">{row.fuel}</td>
                                        <td className="py-3 text-right font-medium text-slate-600 dark:text-slate-300">${row.weightedExecutionUsd.toFixed(2)}</td>
                                        <td className="py-3 text-right font-medium text-slate-500 dark:text-slate-400">${row.weightedBenchmarkUsd.toFixed(2)}</td>
                                        <td className={`py-3 text-right font-bold ${row.differenceUsd <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {row.differenceUsd < 0 ? '-' : '+'}{Math.abs(row.differenceUsd).toFixed(2)} ({row.differencePct.toFixed(1)}%)
                                        </td>
                                    </tr>
                                ))}
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
    const { t, ready } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
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
            addToast({ type: 'success', title: t('tradeHistory.alert.createdTitle'), message: t('tradeHistory.alert.createdMessage') });
            setShowForm(false);
            setFormProductId('');
            setFormDpId('');
            setFormDirection('above');
            setFormThreshold(0);
            await fetchAlerts();
        } catch (err: any) {
            addToast({ type: 'warning', title: t('tradeHistory.alert.failedTitle'), message: i18n.language.startsWith('zh') ? t('tradeHistory.alert.createFailed') : err.message || t('tradeHistory.alert.createFailed') });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            await api.alerts.delete(id);
            addToast({ type: 'info', title: t('tradeHistory.alert.deletedTitle'), message: t('tradeHistory.alert.deletedMessage') });
            await fetchAlerts();
        } catch (err: any) {
            addToast({ type: 'warning', title: t('tradeHistory.alert.failedTitle'), message: i18n.language.startsWith('zh') ? t('tradeHistory.alert.deleteFailed') : err.message || t('tradeHistory.alert.deleteFailed') });
        } finally {
            setDeleting(null);
        }
    };

    const getProductName = (alert: PriceAlert) =>
        alert.product_name
            || (alert.market_product ? getProductDisplayNameFromReference(alert.market_product, products) : '')
            || getProductDisplayNameFromReference(alert.product_id, products);
    const getDpName = (id?: string) => id ? (deliveryPoints.find(d => d.id === id)?.name || t('tradeHistory.alert.anyPort')) : t('tradeHistory.alert.anyPort');

    if (!ready) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <span className="ml-3 text-slate-500 dark:text-slate-400">{t('tradeHistory.alert.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('tradeHistory.alert.description')}
                </p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD9] text-white text-sm font-bold rounded-lg transition-colors"
                >
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? t('common.cancel') : t('tradeHistory.alert.create')}
                </button>
            </div>

            {/* Inline Create Form */}
            {showForm && (
                <div className="v-card p-5 border-2 border-[#5DADE2]/30">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">{t('tradeHistory.alert.new')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('tradeHistory.col.fuel')}</label>
                            <select
                                aria-label={t('tradeHistory.alert.ariaFuel')}
                                value={formProductId}
                                onChange={(event) => setFormProductId(event.target.value)}
                                className={SELECT_CLASS}
                            >
                                <option value="">{t('tradeHistory.alert.selectFuel')}</option>
                                {products
                                        .filter((product) => product.is_active)
                                        .map((product) => (
                                            <option key={product.id} value={product.id}>{getProductDisplayName(product)}</option>
                                        ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('tradeHistory.col.port')}</label>
                            <select
                                aria-label={t('tradeHistory.alert.ariaPort')}
                                value={formDpId}
                                onChange={(event) => setFormDpId(event.target.value)}
                                className={SELECT_CLASS}
                            >
                                <option value="">{t('tradeHistory.alert.anyPort')}</option>
                                {deliveryPoints.map((dp) => (
                                    <option key={dp.id} value={dp.id}>{dp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('tradeHistory.col.direction')}</label>
                            <select
                                aria-label={t('tradeHistory.alert.ariaDirection')}
                                value={formDirection}
                                onChange={(event) => setFormDirection(event.target.value as 'above' | 'below')}
                                className={SELECT_CLASS}
                            >
                                <option value="above">{t('tradeHistory.alert.above')}</option>
                                <option value="below">{t('tradeHistory.alert.below')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('tradeHistory.alert.targetPrice')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={formThreshold || ''}
                                    onChange={e => setFormThreshold(parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={1}
                                    placeholder={t('tradeHistory.alert.pricePlaceholder')}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={!formProductId || formThreshold <= 0 || creating}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    {t('tradeHistory.alert.set')}
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
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">{t('tradeHistory.alert.emptyTitle')}</h3>
                    <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">{t('tradeHistory.alert.emptyBody')}</p>
                </div>
            ) : (
                <div className="v-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                    <th className="px-4 lg:px-6 py-3">{t('tradeHistory.col.fuel')}</th>
                                    <th className="px-4 lg:px-6 py-3">{t('tradeHistory.col.port')}</th>
                                    <th className="px-4 lg:px-6 py-3">{t('tradeHistory.col.direction')}</th>
                                    <th className="px-4 lg:px-6 py-3 text-right">{t('tradeHistory.col.targetPrice')}</th>
                                    <th className="px-4 lg:px-6 py-3">{t('tradeHistory.col.status')}</th>
                                    <th className="px-4 lg:px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {alerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 lg:px-6 py-3">
                                            <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded border border-blue-100 dark:border-blue-800">
                                                {getProductName(alert)}
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
                                                {t(alert.direction === 'above' ? 'tradeHistory.alert.above' : 'tradeHistory.alert.below')}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                                            ${alert.threshold_usd.toLocaleString(locale)}
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            {alert.triggered_at ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
                                                    <AlertTriangle size={10} />
                                                    {t('tradeHistory.alert.triggered')}
                                                </span>
                                            ) : alert.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 size={10} />
                                                    {t('tradeHistory.alert.active')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">
                                                    {t('tradeHistory.alert.inactive')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            <button
                                                onClick={() => handleDelete(alert.id)}
                                                disabled={deleting === alert.id}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                title={t('tradeHistory.alert.delete')}
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
    const { t, ready } = useNamespace('trading');
    const [activeTab, setActiveTab] = useState<TabId>('blotter');

    if (!ready) return null;

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">{t('tradeHistory.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">
                    {t('tradeHistory.subtitle')}
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
                        {t(tab.labelKey)}
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
