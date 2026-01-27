import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip,
    ReferenceLine
} from 'recharts';
import { 
    ArrowUpRight, 
    ArrowDownRight, 
    Zap, 
    Maximize2,
    X,
    TrendingUp,
    Activity
} from 'lucide-react';

// --- Types ---
interface MarketRow {
    id: string;
    period: string;
    type: 'SPOT' | 'MONTH' | 'QTR' | 'YEAR';
    bidQty: number | null;
    bid: number | null;
    ask: number | null;
    askQty: number | null;
    last: number | null;
    change: number | null;
    // active is now derived from 'last' being present (The Gavin Rule)
    flash?: 'up' | 'down' | null;
}

// --- Initial Data (The Curve) ---
// Structure: Spot -> Monthlies -> Quarterlies -> Years
const INITIAL_CURVE: MarketRow[] = [
    { id: '1', period: 'SPOT', type: 'SPOT', bidQty: 500, bid: 542.00, ask: 544.00, askQty: 1000, last: 543.00, change: 1.50 },
    { id: '2', period: 'MAR 26', type: 'MONTH', bidQty: 200, bid: 540.00, ask: 542.50, askQty: 400, last: 541.00, change: 0.50 },
    { id: '3', period: 'APR 26', type: 'MONTH', bidQty: null, bid: 538.00, ask: 541.00, askQty: null, last: null, change: null },
    { id: '4', period: 'MAY 26', type: 'MONTH', bidQty: null, bid: null, ask: null, askQty: null, last: null, change: null },
    { id: '5', period: 'Q2 26', type: 'QTR', bidQty: 1000, bid: 535.00, ask: 538.00, askQty: 2000, last: 536.50, change: -2.00 },
    { id: '6', period: 'Q3 26', type: 'QTR', bidQty: null, bid: 532.00, ask: 536.00, askQty: null, last: null, change: null },
    { id: '7', period: 'CAL 27', type: 'YEAR', bidQty: 5000, bid: 520.00, ask: 525.00, askQty: 5000, last: 522.00, change: -5.00 },
    { id: '8', period: 'CAL 28', type: 'YEAR', bidQty: null, bid: null, ask: null, askQty: null, last: null, change: null },
];

const SPREAD_DATA = [
    { time: '09:00', spread: 12.5 },
    { time: '10:00', spread: 14.2 },
    { time: '11:00', spread: 11.8 },
    { time: '12:00', spread: 15.5 },
    { time: '13:00', spread: 13.2 },
    { time: '14:00', spread: 16.8 },
    { time: '15:00', spread: 18.5 },
    { time: '16:00', spread: 17.2 },
];

export const BraemarTerminal: React.FC = () => {
    const [marketData, setMarketData] = useState<MarketRow[]>(INITIAL_CURVE);
    const [selectedCell, setSelectedCell] = useState<{ rowId: string, field: 'bid' | 'ask' } | null>(null);
    
    // Order Entry State
    const [orderType, setOrderType] = useState<'BID' | 'OFFER'>('BID');
    const [orderPrice, setOrderPrice] = useState<string>('');
    const [orderQty, setOrderQty] = useState<string>('');

    // --- Interaction Handlers ---
    const handleCellClick = (rowId: string, field: 'bid' | 'ask') => {
        const row = marketData.find(r => r.id === rowId);
        const currentVal = field === 'bid' ? row?.bid : row?.ask;
        
        // Initialize user input
        setOrderType(field === 'bid' ? 'BID' : 'OFFER');
        setOrderPrice(currentVal ? currentVal.toString() : '');
        setOrderQty(field === 'bid' ? (row?.bidQty?.toString() || '') : (row?.askQty?.toString() || ''));
        
        setSelectedCell({ rowId, field });
    };

    const handlePostOrder = () => {
        if (!selectedCell || !orderPrice) return;

        setMarketData(prev => prev.map(row => {
            if (row.id === selectedCell.rowId) {
                const price = parseFloat(orderPrice);
                const qty = parseInt(orderQty) || 1000;
                
                const isBid = orderType === 'BID';
                
                return {
                    ...row,
                    bid: isBid ? price : row.bid,
                    bidQty: isBid ? qty : row.bidQty,
                    ask: !isBid ? price : row.ask,
                    askQty: !isBid ? qty : row.askQty,
                    flash: 'up'
                };
            }
            return row;
        }));
        setSelectedCell(null);
    };

    // Helper to determine if a row is "Active" (The Gavin Rule)
    const isRowActive = (row: MarketRow) => row.last !== null;

    return (
        <div className="flex flex-col h-full bg-[#050505] text-[#e5e5e5] font-mono overflow-hidden">
            
            {/* Top Section: Header & Spread Chart */}
            <div className="h-64 border-b border-[#222] flex">
                {/* Product Header */}
                <div className="w-80 p-6 border-r border-[#222] flex flex-col justify-between bg-[#0a0a0a]">
                    <div>
                        <div className="flex items-center space-x-2 text-[#666] text-[10px] uppercase tracking-[0.2em] mb-1 font-bold">
                            <Zap size={12} className="text-verdaxis" />
                            <span>Live Terminal</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-0.5">METHANOL</h1>
                        <div className="flex items-center space-x-2 text-xs font-semibold">
                            <span className="text-emerald-500">SINGAPORE</span>
                            <span className="text-[#333]">/</span>
                            <span className="text-rose-500">ROTTERDAM</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-[#888] font-bold">SPOT SPREAD</span>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-white">$18.50</span>
                                <div className="text-[10px] text-emerald-500 flex items-center justify-end space-x-1">
                                    <TrendingUp size={10} />
                                    <span>+1.20</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-[#222] h-1.5 rounded-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full w-[70%]"></div>
                        </div>
                        <div className="text-[10px] text-[#555] flex justify-between uppercase font-bold tracking-wider">
                            <span>Arb: <span className="text-emerald-500">Open</span></span>
                            <span>Vol: 25.4k</span>
                        </div>
                    </div>
                </div>

                {/* Spread Chart */}
                <div className="flex-1 p-4 bg-[#080808]">
                     <div className="flex justify-between items-start mb-2 px-2">
                        <div>
                            <div className="text-[#888] text-[10px] font-bold tracking-widest uppercase">Spread Visualization</div>
                            <div className="text-xs text-[#444]">METHANOL SIN-ROT</div>
                        </div>
                        <button className="p-1.5 hover:bg-[#222] rounded text-[#666]"><Maximize2 size={14}/></button>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={SPREAD_DATA}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" vertical={false} />
                            <XAxis dataKey="time" stroke="#333" tick={{fontSize: 10, fill: '#555'}} tickLine={false} axisLine={false} />
                            <YAxis orientation="right" stroke="#333" tick={{fontSize: 10, fill: '#555'}} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <ReferenceLine y={15} stroke="#333" strokeDasharray="3 3" />
                            <Line 
                                type="stepAfter" 
                                dataKey="spread" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                dot={false} 
                                activeDot={{ r: 4, fill: '#10b981', stroke: '#000' }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* The Market Grid */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#050505] relative">
                {/* Grid Header */}
                <div className="flex items-center bg-[#0a0a0a] border-b border-[#222] text-[10px] uppercase font-bold text-[#555] py-2 select-none">
                    <div className="w-32 px-4">Period</div>
                    <div className="w-24 text-right px-4">Bid Qty</div>
                    <div className="w-24 text-right px-4 text-emerald-700">Bid</div>
                    <div className="w-24 text-right px-4 text-rose-700">Ask</div>
                    <div className="w-24 text-right px-4">Ask Qty</div>
                    <div className="w-24 text-right px-4">Last</div>
                    <div className="w-24 text-right px-4">Chg</div>
                    <div className="flex-1"></div>
                </div>

                {/* Grid Rows */}
                <div className="overflow-y-auto flex-1 font-mono">
                    {marketData.map((row) => {
                        const active = isRowActive(row);
                        const textColor = active ? 'text-white' : 'text-[#444]';
                        const hoverColor = active ? 'hover:bg-[#111]' : 'hover:bg-[#0a0a0a]';

                        return (
                            <div 
                                key={row.id}
                                className={`
                                    flex items-center border-b border-[#111] py-1.5 transition-colors group
                                    ${hoverColor}
                                    ${textColor}
                                    ${row.flash === 'up' ? 'animate-flash' : ''}
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

                                {/* BID PRICE (Interactive) */}
                                <div className="w-24 px-1">
                                    <button
                                        onClick={() => handleCellClick(row.id, 'bid')}
                                        className={`
                                            w-full text-right px-2 py-0.5 rounded cursor-pointer transition-all
                                            ${row.bid 
                                                ? 'text-emerald-500 font-bold hover:bg-[#1a1a1a] hover:text-emerald-400' 
                                                : 'text-[#222] hover:text-[#444] hover:bg-[#111]'
                                            }
                                            ${selectedCell?.rowId === row.id && selectedCell.field === 'bid' ? 'bg-[#222] ring-1 ring-emerald-600' : ''}
                                        `}
                                    >
                                        {row.bid ? row.bid.toFixed(2) : '--'}
                                    </button>
                                </div>

                                {/* ASK PRICE (Interactive) */}
                                <div className="w-24 px-1">
                                    <button
                                         onClick={() => handleCellClick(row.id, 'ask')}
                                         className={`
                                            w-full text-right px-2 py-0.5 rounded cursor-pointer transition-all
                                            ${row.ask 
                                                ? 'text-rose-500 font-bold hover:bg-[#1a1a1a] hover:text-rose-400' 
                                                : 'text-[#222] hover:text-[#444] hover:bg-[#111]'
                                            }
                                            ${selectedCell?.rowId === row.id && selectedCell.field === 'ask' ? 'bg-[#222] ring-1 ring-rose-600' : ''}
                                        `}
                                    >
                                        {row.ask ? row.ask.toFixed(2) : '--'}
                                    </button>
                                </div>

                                {/* Ask Qty */}
                                <div className="w-24 text-right px-4 text-[11px] opacity-70">
                                    {row.askQty?.toLocaleString() || ''}
                                </div>

                                {/* Last Done */}
                                <div className={`w-24 text-right px-4 font-bold text-xs ${active ? 'text-white' : 'text-[#222]'}`}>
                                    {row.last?.toFixed(2) || ''}
                                </div>

                                {/* Change */}
                                <div className={`w-24 text-right px-4 text-[10px] flex justify-end items-center space-x-1 ${row.change && row.change > 0 ? 'text-emerald-500' : row.change && row.change < 0 ? 'text-rose-500' : 'text-[#222]'}`}>
                                    {row.change ? (
                                        <>
                                            {row.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            <span>{Math.abs(row.change).toFixed(2)}</span>
                                        </>
                                    ) : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Order Entry Popover */}
            {selectedCell && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-[#111] border border-[#333] shadow-2xl w-72 animate-in zoom-in-95 duration-100 rounded-sm">
                        {/* Modal Header */}
                        <div className="bg-[#1a1a1a] px-4 py-2 flex justify-between items-center border-b border-[#333]">
                            <span className="text-xs font-bold text-white tracking-wider flex items-center space-x-2">
                                <Activity size={12} className="text-verdaxis" />
                                <span>MAKE A MARKET</span>
                            </span>
                            <button onClick={() => setSelectedCell(null)} className="text-[#666] hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-4">
                            {/* Product Info */}
                            <div className="text-center mb-4">
                                <div className="text-2xl font-bold text-white font-mono">
                                    {marketData.find(r => r.id === selectedCell.rowId)?.period}
                                </div>
                                <div className="text-[10px] text-[#666] uppercase tracking-widest">Pricing Window</div>
                            </div>

                            {/* Buy/Sell Toggle */}
                            <div className="grid grid-cols-2 gap-px bg-[#333] p-px rounded-sm">
                                <button 
                                    onClick={() => setOrderType('BID')}
                                    className={`py-1.5 text-xs font-bold uppercase transition-colors ${orderType === 'BID' ? 'bg-emerald-600 text-white' : 'bg-[#111] text-[#666] hover:bg-[#161616]'}`}
                                >
                                    Bid
                                </button>
                                <button 
                                    onClick={() => setOrderType('OFFER')}
                                    className={`py-1.5 text-xs font-bold uppercase transition-colors ${orderType === 'OFFER' ? 'bg-rose-600 text-white' : 'bg-[#111] text-[#666] hover:bg-[#161616]'}`}
                                >
                                    Offer
                                </button>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-[#666] uppercase font-bold block mb-1">Price ($/MT)</label>
                                    <div className="relative">
                                        <input 
                                            autoFocus
                                            type="number" 
                                            value={orderPrice}
                                            onChange={(e) => setOrderPrice(e.target.value)}
                                            className={`
                                                w-full bg-[#050505] border rounded-sm p-2 text-white font-mono outline-none text-lg transition-colors
                                                ${orderType === 'BID' ? 'border-emerald-900 focus:border-emerald-500' : 'border-rose-900 focus:border-rose-500'}
                                            `}
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-3 top-3 text-xs text-[#444]">$</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-[#666] uppercase font-bold block mb-1">Quantity (MT)</label>
                                    <input 
                                        type="number" 
                                        value={orderQty}
                                        onChange={(e) => setOrderQty(e.target.value)}
                                        className="w-full bg-[#050505] border border-[#333] rounded-sm p-2 text-white font-mono focus:border-[#666] outline-none text-sm"
                                        placeholder="1000"
                                    />
                                </div>
                            </div>

                            {/* Action Button */}
                            <button 
                                onClick={handlePostOrder}
                                className={`
                                    w-full py-2.5 font-bold text-xs uppercase tracking-wider rounded-sm shadow-lg transition-all
                                    ${orderType === 'BID' 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
                                    }
                                `}
                            >
                                Post {orderType}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Overlay for Modal */}
            {selectedCell && (
                <div className="absolute inset-0 bg-black/50 z-40 backdrop-blur-[1px]" onClick={() => setSelectedCell(null)} />
            )}
        </div>
    );
};
