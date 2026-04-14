import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Settings2,
    Check,
    RotateCcw,
    TrendingUp,
    Activity,
    Loader2,
    ChevronDown,
    EyeOff,
    Bell,
} from 'lucide-react';
import { OrderBookOrder, PriceSummary, MarketProduct, MARKET_PRODUCTS, DeliveryPoint, TradeTapeEntry } from '../types';
import { APPROVED_TRADING_PORTS } from '../data';
import { formatMarketProduct } from '../utils/marketProduct';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';
import { useTheme } from '../context/ThemeContext';
import { useSSE } from '../hooks/useSSE';
import { OrderbookDepth } from './trading/OrderbookDepth';
import { ForwardCurve } from './ForwardCurve';
import { ActivityFeed } from './ActivityFeed';
import { PriceAlertManager } from './PriceAlertManager';
import { useNamespace } from '../hooks/useNamespace';
import { GridLayout } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
    compareAvailabilityWindows,
    formatAvailabilityWindowPeriod,
    getAvailabilityWindowOptions,
    normalizeAvailabilityWindow,
} from '../utils/availabilityWindow';

// --- Types ---
interface TerminalRow {
    id: string;
    period: string;
    type: 'SPOT' | 'MONTH' | 'QTR' | 'YEAR';
    bidQty: number | null;
    bid: number | null;
    ask: number | null;
    askQty: number | null;
    last: number | null;
    change: number | null;
    flash?: 'up' | 'down' | null;
}

interface TradeEvent {
    id: string;
    time: string;
    qty: number;
    price: number;
    port: string;
    period: string;
    side: 'BUY' | 'SELL' | 'TRADE';
    is_anonymous?: boolean;
}

interface PeriodConfig {
    window: string;
    period: string;
    type: TerminalRow['type'];
}

function getPeriodType(window: string): TerminalRow['type'] {
    if (window === 'SPOT') return 'SPOT';
    if (/^\d{4}-\d{2}$/.test(window)) return 'MONTH';
    if (/^\d{4}-Q[1-4]$/.test(window)) return 'QTR';
    return 'YEAR';
}

function buildPeriodConfig(windows: string[]): PeriodConfig[] {
    const defaults = getAvailabilityWindowOptions({ quarterCount: 8 }).map(option => option.value);
    const merged = Array.from(new Set([...defaults, ...windows.map(window => normalizeAvailabilityWindow(window))]));
    return merged
        .sort(compareAvailabilityWindows)
        .map(window => ({
            window,
            period: formatAvailabilityWindowPeriod(window),
            type: getPeriodType(window),
        }));
}

type TerminalLayoutMode = 'view' | 'customize';

const TERMINAL_LAYOUT_STORAGE_KEY = 'verdaxis_terminal_layout_v1';

const DEFAULT_TERMINAL_LAYOUT: Layout[] = [
    { i: 'depth', x: 0, y: 0, w: 7, h: 3, minW: 4, minH: 2 },
    { i: 'trades', x: 7, y: 0, w: 5, h: 3, minW: 4, minH: 2 },
    { i: 'activity', x: 0, y: 3, w: 12, h: 4, minW: 6, minH: 3 },
];

const normalizeTerminalLayout = (layout: Layout[] | null | undefined): Layout[] => {
    const byId = new Map((layout ?? []).map((item) => [item.i, item]));
    return DEFAULT_TERMINAL_LAYOUT.map((item) => ({
        ...item,
        ...byId.get(item.i),
        minW: item.minW,
        minH: item.minH,
    }));
};

const getStoredTerminalLayout = (): Layout[] => {
    if (typeof window === 'undefined') return DEFAULT_TERMINAL_LAYOUT;
    const stored = localStorage.getItem(TERMINAL_LAYOUT_STORAGE_KEY);
    if (!stored) return DEFAULT_TERMINAL_LAYOUT;
    try {
        return normalizeTerminalLayout(JSON.parse(stored));
    } catch {
        return DEFAULT_TERMINAL_LAYOUT;
    }
};

// Convert an SSE trade event into the TradeEvent shape used by the feed UI
let tradeIdCounter = 0;
const sseTradeToEvent = (eventType: string, data: any): TradeEvent => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const id = data.id || data.trade_id || `sse-${++tradeIdCounter}`;
    const qty = Number(data.quantity) || 0;
    const price = Number(data.price) || 0;
    const fuel = data.fuel_type || '';
    const region = data.region || '';

    const side: 'BUY' | 'SELL' = eventType === 'trade_auto_matched' ? 'BUY' : (data.side === 'SELL' ? 'SELL' : 'BUY');
    const period = data.availability_window ? formatAvailabilityWindowPeriod(normalizeAvailabilityWindow(String(data.availability_window))) : (fuel || 'SPOT');

    return { id, time, qty, price, port: region, period, side, is_anonymous: data.is_anonymous ?? false };
};

export const tradeTapeEntryToEvent = (entry: TradeTapeEntry): TradeEvent => ({
    id: `tape-${entry.id}`,
    time: new Date(entry.confirmed_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    qty: Number(entry.quantity_mt) || 0,
    price: Number(entry.price_per_mt_usd) || 0,
    port: entry.region,
    period: formatAvailabilityWindowPeriod(normalizeAvailabilityWindow(entry.availability_window || 'SPOT')),
    side: 'TRADE',
    is_anonymous: true,
});

export const getTerminalFuelType = (marketProduct: MarketProduct): string => marketProduct.includes('METHANOL') ? 'Methanol' : 'Ethanol';

const getStoredTerminalWindow = (): string => {
    if (typeof window === 'undefined') return 'SPOT';
    const stored = localStorage.getItem('verdaxis_marketplace_window');
    if (!stored) return 'SPOT';
    try {
        return normalizeAvailabilityWindow(stored);
    } catch {
        return 'SPOT';
    }
};

interface MarketTerminalProps {
    onNavigate?: (page: string) => void;
}

export const MarketTerminal: React.FC<MarketTerminalProps> = ({ onNavigate }) => {
    const { setPageContext } = useCopilotContext();
    const { t } = useNamespace('trading');
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Port & Fuel selectors
    const [selectedPort, setSelectedPort] = useState<string>(() => {
        const stored = localStorage.getItem('verdaxis_marketplace_port');
        return APPROVED_TRADING_PORTS.includes(stored as (typeof APPROVED_TRADING_PORTS)[number]) ? stored as string : 'Singapore';
    });
    const [selectedMarketProduct, setSelectedMarketProduct] = useState<MarketProduct>(() => {
        const stored = localStorage.getItem('verdaxis_marketplace_fuel');
        return MARKET_PRODUCTS.includes(stored as MarketProduct) ? (stored as MarketProduct) : 'BIO_METHANOL';
    });
    const [showPortDropdown, setShowPortDropdown] = useState(false);
    const [showFuelDropdown, setShowFuelDropdown] = useState(false);
    const [selectedAvailabilityWindow, setSelectedAvailabilityWindow] = useState<string>(() => getStoredTerminalWindow());
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);

    // Orders from API (orderbook sync)
    const [allOrders, setAllOrders] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Alert panel state
    const [alertPanelOpen, setAlertPanelOpen] = useState(false);

    // Responsive grid width
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(1200);

    const [layoutMode, setLayoutMode] = useState<TerminalLayoutMode>('view');
    const [terminalLayout, setTerminalLayout] = useState<Layout[]>(() => getStoredTerminalLayout());

    // Collapsible year groups — Cal years default collapsed, quarters hidden
    const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set(['2027']));
    const toggleYear = (year: string) => {
        setCollapsedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) next.delete(year);
            else next.add(year);
            return next;
        });
    };

    const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
    const [tradeTapeLoading, setTradeTapeLoading] = useState(true);
    // Track which rows are flashing and in which direction
    const [flashRows, setFlashRows] = useState<Record<string, 'up' | 'down'>>({});
    const prevPrices = useRef<Record<string, { bid: number | null; ask: number | null }>>({});
    const tradeScrollRef = useRef<HTMLDivElement>(null);

    // Fetch orders from the orderbook (called on mount and on SSE orderbook events)
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.orderbook.list();
            setAllOrders(data);
        } catch (e) {
            console.error('Failed to load orderbook for terminal', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount (no polling — SSE handles updates)
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        let cancelled = false;
        api.catalog.deliveryPoints()
            .then(points => {
                if (cancelled) return;
                setDeliveryPoints(points.filter(point => point.is_active !== false));
            })
            .catch(error => {
                console.error('Failed to load delivery points for terminal', error);
                if (!cancelled) setDeliveryPoints([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // --- SSE: Orderbook updates (replaces 30s polling) ---
    const handleOrderbookEvent = useCallback((_event: string, _data: any) => {
        // Any orderbook change: refetch the full orderbook
        fetchOrders();
    }, [fetchOrders]);

    const { isConnected: orderbookConnected } = useSSE('orderbook', handleOrderbookEvent);


    // --- SSE: Trade events (replaces tick-based simulation) ---
    const handleTradeEvent = useCallback((event: string, data: any) => {
        if (event === 'trade_created' || event === 'trade_auto_matched' || event === 'trade_confirmed') {
            const trade = sseTradeToEvent(event, data);
            setTradeEvents(prev => [trade, ...prev].slice(0, 50));
        }
    }, []);

    const { isConnected: tradesConnected } = useSSE('trades', handleTradeEvent);

    // Combined SSE connection status
    const sseConnected = orderbookConnected || tradesConnected;

    const selectedDeliveryPoint = useMemo(() => (
        deliveryPoints.find(point => point.name.toLowerCase() === selectedPort.toLowerCase()) ?? null
    ), [deliveryPoints, selectedPort]);

    const selectedDeliveryPointId = selectedDeliveryPoint?.id ?? null;

    // Fetch real price summaries from price discovery API
    const [priceSummaries, setPriceSummaries] = useState<PriceSummary[]>([]);

    useEffect(() => {
        let cancelled = false;
        const fetchPrices = async () => {
            if (!selectedDeliveryPointId) {
                if (!cancelled) setPriceSummaries([]);
                return;
            }
            try {
                const resp = await api.prices.getSummaries({
                    market_product: selectedMarketProduct,
                    delivery_point_id: selectedDeliveryPointId,
                    availability_window: selectedAvailabilityWindow,
                });
                if (!cancelled) {
                    setPriceSummaries(resp.summaries);
                }
            } catch (e) {
                console.error('Failed to load price summaries', e);
                if (!cancelled) setPriceSummaries([]);
            }
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [selectedAvailabilityWindow, selectedMarketProduct, selectedDeliveryPointId]);

    // Fetch VWAP reference prices (internal vs external split)
    const [vwapData, setVwapData] = useState<{ vwap_usd: number; total_volume_mt: number; trade_count: number; visibility: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const fetchTradeTape = async () => {
            setTradeTapeLoading(true);
            try {
                const response = await api.tradeTape.list({
                    market_product: selectedMarketProduct,
                    region: selectedPort,
                    availability: selectedAvailabilityWindow,
                    limit: 20,
                });
                if (!cancelled) {
                    setTradeEvents(response.items.map(tradeTapeEntryToEvent));
                }
            } catch (error) {
                console.error('Failed to load trade tape for terminal', error);
                if (!cancelled) setTradeEvents([]);
            } finally {
                if (!cancelled) setTradeTapeLoading(false);
            }
        };

        fetchTradeTape();
        return () => {
            cancelled = true;
        };
    }, [selectedAvailabilityWindow, selectedMarketProduct, selectedPort]);

    useEffect(() => {
        let cancelled = false;
        const fetchVwap = async () => {
            if (!selectedDeliveryPointId) {
                if (!cancelled) setVwapData(null);
                return;
            }
            try {
                const resp = await api.prices.getReference({
                    market_product: selectedMarketProduct,
                    delivery_point_id: selectedDeliveryPointId,
                    availability_window: selectedAvailabilityWindow,
                    visibility: 'internal',
                });
                if (!cancelled) {
                    if (resp.prices.length > 0) {
                        setVwapData(resp.prices[0]);
                    } else {
                        setVwapData(null);
                    }
                }
            } catch {
                if (!cancelled) setVwapData(null);
            }
        };
        fetchVwap();
        const interval = setInterval(fetchVwap, 30000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [selectedAvailabilityWindow, selectedMarketProduct, selectedDeliveryPointId]);

    // Responsive grid width — observe container and update
    useEffect(() => {
        const container = gridContainerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w) setGridWidth(w);
        });
        observer.observe(container);
        // Set initial width
        setGridWidth(container.getBoundingClientRect().width || 1200);
        return () => observer.disconnect();
    }, []);

    const persistTerminalLayout = useCallback((layout: Layout[]) => {
        const normalized = normalizeTerminalLayout(layout);
        setTerminalLayout(normalized);
        if (typeof window !== 'undefined') {
            localStorage.setItem(TERMINAL_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
        }
    }, []);

    const handleTerminalLayoutChange = useCallback((layout: Layout[]) => {
        if (layoutMode !== 'customize') return;
        persistTerminalLayout(layout);
    }, [layoutMode, persistTerminalLayout]);

    const resetTerminalLayout = useCallback(() => {
        persistTerminalLayout(DEFAULT_TERMINAL_LAYOUT);
    }, [persistTerminalLayout]);

    // Auto-scroll trade feed
    useEffect(() => {
        if (tradeScrollRef.current) {
            tradeScrollRef.current.scrollTop = 0;
        }
    }, [tradeEvents]);

    // Filter orders by selected port and fuel, split into asks and bids
    const normalizedOrders = useMemo(() => {
        return allOrders.map(order => ({
            ...order,
            availability_window: normalizeAvailabilityWindow(order.availability_window),
        }));
    }, [allOrders]);

    const periodConfig = useMemo(() => buildPeriodConfig(normalizedOrders.map(order => order.availability_window)), [normalizedOrders]);

    const filteredOrders = useMemo(() => {
        return normalizedOrders.filter(o => {
            const portLower = selectedPort.toLowerCase();
            const matchPort = o.region.toLowerCase().includes(portLower)
                || (o.delivery_point_name || '').toLowerCase().includes(portLower);
            const matchFuel = o.market_product === selectedMarketProduct;
            return matchPort && matchFuel;
        });
    }, [normalizedOrders, selectedPort, selectedMarketProduct]);

    const filteredAsks = useMemo(() => filteredOrders.filter(o => o.side === 'ASK'), [filteredOrders]);
    const filteredBids = useMemo(() => filteredOrders.filter(o => o.side === 'BID'), [filteredOrders]);

    // Mapped bids/asks for OrderbookDepth
    const depthBids = useMemo(() => filteredBids.map(o => ({
        price: Number(o.price_per_mt_usd),
        quantity: Number(o.remaining_quantity_mt || o.quantity_mt),
    })), [filteredBids]);
    const depthAsks = useMemo(() => filteredAsks.map(o => ({
        price: Number(o.price_per_mt_usd),
        quantity: Number(o.remaining_quantity_mt || o.quantity_mt),
    })), [filteredAsks]);

    // Build terminal rows: merge real orderbook data (bids + asks) with simulated activity
    const terminalData: TerminalRow[] = useMemo(() => {
        return periodConfig.map((config, idx) => {
            const periodAsks = filteredAsks.filter(
                o => o.availability_window === config.window
            );
            const periodBids = filteredBids.filter(
                o => o.availability_window === config.window
            );

            const askPrices = periodAsks.map(o => Number(o.price_per_mt_usd)).filter(Boolean);
            const totalAskQty = periodAsks.reduce((sum, o) => sum + Number(o.remaining_quantity_mt || o.quantity_mt), 0);

            const bidPrices = periodBids.map(o => Number(o.price_per_mt_usd)).filter(Boolean);
            const totalBidQty = periodBids.reduce((sum, o) => sum + Number(o.remaining_quantity_mt || o.quantity_mt), 0);

            // Real orderbook data
            const realAsk = askPrices.length > 0 ? Math.min(...askPrices) : null;
            const realAskQty = totalAskQty > 0 ? totalAskQty : null;
            const realBid = bidPrices.length > 0 ? Math.max(...bidPrices) : null;
            const realBidQty = totalBidQty > 0 ? totalBidQty : null;

            // Only show real orderbook data — no simulation fallback
            // If no real orders exist for this window, show nulls (rendered as dashes)
            const hasAnyRealData = realBid !== null || realAsk !== null;

                        // Only show last/change on SPOT row (price summaries are not per-period)
            const matchingSummary = config.type === 'SPOT' ? priceSummaries.find(
                s => s.market_product === selectedMarketProduct
                  && s.delivery_point_id === selectedDeliveryPointId
                  && (s.availability_window ?? 'SPOT') === selectedAvailabilityWindow
            ) : null;
            const last = hasAnyRealData && matchingSummary?.last_price != null ? Number(matchingSummary.last_price) : null;
            const change = hasAnyRealData && matchingSummary?.price_change_pct
                ? Number(matchingSummary.price_change_pct)
                : null;

            return {
                id: String(idx + 1),
                period: config.period,
                type: config.type,
                bidQty: realBidQty,
                bid: realBid,
                ask: realAsk,
                askQty: realAskQty,
                last: last,
                change: change,
            };
        });
    }, [filteredAsks, filteredBids, periodConfig, priceSummaries, selectedAvailabilityWindow, selectedDeliveryPointId, selectedMarketProduct]);

    // Flash rows whose bid or ask changed on each tick
    useEffect(() => {
        if (!terminalData.length) return;
        const newFlash: Record<string, 'up' | 'down'> = {};
        for (const row of terminalData) {
            const prev = prevPrices.current[row.id];
            if (prev) {
                const bidChanged = row.bid !== prev.bid && row.bid != null && prev.bid != null;
                const askChanged = row.ask !== prev.ask && row.ask != null && prev.ask != null;
                if (bidChanged && row.bid! > prev.bid!) newFlash[row.id] = 'up';
                else if (bidChanged && row.bid! < prev.bid!) newFlash[row.id] = 'down';
                else if (askChanged && row.ask! > prev.ask!) newFlash[row.id] = 'up';
                else if (askChanged && row.ask! < prev.ask!) newFlash[row.id] = 'down';
            }
            prevPrices.current[row.id] = { bid: row.bid, ask: row.ask };
        }
        if (Object.keys(newFlash).length) {
            setFlashRows(newFlash);
            setTimeout(() => setFlashRows({}), 650);
        }
    }, [terminalData]);

    // Summary stats
    const selectedWindowOrders = filteredOrders.filter(o => o.availability_window === selectedAvailabilityWindow);
    const selectedWindowAskPrices = filteredAsks
        .filter(o => o.availability_window === selectedAvailabilityWindow)
        .map(o => Number(o.price_per_mt_usd))
        .filter(Boolean);
    const selectedWindowConfig = periodConfig.find(config => config.window === selectedAvailabilityWindow);
    const selectedWindowRow = selectedWindowConfig
        ? terminalData.find(row => row.period === selectedWindowConfig.period)
        : null;
    const activeWindowPrice = selectedWindowAskPrices.length > 0 ? Math.min(...selectedWindowAskPrices) : selectedWindowRow?.ask;
    const totalListings = filteredOrders.length;
    const totalVolume = filteredOrders.reduce((s, o) => s + Number(o.quantity_mt), 0);
    const activeWindowVolume = selectedWindowOrders.reduce((sum, order) => sum + Number(order.quantity_mt), 0);

    // Broadcast Context
    useEffect(() => {
        setPageContext({
            view: 'Market Terminal',
            product: `${formatMarketProduct(selectedMarketProduct)} (${selectedPort} · ${formatAvailabilityWindowPeriod(selectedAvailabilityWindow)})`,
            market_data_summary: `Showing ${selectedWindowOrders.length} active listings for ${formatMarketProduct(selectedMarketProduct)} at ${selectedPort} for ${formatAvailabilityWindowPeriod(selectedAvailabilityWindow)}.`,
            spot_price: activeWindowPrice ? `$${activeWindowPrice.toFixed(2)}` : 'No offers',
            total_volume: `${activeWindowVolume.toLocaleString()} MT`,
        });
    }, [activeWindowPrice, activeWindowVolume, selectedAvailabilityWindow, selectedMarketProduct, selectedPort, selectedWindowOrders.length, setPageContext]);

    // Helper to determine if a row has real orderbook data
    const hasRealData = useCallback((row: TerminalRow) => {
        const config = periodConfig.find(p => p.period === row.period);
        if (!config) return false;
        return filteredOrders.some(o => o.availability_window === config.window);
    }, [filteredOrders, periodConfig]);

    // Unique port names from ports list
    const portNames = useMemo(() => [...APPROVED_TRADING_PORTS], []);

    const availableProducts = useMemo(() => [...MARKET_PRODUCTS], []);

    return (
        <>
        <div className="flex flex-col min-h-full bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-[#e5e5e5] font-mono transition-colors" onClick={() => { setShowPortDropdown(false); setShowFuelDropdown(false); }}>

            {/* Top Section: Header & Chart */}
            <div className="h-auto lg:h-64 border-b border-slate-200 dark:border-[#222] flex flex-col lg:flex-row">
                {/* Product Header with Selectors */}
                <div className="w-full lg:w-80 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#222] flex flex-col justify-between bg-white dark:bg-[#0a0a0a]">
                    <div>
                        <div className="flex items-center space-x-2 text-slate-400 dark:text-[#666] text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">
                            <Zap size={12} className="text-verdaxis" />
                            {t('terminal.title')}
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                title={sseConnected ? 'Live: connected' : 'Disconnected'}
                            />
                            <button
                                data-tour="terminal-price-alerts"
                                onClick={e => { e.stopPropagation(); setAlertPanelOpen(true); }}
                                title="Price Alerts"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255,176,32,0.25)',
                                    borderRadius: 4,
                                    color: '#FFB020',
                                    cursor: 'pointer',
                                    padding: '2px 5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginLeft: 4,
                                }}
                            >
                                <Bell size={11} />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); setLayoutMode(layoutMode === 'view' ? 'customize' : 'view'); }}
                                title={layoutMode === 'view' ? t('terminal.btn.customizeLayout') : t('terminal.btn.doneCustomizing')}
                                style={{
                                    background: layoutMode === 'customize' ? 'rgba(16,185,129,0.12)' : 'transparent',
                                    border: `1px solid ${layoutMode === 'customize' ? 'rgba(16,185,129,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)')}`,
                                    borderRadius: 4,
                                    color: layoutMode === 'customize' ? '#10b981' : '#888',
                                    cursor: 'pointer',
                                    padding: '2px 7px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginLeft: 4,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {layoutMode === 'view' ? <Settings2 size={11} /> : <Check size={11} />}
                                {layoutMode === 'view' ? t('terminal.btn.customizeLayout') : t('terminal.btn.doneCustomizing')}
                            </button>
                            {layoutMode === 'customize' && (
                                <button
                                    onClick={e => { e.stopPropagation(); resetTerminalLayout(); }}
                                    title={t('terminal.btn.resetLayout')}
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}`,
                                        borderRadius: 4,
                                        color: '#888',
                                        cursor: 'pointer',
                                        padding: '2px 7px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        marginLeft: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    <RotateCcw size={11} />
                                    {t('terminal.btn.resetLayout')}
                                </button>
                            )}
                        </div>

                        {/* Fuel Type Selector */}
                        <div className="relative mb-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowFuelDropdown(!showFuelDropdown); setShowPortDropdown(false); }}
                                className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 hover:text-emerald-500 transition-colors"
                            >
                                {formatMarketProduct(selectedMarketProduct)}
                                <ChevronDown size={16} className="text-slate-400" />
                            </button>
                            {showFuelDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded shadow-xl z-50 min-w-[160px] max-h-48 overflow-y-auto">
                                    {availableProducts.map((productCode) => (
                                        <button
                                            key={productCode}
                                            onClick={() => { setSelectedMarketProduct(productCode); setShowFuelDropdown(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors ${
                                                selectedMarketProduct === productCode ? 'text-emerald-500 bg-slate-50 dark:bg-[#1a1a1a]' : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {formatMarketProduct(productCode)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Port Selector */}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowPortDropdown(!showPortDropdown); setShowFuelDropdown(false); }}
                                className="text-xs font-semibold flex items-center gap-1.5 hover:text-emerald-500 transition-colors"
                            >
                                <span className="text-emerald-500">{selectedPort}</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>
                            {showPortDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded shadow-xl z-50 min-w-[180px] max-h-48 overflow-y-auto">
                                    {portNames.map(name => (
                                        <button
                                            key={name}
                                            onClick={() => { setSelectedPort(name); setShowPortDropdown(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors ${
                                                selectedPort === name ? 'text-emerald-500 bg-slate-50 dark:bg-[#1a1a1a]' : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400 dark:text-[#888] font-bold">{t('terminal.label.bestOffer')}</span>
                            <div className="text-right">
                                {activeWindowPrice ? (
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">${activeWindowPrice.toFixed(2)}</span>
                                ) : (
                                    <span className="text-lg font-bold text-slate-400 dark:text-[#555]">{t('terminal.label.noOffers')}</span>
                                )}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#555] flex justify-between uppercase font-bold tracking-wider">
                            <span>{t('terminal.label.listings')} <span className="text-emerald-500">{totalListings}</span></span>
                            <span>Vol: {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k MT` : '--'}</span>
                        </div>
                    </div>
                </div>

                {/* Price Curve Chart */}
                <div className="flex-1 p-4 bg-slate-100 dark:bg-[#040404] min-h-[200px] lg:min-h-0" style={{ background: isDark ? '#040404' : '#F1F5F9' }}>
                    <div className="flex justify-between items-start mb-2 px-2 gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-slate-400 dark:text-[#888] text-[10px] font-bold tracking-widest uppercase">{t('terminal.label.forwardCurve')}</div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full px-2 py-0.5">{t('terminal.label.indicativeOnly')}</span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-[#555]">{formatMarketProduct(selectedMarketProduct)} — {selectedPort}</div>
                            <div className="text-[10px] text-slate-500 dark:text-[#666] mt-1">{t('terminal.label.curveHint')}</div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">{t('terminal.label.openSliceHint')}</div>
                            {layoutMode === 'customize' && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">{t('terminal.label.layoutHint')}</div>
                            )}
                        </div>
                    </div>
                    <div className="mt-1 h-[80%]" data-tour="terminal-forward-curve">
                        <ForwardCurve
                            marketProductCode={selectedMarketProduct}
                            deliveryPointName={selectedPort}
                            onPeriodClick={(window) => {
                                if (onNavigate) {
                                    localStorage.setItem('verdaxis_marketplace_port', selectedPort);
                                    localStorage.setItem('verdaxis_marketplace_fuel', selectedMarketProduct);
                                    setSelectedAvailabilityWindow(window);
                                    localStorage.setItem('verdaxis_marketplace_window', window);
                                    onNavigate('MARKETPLACE');
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* VWAP Reference Strip */}
            {vwapData && (
                <div data-tour="terminal-vwap" className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#222] text-[10px] overflow-x-auto">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#666] uppercase font-bold tracking-widest whitespace-nowrap">
                        <TrendingUp size={10} className="text-emerald-500" />
                        {t('terminal.label.vwap')}
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">{t('terminal.label.vwapPrice')}</span>
                        <span className="text-emerald-500 font-bold">${Number(vwapData.vwap_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">{t('terminal.label.vwapVol')}</span>
                        <span className="text-slate-700 dark:text-[#ccc] font-bold">{Number(vwapData.total_volume_mt).toLocaleString()} MT</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">{t('terminal.label.vwapTrades')}</span>
                        <span className="text-slate-700 dark:text-[#ccc] font-bold">{vwapData.trade_count}</span>
                    </div>
                    <div className="ml-auto px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider whitespace-nowrap">
                        {vwapData.visibility}
                    </div>
                </div>
            )}

            {/* The Market Grid */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col bg-white dark:bg-[#050505] relative">
                {/* Grid Header */}
                <div className="flex items-center bg-slate-100 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#222] text-[10px] uppercase font-bold text-slate-500 dark:text-[#555] py-2 select-none min-w-[640px]">
                    <div className="w-32 px-4">{t('terminal.col.period')}</div>
                    <div className="w-24 text-right px-4">{t('terminal.col.bidQty')}</div>
                    <div className="w-24 text-right px-4 text-emerald-700">{t('terminal.col.bid')}</div>
                    <div className="w-24 text-right px-4 text-rose-700">{t('terminal.col.ask')}</div>
                    <div className="w-24 text-right px-4">{t('terminal.col.askQty')}</div>
                    <div className="w-24 text-right px-4">{t('terminal.col.last')}</div>
                    <div className="w-24 text-right px-4">{t('terminal.col.chg')}</div>
                    <div className="flex-1 text-right px-4">{t('terminal.col.offers')}</div>
                </div>

                {/* Grid Rows */}
                <div className="overflow-y-auto flex-1 font-mono min-w-[640px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        terminalData.map((row) => {
                            const real = hasRealData(row);
                            const hoverColor = 'hover:bg-slate-50 dark:hover:bg-[#111]';

                            // Count offers for this period
                            const matchedPeriod = periodConfig.find(config => config.period === row.period);
                            const offerCount = matchedPeriod
                                ? filteredOrders.filter(o => o.availability_window === matchedPeriod.window).length
                                : 0;

                            // Determine if this is a quarterly row under a Cal year
                            const yearMatch = row.period.match(/^Q[1-4] (\d{2})$/);
                            const parentYear = yearMatch ? `20${yearMatch[1]}` : null;
                            const isCalRow = row.type === 'YEAR';
                            const calYear = isCalRow ? row.period.replace('CAL ', '20') : null;

                            // Skip quarterly rows if their parent Cal year is collapsed
                            if (parentYear && collapsedYears.has(parentYear)) {
                                return null;
                            }

                            return (
                                <div
                                    key={row.id}
                                    className={`flex items-center border-b border-slate-100 dark:border-[#111] py-1.5 transition-colors group ${flashRows[row.id] === 'up' ? 'flash-up' : flashRows[row.id] === 'down' ? 'flash-down' : hoverColor} ${isCalRow ? 'bg-slate-50/50 dark:bg-[#0a0a0a]' : ''}`}
                                >
                                    {/* Period */}
                                    <div className="w-32 px-4 text-xs font-bold flex items-center space-x-2 text-slate-900 dark:text-white">
                                        {row.type === 'SPOT' && <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse mr-1"/>}
                                        {isCalRow && calYear && (
                                            <button
                                                onClick={() => toggleYear(calYear)}
                                                className="mr-1 text-slate-400 hover:text-emerald-500 transition-colors"
                                                title={collapsedYears.has(calYear) ? 'Show quarters' : 'Hide quarters'}
                                            >
                                                <ChevronDown size={12} className={`transition-transform ${collapsedYears.has(calYear) ? '-rotate-90' : ''}`} />
                                            </button>
                                        )}
                                        <span>{row.period}</span>
                                    </div>

                                    {/* Bid Qty */}
                                    <div className={`w-24 text-right px-4 text-[11px] ${
                                        row.bidQty != null ? 'text-slate-600 dark:text-slate-400 opacity-70' : 'text-slate-300 dark:text-[#333]'
                                    }`}>
                                        {row.bidQty != null ? row.bidQty.toLocaleString() : '—'}
                                    </div>

                                    {/* BID PRICE */}
                                    <div className="w-24 px-1">
                                        <div className={`w-full text-right px-2 py-0.5 rounded text-[11px] ${
                                            row.bid != null
                                                ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                                                : 'text-slate-300 dark:text-[#333]'
                                        }`}>
                                            {row.bid != null ? row.bid.toFixed(2) : '—'}
                                        </div>
                                    </div>

                                    {/* ASK PRICE */}
                                    <div className="w-24 px-1">
                                        <div className={`w-full text-right px-2 py-0.5 rounded text-[11px] ${
                                            row.ask != null
                                                ? `text-rose-600 dark:text-rose-500 font-bold ${real ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`
                                                : 'text-slate-300 dark:text-[#333]'
                                        }`}>
                                            {row.ask != null ? row.ask.toFixed(2) : '—'}
                                        </div>
                                    </div>

                                    {/* Ask Qty */}
                                    <div className={`w-24 text-right px-4 text-[11px] ${
                                        row.askQty != null ? 'text-slate-600 dark:text-slate-400 opacity-70' : 'text-slate-300 dark:text-[#333]'
                                    }`}>
                                        {row.askQty != null ? Math.round(row.askQty).toLocaleString() : '—'}
                                    </div>

                                    {/* Last Done */}
                                    <div className={`w-24 text-right px-4 font-bold text-xs ${
                                        row.last != null ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-[#333]'
                                    }`}>
                                        {row.last != null ? row.last.toFixed(2) : '—'}
                                    </div>

                                    {/* Change */}
                                    <div className={`w-24 text-right px-4 text-[10px] flex justify-end items-center space-x-1 ${row.change != null && row.change > 0 ? 'text-emerald-600 dark:text-emerald-500' : row.change != null && row.change < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-300 dark:text-[#333]'}`}>
                                        {row.change != null ? (
                                            <>
                                                {row.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                <span>{Math.abs(row.change).toFixed(2)}</span>
                                            </>
                                        ) : '—'}
                                    </div>

                                    {/* Offer Count */}
                                    <div className="flex-1 text-right px-4 text-[10px]">
                                        {offerCount > 0 ? (
                                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                                {offerCount}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-[#333] italic text-[9px]">
                                                No orders
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* All bottom panels — draggable grid including orderbook depth */}
                <div ref={gridContainerRef} className="border-t border-slate-200 dark:border-[#222] bg-white dark:bg-[#050505]">
                    {/* @ts-expect-error — react-grid-layout v2 types don't expose legacy props but runtime accepts them */}
                    <GridLayout
                        className="layout"
                        cols={12}
                        rowHeight={50}
                        width={gridWidth}
                        layout={terminalLayout}
                        onLayoutChange={handleTerminalLayoutChange}
                        isDraggable={layoutMode === 'customize'}
                        isResizable={layoutMode === 'customize'}
                        draggableHandle=".drag-handle"
                        compactType="vertical"
                        margin={[6, 6]}
                    >
                        {/* Orderbook Depth */}
                        <div key="depth" className="bg-white dark:bg-[#050505] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className={`drag-handle flex items-center px-3 py-1 ${layoutMode === 'customize' ? 'cursor-move' : 'cursor-default'} bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#181818]`}>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">{t('terminal.panel.orderbookDepth')}</span>
                                {layoutMode === 'customize' && <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>}
                            </div>
                            <div style={{ padding: '4px 8px', height: 'calc(100% - 24px)', overflow: 'hidden' }}>
                                <OrderbookDepth
                                    bids={depthBids}
                                    asks={depthAsks}
                                    fuelType={formatMarketProduct(selectedMarketProduct)}
                                    region={selectedPort}
                                />
                            </div>
                        </div>
                        {/* Trade Events */}
                        <div key="trades" className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className={`drag-handle flex items-center px-3 py-1 ${layoutMode === 'customize' ? 'cursor-move' : 'cursor-default'} border-b border-slate-100 dark:border-[#181818]`}>
                                <Activity size={10} className="text-emerald-500 mr-1.5" />
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">{t('terminal.panel.tradeTape')}</span>
                                <div className={`ml-1.5 w-1.5 h-1.5 rounded-full ${tradesConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                {layoutMode === 'customize' && <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>}
                            </div>
                            <div ref={tradeScrollRef} className="overflow-y-auto px-2 py-1" style={{ height: 'calc(100% - 24px)' }}>
                                {tradeTapeLoading ? (
                                    <div className="text-[10px] text-slate-400 dark:text-[#444] text-center py-4">{t('terminal.tradeTape.loading')}</div>
                                ) : tradeEvents.length === 0 ? (
                                    <div className="text-[10px] text-slate-400 dark:text-[#444] text-center py-4">{t('terminal.tradeTape.empty')}</div>
                                ) : (
                                    tradeEvents.map((trade) => (
                                        <div key={trade.id} className="flex items-center text-[10px] py-0.5 border-b border-slate-50 dark:border-[#111] last:border-0">
                                            <span className="text-slate-400 dark:text-[#555] w-16 shrink-0">{trade.time}</span>
                                            <span className={`font-bold w-10 shrink-0 ${trade.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-500' : trade.side === 'SELL' ? 'text-rose-600 dark:text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                {trade.side}
                                            </span>
                                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                                {trade.qty.toLocaleString()} MT
                                            </span>
                                            <span className="text-slate-400 dark:text-[#666] mx-1">@</span>
                                            <span className="text-slate-900 dark:text-white font-bold">${trade.price.toFixed(2)}</span>
                                            {trade.is_anonymous && (
                                                <span title="Anonymous trade"><EyeOff size={9} className="text-violet-400 dark:text-violet-500 ml-1.5 shrink-0" /></span>
                                            )}
                                            <span className="text-slate-400 dark:text-[#555] ml-auto">{trade.period}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        {/* Activity Feed */}
                        <div key="activity" className="bg-white dark:bg-[#050505] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className={`drag-handle flex items-center px-3 py-1 ${layoutMode === 'customize' ? 'cursor-move' : 'cursor-default'} bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#181818]`}>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">{t('terminal.panel.activityFeed')}</span>
                                {layoutMode === 'customize' && <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>}
                            </div>
                            <div data-tour="terminal-activity-feed" style={{ padding: '4px', height: 'calc(100% - 24px)', overflow: 'auto' }}>
                                <ActivityFeed />
                            </div>
                        </div>
                    </GridLayout>
                </div>
            </div>
        </div>

            {/* Price Alert Manager Panel */}
            <PriceAlertManager
                isOpen={alertPanelOpen}
                onClose={() => setAlertPanelOpen(false)}
            />
        </>
    );
};
