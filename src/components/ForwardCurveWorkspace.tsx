import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, Maximize2, RefreshCw, Target, TrendingUp, X } from 'lucide-react';

import { api } from '../services/api';
import { MARKET_PRODUCTS } from '../types';
import type { ForwardCurveBoardCell, ForwardCurveBoardResponse, MarketProduct, Page, TradeTapeEntry } from '../types';
import { formatAvailabilityWindowPeriod, getAvailabilityWindowOptions, normalizeAvailabilityWindow } from '../utils/availabilityWindow';
import { formatMarketProduct } from '../utils/marketProduct';

interface ForwardCurveWorkspaceProps {
    onNavigate?: (page: Page) => void;
}

const WINDOW_STORAGE_KEY = 'verdaxis_forward_curve_window';
const PRODUCT_STORAGE_KEY = 'verdaxis_forward_curve_product';
const DELIVERY_POINT_STORAGE_KEY = 'verdaxis_forward_curve_delivery_point';
const REFRESH_INTERVAL_MS = 30_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isMarketProduct = (value: string | null): value is MarketProduct =>
    MARKET_PRODUCTS.includes(value as MarketProduct);

const currency = (value: number | string | null | undefined) => {
    if (value == null || value === '') return '--';
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '--';
    return `$${numberValue.toFixed(0)}`;
};

const numberOrNull = (value: number | string | null | undefined) => {
    if (value == null || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const quantity = (value: number | string | null | undefined) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) return '--';
    if (numberValue >= 1000) return `${(numberValue / 1000).toFixed(1)}k MT`;
    return `${numberValue.toLocaleString()} MT`;
};

const sourceLabel = (source: string | null | undefined, isDemo: boolean) => {
    if (isDemo) return 'Demo reference';
    if (!source) return 'No reference';
    return source.replace(/_/g, ' ');
};

const marketSliceKey = (marketProduct: MarketProduct | string | undefined, deliveryPointId: string | undefined, availabilityWindow: string | undefined) =>
    [marketProduct || '', deliveryPointId || '', availabilityWindow || ''].map(value => value.trim().toLowerCase()).join('|');

const tradeSliceKey = (marketProduct: MarketProduct | string | undefined, deliveryPointName: string | undefined, availabilityWindow: string | undefined) =>
    [marketProduct || '', deliveryPointName || '', availabilityWindow || ''].map(value => value.trim().toLowerCase()).join('|');

function getStoredWindow() {
    if (typeof window === 'undefined') return 'SPOT';
    return normalizeAvailabilityWindow(localStorage.getItem(WINDOW_STORAGE_KEY));
}

function getStoredProduct(): MarketProduct {
    if (typeof window === 'undefined') return 'BIO_METHANOL';
    const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
    return isMarketProduct(stored) ? stored : 'BIO_METHANOL';
}

function getStoredDeliveryPointId() {
    if (typeof window === 'undefined') return undefined;
    const stored = localStorage.getItem(DELIVERY_POINT_STORAGE_KEY);
    return stored && UUID_PATTERN.test(stored) ? stored : undefined;
}

function buildWindowOptions() {
    const options = getAvailabilityWindowOptions({ quarterCount: 8 });
    const year = new Date().getUTCFullYear();
    return [
        ...options,
        { value: `${year + 1}-CAL`, label: `CAL ${year + 1}`, summaryLabel: `CAL ${year + 1}`, kind: 'calendar' as const },
        { value: `${year + 2}-CAL`, label: `CAL ${year + 2}`, summaryLabel: `CAL ${year + 2}`, kind: 'calendar' as const },
    ];
}

function makePath(points: Array<{ x: number; y: number }>) {
    if (!points.length) return '';
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

const CurveChart: React.FC<{ points: ForwardCurveBoardCell[] }> = ({ points }) => {
    const chart = useMemo(() => {
        const visible = points.filter(point => (
            numberOrNull(point.benchmark_mid) != null
            || numberOrNull(point.best_bid) != null
            || numberOrNull(point.best_ask) != null
        ));
        const values = visible.flatMap(point => [
            numberOrNull(point.benchmark_mid),
            numberOrNull(point.best_bid),
            numberOrNull(point.best_ask),
        ]).filter((value): value is number => value != null);

        if (!visible.length || !values.length) {
            return { visible, benchmarkPath: '', bidPath: '', askPath: '', min: 0, max: 0 };
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = Math.max((max - min) * 0.12, 10);
        const yMin = min - padding;
        const yMax = max + padding;
        const width = 760;
        const height = 210;
        const xFor = (index: number) => 36 + (index * ((width - 72) / Math.max(visible.length - 1, 1)));
        const yFor = (value: number) => 18 + ((yMax - value) / Math.max(yMax - yMin, 1)) * (height - 42);
        const toSeries = (getter: (point: ForwardCurveBoardCell) => number | null) => visible
            .map((point, index) => {
                const value = getter(point);
                return value == null ? null : { x: xFor(index), y: yFor(value) };
            })
            .filter((point): point is { x: number; y: number } => point != null);

        return {
            visible,
            benchmarkPath: makePath(toSeries(point => numberOrNull(point.benchmark_mid))),
            bidPath: makePath(toSeries(point => numberOrNull(point.best_bid))),
            askPath: makePath(toSeries(point => numberOrNull(point.best_ask))),
            min: yMin,
            max: yMax,
        };
    }, [points]);

    if (!chart.visible.length) {
        return (
            <div className="h-[240px] flex items-center justify-center border border-slate-800 bg-[#05080d] text-xs text-slate-500">
                No curve data for this market yet.
            </div>
        );
    }

    return (
        <div className="border border-slate-800 bg-[#05080d]">
            <svg viewBox="0 0 760 240" className="w-full h-[260px]" role="img" aria-label="Indicative forward curve">
                <rect x="0" y="0" width="760" height="240" fill="#05080d" />
                {[0, 1, 2, 3].map(index => (
                    <line key={index} x1="36" x2="724" y1={24 + index * 48} y2={24 + index * 48} stroke="#182335" strokeWidth="1" />
                ))}
                {chart.askPath && <path d={chart.askPath} fill="none" stroke="#fb7185" strokeWidth="1.4" opacity="0.78" />}
                {chart.bidPath && <path d={chart.bidPath} fill="none" stroke="#34d399" strokeWidth="1.4" opacity="0.78" />}
                {chart.benchmarkPath && <path d={chart.benchmarkPath} fill="none" stroke="#60a5fa" strokeWidth="2.8" />}
                {chart.visible.map((point, index) => {
                    const x = 36 + (index * (688 / Math.max(chart.visible.length - 1, 1)));
                    return (
                        <g key={`${point.availability_window}-${index}`}>
                            <line x1={x} x2={x} y1="18" y2="198" stroke="#101827" strokeWidth="1" />
                            <text x={x} y="224" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                                {formatAvailabilityWindowPeriod(point.availability_window)}
                            </text>
                        </g>
                    );
                })}
                <text x="44" y="30" fill="#64748b" fontSize="10" fontFamily="monospace">{currency(chart.max)}</text>
                <text x="44" y="196" fill="#64748b" fontSize="10" fontFamily="monospace">{currency(chart.min)}</text>
            </svg>
        </div>
    );
};

const PeriodDetailGraph: React.FC<{ cell: ForwardCurveBoardCell | null }> = ({ cell }) => {
    const graph = useMemo(() => {
        if (!cell) return null;

        const markers = [
            { key: 'bid', label: 'Bid', value: numberOrNull(cell.best_bid), className: 'bg-emerald-300', textClassName: 'text-emerald-300' },
            { key: 'benchmark', label: 'Benchmark', value: numberOrNull(cell.benchmark_mid), className: 'bg-blue-300', textClassName: 'text-blue-300' },
            { key: 'ask', label: 'Ask', value: numberOrNull(cell.best_ask), className: 'bg-rose-300', textClassName: 'text-rose-300' },
        ].filter((marker): marker is {
            key: string;
            label: string;
            value: number;
            className: string;
            textClassName: string;
        } => marker.value != null);

        if (markers.length < 2) return { markers, min: null, max: null, range: 0 };

        const rawMin = Math.min(...markers.map(marker => marker.value));
        const rawMax = Math.max(...markers.map(marker => marker.value));
        const padding = Math.max((rawMax - rawMin) * 0.16, 6);

        return {
            markers,
            min: rawMin - padding,
            max: rawMax + padding,
            range: Math.max((rawMax + padding) - (rawMin - padding), 1),
        };
    }, [cell]);

    if (!cell || !graph) {
        return (
            <div data-tour="forward-period-detail" className="border-t border-slate-800 px-3 py-4 text-[11px] text-slate-500">
                Select a matrix cell to inspect a single market period.
            </div>
        );
    }

    return (
        <div data-tour="forward-period-detail" className="border-t border-slate-800 px-3 py-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Indicative Period Range</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        {formatMarketProduct(cell.market_product)} · {cell.delivery_point_name} · {formatAvailabilityWindowPeriod(cell.availability_window)}
                    </div>
                </div>
                <div className="text-right text-[10px] uppercase tracking-wider text-slate-500">
                    <div>{cell.order_count} orders</div>
                    <div>{quantity(cell.volume_mt)}</div>
                </div>
            </div>

            {graph.min == null || graph.max == null ? (
                <div className="flex min-h-20 items-center justify-center border border-slate-800 bg-[#05080d] text-center text-[11px] text-slate-500">
                    Not enough bid/ask context yet.
                </div>
            ) : (
                <div className="border border-slate-800 bg-[#05080d] px-3 py-4">
                    <div className="relative h-10">
                        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-700" />
                        {graph.markers.map(marker => {
                            const left = ((marker.value - graph.min!) / graph.range) * 100;
                            return (
                                <div
                                    key={marker.key}
                                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: `${Math.min(100, Math.max(0, left))}%` }}
                                >
                                    <div className={`mx-auto h-3 w-3 rounded-full ${marker.className}`} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-5 flex items-center justify-between font-mono text-[10px] text-slate-500">
                        <span>{currency(graph.min)}</span>
                        <span>{currency(graph.max)}</span>
                    </div>
                </div>
            )}

            {graph.markers.length > 0 && (
                <dl className="mt-3 grid grid-cols-3 gap-px bg-slate-900">
                    {graph.markers.map(marker => (
                        <div key={marker.key} className="min-w-0 bg-[#080c13] p-2">
                            <dt className={`truncate text-[9px] font-bold uppercase tracking-wider ${marker.textClassName}`}>{marker.label}</dt>
                            <dd className="mt-1 font-mono text-sm font-bold text-slate-100">{currency(marker.value)}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <div className="mt-3 grid grid-cols-3 gap-px bg-slate-900">
                <div className="bg-[#080c13] p-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Spread</div>
                    <div className="mt-1 font-mono text-sm font-bold text-slate-200">{currency(cell.spread)}</div>
                </div>
                <div className="bg-[#080c13] p-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Volume</div>
                    <div className="mt-1 font-mono text-sm font-bold text-slate-200">{quantity(cell.volume_mt)}</div>
                </div>
                <div className="bg-[#080c13] p-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Benchmark Source</div>
                    <div className="mt-1 truncate text-[10px] font-bold uppercase text-slate-300">
                        {sourceLabel(cell.benchmark_source, cell.is_demo_benchmark)}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SignalStatus {
    label: string;
    status: 'available' | 'empty' | 'refreshing' | 'unavailable';
    detail: string;
}

const SignalReadiness: React.FC<{ signals: SignalStatus[] }> = ({ signals }) => (
    <div className="grid gap-px bg-slate-900">
        {signals.map(signal => (
            <div key={signal.label} className="grid grid-cols-[minmax(0,1fr)_112px] gap-3 bg-[#080c13] px-3 py-2 text-[11px]">
                <div className="min-w-0">
                    <div className="font-bold uppercase tracking-wider text-slate-300">{signal.label}</div>
                    <div className="mt-0.5 text-slate-500">{signal.detail}</div>
                </div>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    signal.status === 'available'
                        ? 'text-emerald-300'
                        : signal.status === 'refreshing'
                            ? 'text-blue-300'
                            : signal.status === 'empty'
                                ? 'text-slate-400'
                                : 'text-amber-300'
                }`}>
                    {signal.status === 'available' && <CheckCircle2 size={12} aria-hidden="true" />}
                    {signal.status === 'refreshing' && <RefreshCw size={12} className="animate-spin" aria-hidden="true" />}
                    {signal.status === 'available' ? 'Available' : signal.status === 'refreshing' ? 'Refreshing' : signal.status === 'empty' ? 'No data' : 'No feed'}
                </div>
            </div>
        ))}
    </div>
);

const PeriodDrilldownDialog: React.FC<{
    cell: ForwardCurveBoardCell | null;
    depthBids: ForwardCurveBoardResponse['focus']['depth_bids'];
    depthAsks: ForwardCurveBoardResponse['focus']['depth_asks'];
    depthReady: boolean;
    trades: TradeTapeEntry[];
    tradesReady: boolean;
    open: boolean;
    onClose: () => void;
}> = ({ cell, depthBids, depthAsks, depthReady, trades, tradesReady, open, onClose }) => {
    const titleId = useId();
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        window.setTimeout(() => closeButtonRef.current?.focus(), 0);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus();
        };
    }, [onClose, open]);

    const signals = useMemo<SignalStatus[]>(() => {
        if (!cell) return [];
        const depthCount = depthBids.length + depthAsks.length;

        return [
            {
                label: 'Benchmark',
                status: numberOrNull(cell.benchmark_mid) == null ? 'empty' : 'available',
                detail: sourceLabel(cell.benchmark_source, cell.is_demo_benchmark),
            },
            {
                label: 'Latest bid context',
                status: numberOrNull(cell.best_bid) == null ? 'empty' : 'available',
                detail: numberOrNull(cell.best_bid) == null ? 'No bid context for this period' : currency(cell.best_bid),
            },
            {
                label: 'Latest ask context',
                status: numberOrNull(cell.best_ask) == null ? 'empty' : 'available',
                detail: numberOrNull(cell.best_ask) == null ? 'No ask context for this period' : currency(cell.best_ask),
            },
            {
                label: 'Selected depth',
                status: !depthReady ? 'refreshing' : depthCount > 0 ? 'available' : 'empty',
                detail: !depthReady ? 'Refreshing selected slice depth' : depthCount > 0 ? `${depthCount} visible depth levels` : 'No depth levels for this selected slice',
            },
            {
                label: 'Confirmed prints',
                status: !tradesReady ? 'refreshing' : trades.length > 0 ? 'available' : 'empty',
                detail: !tradesReady ? 'Refreshing confirmed 7-day prints' : trades.length > 0 ? `${trades.length} confirmed prints in last 7 days` : 'No confirmed trades in the last 7 days',
            },
            {
                label: 'Indications',
                status: 'unavailable',
                detail: 'No indications feed connected yet',
            },
            {
                label: 'Physical stems',
                status: 'unavailable',
                detail: 'No stems feed connected yet',
            },
            {
                label: 'Fair-value band',
                status: 'unavailable',
                detail: 'No model-derived fair-value band yet',
            },
        ];
    }, [cell, depthAsks.length, depthBids.length, depthReady, trades.length, tradesReady]);

    if (!open || !cell) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div
                className="absolute inset-0 cursor-default"
                aria-hidden="true"
                onClick={onClose}
            />
            <div className="relative z-[1] flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-slate-700 bg-[#05070b] text-slate-100 shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
                    <div>
                        <div id={titleId} className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Single-Period Drilldown</div>
                        <div className="mt-1 text-xl font-bold">
                            {formatMarketProduct(cell.market_product)} - {cell.delivery_point_name}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                            {formatAvailabilityWindowPeriod(cell.availability_window)} · {cell.region}
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="rounded border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        aria-label="Close period drilldown"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="grid min-h-0 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <section className="min-w-0 border border-slate-800 bg-[#080c13]">
                        <div className="border-b border-slate-800 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Price Context</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">Benchmark, bid and ask context for the selected period.</div>
                        </div>
                        <PeriodDetailGraph cell={cell} />
                    </section>

                    <section className="min-w-0 border border-slate-800 bg-[#080c13]">
                        <div className="border-b border-slate-800 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Signal Readiness</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">Unavailable signals are labelled as missing feeds, not inferred values.</div>
                        </div>
                        <SignalReadiness signals={signals} />
                    </section>
                </div>
            </div>
        </div>
    );
};

const DepthPanel: React.FC<{ board: ForwardCurveBoardResponse }> = ({ board }) => {
    const bids = board.focus.depth_bids;
    const asks = board.focus.depth_asks;
    const rowCount = Math.max(bids.length, asks.length, 5);

    return (
        <section data-tour="forward-depth-panel" className="border border-slate-800 bg-[#080c13]">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Selected Slice Depth</span>
                <span className="text-[10px] text-slate-500">{formatAvailabilityWindowPeriod(board.availability_window)}</span>
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-px bg-slate-900 text-[10px]">
                <div className="bg-[#080c13] px-3 py-1 font-bold uppercase tracking-widest text-emerald-400">Bids</div>
                <div className="bg-[#080c13] px-3 py-1 text-right font-bold uppercase tracking-widest text-rose-400">Asks</div>
            </div>
            <div>
                {Array.from({ length: rowCount }).map((_, index) => {
                    const bid = bids[index];
                    const ask = asks[index];
                    return (
                        <div key={index} className="grid grid-cols-[1fr_1fr] gap-px bg-slate-900 text-[11px]">
                            <div className="bg-[#080c13] px-3 py-1.5 font-mono text-emerald-300">
                                {bid ? `${currency(bid.price_per_mt_usd)} / ${quantity(bid.quantity_mt)}` : '--'}
                            </div>
                            <div className="bg-[#080c13] px-3 py-1.5 text-right font-mono text-rose-300">
                                {ask ? `${currency(ask.price_per_mt_usd)} / ${quantity(ask.quantity_mt)}` : '--'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const TradeTapePanel: React.FC<{ trades: TradeTapeEntry[]; loading: boolean }> = ({ trades, loading }) => (
    <section data-tour="forward-trade-tape" className="border border-slate-800 bg-[#080c13]">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Trade Tape</span>
            <span className="text-[10px] text-slate-500">24h market · 7D confirmed trades</span>
        </div>
        <div className="divide-y divide-slate-900">
            {loading ? (
                <div className="px-3 py-8 text-center text-[11px] text-slate-500">Loading recent prints...</div>
            ) : trades.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] text-slate-500">No confirmed trades in the last 7 days for this selected slice.</div>
            ) : trades.map(trade => (
                <div key={trade.id} className="grid grid-cols-[72px_1fr_auto] gap-2 px-3 py-2 text-[11px]">
                    <span className="font-mono text-slate-500">{new Date(trade.confirmed_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="truncate text-slate-300">
                        {quantity(trade.quantity_mt)}
                        {trade.is_demo_trade && (
                            <span
                                className="ml-1 text-[9px] font-bold uppercase text-amber-300"
                                aria-label="Demo trade seeded for platform preview. Not user-posted liquidity."
                            >
                                Demo
                            </span>
                        )}
                    </span>
                    <span className="font-mono font-bold text-blue-300">{currency(trade.price_per_mt_usd)}</span>
                </div>
            ))}
        </div>
    </section>
);

export const ForwardCurveWorkspace: React.FC<ForwardCurveWorkspaceProps> = ({ onNavigate }) => {
    const [selectedWindow, setSelectedWindow] = useState(() => getStoredWindow());
    const [focusMarketProduct, setFocusMarketProduct] = useState<MarketProduct>(() => getStoredProduct());
    const [focusDeliveryPointId, setFocusDeliveryPointId] = useState<string | undefined>(() => getStoredDeliveryPointId());
    const [board, setBoard] = useState<ForwardCurveBoardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trades, setTrades] = useState<TradeTapeEntry[]>([]);
    const [tradeLoading, setTradeLoading] = useState(false);
    const [tradeDataSliceKey, setTradeDataSliceKey] = useState<string | null>(null);
    const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
    const windowOptions = useMemo(() => buildWindowOptions(), []);
    const closePeriodDialog = useCallback(() => setPeriodDialogOpen(false), []);

    const fetchBoard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.curves.board({
                availability_window: selectedWindow,
                focus_market_product: focusMarketProduct,
                focus_delivery_point_id: focusDeliveryPointId,
            });
            setBoard(response);
            if (!focusDeliveryPointId) {
                setFocusDeliveryPointId(response.focus.delivery_point_id);
                localStorage.setItem(DELIVERY_POINT_STORAGE_KEY, response.focus.delivery_point_id);
            }
        } catch (err) {
            console.error('Failed to load forward curve board', err);
            setError('Forward Curve board is unavailable.');
        } finally {
            setLoading(false);
        }
    }, [focusDeliveryPointId, focusMarketProduct, selectedWindow]);

    useEffect(() => {
        localStorage.setItem(WINDOW_STORAGE_KEY, selectedWindow);
        localStorage.setItem(PRODUCT_STORAGE_KEY, focusMarketProduct);
        if (focusDeliveryPointId) localStorage.setItem(DELIVERY_POINT_STORAGE_KEY, focusDeliveryPointId);
        fetchBoard();
        const interval = setInterval(fetchBoard, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchBoard, focusDeliveryPointId, focusMarketProduct, selectedWindow]);

    const focusedCell = useMemo(() => {
        if (!board) return null;

        const selectedDeliveryPointId = focusDeliveryPointId ?? board.focus.delivery_point_id;
        return board.ports
            .flatMap(port => port.cells)
            .find(cell => cell.market_product === focusMarketProduct && cell.delivery_point_id === selectedDeliveryPointId)
            ?? board.ports
                .flatMap(port => port.cells)
                .find(cell => cell.market_product === board.focus.market_product && cell.delivery_point_id === board.focus.delivery_point_id)
            ?? null;
    }, [board, focusDeliveryPointId, focusMarketProduct]);

    const selectedDepthSliceKey = focusedCell
        ? marketSliceKey(focusedCell.market_product, focusedCell.delivery_point_id, focusedCell.availability_window)
        : null;
    const boardDepthSliceKey = board
        ? marketSliceKey(board.focus.market_product, board.focus.delivery_point_id, board.focus.availability_window)
        : null;
    const depthReadyForSelected = Boolean(selectedDepthSliceKey && boardDepthSliceKey === selectedDepthSliceKey && !loading);
    const selectedTradeSliceKey = focusedCell
        ? tradeSliceKey(focusedCell.market_product, focusedCell.delivery_point_name, focusedCell.availability_window)
        : null;
    const tradesReadyForSelected = Boolean(selectedTradeSliceKey && tradeDataSliceKey === selectedTradeSliceKey && !tradeLoading);
    const visibleTrades = tradesReadyForSelected ? trades : [];

    useEffect(() => {
        let cancelled = false;
        const fetchTrades = async () => {
            if (!board) return;
            const marketProduct = focusedCell?.market_product ?? board.focus.market_product;
            const deliveryPointName = focusedCell?.delivery_point_name ?? board.focus.delivery_point_name;
            const availabilityWindow = focusedCell?.availability_window ?? board.availability_window;
            const sliceKey = tradeSliceKey(marketProduct, deliveryPointName, availabilityWindow);
            setTradeLoading(true);
            setTradeDataSliceKey(null);
            try {
                const response = await api.tradeTape.list({
                    market_product: marketProduct,
                    region: deliveryPointName,
                    availability_window: availabilityWindow,
                    limit: 8,
                });
                if (!cancelled) {
                    setTrades(response.items ?? []);
                    setTradeDataSliceKey(sliceKey);
                }
            } catch (err) {
                console.error('Failed to load forward curve trade tape', err);
                if (!cancelled) {
                    setTrades([]);
                    setTradeDataSliceKey(sliceKey);
                }
            } finally {
                if (!cancelled) setTradeLoading(false);
            }
        };
        fetchTrades();
        return () => {
            cancelled = true;
        };
    }, [board, focusedCell?.availability_window, focusedCell?.delivery_point_name, focusedCell?.market_product]);

    const openMarketplace = () => {
        if (!board) return;
        const marketProduct = focusedCell?.market_product ?? board.focus.market_product;
        const deliveryPointName = focusedCell?.delivery_point_name ?? board.focus.delivery_point_name;
        localStorage.setItem('verdaxis_marketplace_port', deliveryPointName);
        localStorage.setItem('verdaxis_marketplace_product', marketProduct);
        localStorage.setItem('verdaxis_marketplace_fuel', marketProduct);
        localStorage.setItem('verdaxis_marketplace_window', board.availability_window);
        onNavigate?.('MARKETPLACE');
    };

    const selectCell = (cell: ForwardCurveBoardCell, expand = false) => {
        setFocusMarketProduct(cell.market_product);
        setFocusDeliveryPointId(cell.delivery_point_id);
        if (expand) setPeriodDialogOpen(true);
    };

    return (
        <div className="min-h-full bg-[#05070b] text-slate-100 font-mono">
            <div className="border-b border-slate-800 bg-[#080c13] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            <Activity size={17} />
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Forward Curve</div>
                            <div className="text-[11px] text-slate-500">All approved ports x Verdaxis market products</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            aria-label="Availability window"
                            value={selectedWindow}
                            onChange={event => setSelectedWindow(normalizeAvailabilityWindow(event.target.value))}
                            className="h-8 border border-slate-700 bg-[#05070b] px-2 text-[11px] font-bold text-slate-200 outline-none focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        >
                            {windowOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={fetchBoard}
                            className="flex h-8 items-center gap-1 border border-slate-700 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            data-tour="forward-open-marketplace"
                            onClick={openMarketplace}
                            disabled={!board}
                            className="flex h-8 items-center gap-1 bg-emerald-500 px-3 text-[11px] font-bold uppercase tracking-wider text-[#04110c] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            Open Marketplace
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="p-6 text-sm text-rose-300">{error}</div>
            ) : !board ? (
                <div className="flex h-96 items-center justify-center text-xs text-slate-500">Loading Forward Curve board...</div>
            ) : (
                <div className="grid gap-3 p-3 xl:grid-cols-[minmax(620px,1fr)_420px]">
                    <section data-tour="forward-curve-chart" className="border border-slate-800 bg-[#080c13] xl:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={13} className="text-blue-300" />
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Indicative Forward Curve</div>
                                    <div className="text-[10px] text-slate-500">Benchmark mid with visible orderbook context</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span className="text-blue-300">Benchmark mid</span>
                                <span className="text-emerald-300">Bid context</span>
                                <span className="text-rose-300">Ask context</span>
                            </div>
                        </div>
                        <div className="p-3">
                            <CurveChart points={board.focus.curve} />
                        </div>
                    </section>

                    <section data-tour="forward-market-matrix" className="overflow-hidden border border-slate-800 bg-[#080c13]">
                        <div data-tour="forward-market-matrix-header" className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Selected-Window Forward Matrix</div>
                                <div className="text-[10px] text-slate-500">Click a price cell to inspect {formatAvailabilityWindowPeriod(board.availability_window)}</div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span><span className="mr-1 inline-block h-2 w-2 bg-blue-400" />Benchmark</span>
                                <span><span className="mr-1 inline-block h-2 w-2 bg-emerald-400" />Bid</span>
                                <span><span className="mr-1 inline-block h-2 w-2 bg-rose-400" />Ask</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <div
                                className="grid min-w-[920px] gap-px bg-slate-900 text-[11px]"
                                style={{ gridTemplateColumns: `126px repeat(${board.products.length}, minmax(190px, 1fr))` }}
                            >
                                <div className="bg-[#0b111a] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Port</div>
                                {board.products.map(product => (
                                    <div key={product.market_product} className="bg-[#0b111a] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                                        {formatMarketProduct(product.market_product)}
                                    </div>
                                ))}
                                {board.ports.map(port => (
                                    <React.Fragment key={port.delivery_point_id}>
                                        <div className="bg-[#080c13] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                            {port.delivery_point_name}
                                            <span className="mt-1 block text-[9px] font-normal uppercase text-slate-600">{port.region}</span>
                                        </div>
                                        {board.products.map(product => {
                                            const cell = port.cells.find(item => item.market_product === product.market_product);
                                            const selectedDeliveryPointId = focusDeliveryPointId ?? board.focus.delivery_point_id;
                                            const selected = cell?.market_product === focusMarketProduct && cell.delivery_point_id === selectedDeliveryPointId;
                                            return (
                                                <button
                                                    key={`${port.delivery_point_id}-${product.market_product}`}
                                                    onClick={() => cell && selectCell(cell, true)}
                                                    disabled={!cell}
                                                    aria-pressed={Boolean(selected)}
                                                    aria-label={cell
                                                        ? `Open period detail for ${formatMarketProduct(cell.market_product)} at ${cell.delivery_point_name}, ${formatAvailabilityWindowPeriod(cell.availability_window)}`
                                                        : `No market for ${formatMarketProduct(product.market_product)} at ${port.delivery_point_name}`}
                                                    className={`min-h-[88px] bg-[#080c13] px-3 py-2 text-left transition-colors hover:bg-[#0d1520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                                        selected ? 'outline outline-1 outline-emerald-400 bg-[#0b1f1a]' : ''
                                                    } disabled:cursor-not-allowed disabled:text-slate-600`}
                                                >
                                                    {cell ? (
                                                        <>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-mono text-base font-bold text-blue-300">{currency(cell.benchmark_mid)}</span>
                                                                {cell.is_demo_benchmark && <span className="text-[9px] font-bold uppercase text-amber-300">Demo</span>}
                                                            </div>
                                                            <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-[10px]">
                                                                <span className="text-emerald-300">Bid {currency(cell.best_bid)}</span>
                                                                <span className="text-right text-rose-300">Ask {currency(cell.best_ask)}</span>
                                                            </div>
                                                            <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500">
                                                                <span>{cell.order_count} orders</span>
                                                                <span>{sourceLabel(cell.benchmark_source, cell.is_demo_benchmark)}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-600">No market</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-3">
                        <section data-tour="forward-focus-panel" className="border border-slate-800 bg-[#080c13]">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                                <div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        <Target size={12} />
                                        Selected Period
                                    </div>
                                    <div className="mt-1 text-lg font-bold text-slate-100">
                                        {formatMarketProduct(focusedCell?.market_product ?? board.focus.market_product)} - {focusedCell?.delivery_point_name ?? board.focus.delivery_point_name}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right text-[10px] uppercase tracking-wider text-slate-500">
                                    <div>
                                        <div>{formatAvailabilityWindowPeriod(board.availability_window)}</div>
                                        <div>{focusedCell ? sourceLabel(focusedCell.benchmark_source, focusedCell.is_demo_benchmark) : 'Reference'}</div>
                                    </div>
                                    <button
                                        data-tour="forward-expand-period"
                                        type="button"
                                        onClick={() => setPeriodDialogOpen(true)}
                                        disabled={!focusedCell}
                                        className="inline-flex h-7 items-center gap-1 border border-slate-700 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-blue-400/60 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                                    >
                                        <Maximize2 size={11} />
                                        Expand period
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-px bg-slate-900">
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Benchmark</div>
                                    <div className="mt-1 font-mono text-xl font-bold text-blue-300">{currency(focusedCell?.benchmark_mid)}</div>
                                </div>
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Best Bid</div>
                                    <div className="mt-1 font-mono text-xl font-bold text-emerald-300">{currency(focusedCell?.best_bid)}</div>
                                </div>
                                <div className="bg-[#080c13] p-3">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500">Best Ask</div>
                                    <div className="mt-1 font-mono text-xl font-bold text-rose-300">{currency(focusedCell?.best_ask)}</div>
                                </div>
                            </div>
                            <PeriodDetailGraph cell={focusedCell} />
                        </section>
                        <DepthPanel board={board} />
                        <TradeTapePanel trades={visibleTrades} loading={tradeLoading || !tradesReadyForSelected} />
                    </div>
                    <PeriodDrilldownDialog
                        open={periodDialogOpen}
                        onClose={closePeriodDialog}
                        cell={focusedCell}
                        depthBids={depthReadyForSelected ? board.focus.depth_bids : []}
                        depthAsks={depthReadyForSelected ? board.focus.depth_asks : []}
                        depthReady={depthReadyForSelected}
                        trades={visibleTrades}
                        tradesReady={tradesReadyForSelected}
                    />
                </div>
            )}
        </div>
    );
};
