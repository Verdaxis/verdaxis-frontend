import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from 'recharts';
import {
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Maximize2,
    TrendingUp,
    Activity,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { Port, OrderBookOrder, PriceSummary } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';
import { useSSE } from '../hooks/useSSE';
import { OrderbookDepth } from './trading/OrderbookDepth';

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
}

// Map availability windows to terminal periods
const PERIOD_CONFIG: { window: string; period: string; type: TerminalRow['type'] }[] = [
    { window: 'Spot', period: 'SPOT', type: 'SPOT' },
    { window: 'Q1 2026', period: 'Q1 26', type: 'QTR' },
    { window: 'Q2 2026', period: 'Q2 26', type: 'QTR' },
    { window: 'Q3 2026', period: 'Q3 26', type: 'QTR' },
    { window: 'Q4 2026', period: 'Q4 26', type: 'QTR' },
    { window: 'Forward 2027', period: 'CAL 27', type: 'YEAR' },
    { window: 'Forward 2028', period: 'CAL 28', type: 'YEAR' },
];

// Base prices by fuel type for simulation
const FUEL_BASE_PRICES: Record<string, number> = {
    'Methanol': 540,
    'Biofuel': 1200,
    'LNG': 680,
    'Ammonia': 450,
    'Ethanol': 780,
    'LSMGO': 620,
};

// Region price modifiers (spread vs base)
const REGION_MODIFIERS: Record<string, number> = {
    'Singapore': 0,
    'Rotterdam': 8,
    'ARA': 10,
    'Houston': -12,
    'Fujairah': 5,
    'Busan': 3,
    'Shanghai': -5,
    'Algeciras': 6,
};

// Available fuel types for the selector
const FUEL_TYPES = ['Methanol', 'Biofuel', 'LNG', 'Ammonia', 'Ethanol', 'LSMGO'];

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

    return { id, time, qty, price, port: region, period, side };
};

export const MarketTerminal: React.FC = () => {
    const { setPageContext } = useCopilotContext();

    // Port & Fuel selectors
    const [ports, setPorts] = useState<Port[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('Singapore');
    const [selectedFuel, setSelectedFuel] = useState<string>('Methanol');
    const [showPortDropdown, setShowPortDropdown] = useState(false);
    const [showFuelDropdown, setShowFuelDropdown] = useState(false);

    // Orders from API (orderbook sync)
    const [allOrders, setAllOrders] = useState<OrderBookOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Simulation tick counter (drives simulated row data for periods without real orders)
    const [tick, setTick] = useState(0);
    const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
    const tradeScrollRef = useRef<HTMLDivElement>(null);

    // Fetch ports for the selector
    useEffect(() => {
        api.ports.list().then(setPorts).catch(console.error);
    }, []);

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

    // Fetch real price summaries from price discovery API
    const [priceSummaries, setPriceSummaries] = useState<PriceSummary[]>([]);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const resp = await api.prices.getSummaries({
                    fuel_type: selectedFuel,
                    region: selectedPort,
                });
                setPriceSummaries(resp.summaries);
            } catch (e) {
                console.error('Failed to load price summaries', e);
            }
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [selectedFuel, selectedPort]);

    // Fetch VWAP reference prices (internal vs external split)
    const [vwapData, setVwapData] = useState<{ vwap_usd: number; total_volume_mt: number; trade_count: number; visibility: string } | null>(null);

    useEffect(() => {
        const fetchVwap = async () => {
            try {
                const resp = await api.prices.getReference({
                    fuel_type: selectedFuel,
                    region: selectedPort,
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
    }, [selectedFuel, selectedPort]);

    // Simulation tick: update every 6 seconds (drives simulated fallback rows & chart)
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Derived base price for simulated rows
    const basePrice = FUEL_BASE_PRICES[selectedFuel] || 540;
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
            const matchPort = o.region.toLowerCase().includes(selectedPort.toLowerCase());
            const matchFuel = o.fuel_type.toLowerCase().includes(selectedFuel.toLowerCase());
            return matchPort && matchFuel;
        });
    }, [allOrders, selectedPort, selectedFuel]);

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

            // Simulated data for last/change (and fallback bid if no real bids)
            const sim = generateSimulatedRow(idx, effectiveBase, realAsk, realAskQty, tick);

            // Use real bid if available, otherwise simulated
            const bid = realBid ?? sim.bid;
            const bidQty = realBidQty ?? sim.bidQty;

            // Use real ask if available, otherwise simulated
            const ask = realAsk ?? Math.round(((bid || sim.bid) + 3 + seededRandom(tick * 37 + idx * 17) * 5) * 100) / 100;
            const askQty = realAskQty ?? Math.round((150 + seededRandom(tick * 43 + idx * 23) * 600) / 50) * 50;

            // Use real price discovery data for last/change when available
            const matchingSummary = priceSummaries.find(
                s => s.fuel_type.toLowerCase().includes(selectedFuel.toLowerCase())
                  && s.region.toLowerCase().includes(selectedPort.toLowerCase())
            );
            const last = matchingSummary?.last_price != null ? Number(matchingSummary.last_price) : sim.last;
            const change = matchingSummary?.price_change_pct
                ? Number(matchingSummary.price_change_pct)
                : sim.change;

            return {
                id: String(idx + 1),
                period: config.period,
                type: config.type,
                bidQty: bidQty,
                bid: bid,
                ask: ask,
                askQty: askQty,
                last: last,
                change: change,
            };
        });
    }, [filteredAsks, filteredBids, tick, effectiveBase, priceSummaries, selectedFuel, selectedPort]);

    // Build chart data from orderbook by period
    const chartData = useMemo(() => {
        return PERIOD_CONFIG.map((config, idx) => {
            const periodOrders = filteredOrders.filter(
                o => o.availability_window === config.window
            );
            const prices = periodOrders.map(o => Number(o.price_per_mt_usd));
            // Use real prices if available, otherwise use simulated mid price
            const avgPrice = prices.length > 0
                ? prices.reduce((a, b) => a + b, 0) / prices.length
                : effectiveBase + idx * 2.5 + (seededRandom(tick * 7 + idx) - 0.5) * 3;
            const totalQty = periodOrders.reduce((s, o) => s + Number(o.quantity_mt), 0);

            return {
                period: config.period,
                price: Math.round(avgPrice * 100) / 100,
                quantity: totalQty || null,
            };
        });
    }, [filteredOrders, effectiveBase, tick]);

    // Summary stats
    const spotPrice = terminalData.find(r => r.type === 'SPOT')?.ask;
    const totalListings = filteredOrders.length;
    const totalVolume = filteredOrders.reduce((s, o) => s + Number(o.quantity_mt), 0);

    // Broadcast Context
    useEffect(() => {
        setPageContext({
            view: 'Market Terminal',
            product: `${selectedFuel} (${selectedPort})`,
            market_data_summary: `Showing ${totalListings} active listings for ${selectedFuel} at ${selectedPort}.`,
            spot_price: spotPrice ? `$${spotPrice.toFixed(2)}` : 'No offers',
            total_volume: `${totalVolume.toLocaleString()} MT`,
        });
    }, [terminalData, selectedPort, selectedFuel, setPageContext]);

    // Helper to determine if a row has real orderbook data
    const hasRealData = useCallback((row: TerminalRow) => {
        const config = PERIOD_CONFIG.find(p => p.period === row.period);
        if (!config) return false;
        return filteredOrders.some(o => o.availability_window === config.window);
    }, [filteredOrders]);

    // Unique port names from ports list
    const portNames = useMemo(() => {
        const names = ports.map(p => p.name);
        allOrders.forEach(o => {
            if (!names.includes(o.region)) names.push(o.region);
        });
        return [...new Set(names)].sort();
    }, [ports, allOrders]);

    // Unique fuel types from orderbook
    const availableFuels = useMemo(() => {
        const fromOrders = [...new Set(allOrders.map(o => o.fuel_type))];
        const combined = [...new Set([...FUEL_TYPES, ...fromOrders])];
        return combined.sort();
    }, [allOrders]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-[#e5e5e5] font-mono overflow-auto lg:overflow-hidden transition-colors" onClick={() => { setShowPortDropdown(false); setShowFuelDropdown(false); }}>

            {/* Top Section: Header & Chart */}
            <div className="h-auto lg:h-64 border-b border-slate-200 dark:border-[#222] flex flex-col lg:flex-row">
                {/* Product Header with Selectors */}
                <div className="w-full lg:w-80 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#222] flex flex-col justify-between bg-white dark:bg-[#0a0a0a]">
                    <div>
                        <div className="flex items-center space-x-2 text-slate-400 dark:text-[#666] text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">
                            <Zap size={12} className="text-verdaxis" />
                            <span>Market Terminal</span>
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                title={sseConnected ? 'Live: connected' : 'Disconnected'}
                            />
                        </div>

                        {/* Fuel Type Selector */}
                        <div className="relative mb-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowFuelDropdown(!showFuelDropdown); setShowPortDropdown(false); }}
                                className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 hover:text-emerald-500 transition-colors"
                            >
                                {selectedFuel.toUpperCase()}
                                <ChevronDown size={16} className="text-slate-400" />
                            </button>
                            {showFuelDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded shadow-xl z-50 min-w-[160px] max-h-48 overflow-y-auto">
                                    {availableFuels.map(fuel => (
                                        <button
                                            key={fuel}
                                            onClick={() => { setSelectedFuel(fuel); setShowFuelDropdown(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors ${
                                                selectedFuel === fuel ? 'text-emerald-500 bg-slate-50 dark:bg-[#1a1a1a]' : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {fuel}
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
                            <span className="text-xs text-slate-400 dark:text-[#888] font-bold">BEST OFFER</span>
                            <div className="text-right">
                                {spotPrice ? (
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">${spotPrice.toFixed(2)}</span>
                                ) : (
                                    <span className="text-lg font-bold text-slate-400 dark:text-[#555]">No offers</span>
                                )}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#555] flex justify-between uppercase font-bold tracking-wider">
                            <span>Listings: <span className="text-emerald-500">{totalListings}</span></span>
                            <span>Vol: {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k MT` : '--'}</span>
                        </div>
                    </div>
                </div>

                {/* Price Curve Chart */}
                <div className="flex-1 p-4 bg-slate-50 dark:bg-[#080808] min-h-[200px] lg:min-h-0">
                    <div className="flex justify-between items-start mb-2 px-2">
                        <div>
                            <div className="text-slate-400 dark:text-[#888] text-[10px] font-bold tracking-widest uppercase">Forward Curve</div>
                            <div className="text-xs text-slate-600 dark:text-[#444]">{selectedFuel.toUpperCase()} — {selectedPort.toUpperCase()}</div>
                        </div>
                        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#222] rounded text-slate-400 dark:text-[#666]"><Maximize2 size={14}/></button>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-[80%]">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.1} vertical={false} />
                                <XAxis dataKey="period" stroke="#888" tick={{fontSize: 10, fill: '#888'}} tickLine={false} axisLine={false} />
                                <YAxis orientation="right" stroke="#888" tick={{fontSize: 10, fill: '#888'}} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#10b981', stroke: '#000' }}
                                    activeDot={{ r: 5, fill: '#10b981', stroke: '#000' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* VWAP Reference Strip */}
            {vwapData && (
                <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#222] text-[10px] overflow-x-auto">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#666] uppercase font-bold tracking-widest whitespace-nowrap">
                        <TrendingUp size={10} className="text-emerald-500" />
                        VWAP
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">Price:</span>
                        <span className="text-emerald-500 font-bold">${Number(vwapData.vwap_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">Vol:</span>
                        <span className="text-slate-700 dark:text-[#ccc] font-bold">{Number(vwapData.total_volume_mt).toLocaleString()} MT</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-slate-400 dark:text-[#555] font-bold">Trades:</span>
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
                    <div className="w-32 px-4">Period</div>
                    <div className="w-24 text-right px-4">Bid Qty</div>
                    <div className="w-24 text-right px-4 text-emerald-700">Bid</div>
                    <div className="w-24 text-right px-4 text-rose-700">Ask</div>
                    <div className="w-24 text-right px-4">Ask Qty</div>
                    <div className="w-24 text-right px-4">Last</div>
                    <div className="w-24 text-right px-4">Chg</div>
                    <div className="flex-1 text-right px-4"># Offers</div>
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
                                ? filteredOrders.filter(o => o.availability_window === periodConfig.window).length
                                : 0;

                            return (
                                <div
                                    key={row.id}
                                    className={`flex items-center border-b border-slate-100 dark:border-[#111] py-1.5 transition-colors group ${hoverColor}`}
                                >
                                    {/* Period */}
                                    <div className="w-32 px-4 text-xs font-bold flex items-center space-x-2 text-slate-900 dark:text-white">
                                        {row.type === 'SPOT' && <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse mr-1"/>}
                                        <span>{row.period}</span>
                                    </div>

                                    {/* Bid Qty */}
                                    <div className="w-24 text-right px-4 text-[11px] text-slate-600 dark:text-slate-400 opacity-70">
                                        {row.bidQty?.toLocaleString() || ''}
                                    </div>

                                    {/* BID PRICE */}
                                    <div className="w-24 px-1">
                                        <div className={`w-full text-right px-2 py-0.5 rounded text-[11px] ${
                                            row.bid
                                                ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                                                : 'text-slate-300 dark:text-[#222]'
                                        }`}>
                                            {row.bid ? row.bid.toFixed(2) : '--'}
                                        </div>
                                    </div>

                                    {/* ASK PRICE */}
                                    <div className="w-24 px-1">
                                        <div className={`w-full text-right px-2 py-0.5 rounded text-[11px] ${
                                            row.ask
                                                ? `text-rose-600 dark:text-rose-500 font-bold ${real ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`
                                                : 'text-slate-300 dark:text-[#222]'
                                        }`}>
                                            {row.ask ? row.ask.toFixed(2) : '--'}
                                        </div>
                                    </div>

                                    {/* Ask Qty */}
                                    <div className="w-24 text-right px-4 text-[11px] text-slate-600 dark:text-slate-400 opacity-70">
                                        {row.askQty ? Math.round(row.askQty).toLocaleString() : ''}
                                    </div>

                                    {/* Last Done */}
                                    <div className="w-24 text-right px-4 font-bold text-xs text-slate-900 dark:text-white">
                                        {row.last?.toFixed(2) || ''}
                                    </div>

                                    {/* Change */}
                                    <div className={`w-24 text-right px-4 text-[10px] flex justify-end items-center space-x-1 ${row.change && row.change > 0 ? 'text-emerald-600 dark:text-emerald-500' : row.change && row.change < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-300 dark:text-[#222]'}`}>
                                        {row.change ? (
                                            <>
                                                {row.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                <span>{Math.abs(row.change).toFixed(2)}</span>
                                            </>
                                        ) : ''}
                                    </div>

                                    {/* Offer Count */}
                                    <div className="flex-1 text-right px-4 text-[10px]">
                                        {offerCount > 0 && (
                                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                                {offerCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Orderbook Depth Chart */}
                <div className="px-3 py-2 border-t border-slate-200 dark:border-[#222] bg-white dark:bg-[#050505]">
                    <OrderbookDepth
                        bids={depthBids}
                        asks={depthAsks}
                        fuelType={selectedFuel}
                        region={selectedPort}
                    />
                </div>

                {/* Trade Activity Feed */}
                <div className="border-t border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#0a0a0a]">
                    <div className="flex items-center px-4 py-1.5 border-b border-slate-100 dark:border-[#181818]">
                        <Activity size={12} className="text-emerald-500 mr-2" />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#666] uppercase tracking-widest">Trade Activity</span>
                        <div className={`ml-2 w-1.5 h-1.5 rounded-full ${tradesConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    </div>
                    <div ref={tradeScrollRef} className="h-24 overflow-y-auto px-2 py-1">
                        {tradeEvents.length === 0 ? (
                            <div className="text-[10px] text-slate-400 dark:text-[#444] text-center py-4">Waiting for activity...</div>
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
                                    <span className="text-slate-400 dark:text-[#555] ml-auto">{trade.period}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
