import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip 
} from 'recharts';
import { 
    ArrowUpRight, 
    ArrowDownRight, 
    MoreHorizontal, 
    Plus, 
    Zap, 
    Activity,
    Settings,
    Maximize2
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
    active: boolean;
    flash?: 'up' | 'down' | null;
}

// --- Initial Data (The Curve) ---
const INITIAL_CURVE: MarketRow[] = [
    { id: '1', period: 'SPOT', type: 'SPOT', bidQty: 500, bid: 542.00, ask: 544.00, askQty: 1000, last: 543.00, change: 1.50, active: true },
    { id: '2', period: 'FEB 26', type: 'MONTH', bidQty: 200, bid: 540.00, ask: 542.50, askQty: 400, last: 541.00, change: 0.50, active: true },
    { id: '3', period: 'MAR 26', type: 'MONTH', bidQty: null, bid: 538.00, ask: 541.00, askQty: null, last: null, change: null, active: false },
    { id: '4', period: 'APR 26', type: 'MONTH', bidQty: null, bid: null, ask: null, askQty: null, last: null, change: null, active: false },
    { id: '5', period: 'Q2 26', type: 'QTR', bidQty: 1000, bid: 535.00, ask: 538.00, askQty: 2000, last: 536.50, change: -2.00, active: true },
    { id: '6', period: 'Q3 26', type: 'QTR', bidQty: null, bid: 532.00, ask: 536.00, askQty: null, last: null, change: null, active: false },
    { id: '7', period: 'Q4 26', type: 'QTR', bidQty: null, bid: null, ask: null, askQty: null, last: null, change: null, active: false },
    { id: '8', period: 'CAL 27', type: 'YEAR', bidQty: 5000, bid: 520.00, ask: 525.00, askQty: 5000, last: 522.00, change: -5.00, active: true },
    { id: '9', period: 'CAL 28', type: 'YEAR', bidQty: null, bid: null, ask: null, askQty: null, last: null, change: null, active: false },
];

const SPREAD_DATA = [
    { time: '09:00', spread: 12.5 },
    { time: '10:00', spread: 14.2 },
    { time: '11:00', spread: 11.8 },
    { time: '12:00', spread: 15.5 },
    { time: '13:00', spread: 13.2 },
    { time: '14:00', spread: 16.8 },
    { time: '15:00', spread: 18.5 },
];

export const BraemarTerminal: React.FC = () => {
    const [marketData, setMarketData] = useState<MarketRow[]>(INITIAL_CURVE);
    const [selectedCell, setSelectedCell] = useState<{ rowId: string, field: 'bid' | 'ask' } | null>(null);
    const [orderPrice, setOrderPrice] = useState<string>('');
    const [orderQty, setOrderQty] = useState<string>('');

    // --- Interaction Handlers ---
    const handleCellClick = (rowId: string, field: 'bid' | 'ask') => {
        const row = marketData.find(r => r.id === rowId);
        // Pre-fill with existing value if any
        const currentVal = field === 'bid' ? row?.bid : row?.ask;
        setOrderPrice(currentVal ? currentVal.toString() : '');
        setOrderQty(field === 'bid' ? (row?.bidQty?.toString() || '') : (row?.askQty?.toString() || ''));
        setSelectedCell({ rowId, field });
    };

    const handlePostOrder = () => {
        if (!selectedCell || !orderPrice) return;

        setMarketData(prev => prev.map(row => {
            if (row.id === selectedCell.rowId) {
                const price = parseFloat(orderPrice);
                const qty = parseInt(orderQty) || 100;
                
                // Active logic: If we post an order, the row becomes "active" conceptually because there is liquidity
                // But specifically, the Gavin rule says "Active Rows: If Last Done has data".
                // However, user also said "Clicking... lights up the market". 
                // Let's interpret "lights up" as visually flashing and potential activation if we simulate a trade.
                // For now, let's keep 'active' strictly as 'has trades', but simulate a trade if the spread crosses?
                // Or just highlight the cell. 
                
                return {
                    ...row,
                    [selectedCell.field]: price,
                    [selectedCell.field === 'bid' ? 'bidQty' : 'askQty']: qty,
                    flash: 'up' // Simple flash for update
                };
            }
            return row;
        }));
        setSelectedCell(null);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] font-mono overflow-hidden selection:bg-verdaxis selection:text-white">
            
            {/* Top Bar: Spread Widget & Market Status */}
            <div className="h-64 border-b border-[#333] flex">
                {/* Product Header */}
                <div className="w-1/4 p-6 border-r border-[#333] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-[#888] text-xs uppercase tracking-widest mb-1">
                            <Zap size={12} className="text-verdaxis" />
                            <span>Live Market</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">METHANOL</h1>
                        <div className="flex items-center space-x-2 text-sm mt-1">
                            <span className="text-[#888]">SINGAPORE</span>
                            <span className="text-[#444]">|</span>
                            <span className="text-[#888]">ROTTERDAM</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-[#666]">SPOT SPREAD</span>
                            <span className="text-xl font-bold text-emerald-400">$18.50</span>
                        </div>
                        <div className="w-full bg-[#222] h-1 rounded overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[70%]"></div>
                        </div>
                        <div className="text-[10px] text-[#555] flex justify-between">
                            <span>ARB WINDOW: OPEN</span>
                            <span>VOL: 25.4kt</span>
                        </div>
                    </div>
                </div>

                {/* Spread Chart */}
                <div className="flex-1 p-4 bg-[#0f0f0f]">
                     <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-xs font-bold text-[#666]">SPREAD VISUALIZATION (SIN-ROT)</span>
                        <div className="flex space-x-2">
                             <button className="p-1 hover:bg-[#333] rounded text-[#666]"><Maximize2 size={12}/></button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={SPREAD_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="time" stroke="#444" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                            <YAxis stroke="#444" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="spread" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* The Market Grid */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Grid Header */}
                <div className="flex items-center bg-[#111] border-b border-[#333] text-[11px] font-bold text-[#666] py-2">
                    <div className="w-32 px-4 uppercase">Period</div>
                    <div className="w-24 text-right px-4 uppercase">Bid Qty</div>
                    <div className="w-24 text-right px-4 uppercase text-emerald-700">Bid</div>
                    <div className="w-24 text-right px-4 uppercase text-rose-700">Ask</div>
                    <div className="w-24 text-right px-4 uppercase">Ask Qty</div>
                    <div className="w-24 text-right px-4 uppercase">Last</div>
                    <div className="w-24 text-right px-4 uppercase">Chg</div>
                    <div className="flex-1"></div>
                </div>

                {/* Grid Rows */}
                <div className="overflow-y-auto flex-1">
                    {marketData.map((row) => (
                        <div 
                            key={row.id}
                            className={`
                                flex items-center border-b border-[#222] py-2.5 transition-colors group
                                hover:bg-[#1a1a1a]
                                ${row.active ? 'text-white' : 'text-[#555]'}
                                ${row.flash === 'up' ? 'bg-emerald-900/10' : ''}
                            `}
                        >
                            {/* Period */}
                            <div className="w-32 px-4 font-bold flex items-center space-x-2">
                                {row.type === 'SPOT' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>}
                                <span>{row.period}</span>
                            </div>

                            {/* Bid Qty */}
                            <div className="w-24 text-right px-4 font-mono text-xs">
                                {row.bidQty?.toLocaleString() || '-'}
                            </div>

                            {/* BID PRICE (Interactive) */}
                            <div className="w-24 px-1">
                                <button
                                    onClick={() => handleCellClick(row.id, 'bid')}
                                    className={`
                                        w-full text-right px-3 py-1 rounded cursor-pointer transition-colors
                                        hover:bg-[#333] hover:text-white
                                        ${row.bid ? 'text-emerald-400 font-bold' : 'text-[#333] hover:text-[#666]'}
                                        ${selectedCell?.rowId === row.id && selectedCell.field === 'bid' ? 'bg-[#333] ring-1 ring-emerald-500 text-white' : ''}
                                    `}
                                >
                                    {row.bid ? row.bid.toFixed(2) : '---'}
                                </button>
                            </div>

                            {/* ASK PRICE (Interactive) */}
                            <div className="w-24 px-1">
                                <button
                                     onClick={() => handleCellClick(row.id, 'ask')}
                                     className={`
                                        w-full text-right px-3 py-1 rounded cursor-pointer transition-colors
                                        hover:bg-[#333] hover:text-white
                                        ${row.ask ? 'text-rose-400 font-bold' : 'text-[#333] hover:text-[#666]'}
                                        ${selectedCell?.rowId === row.id && selectedCell.field === 'ask' ? 'bg-[#333] ring-1 ring-rose-500 text-white' : ''}
                                    `}
                                >
                                    {row.ask ? row.ask.toFixed(2) : '---'}
                                </button>
                            </div>

                            {/* Ask Qty */}
                            <div className="w-24 text-right px-4 font-mono text-xs">
                                {row.askQty?.toLocaleString() || '-'}
                            </div>

                            {/* Last Done */}
                            <div className={`w-24 text-right px-4 font-mono font-bold ${row.active ? 'text-white' : 'text-[#444]'}`}>
                                {row.last?.toFixed(2) || '-'}
                            </div>

                            {/* Change */}
                            <div className={`w-24 text-right px-4 font-mono text-xs flex justify-end items-center space-x-1 ${row.change && row.change > 0 ? 'text-emerald-500' : row.change && row.change < 0 ? 'text-rose-500' : 'text-[#444]'}`}>
                                {row.change ? (
                                    <>
                                        {row.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                        <span>{Math.abs(row.change).toFixed(2)}</span>
                                    </>
                                ) : '-'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Entry Popover (Mock Positioned) */}
            {selectedCell && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-[#444] rounded-lg shadow-2xl p-6 w-80">
                        <h3 className="text-white font-bold mb-4 flex items-center justify-between">
                            <span>MAKE A MARKET</span>
                            <span className="text-xs text-[#666] font-mono">{marketData.find(r => r.id === selectedCell.rowId)?.period}</span>
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex space-x-2 p-1 bg-[#222] rounded">
                                <button className={`flex-1 py-1 text-xs font-bold rounded ${selectedCell.field === 'bid' ? 'bg-emerald-600 text-white' : 'text-[#666]'}`}>BID</button>
                                <button className={`flex-1 py-1 text-xs font-bold rounded ${selectedCell.field === 'ask' ? 'bg-rose-600 text-white' : 'text-[#666]'}`}>OFFER</button>
                            </div>

                            <div>
                                <label className="text-[10px] text-[#888] uppercase font-bold">Price ($/MT)</label>
                                <input 
                                    autoFocus
                                    type="number" 
                                    value={orderPrice}
                                    onChange={(e) => setOrderPrice(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-white font-mono focus:border-verdaxis outline-none text-lg"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-[#888] uppercase font-bold">Quantity (MT)</label>
                                <input 
                                    type="number" 
                                    value={orderQty}
                                    onChange={(e) => setOrderQty(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-white font-mono focus:border-verdaxis outline-none"
                                    placeholder="1000"
                                />
                            </div>

                            <div className="pt-2 flex space-x-3">
                                <button 
                                    onClick={() => setSelectedCell(null)}
                                    className="flex-1 py-2 text-xs font-bold text-[#888] hover:text-white transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button 
                                    onClick={handlePostOrder}
                                    className="flex-1 py-2 bg-verdaxis hover:bg-emerald-400 text-white font-bold rounded text-xs transition-colors"
                                >
                                    POST ORDER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
