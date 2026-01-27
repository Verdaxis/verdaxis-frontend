import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, WifiOff } from 'lucide-react';
import { MarketWatchItem } from '../../types';
import { fetchLiveMarketData } from '../../services/ai-engine/generators';

interface MarketWatchTickerProps {
    isPanelOpen: boolean;
    onOpenPanel: () => void;
}

// Initial placeholder state
const PLACEHOLDERS: MarketWatchItem[] = [
    { pair: 'VLSFO-Methanol Spread', val: 'Loading...', change: '--', up: true },
    { pair: 'EUA Carbon', val: 'Loading...', change: '--', up: true },
    { pair: 'Brent Crude', val: 'Loading...', change: '--', up: true },
    { pair: 'LNG (RTM)', val: 'Loading...', change: '--', up: false },
];

export const MarketWatchTicker: React.FC<MarketWatchTickerProps> = ({ isPanelOpen, onOpenPanel }) => {
    const [items, setItems] = useState<MarketWatchItem[]>(PLACEHOLDERS);
    const [status, setStatus] = useState<'LOADING' | 'LIVE' | 'ERROR'>('LOADING');

    const loadLiveMarketData = async () => {
        setStatus('LOADING');
        setItems(PLACEHOLDERS);
        
        try {
            const liveData = await fetchLiveMarketData();
            if (liveData && liveData.length > 0) {
                setItems(liveData);
                setStatus('LIVE');
            } else {
                throw new Error("No live data returned");
            }
        } catch (err) {
            console.error("Market data fetch error:", err);
            setStatus('ERROR');
            // Show unavailable state for debugging
            setItems(prev => prev.map(item => ({
                ...item,
                val: 'Unavailable',
                change: '---',
                up: false
            })));
        }
    };

    useEffect(() => {
        loadLiveMarketData();
    }, []);

    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-lg p-3 flex items-center space-x-6 overflow-x-auto w-full">
            <div className="flex items-center space-x-2 border-r border-slate-200 pr-4 min-w-fit">
                {status === 'LIVE' && <Activity size={18} className="text-green-600 animate-pulse" />}
                {status === 'LOADING' && <RefreshCw size={18} className="text-verdaxis animate-spin" />}
                {status === 'ERROR' && <WifiOff size={18} className="text-red-500" />}
                
                <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap block">
                        Market Watch
                    </span>
                    {status === 'LIVE' && <span className="text-[8px] font-bold text-green-600 uppercase tracking-wider">● LIVE FEED</span>}
                    {status === 'LOADING' && <span className="text-[8px] font-bold text-verdaxis uppercase tracking-wider">CONNECTING...</span>}
                    {status === 'ERROR' && <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">OFFLINE</span>}
                </div>
            </div>

            {items.map((item, i) => (
                <div key={i} className="flex flex-col min-w-fit">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{item.pair}</span>
                    <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${status === 'ERROR' || item.val === 'Loading...' ? 'text-slate-400' : 'text-verdaxis-dark'}`}>
                            {item.val}
                        </span>
                        {status === 'LIVE' && (
                            <span className={`text-xs font-bold ${item.up ? 'text-green-500' : 'text-red-500'}`}>
                                {item.change}
                            </span>
                        )}
                    </div>
                </div>
            ))}
            
            <div className="flex-1"></div>
            
            {status === 'ERROR' && (
                <button 
                    onClick={loadLiveMarketData}
                    className="mr-4 p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Retry Connection"
                >
                    <RefreshCw size={14} />
                </button>
            )}

            <button 
                onClick={onOpenPanel}
                className="text-xs font-bold text-verdaxis hover:text-verdaxis-dark whitespace-nowrap"
                title="View Full Analytics"
            >
                View Full Analytics →
            </button>
        </div>
    );
};