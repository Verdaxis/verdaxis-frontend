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
    RefreshCw,
    SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';
import { Trade, Product, DeliveryPoint, PriceAlert, OrderBookOrder } from '../types';
import { useToast } from './Toast';
import { MyTrades } from './MyTrades';
import { buildTradePerformanceModel, tradeSliceKey } from '../utils/tradeAnalytics';
import { getProductDisplayName, getProductDisplayNameFromReference } from '../utils/marketProduct';
import { VerdaxisSelect } from './ui/VerdaxisSelect';
import { compareAvailabilityWindows, formatAvailabilityWindow } from '../utils/availabilityWindow';
import { BenchmarkPriceBlock } from './trading/BenchmarkPriceBlock';

// ─── Types ───────────────────────────────────────────────────────
type TabId = 'blotter' | 'performance' | 'alerts';

type ScannerPresetId = 'VALUE_ASKS' | 'AGGRESSIVE_BIDS' | 'TIGHT_SPREAD' | 'LARGE_LOTS';
type ScannerSide = 'BOTH' | 'ASK' | 'BID';
type ScannerSortBy = 'BENCHMARK_EDGE' | 'PRICE' | 'SIZE' | 'NEWEST';

interface ScannerState {
    selectedProducts: string[];
    selectedPorts: string[];
    availabilityWindow: string;
    side: ScannerSide;
    minRemainingQuantityMt: number;
    requireCertification: boolean;
    minBenchmarkEdgeUsd: number;
    maxSpreadUsd: number | null;
    sortBy: ScannerSortBy;
    cadenceSeconds: 0 | 10 | 30 | 60;
}

interface ScannerRow extends OrderBookOrder {
    productRef: string;
    benchmarkUsd: number | null;
    deltaUsd: number | null;
    edgeUsd: number | null;
    spreadUsd: number | null;
    certDeclared: boolean;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'blotter', label: 'Blotter', icon: ArrowLeftRight },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: Bell },
];

const SCANNER_STORAGE_KEY = 'verdaxis_alert_scanner_v1';
const DEFAULT_SCANNER_STATE: ScannerState = {
    selectedProducts: [],
    selectedPorts: [],
    availabilityWindow: '',
    side: 'ASK',
    minRemainingQuantityMt: 500,
    requireCertification: false,
    minBenchmarkEdgeUsd: 0,
    maxSpreadUsd: null,
    sortBy: 'BENCHMARK_EDGE',
    cadenceSeconds: 30,
};

const SCANNER_PRESETS: Record<ScannerPresetId, { label: string; description: string; state: Partial<ScannerState> }> = {
    VALUE_ASKS: {
        label: 'Value Asks',
        description: 'Below benchmark supply',
        state: {
            side: 'ASK',
            minBenchmarkEdgeUsd: 10,
            minRemainingQuantityMt: 500,
            maxSpreadUsd: null,
            sortBy: 'BENCHMARK_EDGE',
        },
    },
    AGGRESSIVE_BIDS: {
        label: 'Aggressive Bids',
        description: 'Buyer intent above benchmark',
        state: {
            side: 'BID',
            minBenchmarkEdgeUsd: 8,
            minRemainingQuantityMt: 300,
            maxSpreadUsd: null,
            sortBy: 'BENCHMARK_EDGE',
        },
    },
    TIGHT_SPREAD: {
        label: 'Tight Spread',
        description: 'Best two-sided slices',
        state: {
            side: 'BOTH',
            minBenchmarkEdgeUsd: 0,
            maxSpreadUsd: 20,
            minRemainingQuantityMt: 300,
            sortBy: 'PRICE',
        },
    },
    LARGE_LOTS: {
        label: 'Large Lots',
        description: 'High-volume liquidity',
        state: {
            side: 'BOTH',
            minBenchmarkEdgeUsd: 0,
            minRemainingQuantityMt: 2500,
            maxSpreadUsd: null,
            sortBy: 'SIZE',
        },
    },
};

const getScannerProductRef = (order: Partial<OrderBookOrder>) =>
    order.market_product || order.product_id || order.product_name || '';

const getScannerSliceKey = (order: Partial<OrderBookOrder>) => [
    getScannerProductRef(order),
    order.delivery_point_id || '',
    order.availability_window || '',
].join('|');

// ─── Performance Tab ─────────────────────────────────────────────
const PerformanceTab: React.FC = () => {
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

                const slices = new Map<string, { market_product: any; delivery_point_id: string; availability_window: string; fuel_type?: string; region?: string }>();
                for (const trade of data) {
                    const key = tradeSliceKey(trade);
                    if (!key || !trade.market_product || !trade.delivery_point_id || !trade.availability_window) {
                        continue;
                    }
                    slices.set(key, {
                        market_product: trade.market_product,
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
                                market_product: slice.market_product,
                                delivery_point_id: slice.delivery_point_id,
                                availability_window: slice.availability_window,
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
        () => buildTradePerformanceModel(trades, referenceBySlice),
        [trades, referenceBySlice]
    );

    const maxVolume = model.volumeByFuel.length > 0
        ? Math.max(...model.volumeByFuel.map((entry) => entry.volumeMt))
        : 1;
    const maxMonthly = model.monthlyTradeCounts.length > 0
        ? Math.max(...model.monthlyTradeCounts.map((entry) => entry.count), 1)
        : 1;

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Trades', value: model.totalTrades.toString(), icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Total Volume', value: `${model.totalVolumeMt.toLocaleString()} MT`, icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Weighted Avg Price', value: `$${model.weightedAveragePriceUsd.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Gross Notional', value: `$${model.grossNotionalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
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
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Volume by Fuel Type</h3>
                    {model.volumeByFuel.length === 0 ? (
                        <p className="text-sm text-slate-400 py-8 text-center">Confirm your first trade to see volume data</p>
                    ) : (
                        <div className="space-y-3">
                            {model.volumeByFuel.map((entry) => (
                                <div key={entry.fuel}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{entry.fuel}</span>
                                        <span className="text-slate-500 dark:text-slate-400">{entry.volumeMt.toLocaleString()} MT</span>
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
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Monthly Trade Count</h3>
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
                <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 uppercase tracking-wider">Execution vs Internal Reference</h3>
                {model.fuelComparisons.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No internal reference prices were available for your confirmed trades yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                                    <th className="text-left py-2 font-bold">Fuel Type</th>
                                    <th className="text-right py-2 font-bold">Avg Execution</th>
                                    <th className="text-right py-2 font-bold">Internal Reference</th>
                                    <th className="text-right py-2 font-bold">Difference</th>
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
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const [scannerPresetId, setScannerPresetId] = useState<ScannerPresetId | 'CUSTOM'>('VALUE_ASKS');
    const [scannerState, setScannerState] = useState<ScannerState>(DEFAULT_SCANNER_STATE);
    const [scanUniverse, setScanUniverse] = useState<OrderBookOrder[]>([]);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scanLastUpdated, setScanLastUpdated] = useState<string | null>(null);

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

    const refreshScanner = useCallback(async () => {
        setScanLoading(true);
        setScanError('');
        try {
            const data = await api.orderbook.list();
            const rows = Array.isArray(data) ? data : (data?.items || []);
            const openRows = rows.filter((order: OrderBookOrder) => order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED');
            setScanUniverse(openRows);
            setScanLastUpdated(new Date().toISOString());
        } catch (err: any) {
            setScanUniverse([]);
            setScanError(err?.message || 'Could not refresh scanner data.');
        } finally {
            setScanLoading(false);
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

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SCANNER_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.presetId && (parsed.presetId === 'CUSTOM' || parsed.presetId in SCANNER_PRESETS)) {
                setScannerPresetId(parsed.presetId);
            }
            if (parsed?.state && typeof parsed.state === 'object') {
                setScannerState({
                    ...DEFAULT_SCANNER_STATE,
                    ...parsed.state,
                    maxSpreadUsd: parsed.state.maxSpreadUsd == null ? null : Number(parsed.state.maxSpreadUsd),
                });
            }
        } catch {
            // ignore storage parse errors
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SCANNER_STORAGE_KEY, JSON.stringify({
                presetId: scannerPresetId,
                state: scannerState,
            }));
        } catch {
            // ignore storage errors
        }
    }, [scannerPresetId, scannerState]);

    useEffect(() => {
        void refreshScanner();
    }, [refreshScanner]);

    useEffect(() => {
        if (scannerState.cadenceSeconds <= 0) return;
        const intervalId = window.setInterval(() => {
            void refreshScanner();
        }, scannerState.cadenceSeconds * 1000);
        return () => window.clearInterval(intervalId);
    }, [refreshScanner, scannerState.cadenceSeconds]);

    const updateScannerState = useCallback((patch: Partial<ScannerState>) => {
        setScannerPresetId('CUSTOM');
        setScannerState((prev) => ({ ...prev, ...patch }));
    }, []);

    const toggleScannerMultiSelect = useCallback((field: 'selectedProducts' | 'selectedPorts', value: string) => {
        setScannerPresetId('CUSTOM');
        setScannerState((prev) => {
            const existing = prev[field];
            const selected = existing.includes(value)
                ? existing.filter((entry) => entry !== value)
                : [...existing, value];
            return {
                ...prev,
                [field]: selected,
            };
        });
    }, []);

    const applyScannerPreset = useCallback((presetId: ScannerPresetId) => {
        setScannerPresetId(presetId);
        setScannerState((prev) => ({
            ...prev,
            ...SCANNER_PRESETS[presetId].state,
        }));
    }, []);

    const scannerProductOptions = useMemo(() => {
        const seen = new Set<string>();
        const options: Array<{ value: string; label: string }> = [];
        for (const product of products) {
            if (!product.is_active) continue;
            const value = product.market_product || product.id;
            if (!value || seen.has(value)) continue;
            seen.add(value);
            options.push({
                value,
                label: getProductDisplayName(product) || product.name,
            });
        }
        return options;
    }, [products]);

    const scannerPortOptions = useMemo(
        () => deliveryPoints
            .filter((dp) => dp.is_active)
            .map((dp) => ({ value: dp.id, label: dp.name })),
        [deliveryPoints]
    );

    const scannerWindowOptions = useMemo(() => {
        const windows = Array.from(new Set(scanUniverse.map((order) => order.availability_window || '').filter(Boolean)));
        windows.sort(compareAvailabilityWindows);
        return windows.map((windowCode) => ({
            value: windowCode,
            label: formatAvailabilityWindow(windowCode),
        }));
    }, [scanUniverse]);

    const spreadBySlice = useMemo(() => {
        const sliceBook = new Map<string, { bestBid: number | null; bestAsk: number | null }>();

        for (const order of scanUniverse) {
            const key = getScannerSliceKey(order);
            if (!key) continue;
            const current = sliceBook.get(key) || { bestBid: null, bestAsk: null };
            const price = Number(order.price_per_mt_usd);
            if (!Number.isFinite(price)) continue;

            if (order.side === 'BID') {
                current.bestBid = current.bestBid == null ? price : Math.max(current.bestBid, price);
            } else {
                current.bestAsk = current.bestAsk == null ? price : Math.min(current.bestAsk, price);
            }
            sliceBook.set(key, current);
        }

        const result = new Map<string, number | null>();
        for (const [key, level] of sliceBook.entries()) {
            if (level.bestAsk == null || level.bestBid == null) {
                result.set(key, null);
            } else {
                result.set(key, level.bestAsk - level.bestBid);
            }
        }
        return result;
    }, [scanUniverse]);

    const scannedRows = useMemo<ScannerRow[]>(() => {
        const enriched: ScannerRow[] = scanUniverse.map((order) => {
            const benchmarkUsd = typeof order.benchmark_price_per_mt_usd === 'number' && Number.isFinite(order.benchmark_price_per_mt_usd)
                ? Number(order.benchmark_price_per_mt_usd)
                : null;
            const deltaUsd = typeof order.premium_discount_per_mt_usd === 'number' && Number.isFinite(order.premium_discount_per_mt_usd)
                ? Number(order.premium_discount_per_mt_usd)
                : benchmarkUsd == null
                    ? null
                    : Number(order.price_per_mt_usd) - benchmarkUsd;
            const edgeUsd = deltaUsd == null
                ? null
                : order.side === 'ASK'
                    ? -deltaUsd
                    : deltaUsd;
            const spreadUsd = spreadBySlice.get(getScannerSliceKey(order)) ?? null;
            const certDeclared = Boolean(order.certification_declared || (order.certifications?.length ?? 0) > 0);

            return {
                ...order,
                productRef: getScannerProductRef(order),
                benchmarkUsd,
                deltaUsd,
                edgeUsd,
                spreadUsd,
                certDeclared,
            };
        });

        const filtered = enriched.filter((row) => {
            if (scannerState.side !== 'BOTH' && row.side !== scannerState.side) return false;
            if (scannerState.selectedProducts.length > 0 && !scannerState.selectedProducts.includes(row.productRef)) return false;
            if (scannerState.selectedPorts.length > 0 && !scannerState.selectedPorts.includes(row.delivery_point_id || '')) return false;
            if (scannerState.availabilityWindow && row.availability_window !== scannerState.availabilityWindow) return false;

            const remainingQty = Number(row.remaining_quantity_mt || row.quantity_mt || 0);
            if (remainingQty < scannerState.minRemainingQuantityMt) return false;

            if (scannerState.requireCertification && !row.certDeclared) return false;
            if (scannerState.minBenchmarkEdgeUsd > 0 && (row.edgeUsd == null || row.edgeUsd < scannerState.minBenchmarkEdgeUsd)) return false;

            if (scannerState.maxSpreadUsd != null) {
                if (row.spreadUsd == null) return false;
                if (row.spreadUsd > scannerState.maxSpreadUsd) return false;
            }
            return true;
        });

        filtered.sort((left, right) => {
            if (scannerState.sortBy === 'BENCHMARK_EDGE') {
                const leftEdge = left.edgeUsd ?? Number.NEGATIVE_INFINITY;
                const rightEdge = right.edgeUsd ?? Number.NEGATIVE_INFINITY;
                if (rightEdge !== leftEdge) return rightEdge - leftEdge;
                return Number(right.price_per_mt_usd) - Number(left.price_per_mt_usd);
            }

            if (scannerState.sortBy === 'PRICE') {
                return Number(left.price_per_mt_usd) - Number(right.price_per_mt_usd);
            }

            if (scannerState.sortBy === 'SIZE') {
                const leftQty = Number(left.remaining_quantity_mt || left.quantity_mt || 0);
                const rightQty = Number(right.remaining_quantity_mt || right.quantity_mt || 0);
                return rightQty - leftQty;
            }

            const leftTime = new Date(left.created_at).getTime();
            const rightTime = new Date(right.created_at).getTime();
            return rightTime - leftTime;
        });

        return filtered.slice(0, 60);
    }, [scanUniverse, scannerState, spreadBySlice]);

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

    const prefillAlertFromScan = useCallback((row: ScannerRow) => {
        let productId = row.product_id || '';
        if (!productId && row.market_product) {
            productId = products.find((product) => product.market_product === row.market_product)?.id || '';
        }

        if (!productId) {
            addToast({
                type: 'warning',
                title: 'Cannot prefill alert',
                message: 'No catalog product was matched for this listing.',
            });
            return;
        }

        setFormProductId(productId);
        setFormDpId(row.delivery_point_id || '');
        setFormDirection(row.side === 'ASK' ? 'below' : 'above');
        setFormThreshold(Number(row.price_per_mt_usd));
        setShowForm(true);
    }, [addToast, products]);

    const getProductName = (alert: PriceAlert) =>
        alert.product_name
            || (alert.market_product ? getProductDisplayNameFromReference(alert.market_product, products) : '')
            || getProductDisplayNameFromReference(alert.product_id, products);
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
            <div className="v-card p-5 lg:p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <SlidersHorizontal size={14} />
                            Market Scanner
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            TradingView-style scans for actionable slices, tuned to benchmark edge and liquidity.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <VerdaxisSelect
                            ariaLabel="Scanner refresh cadence"
                            value={String(scannerState.cadenceSeconds)}
                            onChange={(value) => updateScannerState({ cadenceSeconds: Number(value) as ScannerState['cadenceSeconds'] })}
                            options={[
                                { value: '0', label: 'Manual' },
                                { value: '10', label: 'Every 10s' },
                                { value: '30', label: 'Every 30s' },
                                { value: '60', label: 'Every 60s' },
                            ]}
                        />
                        <button
                            onClick={() => void refreshScanner()}
                            disabled={scanLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                        >
                            <RefreshCw size={12} className={scanLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {Object.entries(SCANNER_PRESETS).map(([id, preset]) => (
                        <button
                            key={id}
                            onClick={() => applyScannerPreset(id as ScannerPresetId)}
                            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                                scannerPresetId === id
                                    ? 'border-[#5DADE2] bg-[#5DADE2]/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                            }`}
                        >
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-100">{preset.label}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{preset.description}</div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Side</label>
                        <VerdaxisSelect
                            ariaLabel="Scanner side"
                            value={scannerState.side}
                            onChange={(value) => updateScannerState({ side: value as ScannerSide })}
                            options={[
                                { value: 'BOTH', label: 'Both sides' },
                                { value: 'ASK', label: 'Asks only' },
                                { value: 'BID', label: 'Bids only' },
                            ]}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Availability Window</label>
                        <VerdaxisSelect
                            ariaLabel="Scanner availability window"
                            value={scannerState.availabilityWindow}
                            onChange={(value) => updateScannerState({ availabilityWindow: value })}
                            options={[
                                { value: '', label: 'Any window' },
                                ...scannerWindowOptions,
                            ]}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Min Remaining (MT)</label>
                        <input
                            type="number"
                            min={0}
                            value={scannerState.minRemainingQuantityMt}
                            onChange={(event) => updateScannerState({ minRemainingQuantityMt: Math.max(0, Number(event.target.value) || 0) })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Sort By</label>
                        <VerdaxisSelect
                            ariaLabel="Scanner sort"
                            value={scannerState.sortBy}
                            onChange={(value) => updateScannerState({ sortBy: value as ScannerSortBy })}
                            options={[
                                { value: 'BENCHMARK_EDGE', label: 'Benchmark edge' },
                                { value: 'PRICE', label: 'Price' },
                                { value: 'SIZE', label: 'Size' },
                                { value: 'NEWEST', label: 'Newest first' },
                            ]}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Min Benchmark Edge (USD/MT)</label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={scannerState.minBenchmarkEdgeUsd}
                            onChange={(event) => updateScannerState({ minBenchmarkEdgeUsd: Math.max(0, Number(event.target.value) || 0) })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Max Spread (USD/MT)</label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={scannerState.maxSpreadUsd ?? ''}
                            onChange={(event) => {
                                const raw = event.target.value;
                                updateScannerState({ maxSpreadUsd: raw === '' ? null : Math.max(0, Number(raw) || 0) });
                            }}
                            placeholder="Any"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2]"
                        />
                    </div>
                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                            <input
                                type="checkbox"
                                checked={scannerState.requireCertification}
                                onChange={(event) => updateScannerState({ requireCertification: event.target.checked })}
                                className="rounded border-slate-300 dark:border-slate-600 text-[#5DADE2] focus:ring-[#5DADE2]"
                            />
                            Certified listings only
                        </label>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-end">
                        {scanLastUpdated ? `Last update: ${new Date(scanLastUpdated).toLocaleTimeString()}` : 'No scan data yet'}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Products</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-auto pr-1">
                            {scannerProductOptions.map((option) => (
                                <label key={option.value} className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={scannerState.selectedProducts.includes(option.value)}
                                        onChange={() => toggleScannerMultiSelect('selectedProducts', option.value)}
                                        className="rounded border-slate-300 dark:border-slate-600 text-[#5DADE2] focus:ring-[#5DADE2]"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Ports</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-auto pr-1">
                            {scannerPortOptions.map((option) => (
                                <label key={option.value} className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={scannerState.selectedPorts.includes(option.value)}
                                        onChange={() => toggleScannerMultiSelect('selectedPorts', option.value)}
                                        className="rounded border-slate-300 dark:border-slate-600 text-[#5DADE2] focus:ring-[#5DADE2]"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {scanError && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        {scanError}
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>{scannedRows.length} matching listings</span>
                        <span>Preset: {scannerPresetId === 'CUSTOM' ? 'Custom' : SCANNER_PRESETS[scannerPresetId].label}</span>
                    </div>
                    {scanLoading ? (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            <Loader2 className="inline-block animate-spin mr-2" size={14} />
                            Running scan...
                        </div>
                    ) : scannedRows.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            No listings match the current scan settings.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="px-3 py-2">Product</th>
                                        <th className="px-3 py-2">Port</th>
                                        <th className="px-3 py-2">Window</th>
                                        <th className="px-3 py-2">Side</th>
                                        <th className="px-3 py-2">Price</th>
                                        <th className="px-3 py-2 text-right">Remaining</th>
                                        <th className="px-3 py-2 text-right">Spread</th>
                                        <th className="px-3 py-2">Cert</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {scannedRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                                                {getProductDisplayNameFromReference(row.productRef, products) || row.fuel_type}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                                {getDpName(row.delivery_point_id)}
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                                {formatAvailabilityWindow(row.availability_window)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    row.side === 'ASK'
                                                        ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300'
                                                        : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300'
                                                }`}>
                                                    {row.side}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <BenchmarkPriceBlock
                                                    priceUsd={Number(row.price_per_mt_usd)}
                                                    benchmarkUsd={row.benchmarkUsd}
                                                    deltaUsd={row.deltaUsd}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">
                                                {Number(row.remaining_quantity_mt || row.quantity_mt || 0).toLocaleString()} MT
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                                                {row.spreadUsd == null ? 'N/A' : `$${row.spreadUsd.toFixed(2)}`}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                                {row.certDeclared ? 'Yes' : 'No'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={() => prefillAlertFromScan(row)}
                                                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-md bg-[#5DADE2] hover:bg-[#4A9BD9] text-white transition-colors"
                                                >
                                                    Create Alert
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

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
                            <VerdaxisSelect
                                ariaLabel="Price alert fuel"
                                value={formProductId}
                                onChange={setFormProductId}
                                options={[
                                    { value: '', label: 'Select fuel...' },
                                    ...products
                                        .filter((product) => product.is_active)
                                        .map((product) => ({ value: product.id, label: getProductDisplayName(product) })),
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Port</label>
                            <VerdaxisSelect
                                ariaLabel="Price alert port"
                                value={formDpId}
                                onChange={setFormDpId}
                                options={[{ value: '', label: 'Any port' }, ...deliveryPoints.map(dp => ({ value: dp.id, label: dp.name }))]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Direction</label>
                            <VerdaxisSelect
                                ariaLabel="Price alert direction"
                                value={formDirection}
                                onChange={value => setFormDirection(value as 'above' | 'below')}
                                options={[{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }]}
                            />
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
