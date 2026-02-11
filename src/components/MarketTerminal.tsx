import React, { useState, useEffect, useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar
} from 'recharts';
import {
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Maximize2,
    X,
    TrendingUp,
    Activity,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { PublicListing, Port } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';

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

// Available fuel types for the selector
const FUEL_TYPES = ['Methanol', 'Biofuel', 'LNG', 'Ammonia', 'Ethanol', 'LSMGO'];

export const MarketTerminal: React.FC = () => {
    const { setPageContext } = useCopilotContext();

    // Port & Fuel selectors
    const [ports, setPorts] = useState<Port[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>('Singapore');
    const [selectedFuel, setSelectedFuel] = useState<string>('Methanol');
    const [showPortDropdown, setShowPortDropdown] = useState(false);
    const [showFuelDropdown, setShowFuelDropdown] = useState(false);

    // Listings from API (marketplace sync)
    const [allListings, setAllListings] = useState<PublicListing[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch ports for the selector
    useEffect(() => {
        api.ports.list().then(setPorts).catch(console.error);
    }, []);

    // Fetch listings from the marketplace (one-way sync)
    const fetchListings = async () => {
        setLoading(true);
        try {
            const data = await api.listings.list({});
            setAllListings(data);
        } catch (e) {
            console.error('Failed to load listings for terminal', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchListings, 30000);
        return () => clearInterval(interval);
    }, []);

    // Filter listings by selected port and fuel
    const filteredListings = useMemo(() => {
        return allListings.filter(l => {
            const matchPort = l.region.toLowerCase().includes(selectedPort.toLowerCase());
            const matchFuel = l.fuel_type.toLowerCase().includes(selectedFuel.toLowerCase());
            return matchPort && matchFuel;
        });
    }, [allListings, selectedPort, selectedFuel]);

    // Build terminal rows from filtered listings (marketplace -> terminal sync)
    const terminalData: TerminalRow[] = useMemo(() => {
        return PERIOD_CONFIG.map((config, idx) => {
            // Find listings matching this availability window
            const periodListings = filteredListings.filter(
                l => l.availability_window === config.window
            );

            const askPrices = periodListings.map(l => Number(l.price_per_mt_usd)).filter(Boolean);
            const totalQty = periodListings.reduce((sum, l) => sum + Number(l.quantity_mt), 0);

            const bestAsk = askPrices.length > 0 ? Math.min(...askPrices) : null;
            const askQty = totalQty > 0 ? totalQty : null;

            // Last done is the most recent listing price (if any exist)
            const lastDone = askPrices.length > 0 ? askPrices[0] : null;

            // Change is synthetic for now (difference from spot)
            let change: number | null = null;
            if (lastDone !== null && idx > 0) {
                const spotListings = filteredListings.filter(l => l.availability_window === 'Spot');
                const spotPrice = spotListings.length > 0 ? Number(spotListings[0].price_per_mt_usd) : null;
                if (spotPrice) {
                    change = lastDone - spotPrice;
                }
            }

            return {
                id: String(idx + 1),
                period: config.period,
                type: config.type,
                bidQty: null, // Bids not tracked yet
                bid: null,
                ask: bestAsk,
                askQty: askQty,
                last: lastDone,
                change: change,
            };
        });
    }, [filteredListings]);

    // Build chart data from listings by period
    const chartData = useMemo(() => {
        return PERIOD_CONFIG.map(config => {
            const periodListings = filteredListings.filter(
                l => l.availability_window === config.window
            );
            const prices = periodListings.map(l => Number(l.price_per_mt_usd));
            const avgPrice = prices.length > 0
                ? prices.reduce((a, b) => a + b, 0) / prices.length
                : null;
            const totalQty = periodListings.reduce((s, l) => s + Number(l.quantity_mt), 0);

            return {
                period: config.period,
                price: avgPrice,
                quantity: totalQty || null,
            };
        }).filter(d => d.price !== null);
    }, [filteredListings]);

    // Summary stats
    const spotPrice = terminalData.find(r => r.type === 'SPOT')?.ask;
    const totalListings = filteredListings.length;
    const totalVolume = filteredListings.reduce((s, l) => s + Number(l.quantity_mt), 0);

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

    // Helper to determine if a row is "Active"
    const isRowActive = (row: TerminalRow) => row.ask !== null || row.last !== null;

    // Unique port names from ports list
    const portNames = useMemo(() => {
        const names = ports.map(p => p.name);
        // Also add any region names from listings that aren't in ports
        allListings.forEach(l => {
            if (!names.includes(l.region)) names.push(l.region);
        });
        return [...new Set(names)].sort();
    }, [ports, allListings]);

    // Unique fuel types from listings
    const availableFuels = useMemo(() => {
        const fromListings = [...new Set(allListings.map(l => l.fuel_type))];
        const combined = [...new Set([...FUEL_TYPES, ...fromListings])];
        return combined.sort();
    }, [allListings]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-[#e5e5e5] font-mono overflow-hidden transition-colors" onClick={() => { setShowPortDropdown(false); setShowFuelDropdown(false); }}>

            {/* Top Section: Header & Chart */}
            <div className="h-64 border-b border-slate-200 dark:border-[#222] flex">
                {/* Product Header with Selectors */}
                <div className="w-80 p-6 border-r border-slate-200 dark:border-[#222] flex flex-col justify-between bg-white dark:bg-[#0a0a0a]">
                    <div>
                        <div className="flex items-center space-x-2 text-slate-400 dark:text-[#666] text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">
                            <Zap size={12} className="text-verdaxis" />
                            <span>Market Terminal</span>
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
                <div className="flex-1 p-4 bg-slate-50 dark:bg-[#080808]">
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
                    ) : chartData.length > 0 ? (
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
                    ) : (
                        <div className="flex items-center justify-center h-[80%] text-xs text-slate-400 dark:text-[#555]">
                            No listing data available for {selectedFuel} at {selectedPort}
                        </div>
                    )}
                </div>
            </div>

            {/* The Market Grid */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#050505] relative">
                {/* Grid Header */}
                <div className="flex items-center bg-slate-100 dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#222] text-[10px] uppercase font-bold text-slate-500 dark:text-[#555] py-2 select-none">
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
                <div className="overflow-y-auto flex-1 font-mono">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        terminalData.map((row) => {
                            const active = isRowActive(row);
                            const textColor = active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-[#444]';
                            const hoverColor = active ? 'hover:bg-slate-50 dark:hover:bg-[#111]' : 'hover:bg-slate-50 dark:hover:bg-[#0a0a0a]';

                            // Count offers for this period
                            const periodConfig = PERIOD_CONFIG.find(p => p.period === row.period);
                            const offerCount = periodConfig
                                ? filteredListings.filter(l => l.availability_window === periodConfig.window).length
                                : 0;

                            return (
                                <div
                                    key={row.id}
                                    className={`
                                        flex items-center border-b border-slate-100 dark:border-[#111] py-1.5 transition-colors group
                                        ${hoverColor}
                                        ${textColor}
                                    `}
                                >
                                    {/* Period */}
                                    <div className="w-32 px-4 text-xs font-bold flex items-center space-x-2">
                                        {row.type === 'SPOT' && <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse mr-1"/>}
                                        <span>{row.period}</span>
                                    </div>

                                    {/* Bid Qty */}
                                    <div className="w-24 text-right px-4 text-[11px] opacity-70">
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

                                    {/* ASK PRICE (from marketplace listings) */}
                                    <div className="w-24 px-1">
                                        <div className={`w-full text-right px-2 py-0.5 rounded text-[11px] ${
                                            row.ask
                                                ? 'text-rose-600 dark:text-rose-500 font-bold'
                                                : 'text-slate-300 dark:text-[#222]'
                                        }`}>
                                            {row.ask ? row.ask.toFixed(2) : '--'}
                                        </div>
                                    </div>

                                    {/* Ask Qty */}
                                    <div className="w-24 text-right px-4 text-[11px] opacity-70">
                                        {row.askQty ? Math.round(row.askQty).toLocaleString() : ''}
                                    </div>

                                    {/* Last Done */}
                                    <div className={`w-24 text-right px-4 font-bold text-xs ${active ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-[#222]'}`}>
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
            </div>
        </div>
    );
};
