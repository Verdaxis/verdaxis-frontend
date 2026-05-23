import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, RefreshCw, Target, TrendingUp } from 'lucide-react';

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
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '--';
    return `$${numberValue.toFixed(0)}`;
};

const numberOrNull = (value: number | string | null | undefined) => {
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
            <svg viewBox="0 0 760 240" className="w-full h-[260px]" role="img" aria-label="Hybrid forward curve">
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

const DepthPanel: React.FC<{ board: ForwardCurveBoardResponse }> = ({ board }) => {
    const bids = board.focus.depth_bids;
    const asks = board.focus.depth_asks;
    const rowCount = Math.max(bids.length, asks.length, 5);

    return (
        <section className="border border-slate-800 bg-[#080c13]">
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
    <section className="border border-slate-800 bg-[#080c13]">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Trade Tape</span>
            <span className="text-[10px] text-emerald-400">Live · 7D history</span>
        </div>
        <div className="divide-y divide-slate-900">
            {loading ? (
                <div className="px-3 py-8 text-center text-[11px] text-slate-500">Loading recent prints...</div>
            ) : trades.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] text-slate-500">No confirmed trades yet for this selected slice.</div>
            ) : trades.map(trade => (
                <div key={trade.id} className="grid grid-cols-[72px_1fr_auto] gap-2 px-3 py-2 text-[11px]">
                    <span className="font-mono text-slate-500">{new Date(trade.confirmed_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="truncate text-slate-300">{quantity(trade.quantity_mt)}</span>
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
    const windowOptions = useMemo(() => buildWindowOptions(), []);

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

    useEffect(() => {
        let cancelled = false;
        const fetchTrades = async () => {
            if (!board) return;
            setTradeLoading(true);
            try {
                const response = await api.tradeTape.list({
                    market_product: board.focus.market_product,
                    region: board.focus.delivery_point_name,
                    availability_window: board.availability_window,
                    limit: 8,
                });
                if (!cancelled) setTrades(response.items ?? []);
            } catch (err) {
                console.error('Failed to load forward curve trade tape', err);
                if (!cancelled) setTrades([]);
            } finally {
                if (!cancelled) setTradeLoading(false);
            }
        };
        fetchTrades();
        return () => {
            cancelled = true;
        };
    }, [board?.focus.market_product, board?.focus.delivery_point_name, board?.availability_window]);

    const focusedCell = useMemo(() => {
        if (!board) return null;
        return board.ports
            .flatMap(port => port.cells)
            .find(cell => cell.market_product === board.focus.market_product && cell.delivery_point_id === board.focus.delivery_point_id) ?? null;
    }, [board]);

    const openMarketplace = () => {
        if (!board) return;
        localStorage.setItem('verdaxis_marketplace_port', board.focus.delivery_point_name);
        localStorage.setItem('verdaxis_marketplace_product', board.focus.market_product);
        localStorage.setItem('verdaxis_marketplace_fuel', board.focus.market_product);
        localStorage.setItem('verdaxis_marketplace_window', board.availability_window);
        onNavigate?.('MARKETPLACE');
    };

    const selectCell = (cell: ForwardCurveBoardCell) => {
        setFocusMarketProduct(cell.market_product);
        setFocusDeliveryPointId(cell.delivery_point_id);
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
                            className="h-8 border border-slate-700 bg-[#05070b] px-2 text-[11px] font-bold text-slate-200 outline-none"
                        >
                            {windowOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={fetchBoard}
                            className="flex h-8 items-center gap-1 border border-slate-700 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={openMarketplace}
                            disabled={!board}
                            className="flex h-8 items-center gap-1 bg-emerald-500 px-3 text-[11px] font-bold uppercase tracking-wider text-[#04110c] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
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
                    <section className="border border-slate-800 bg-[#080c13] xl:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={13} className="text-blue-300" />
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Hybrid Forward Curve</div>
                                    <div className="text-[10px] text-slate-500">Benchmark mid with visible bid/ask context</div>
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

                    <section className="overflow-hidden border border-slate-800 bg-[#080c13]">
                        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Market Matrix</div>
                                <div className="text-[10px] text-slate-500">Window: {formatAvailabilityWindowPeriod(board.availability_window)}</div>
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
                                        <button
                                            onClick={() => {
                                                const firstCell = port.cells[0];
                                                if (firstCell) selectCell(firstCell);
                                            }}
                                            className="bg-[#080c13] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:bg-[#0d1520]"
                                        >
                                            {port.delivery_point_name}
                                            <span className="mt-1 block text-[9px] font-normal uppercase text-slate-600">{port.region}</span>
                                        </button>
                                        {board.products.map(product => {
                                            const cell = port.cells.find(item => item.market_product === product.market_product);
                                            const selected = cell?.market_product === board.focus.market_product && cell.delivery_point_id === board.focus.delivery_point_id;
                                            return (
                                                <button
                                                    key={`${port.delivery_point_id}-${product.market_product}`}
                                                    onClick={() => cell && selectCell(cell)}
                                                    className={`min-h-[88px] bg-[#080c13] px-3 py-2 text-left transition-colors hover:bg-[#0d1520] ${
                                                        selected ? 'outline outline-1 outline-emerald-400 bg-[#0b1f1a]' : ''
                                                    }`}
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
                        <section className="border border-slate-800 bg-[#080c13]">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                                <div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        <Target size={12} />
                                        Focus
                                    </div>
                                    <div className="mt-1 text-lg font-bold text-slate-100">
                                        {formatMarketProduct(board.focus.market_product)} - {board.focus.delivery_point_name}
                                    </div>
                                </div>
                                <div className="text-right text-[10px] uppercase tracking-wider text-slate-500">
                                    <div>{formatAvailabilityWindowPeriod(board.availability_window)}</div>
                                    <div>{focusedCell ? sourceLabel(focusedCell.benchmark_source, focusedCell.is_demo_benchmark) : 'Reference'}</div>
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
                        </section>
                        <DepthPanel board={board} />
                        <TradeTapePanel trades={trades} loading={tradeLoading} />
                    </div>
                </div>
            )}
        </div>
    );
};
