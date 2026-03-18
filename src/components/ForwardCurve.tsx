import React, { useState, useEffect, useCallback } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
} from 'recharts';
import { Download, RefreshCw, TrendingUp, Lock } from 'lucide-react';
import { api } from '../services/api';
import { Product, ForwardCurveResponse, Subscription } from '../types';
import { useNamespace } from '../hooks/useNamespace';

interface ForwardCurveProps {
    initialProductId?: string;
}

const REFRESH_INTERVAL_MS = 30_000;

const CustomTooltip = ({ active, payload, label, tFn }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div style={{
            background: 'var(--ocean, #0A1628)',
            border: '1px solid var(--sonar, #0066FF)',
            borderRadius: 6,
            padding: '10px 14px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: 'var(--bio, #00D4AA)',
            minWidth: 180,
        }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#e5e5e5' }}>{label}</div>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: entry.color }}>
                    <span>{entry.name}:</span>
                    <span style={{ fontWeight: 700 }}>
                        {entry.value != null ? `$${Number(entry.value).toFixed(2)}` : '—'}
                    </span>
                </div>
            ))}
            {payload[0]?.payload?.spread != null && (
                <div style={{ marginTop: 4, color: '#888', fontSize: 10 }}>
                    {tFn ? tFn('forwardCurve.spread') : 'Spread:'} ${Number(payload[0].payload.spread).toFixed(2)}
                </div>
            )}
            {payload[0]?.payload?.volume_mt != null && (
                <div style={{ color: '#888', fontSize: 10 }}>
                    {tFn ? tFn('forwardCurve.vol') : 'Vol:'} {Number(payload[0].payload.volume_mt).toLocaleString()} MT
                    {payload[0]?.payload?.order_count != null && ` · ${payload[0].payload.order_count} ${tFn ? tFn('forwardCurve.orders') : 'orders'}`}
                </div>
            )}
        </div>
    );
};

export const ForwardCurve: React.FC<ForwardCurveProps> = ({ initialProductId }) => {
    const { t, ready } = useNamespace('dashboard');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
    const [curveData, setCurveData] = useState<ForwardCurveResponse | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Load products on mount
    useEffect(() => {
        api.catalog.products()
            .then(prods => {
                const active = prods.filter(p => p.is_active);
                setProducts(active);
                if (!selectedProductId && active.length > 0) {
                    setSelectedProductId(active[0].id);
                }
            })
            .catch(console.error);

        // Load subscription tier
        api.subscriptions.me()
            .then(setSubscription)
            .catch(() => setSubscription({ id: '', org_id: '', tier: 'free', is_active: true }));
    }, []);

    const fetchCurve = useCallback(async () => {
        if (!selectedProductId) return;
        setLoading(true);
        try {
            const data = await api.curves.forward({ product_id: selectedProductId });
            setCurveData(data);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Failed to load forward curve', e);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId]);

    // Fetch on product change
    useEffect(() => {
        fetchCurve();
    }, [fetchCurve]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchCurve, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchCurve]);

    const handleExport = () => {
        if (!selectedProductId) return;
        const isFree = !subscription || subscription.tier === 'free';
        if (isFree) {
            // Show upgrade CTA — open in new tab pointing to a pricing page
            window.open('/pricing', '_blank');
            return;
        }
        const url = api.curves.exportCsvUrl(selectedProductId);
        window.open(url, '_blank');
    };

    const isFree = !subscription || subscription.tier === 'free';
    const chartPoints = curveData?.curve ?? [];

    if (!ready) return null;

    return (
        <div style={{
            background: 'var(--ocean, #0A1628)',
            border: '1px solid rgba(0,102,255,0.15)',
            borderRadius: 8,
            padding: '16px',
            fontFamily: "'IBM Plex Mono', monospace",
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={14} color="var(--bio, #00D4AA)" />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888' }}>
                        {t('forwardCurve.title')}
                    </span>
                    {lastRefresh && (
                        <span style={{ fontSize: 10, color: '#555' }}>
                            {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Product selector */}
                    <select
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                        style={{
                            background: '#050A14',
                            border: '1px solid rgba(0,102,255,0.3)',
                            borderRadius: 4,
                            color: '#e5e5e5',
                            fontSize: 11,
                            padding: '4px 8px',
                            fontFamily: "'IBM Plex Mono', monospace",
                        }}
                    >
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {/* Refresh button */}
                    <button
                        onClick={fetchCurve}
                        disabled={loading}
                        title={t('forwardCurve.refresh')}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(0,102,255,0.3)',
                            borderRadius: 4,
                            color: '#888',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={handleExport}
                        style={{
                            background: isFree ? 'rgba(255,176,32,0.1)' : 'rgba(0,102,255,0.1)',
                            border: `1px solid ${isFree ? 'rgba(255,176,32,0.3)' : 'rgba(0,102,255,0.3)'}`,
                            borderRadius: 4,
                            color: isFree ? 'var(--amber, #FFB020)' : 'var(--sonar, #0066FF)',
                            fontSize: 10,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 700,
                        }}
                    >
                        {isFree ? <Lock size={10} /> : <Download size={10} />}
                        {isFree ? t('forwardCurve.upgrade') : t('forwardCurve.exportCsv')}
                    </button>
                </div>
            </div>

            {/* Chart */}
            {loading && chartPoints.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                    <span style={{ fontSize: 12 }}>{t('forwardCurve.loading')}</span>
                </div>
            ) : chartPoints.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                    <span style={{ fontSize: 12 }}>{t('forwardCurve.noData')}</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartPoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid
                            strokeDasharray="2 2"
                            strokeOpacity={0.15}
                            vertical={false}
                            stroke="var(--sonar, #0066FF)"
                        />
                        <XAxis
                            dataKey="availability_window"
                            tick={{ fontSize: 10, fill: '#666', fontFamily: "'IBM Plex Mono', monospace" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            orientation="right"
                            tick={{ fontSize: 10, fill: '#666', fontFamily: "'IBM Plex Mono', monospace" }}
                            tickLine={false}
                            axisLine={false}
                            domain={['dataMin - 5', 'dataMax + 5']}
                            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                        />
                        <RechartsTooltip content={<CustomTooltip tFn={t} />} />
                        <Legend
                            iconSize={8}
                            wrapperStyle={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#888', paddingTop: 8 }}
                        />
                        <Bar
                            dataKey="best_bid"
                            name={t('forwardCurve.bestBid')}
                            fill="rgba(0, 212, 170, 0.35)"
                            stroke="var(--bio, #00D4AA)"
                            strokeWidth={1}
                            radius={[2, 2, 0, 0]}
                        />
                        <Bar
                            dataKey="best_ask"
                            name={t('forwardCurve.bestAsk')}
                            fill="rgba(255, 59, 59, 0.25)"
                            stroke="var(--danger, #FF3B3B)"
                            strokeWidth={1}
                            radius={[2, 2, 0, 0]}
                        />
                        <Line
                            type="monotone"
                            dataKey="mid_price"
                            name={t('forwardCurve.midPrice')}
                            stroke="var(--sonar, #0066FF)"
                            strokeWidth={2}
                            dot={{ r: 3, fill: 'var(--sonar, #0066FF)', stroke: '#050A14' }}
                            activeDot={{ r: 5, fill: 'var(--sonar, #0066FF)', stroke: '#050A14' }}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}

            {/* Product name subtitle */}
            {curveData && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#555', textAlign: 'right' }}>
                    {curveData.product_name} · updated {new Date(curveData.generated_at).toLocaleTimeString('en-US', { hour12: false })}
                </div>
            )}
        </div>
    );
};
