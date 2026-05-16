import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createChart, LineSeries, CrosshairMode, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import {
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Maximize2,
    TrendingUp,
    Activity,
    Loader2,
    ChevronDown,
    EyeOff,
    Bell,
} from 'lucide-react';
import { DeliveryPoint, MarketProduct, OrderBookOrder, PriceSummary } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';
import { useTheme } from '../context/ThemeContext';
import { useSSE } from '../hooks/useSSE';
import { OrderbookDepth } from './trading/OrderbookDepth';
import { ForwardCurve } from './ForwardCurve';
import { ActivityFeed } from './ActivityFeed';
import { PriceAlertManager } from './PriceAlertManager';
import { useNamespace } from '../hooks/useNamespace';
import { normalizeAvailabilityWindow } from '../utils/availabilityWindow';
import { GridLayout } from 'react-grid-layout';
import {
    ACTIVE_MARKETPLACE_PRODUCT_OPTIONS,
    getMarketplaceFuelType,
    getMarketplaceProductLabel,
    getMarketplaceProductValue,
} from '../utils/marketProducts';
import { APPROVED_TRADING_PORTS } from '../data';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export const getTerminalFuelType = (value: string | null | undefined): string | undefined =>
    getMarketplaceFuelType(value) || value || undefined;

const DEFAULT_TRADING_PORT = 'Singapore';

export const getTerminalPort = (value: string | null | undefined): string => {
    const match = APPROVED_TRADING_PORTS.find((port) => port.toLowerCase() === value?.toLowerCase());
    return match || DEFAULT_TRADING_PORT;
};

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
    side: 'BUY' | 'SELL';
    is_anonymous?: boolean;
}

// Map availability windows to terminal periods
const PERIOD_CONFIG: { window: string; period: string; type: TerminalRow['type'] }[] = [
    { window: 'SPOT', period: 'SPOT', type: 'SPOT' },
    { window: '2026-Q1', period: 'Q1 26', type: 'QTR' },
    { window: '2026-Q2', period: 'Q2 26', type: 'QTR' },
    { window: '2026-Q3', period: 'Q3 26', type: 'QTR' },
    { window: '2026-Q4', period: 'Q4 26', type: 'QTR' },
    { window: '2027-CAL', period: 'CAL 27', type: 'YEAR' },
    { window: '2027-Q1', period: 'Q1 27', type: 'QTR' },
    { window: '2027-Q2', period: 'Q2 27', type: 'QTR' },
    { window: '2027-Q3', period: 'Q3 27', type: 'QTR' },
    { window: '2027-Q4', period: 'Q4 27', type: 'QTR' },
    { window: '2028-CAL', period: 'CAL 28', type: 'YEAR' },
    { window: '2029-CAL', period: 'CAL 29', type: 'YEAR' },
    { window: '2030-CAL', period: 'CAL 30', type: 'YEAR' },
];

export const terminalWindowMatches = (orderWindow: string | null | undefined, configWindow: string): boolean =>
    normalizeAvailabilityWindow(orderWindow) === normalizeAvailabilityWindow(configWindow);

let terminalOrdersCache: OrderBookOrder[] | null = null;
let terminalDeliveryPointsCache: DeliveryPoint[] | null = null;

// Base prices by fuel type for simulation
// Base prices by fuel type — aligned with Ship & Bunker real market (March 2026)
// These are ARA mid-market prices; region modifiers adjust per port
const FUEL_BASE_PRICES: Record<MarketProduct, number> = {
    BIO_METHANOL: 680,
    E_METHANOL: 1250,
    BIO_ETHANOL: 590,
    SYNTHETIC_ETHANOL: 740,
};

// Region price modifiers (spread vs base)
// Region price modifiers ($/MT vs ARA base)
const REGION_MODIFIERS: Record<string, number> = {
    'Singapore': 140,     // SG consistently premium over ARA
    'Rotterdam': 0,       // ~= ARA
    'ARA': 0,
    'Houston': 30,
    'Fujairah': 170,      // Fujairah premium vs ARA
    'Busan': 120,
    'Shanghai': 100,
    'Algeciras': 20,
};

// Seeded random for deterministic-looking but varying data
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

// Generate simulated market data for a period
const generateSimulatedRow = (
    periodIndex: number,
    basePrice: number,
    realAsk: number | null,
    realAskQty: number | null,
    tick: number
): { bid: number; bidQty: number; last: number; change: number } => {
    // Forward curve: slight contango (prices increase with time)
    const forwardPremium = periodIndex * (2 + seededRandom(tick * 7 + periodIndex) * 3);
    const periodBase = basePrice + forwardPremium;

    // Small tick-to-tick variance
    const tickNoise = (seededRandom(tick * 13 + periodIndex * 37) - 0.5) * 4;
    const currentMid = periodBase + tickNoise;

    // Bid sits below ask (or below mid if no ask)
    const spread = 3 + seededRandom(tick * 19 + periodIndex) * 5;
    const bid = realAsk
        ? realAsk - spread
        : currentMid - spread / 2;

    // Bid quantity: random realistic amounts
    const bidQty = Math.round((200 + seededRandom(tick * 23 + periodIndex * 11) * 800) / 50) * 50;

    // Last done: between bid and ask, with slight randomness
    const askForCalc = realAsk || (currentMid + spread / 2);
    const lastPct = 0.3 + seededRandom(tick * 29 + periodIndex * 43) * 0.4;
    const last = bid + (askForCalc - bid) * lastPct;

    // Change from previous (small random delta)
    const change = (seededRandom(tick * 31 + periodIndex * 53) - 0.45) * 8;

    return {
        bid: Math.round(bid * 100) / 100,
        bidQty,
        last: Math.round(last * 100) / 100,
        change: Math.round(change * 100) / 100,
    };
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

    // Determine side: auto-matched trades don't include side, default to BUY
    // trade_created events come from explicit order creation
    const side: 'BUY' | 'SELL' = eventType === 'trade_auto_matched' ? 'BUY' : (data.side === 'SELL' ? 'SELL' : 'BUY');

    // Best-effort period label from fuel_type (the backend doesn't send availability_window in trade events)
    const period = fuel || 'SPOT';

    return { id, time, qty, price, port: region, period, side, is_anonymous: data.is_anonymous ?? false };
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
        return getTerminalPort(localStorage.getItem('verdaxis_marketplace_port'));
    });
    const [selectedProduct, setSelectedProduct] = useState<MarketProduct>(() => {
        const storedProduct = localStorage.getItem('verdaxis_marketplace_product');
        const storedFuel = localStorage.getItem('verdaxis_marketplace_fuel');
        return getMarketplaceProductValue(storedProduct) || getMarketplaceProductValue(storedFuel) || 'BIO_METHANOL';
    });
    const [showPortDropdown, setShowPortDropdown] = useState(false);
    const [showFuelDropdown, setShowFuelDropdown] = useState(false);

    // Orders from API (orderbook sync)
    const [allOrders, setAllOrders] = useState<OrderBookOrder[]>(() => terminalOrdersCache ?? []);
    const [loading, setLoading] = useState(!terminalOrdersCache);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>(() => terminalDeliveryPointsCache ?? []);

    // Alert panel state
    const [alertPanelOpen, setAlertPanelOpen] = useState(false);

    // TradingView lightweight-charts refs
    const tvChartContainerRef = useRef<HTMLDivElement>(null);
    const tvChartRef = useRef<IChartApi | null>(null);
    const tvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

    // Responsive grid width
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [gridWidth, setGridWidth] = useState(1200);

    // Layout customization (movable boxes — currently shows preset toggle)
    const [layoutMode, setLayoutMode] = useState<'default' | 'compact'>('default');

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

    // Simulation tick counter (drives simulated row data for periods without real orders)
    const [tick, setTick] = useState(0);
    const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
    // Track which rows are flashing and in which direction
    const [flashRows, setFlashRows] = useState<Record<string, 'up' | 'down'>>({});
    const prevPrices = useRef<Record<string, { bid: number | null; ask: number | null }>>({});
    const tradeScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('verdaxis_marketplace_port', selectedPort);
    }, [selectedPort]);

    useEffect(() => {
        localStorage.setItem('verdaxis_marketplace_product', selectedProduct);
    }, [selectedProduct]);

    // Fetch orders from the orderbook (called on mount and on SSE orderbook events)
    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.orderbook.list();
            terminalOrdersCache = data;
            setAllOrders(data);
        } catch (e) {
            console.error('Failed to load orderbook for terminal', e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Initial fetch on mount (no polling — SSE handles updates)
    useEffect(() => {
        fetchOrders(Boolean(terminalOrdersCache));
    }, [fetchOrders]);

    useEffect(() => {
        let cancelled = false;
        const fetchDeliveryPoints = async () => {
            if (terminalDeliveryPointsCache) return;
            try {
                const points = await api.catalog.deliveryPoints();
                if (cancelled) return;
                terminalDeliveryPointsCache = points;
                setDeliveryPoints(points);
            } catch (e) {
                console.error('Failed to load delivery points for terminal', e);
            }
        };
        fetchDeliveryPoints();
        return () => {
            cancelled = true;
        };
    }, []);

    // --- SSE: Orderbook updates (replaces 30s polling) ---
    const handleOrderbookEvent = useCallback((_event: string, _data: any) => {
        // Any orderbook change: refetch the full orderbook
        fetchOrders(true);
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

    // Fetch real price summaries from price discovery API
    const [priceSummaries, setPriceSummaries] = useState<PriceSummary[]>([]);
    const selectedProductOption = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.find((option) => option.value === selectedProduct);
    const selectedFuelType = selectedProductOption?.fuelType || getMarketplaceFuelType(selectedProduct) || 'Methanol';
    const selectedProductLabel = getMarketplaceProductLabel(selectedProduct, selectedFuelType);
    const selectedDeliveryPoint = useMemo(
        () => deliveryPoints.find((point) => point.name.toLowerCase() === selectedPort.toLowerCase()),
        [deliveryPoints, selectedPort]
    );
    const selectedDeliveryPointId = selectedDeliveryPoint?.id;

    useEffect(() => {
        const fetchPrices = async () => {
            if (!selectedDeliveryPointId) {
                setPriceSummaries([]);
                return;
            }
            try {
                const resp = await api.prices.getSummaries({
                    fuel_type: selectedFuelType,
                    market_product: selectedProduct,
                    delivery_point_id: selectedDeliveryPointId,
                });
                setPriceSummaries(resp.summaries);
            } catch (e) {
                console.error('Failed to load price summaries', e);
            }
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [selectedFuelType, selectedProduct, selectedDeliveryPointId]);

    // Fetch VWAP reference prices (internal vs external split)
    const [vwapData, setVwapData] = useState<{ vwap_usd: number; total_volume_mt: number; trade_count: number; visibility: string } | null>(null);

    useEffect(() => {
        const fetchVwap = async () => {
            if (!selectedDeliveryPointId) {
                setVwapData(null);
                return;
            }
            try {
                const resp = await api.prices.getReference({
                    fuel_type: selectedFuelType,
                    market_product: selectedProduct,
                    delivery_point_id: selectedDeliveryPointId,
                    visibility: 'internal',
                });
                if (resp.prices.length > 0) {
                    setVwapData(resp.prices[0]);
                } else {
                    setVwapData(null);
                }
            } catch {
                setVwapData(null);
            }
        };
        fetchVwap();
        const interval = setInterval(fetchVwap, 30000);
        return () => clearInterval(interval);
    }, [selectedFuelType, selectedProduct, selectedDeliveryPointId]);

    // Simulation tick: update every 6 seconds (drives simulated fallback rows & chart)
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

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

    // Derived base price for simulated rows
    const basePrice = FUEL_BASE_PRICES[selectedProduct] || 540;
    const regionMod = REGION_MODIFIERS[selectedPort] || 0;
    const effectiveBase = basePrice + regionMod;

    // Auto-scroll trade feed
    useEffect(() => {
        if (tradeScrollRef.current) {
            tradeScrollRef.current.scrollTop = 0;
        }
    }, [tradeEvents]);

    // Filter orders by selected port and fuel, split into asks and bids
    const filteredOrders = useMemo(() => {
        return allOrders.filter(o => {
            const portLower = selectedPort.toLowerCase();
            const matchPort = o.region.toLowerCase().includes(portLower)
                || (o.delivery_point_name || '').toLowerCase().includes(portLower);
            const orderProduct = (
                o.market_product
                || getMarketplaceProductValue(o.product_name)
                || getMarketplaceProductValue(o.fuel_type)
            );
            const fallbackLabel = (o.product_name || o.fuel_type || '').trim().toLowerCase();
            const matchProduct = orderProduct
                ? orderProduct === selectedProduct
                : fallbackLabel === selectedProductLabel.toLowerCase();
            return matchPort && matchProduct;
        });
    }, [allOrders, selectedPort, selectedProduct, selectedProductLabel]);

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
        return PERIOD_CONFIG.map((config, idx) => {
            const periodAsks = filteredAsks.filter(
                o => terminalWindowMatches(o.availability_window, config.window)
            );
            const periodBids = filteredBids.filter(
                o => terminalWindowMatches(o.availability_window, config.window)
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
            const matchingSummary = config.type === 'SPOT' ? priceSummaries.find((summary) => {
                const matchesProduct = summary.market_product
                    ? summary.market_product === selectedProduct
                    : summary.fuel_type.toLowerCase().includes(selectedFuelType.toLowerCase());
                const matchesDeliveryPoint = selectedDeliveryPointId
                    ? summary.delivery_point_id === selectedDeliveryPointId
                    : summary.delivery_point_name?.toLowerCase() === selectedPort.toLowerCase();
                return matchesProduct && matchesDeliveryPoint;
            }) : null;
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
    }, [filteredAsks, filteredBids, priceSummaries, selectedFuelType, selectedProduct, selectedPort, selectedDeliveryPointId]);

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

    // Build chart data from orderbook by period
    const chartData = useMemo(() => {
        return PERIOD_CONFIG.map((config, idx) => {
            const periodAsksForChart = filteredAsks.filter(o => terminalWindowMatches(o.availability_window, config.window));
            const periodBidsForChart = filteredBids.filter(o => terminalWindowMatches(o.availability_window, config.window));

            const askPricesChart = periodAsksForChart.map(o => Number(o.price_per_mt_usd)).filter(Boolean);
            const bidPricesChart = periodBidsForChart.map(o => Number(o.price_per_mt_usd)).filter(Boolean);

            // Best bid and best ask for the chart — no simulation fallback, show real data only
            const bestAsk = askPricesChart.length > 0 ? Math.min(...askPricesChart) : null;
            const bestBid = bidPricesChart.length > 0 ? Math.max(...bidPricesChart) : null;
            const midPrice = (bestBid && bestAsk) ? (bestBid + bestAsk) / 2 : bestBid || bestAsk || null;

            const totalQty = [...periodAsksForChart, ...periodBidsForChart]
                .reduce((s, o) => s + Number(o.remaining_quantity_mt || o.quantity_mt), 0);

            return {
                period: config.period,
                window: config.window,
                price: midPrice ? Math.round(midPrice * 100) / 100 : null,
                bestBid: bestBid ? Math.round(bestBid * 100) / 100 : null,
                bestAsk: bestAsk ? Math.round(bestAsk * 100) / 100 : null,
                quantity: totalQty || null,
            };
        });
    }, [filteredAsks, filteredBids]);

    // Stable ref for click handler closures (avoids recreating chart on every state change)
    const chartDataRef = useRef(chartData);
    chartDataRef.current = chartData;
    const selectedPortRef = useRef(selectedPort);
    selectedPortRef.current = selectedPort;
    const selectedProductRef = useRef(selectedProduct);
    selectedProductRef.current = selectedProduct;
    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;

    // TradingView chart: create once when container mounts, clean up on unmount
    useEffect(() => {
        const container = tvChartContainerRef.current;
        if (!container) return;

        const dark = isDark;
        const chartBg   = dark ? '#040404' : '#F1F5F9';
        const chartText = dark ? '#888888' : '#6B7280';
        const chartGrid = dark ? '#1a1a1a' : '#E2E8F0';
        const chartBorder = dark ? '#333333' : '#CBD5E1';

        const chart = createChart(container, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: chartBg },
                textColor: chartText,
                fontFamily: "'IBM Plex Mono', monospace",
            },
            grid: {
                vertLines: { color: chartGrid, style: 0 },
                horzLines: { color: chartGrid, style: 0 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: chartBorder,
            },
            timeScale: {
                borderColor: chartBorder,
                tickMarkFormatter: (time: number) => {
                    const item = chartDataRef.current[time];
                    return item ? item.period : '';
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        const series = chart.addSeries(LineSeries, {
            color: '#10b981',
            lineWidth: 2,
            pointMarkersVisible: true,
            pointMarkersRadius: 4,
            crosshairMarkerRadius: 6,
            crosshairMarkerBorderColor: '#fff',
            crosshairMarkerBorderWidth: 2,
            crosshairMarkerBackgroundColor: '#10b981',
            lastValueVisible: false,
            priceLineVisible: false,
        });

        tvChartRef.current = chart;
        tvSeriesRef.current = series;

        // Click handler reads from refs so it always has current values
        chart.subscribeClick((param) => {
            if (!param.time && param.time !== 0) return;
            const idx = param.time as number;
            const item = chartDataRef.current[idx];
            if (item?.window && onNavigateRef.current) {
                localStorage.setItem('verdaxis_marketplace_port', selectedPortRef.current);
                localStorage.setItem('verdaxis_marketplace_product', selectedProductRef.current);
                localStorage.setItem('verdaxis_marketplace_window', item.window);
                onNavigateRef.current('MARKETPLACE');
            }
        });

        return () => {
            chart.remove();
            tvChartRef.current = null;
            tvSeriesRef.current = null;
        };
    }, [loading]); // recreate when loading toggles (container mounts/unmounts)

    // Update chart data when chartData changes
    useEffect(() => {
        if (!tvSeriesRef.current || !tvChartRef.current) return;
        const tvData = chartData
            .map((item, idx) => ({
                time: idx as any,
                value: item.price as number,
            }))
            .filter(d => d.value != null);

        tvSeriesRef.current.setData(tvData);
        tvChartRef.current.timeScale().fitContent();
    }, [chartData]);

    // Update TV chart colors when theme changes
    useEffect(() => {
        if (!tvChartRef.current) return;
        const chartBg   = isDark ? '#040404' : '#F1F5F9';
        const chartText = isDark ? '#888888' : '#6B7280';
        const chartGrid = isDark ? '#1a1a1a' : '#E2E8F0';
        const chartBorder = isDark ? '#333333' : '#CBD5E1';
        tvChartRef.current.applyOptions({
            layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
            grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
            rightPriceScale: { borderColor: chartBorder },
            timeScale: { borderColor: chartBorder },
        });
    }, [isDark]);

    // Summary stats
    // Best offer = lowest real ask price across all periods (for the header display)
    const realAskPrices = filteredAsks.map(o => Number(o.price_per_mt_usd)).filter(Boolean);
    const spotPrice = realAskPrices.length > 0 ? Math.min(...realAskPrices) : terminalData.find(r => r.type === 'SPOT')?.ask;
    const totalListings = filteredOrders.length;
    const totalVolume = filteredOrders.reduce((s, o) => s + Number(o.quantity_mt), 0);

    // Broadcast Context
    useEffect(() => {
        setPageContext({
            view: 'Market Terminal',
            product: `${selectedProductLabel} (${selectedPort})`,
            market_data_summary: `Showing ${totalListings} active listings for ${selectedProductLabel} at ${selectedPort}.`,
            spot_price: spotPrice ? `$${spotPrice.toFixed(2)}` : 'No offers',
            total_volume: `${totalVolume.toLocaleString()} MT`,
        });
    }, [terminalData, selectedPort, selectedProductLabel, spotPrice, totalListings, totalVolume, setPageContext]);

    // Helper to determine if a row has real orderbook data
    const hasRealData = useCallback((row: TerminalRow) => {
        const config = PERIOD_CONFIG.find(p => p.period === row.period);
        if (!config) return false;
        return filteredOrders.some(o => terminalWindowMatches(o.availability_window, config.window));
    }, [filteredOrders]);

    const portNames = APPROVED_TRADING_PORTS;

    const availableProducts = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS;

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
                                onClick={e => { e.stopPropagation(); setLayoutMode(layoutMode === 'default' ? 'compact' : 'default'); }}
                                title={layoutMode === 'default' ? 'Compact layout' : 'Default layout'}
                                style={{
                                    background: 'transparent',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}`,
                                    borderRadius: 4,
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '2px 5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginLeft: 4,
                                }}
                            >
                                <Maximize2 size={11} />
                            </button>
                        </div>

                        {/* Fuel Type Selector */}
                        <div className="relative mb-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowFuelDropdown(!showFuelDropdown); setShowPortDropdown(false); }}
                                className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 hover:text-emerald-500 transition-colors"
                            >
                                {selectedProductLabel.toUpperCase()}
                                <ChevronDown size={16} className="text-slate-400" />
                            </button>
                            {showFuelDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded shadow-xl z-50 min-w-[160px] max-h-48 overflow-y-auto">
                                    {availableProducts.map((product) => (
                                        <button
                                            key={product.value}
                                            onClick={() => { setSelectedProduct(product.value); setShowFuelDropdown(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors ${
                                                selectedProduct === product.value ? 'text-emerald-500 bg-slate-50 dark:bg-[#1a1a1a]' : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {product.label}
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
                                <span className="text-emerald-500">{selectedPort.toUpperCase()}</span>
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
                                {spotPrice ? (
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">${spotPrice.toFixed(2)}</span>
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
                    <div className="flex justify-between items-start mb-2 px-2">
                        <div>
                            <div className="text-slate-400 dark:text-[#888] text-[10px] font-bold tracking-widest uppercase">{t('terminal.label.forwardCurve')}</div>
                            <div className="text-xs text-slate-600 dark:text-[#555]">{selectedProductLabel.toUpperCase()} — {selectedPort.toUpperCase()}</div>
                        </div>
                        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#222] rounded text-slate-400 dark:text-[#666]"><Maximize2 size={14}/></button>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-[80%]">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div
                            ref={tvChartContainerRef}
                            className="verdaxis-chart-container"
                            style={{ width: '100%', height: '80%', cursor: 'pointer' }}
                        />
                    )}
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
                            const periodConfig = PERIOD_CONFIG.find(p => p.period === row.period);
                            const offerCount = periodConfig
                                ? filteredOrders.filter(o => terminalWindowMatches(o.availability_window, periodConfig.window)).length
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
                        layout={[
                            { i: 'depth', x: 0, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
                            { i: 'trades', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 2 },
                            { i: 'curve', x: 0, y: 3, w: 8, h: 4, minW: 4, minH: 3 },
                            { i: 'activity', x: 8, y: 3, w: 4, h: 4, minW: 3, minH: 2 },
                        ]}
                        isDraggable={true}
                        isResizable={true}
                        draggableHandle=".drag-handle"
                        compactType="vertical"
                        margin={[6, 6]}
                    >
                        {/* Orderbook Depth */}
                        <div key="depth" className="bg-white dark:bg-[#050505] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className="drag-handle flex items-center px-3 py-1 cursor-move bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#181818]">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">Orderbook Depth</span>
                                <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>
                            </div>
                            <div style={{ padding: '4px 8px', height: 'calc(100% - 24px)', overflow: 'hidden' }}>
                                <OrderbookDepth
                                    bids={depthBids}
                                    asks={depthAsks}
                                    fuelType={selectedProductLabel}
                                    region={selectedPort}
                                />
                            </div>
                        </div>
                        {/* Trade Events */}
                        <div key="trades" className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className="drag-handle flex items-center px-3 py-1 cursor-move border-b border-slate-100 dark:border-[#181818]">
                                <Activity size={10} className="text-emerald-500 mr-1.5" />
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">{t('terminal.activity.title')}</span>
                                <div className={`ml-1.5 w-1.5 h-1.5 rounded-full ${tradesConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>
                            </div>
                            <div ref={tradeScrollRef} className="overflow-y-auto px-2 py-1" style={{ height: 'calc(100% - 24px)' }}>
                                {tradeEvents.length === 0 ? (
                                    <div className="text-[10px] text-slate-400 dark:text-[#444] text-center py-4">{t('terminal.activity.waiting')}</div>
                                ) : (
                                    tradeEvents.map((trade) => (
                                        <div key={trade.id} className="flex items-center text-[10px] py-0.5 border-b border-slate-50 dark:border-[#111] last:border-0">
                                            <span className="text-slate-400 dark:text-[#555] w-16 shrink-0">{trade.time}</span>
                                            <span className={`font-bold w-10 shrink-0 ${trade.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
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
                        {/* Forward Curve */}
                        <div key="curve" className="bg-white dark:bg-[#050505] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className="drag-handle flex items-center px-3 py-1 cursor-move bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#181818]">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">Forward Curve</span>
                                <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>
                            </div>
                            <div data-tour="terminal-forward-curve" style={{ padding: '4px', height: 'calc(100% - 24px)' }}>
                                <ForwardCurve
                                    fuelType={selectedFuelType}
                                    marketProductCode={selectedProduct}
                                    deliveryPointName={selectedPort}
                                    embedded
                                    onPeriodClick={(window) => {
                                        if (onNavigate) {
                                            localStorage.setItem('verdaxis_marketplace_port', selectedPort);
                                            localStorage.setItem('verdaxis_marketplace_product', selectedProduct);
                                            localStorage.setItem('verdaxis_marketplace_window', window);
                                            onNavigate('MARKETPLACE');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        {/* Activity Feed */}
                        <div key="activity" className="bg-white dark:bg-[#050505] border border-slate-100 dark:border-[#222] rounded-lg overflow-hidden">
                            <div className="drag-handle flex items-center px-3 py-1 cursor-move bg-slate-50 dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-[#181818]">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-widest">Activity Feed</span>
                                <span className="ml-auto text-[9px] text-slate-300 dark:text-[#333]">⋮⋮</span>
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
