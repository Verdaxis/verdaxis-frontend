import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PanelRightClose, Anchor, Ship, Info, LineChart, ArrowRight, Sparkles, RefreshCw, GraduationCap, Shield } from 'lucide-react';
import { Port, Page, Product, ForwardCurvePoint } from '../../types';
import { generateMarketNarrative, generateArbitrageInsight } from '../../services/ai';
import { api } from '../../services/api';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { useNamespace } from '../../hooks/useNamespace';
import { NewsFeed } from '../NewsFeed';

interface IntelligencePanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPort: Port | undefined;
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    ports: Port[];
    onArbitrageUpdate?: (originId: string, destId: string, spread: number, text: string) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
    isOpen,
    onClose,
    selectedPort,
    onPortSelect,
    onNavigate,
    ports,
    onArbitrageUpdate
}) => {
    const { t, ready } = useNamespace('dashboard');
    const [aiNarrative, setAiNarrative] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    const [arbitrageData, setArbitrageData] = useState<{narrative: string, spread: number} | null>(null);
    const [isArbitrageLoading, setIsArbitrageLoading] = useState(false);



    useEffect(() => {
        if (selectedPort) {
            // Fetch Port Narrative
            setIsAiLoading(true);
            setAiNarrative(null);
            generateMarketNarrative(selectedPort).then(text => {
                setAiNarrative(text);
                setIsAiLoading(false);
            });
        } else {
            // Arbitrage Insight hidden — pending real data integration
        }
    }, [selectedPort?.id, ports.length]);

    // Real forward curve data from API
    const [curveProducts, setCurveProducts] = useState<{ label: string; price: string; change: string; up: boolean; curve: string }[]>([]);

    const marketPriceLabel = selectedPort && selectedPort.priceMethanol > 0
        ? `$${selectedPort.priceMethanol}`
        : '--';
    const availabilityLabel = selectedPort && selectedPort.methanolSupply !== 'Unknown'
        ? selectedPort.methanolSupply
        : '--';
    const availabilityTone = availabilityLabel === 'High'
        ? 'text-emerald-500'
        : availabilityLabel === 'Medium'
            ? 'text-amber-500'
            : availabilityLabel === 'Low'
                ? 'text-red-500'
                : 'text-slate-400 dark:text-slate-500';
    const availabilityDotTone = availabilityLabel === 'High'
        ? 'bg-emerald-500 animate-pulse'
        : availabilityLabel === 'Medium'
            ? 'bg-amber-500'
            : availabilityLabel === 'Low'
                ? 'bg-red-500'
                : 'bg-slate-400';
    const hasPriceHistory = Boolean(selectedPort?.details?.priceHistory?.length);
    const congestionLabel = selectedPort?.details?.congestionLevel && selectedPort.details.congestionLevel !== 'Unknown'
        ? selectedPort.details.congestionLevel
        : '--';

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const products: Product[] = await api.catalog.products();
                const active = products.filter(p => p.is_active).slice(0, 3);
                const results = await Promise.allSettled(
                    active.map(p => api.curves.forward({ product_id: p.id }))
                );
                if (cancelled) return;
                const items = results
                    .map((r, i) => {
                        if (r.status !== 'fulfilled' || !r.value.curve?.length) return null;
                        const curve = r.value.curve;
                        const spot = curve.find((c: ForwardCurvePoint) => c.availability_window === 'Spot') || curve[0];
                        const far = curve[curve.length - 1];
                        const mid = spot.mid_price ?? 0;
                        const farMid = far.mid_price ?? mid;
                        const pctChange = mid > 0 ? ((farMid - mid) / mid) * 100 : 0;
                        const isContango = farMid >= mid;
                        return {
                            label: active[i].name,
                            price: mid > 0 ? `$${mid.toFixed(0)}` : '--',
                            change: pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`,
                            up: isContango,
                            curve: isContango ? 'Contango' : 'Backwardation',
                        };
                    })
                    .filter(Boolean) as typeof curveProducts;
                setCurveProducts(items);
            } catch {
                // Graceful degradation — show empty if API unavailable
            }
        })();
        return () => { cancelled = true; };
    }, []);


    if (!ready) return null;

    return (
        <div className={`
            absolute right-0 top-0 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-slate-200 dark:border-slate-700 shadow-xl z-10 flex flex-col transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            w-full md:w-80
        `}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-2 text-[#5DADE2] mb-1">
                        <TrendingUp size={18} />
                        <span className="text-xs font-bold tracking-widest uppercase">
                            {selectedPort ? t('intelligencePanel.portIntelligence') : t('intelligencePanel.globalInsights')}
                        </span>
                    </div>
                    <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-slate-100">
                        {selectedPort ? selectedPort.name : t('intelligencePanel.globalOverview')}
                    </h2>
                </div>
                <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <PanelRightClose size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Context Aware Content */}
                {selectedPort ? (
                    <>
                        {/* AI Narrative — hidden until AI integration is live */}

                        {/* Market Price & Trend */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('intelligencePanel.marketPrice')}</div>
                                <div className="text-2xl font-['Montserrat'] font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    {marketPriceLabel}
                                    {selectedPort.priceMethanol > 0 && selectedPort.priceTrend !== undefined && (
                                        <span className={`text-xs font-medium ${selectedPort.priceTrend >= 0 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'} px-1.5 py-0.5 rounded ml-2 flex items-center`}>
                                            {selectedPort.priceTrend >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                            {selectedPort.priceTrend >= 0 ? '+' : ''}{selectedPort.priceTrend.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{t('intelligencePanel.availability')}</div>
                                <div className={`text-xl font-bold flex items-center ${availabilityTone}`}>
                                    {availabilityLabel}
                                    <div className={`ml-2 w-3 h-3 rounded-full ${availabilityDotTone}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Port Specific Data — auto-hidden when no real data */}
                        {selectedPort.details && (selectedPort.details.avgWaitingTime > 0 || selectedPort.details.activeBarges > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                                {selectedPort.details.avgWaitingTime > 0 && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                            <Anchor size={10} /> {t('intelligencePanel.congestion')}
                                        </div>
                                        <div className={`text-sm font-bold ${congestionLabel === 'High' ? 'text-red-500' : congestionLabel === 'Moderate' ? 'text-amber-500' : 'text-green-600'}`}>
                                            {congestionLabel}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('intelligencePanel.waitAvg', { hours: selectedPort.details.avgWaitingTime })}</div>
                                    </div>
                                )}
                                {selectedPort.details.activeBarges > 0 && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                            <Ship size={10} /> {t('intelligencePanel.supply')}
                                        </div>
                                        <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{selectedPort.details.forecastSupply}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('intelligencePanel.activeBarges', { count: selectedPort.details.activeBarges })}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Compliance & Future Projects */}
                        {selectedPort.details?.upcomingProjects && selectedPort.details.upcomingProjects.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2 flex items-center gap-2">
                                    <Shield size={16} className="text-blue-500" /> {t('intelligencePanel.futurePipeline')}
                                </h3>
                                <div className="space-y-2">
                                    {selectedPort.details.upcomingProjects.map((project, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div>
                                                <div className="font-bold text-verdaxis-dark dark:text-slate-200">{project.project}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400">{project.year}</div>
                                            </div>
                                            <div className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                                {project.capacity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mock Price Chart */}
                        <div className="border border-slate-100 dark:border-slate-700 rounded-lg p-4">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">{t('intelligencePanel.methanolPrice7Day')}</h3>
                            {hasPriceHistory ? (
                                <div className="h-24 flex items-end space-x-1">
                                    {selectedPort.details!.priceHistory.map((price, i) => {
                                    const h = (price / 600) * 100; // Normalize roughly
                                    return (
                                        <div key={i} className="flex-1 bg-blue-100 rounded-t hover:bg-[#5DADE2] transition-colors relative group">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] font-bold bg-slate-800 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                ${price}
                                            </div>
                                            <div style={{ height: `${h}%` }}></div>
                                        </div>
                                    )
                                    })}
                                </div>
                            ) : (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">No live port intelligence history yet.</div>
                            )}
                        </div>

                        {/* CTA */}
                        <button 
                            onClick={() => onPortSelect(selectedPort)}
                            className="w-full bg-[#5DADE2] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#4FA3D9] flex items-center justify-center space-x-2 transition-colors"
                        >
                            <span>{t('intelligencePanel.viewMarketProcure')}</span>
                            <ArrowRight size={16} />
                        </button>
                    </>
                ) : (
                    /* Global Default View */
                    <>
                        {/* Arbitrage Opportunity hidden — pending real data integration */}

                        {/* Forward Curves */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forward Curves</h3>
                                <LineChart size={14} className="text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {curveProducts.length === 0 && (
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">Loading curve data...</div>
                                )}
                                {curveProducts.map((item, i) => (
                                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{item.label}</div>
                                            <div className={`text-xs font-bold ${item.up ? 'text-green-600' : 'text-red-500'}`}>
                                                {item.change}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.price}</div>
                                            <div className="text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                                                {item.curve}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2 flex items-center gap-2">
                                <GraduationCap size={16} className="text-emerald-500" /> Education
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => onNavigate('TRAINING')}
                                    className="w-full flex items-center gap-2 text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                                >
                                    <Info size={12} className="text-emerald-500 shrink-0" />
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">FuelEU & EU ETS Basics</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Regulation overview for operators</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => onNavigate('TRAINING')}
                                    className="w-full flex items-center gap-2 text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                                >
                                    <Info size={12} className="text-emerald-500 shrink-0" />
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">Alternative Fuel Guide</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Methanol, ammonia, biofuel comparison</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* News Feed — replaces fleet alert per Gavin feedback */}
                <div className="mt-auto">
                    <NewsFeed />
                </div>
            </div>
        </div>
    );
};
