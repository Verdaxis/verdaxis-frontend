import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    ArrowRightLeft, 
    Zap, 
    BarChart3, 
    Clock, 
    AlertCircle,
    MoreHorizontal,
    Search
} from 'lucide-react';

interface MarketData {
    id: string;
    product: string;
    qtyBid: number;
    bid: number;
    ask: number;
    qtyAsk: number;
    change: number;
    lastDone: string;
    flash?: 'up' | 'down' | null;
}

const INITIAL_DATA: MarketData[] = [
    { id: '1', product: 'VLSFO Rotterdam', qtyBid: 500, bid: 542.50, ask: 544.00, qtyAsk: 1000, change: 1.5, lastDone: '200MT @ 543.0' },
    { id: '2', product: 'MGO Singapore', qtyBid: 250, bid: 785.00, ask: 788.50, qtyAsk: 500, change: -2.0, lastDone: '100MT @ 786.0' },
    { id: '3', product: 'BioB24 Singapore', qtyBid: 1000, bid: 820.50, ask: 822.00, qtyAsk: 1200, change: 0.5, lastDone: '500MT @ 821.0' },
    { id: '4', product: 'Methanol Singapore', qtyBid: 300, bid: 415.00, ask: 417.00, qtyAsk: 600, change: 4.25, lastDone: '150MT @ 416.0' },
    { id: '5', product: 'LNG Rotterdam', qtyBid: 2000, bid: 612.00, ask: 615.50, qtyAsk: 1500, change: -1.25, lastDone: '500MT @ 613.5' },
    { id: '6', product: 'MGO Fujairah', qtyBid: 400, bid: 810.00, ask: 812.50, qtyAsk: 800, change: 0.1, lastDone: '200MT @ 811.0' },
];

export const MarketTerminal: React.FC = () => {
    const [marketData, setMarketData] = useState<MarketData[]>(INITIAL_DATA);
    const [tradeTape, setTradeTape] = useState<string[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const index = Math.floor(Math.random() * marketData.length);
            const isUp = Math.random() > 0.5;
            const delta = (Math.random() * 2).toFixed(2);
            
            setMarketData(prev => prev.map((item, i) => {
                if (i === index) {
                    const newBid = isUp ? item.bid + parseFloat(delta) : item.bid - parseFloat(delta);
                    const newAsk = isUp ? item.ask + parseFloat(delta) : item.ask - parseFloat(delta);
                    return { 
                        ...item, 
                        bid: parseFloat(newBid.toFixed(2)), 
                        ask: parseFloat(newAsk.toFixed(2)),
                        change: parseFloat((item.change + (isUp ? 0.1 : -0.1)).toFixed(2)),
                        flash: isUp ? 'up' : 'down'
                    };
                }
                return { ...item, flash: null };
            }));

            // Add to trade tape
            const products = ['CAPE', 'PMAX', 'SMAX', 'VLSFO', 'MGO'];
            const newTrade = `${products[Math.floor(Math.random() * products.length)]} ${isUp ? 'LIFTED' : 'HIT'} @ ${marketData[index].bid} (${(Math.random() * 500).toFixed(0)}MT)`;
            setTradeTape(prev => [newTrade, ...prev].slice(0, 15));

        }, 3000);

        return () => clearInterval(interval);
    }, [marketData]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-sm overflow-hidden">
            {/* Terminal Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-verdaxis font-bold">
                        <Activity size={18} />
                        <span>VERDAXIS_TERMINAL_v2.0</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700 mx-2"></div>
                    <div className="flex items-center space-x-4 text-slate-400">
                        <span className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span className="text-xs">MARKET OPEN (GMT+8)</span>
                        </span>
                        <div className="flex items-center space-x-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            <Search size={14} />
                            <input className="bg-transparent border-none outline-none text-xs w-32" placeholder="SEARCH TICKER..." />
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                        <TrendingUp size={12} />
                        <span>EST. SAVINGS: +4.2%</span>
                    </div>
                    <button className="text-slate-400 hover:text-white transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side: Bid/Ask Screen */}
                <div className="flex-[3] border-r border-slate-800 flex flex-col overflow-hidden">
                    <div className="bg-slate-900/50 flex items-center p-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0">
                        <div className="w-1/4">Product / Contract</div>
                        <div className="w-1/6 text-right px-4">Qty (Bid)</div>
                        <div className="w-1/6 text-center">Bid</div>
                        <div className="w-1/6 text-center">Ask</div>
                        <div className="w-1/6 text-left px-4">Qty (Ask)</div>
                        <div className="w-1/6 text-right pr-4">Change</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {marketData.map((item) => (
                            <div 
                                key={item.id} 
                                className={`
                                    flex items-center p-3 border-b border-slate-800/50 hover:bg-slate-900 transition-colors group cursor-pointer
                                    ${item.flash === 'up' ? 'bg-emerald-950/20' : item.flash === 'down' ? 'bg-rose-950/20' : ''}
                                `}
                            >
                                <div className="w-1/4 flex flex-col font-bold text-slate-100">
                                    <span>{item.product}</span>
                                    <span className="text-[10px] text-slate-500">{item.lastDone}</span>
                                </div>
                                <div className="w-1/6 text-right px-4 text-slate-400">{item.qtyBid}</div>
                                <div className={`w-1/6 text-right px-4 py-2 rounded transition-all duration-300 font-bold border border-transparent ${item.flash === 'up' ? 'text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : item.flash === 'down' ? 'text-rose-400 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-emerald-400'}`}>
                                    {item.bid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className={`w-1/6 text-left px-4 py-2 rounded transition-all duration-300 font-bold border border-transparent ${item.flash === 'up' ? 'text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : item.flash === 'down' ? 'text-rose-400 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-rose-400'}`}>
                                    {item.ask.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="w-1/6 text-left px-4 text-slate-400">{item.qtyAsk}</div>
                                <div className={`w-1/6 text-right pr-4 flex items-center justify-end space-x-1 ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{item.change > 0 ? '+' : ''}{item.change.toFixed(2)}</span>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute right-4 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">LIFT</button>
                                    <button className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">HIT</button>
                                    <button className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">NEG</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Matrix View Mock */}
                    <div className="h-48 border-t border-slate-800 bg-slate-900/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-2">
                                <BarChart3 size={14} />
                                <span>MARKET_DEPTH_VISUALIZATION</span>
                            </span>
                        </div>
                        <div className="flex h-24 items-end space-x-1 px-4">
                            {[40, 60, 45, 80, 55, 90, 75, 40, 30, 65, 85, 95, 100, 80, 60, 45, 30, 20].map((h, i) => (
                                <div 
                                    key={i} 
                                    style={{ height: `${h}%` }} 
                                    className={`flex-1 rounded-t-sm ${i < 9 ? 'bg-emerald-500' : 'bg-rose-500'} opacity-50 hover:opacity-100 transition-opacity`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Trade Tape & Info */}
                <div className="flex-1 bg-slate-900/50 flex flex-col overflow-hidden">
                    {/* Insights Hub */}
                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center space-x-2 text-verdaxis mb-4">
                            <Zap size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Verdaxis AI_INTEL</span>
                        </div>
                        <div className="bg-slate-800/50 border border-verdaxis/20 rounded p-3 text-[11px] leading-relaxed italic text-slate-300">
                            "Methanol prices in Singapore showing bullish divergence due to logistical tight spots in the Malacca Strait. Recommend locking in JAN26 volume now."
                        </div>
                    </div>

                    {/* Trade Tape */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="bg-slate-900 p-2 text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-2">
                            <ArrowRightLeft size={14} />
                            <span>LIVE_TRADE_TAPE</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {tradeTape.map((trade, i) => (
                                <div key={i} className={`flex items-center space-x-2 text-[10px] py-1 border-l-2 pl-2 ${trade.includes('LIFTED') ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'} animate-in slide-in-from-top-1`}>
                                    <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                                    <span className="font-bold">{trade}</span>
                                </div>
                            ))}
                            {tradeTape.length === 0 && (
                                <div className="text-slate-600 text-[10px] animate-pulse">awaiting_market_data...</div>
                            )}
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[9px]">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)] animate-pulse"></div>
                            <span className="text-emerald-500 uppercase">SERVER_LINK: ACTIVE</span>
                        </div>
                        <div className="text-slate-500 font-bold">LATENCY: 42ms</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
