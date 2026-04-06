import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, WifiOff, FlaskConical } from 'lucide-react';
import { MarketWatchItem } from '../../types';
import { fetchLiveMarketData } from '../../services/ai-engine/generators';
import { useNamespace } from '../../hooks/useNamespace';

interface MarketWatchTickerProps {
    isPanelOpen: boolean;
    onOpenPanel: () => void;
}

// Initial placeholder state
const PLACEHOLDERS: MarketWatchItem[] = [
    { pair: 'Methanol (ARA)', val: 'Loading...', change: '--', up: true },
    { pair: 'EUA Carbon', val: 'Loading...', change: '--', up: true },
    { pair: 'Ammonia (AG)', val: 'Loading...', change: '--', up: true },
    { pair: 'Biofuel (ARA)', val: 'Loading...', change: '--', up: false },
];

export const MarketWatchTicker: React.FC<MarketWatchTickerProps> = ({ isPanelOpen, onOpenPanel }) => {
    const { t, ready } = useNamespace('dashboard');
    const [items, setItems] = useState<MarketWatchItem[]>(PLACEHOLDERS);
    const [status, setStatus] = useState<'LOADING' | 'LIVE' | 'DEMO' | 'ERROR'>('LOADING');

    const loadLiveMarketData = async () => {
        setStatus('LOADING');
        setItems(PLACEHOLDERS);

        try {
            const result = await fetchLiveMarketData();
            if (result && result.items.length > 0) {
                setItems(result.items);
                setStatus(result.isDemo ? 'DEMO' : 'LIVE');
            } else {
                throw new Error("No live data returned");
            }
        } catch (err) {
            console.error("Market data fetch error:", err);
            setStatus('ERROR');
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

    if (!ready) return null;

    return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-3 flex items-center space-x-6 overflow-x-auto w-full">
            <div className="flex items-center space-x-2 border-r border-slate-200 pr-4 min-w-fit">
                {status === 'LIVE' && <Activity size={18} className="text-green-600 animate-pulse" />}
                {status === 'DEMO' && <FlaskConical size={18} className="text-blue-500" />}
                {status === 'LOADING' && <RefreshCw size={18} className="text-verdaxis animate-spin" />}
                {status === 'ERROR' && <WifiOff size={18} className="text-red-500" />}

                <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap block">
                        {t('marketWatch.title')}
                    </span>
                    {status === 'LIVE' && <span className="text-[8px] font-bold text-green-600 uppercase tracking-wider">● {t('marketWatch.liveFeed')}</span>}
                    {status === 'DEMO' && <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wider">● {t('marketWatch.reference')}</span>}
                    {status === 'LOADING' && <span className="text-[8px] font-bold text-verdaxis uppercase tracking-wider">{t('marketWatch.connecting')}</span>}
                    {status === 'ERROR' && <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">{t('marketWatch.offline')}</span>}
                </div>
            </div>

            {items.map((item, i) => (
                <div key={i} className="flex flex-col min-w-fit">
                    <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase">{item.pair}</span>
                    <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${status === 'ERROR' || item.val === 'Loading...' ? 'text-slate-400 dark:text-slate-500' : status === 'DEMO' ? 'text-blue-700 dark:text-blue-300' : 'text-sky-700 dark:text-sky-300'}`}>
                            {item.val}
                        </span>
                        {(status === 'LIVE' || status === 'DEMO') && (
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
                    title={t('marketWatch.retryConnection')}
                >
                    <RefreshCw size={14} />
                </button>
            )}

            <button 
                onClick={onOpenPanel}
                className="text-xs font-bold text-verdaxis hover:text-verdaxis-dark whitespace-nowrap"
                title={t('marketWatch.viewFullAnalytics')}
            >
                {t('marketWatch.viewFullAnalytics')}
            </button>
        </div>
    );
};
