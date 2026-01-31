import React, { useState, useEffect } from 'react';
import { TrendingUp, PanelRightClose, Anchor, Ship, Info, LineChart, ArrowRight, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Port, Page } from '../../types';
import { generateMarketNarrative, generateArbitrageInsight } from '../../services/ai';
import MarkdownRenderer from '../ui/MarkdownRenderer';

interface IntelligencePanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPort: Port | undefined;
    onPortSelect: (port: Port) => void;
    onNavigate: (page: Page) => void;
    onShowArbitrage: () => void;
    ports: Port[];
    onArbitrageUpdate?: (originId: string, destId: string, spread: number, text: string) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
    isOpen,
    onClose,
    selectedPort,
    onPortSelect,
    onNavigate,
    onShowArbitrage,
    ports,
    onArbitrageUpdate
}) => {
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
            // Fetch Global Arbitrage Insight
            // Only fetch if we have ports and haven't loaded data yet or if it's a fresh mount
            if (ports.length > 0) {
                setIsArbitrageLoading(true);
                generateArbitrageInsight(ports).then(data => {
                    // Data is guaranteed to be returned (real or mock)
                    if (data) {
                        setArbitrageData({
                            narrative: data.narrative,
                            spread: data.spread
                        });
    
                        if (onArbitrageUpdate) {
                            onArbitrageUpdate(data.originId, data.destinationId, data.spread, data.narrative);
                        }
                    }
                    setIsArbitrageLoading(false);
                });
            }
        }
    }, [selectedPort?.id, ports.length]); // Use ID for stability

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
                            {selectedPort ? 'Port Intelligence' : 'Global Insights'}
                        </span>
                    </div>
                    <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-slate-100">
                        {selectedPort ? selectedPort.name : 'Global Overview'}
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
                {selectedPort && selectedPort.details ? (
                    <>
                        {/* AI Narrative Section */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 relative overflow-hidden">
                            <div className="flex items-center space-x-2 mb-2">
                                <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Verdaxis AI Narrative</span>
                            </div>
                            {isAiLoading ? (
                                <div className="space-y-2">
                                    <div className="h-2 bg-indigo-200 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-2 bg-indigo-200 rounded w-1/2 animate-pulse"></div>
                                </div>
                            ) : (
                                <div className="text-xs font-medium text-indigo-900 dark:text-indigo-300 leading-relaxed">
                                    <MarkdownRenderer content={aiNarrative || "Analyzing market conditions..."} />
                                </div>
                            )}
                        </div>

                        {/* Market Price & Trend */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Market Price</div>
                                <div className="text-2xl font-['Montserrat'] font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    ${selectedPort.priceMethanol}
                                    <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded ml-2 flex items-center">
                                        <TrendingUp size={10} className="mr-0.5" /> +2.4%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Availability</div>
                                <div className={`text-xl font-bold flex items-center ${selectedPort.methanolSupply === 'High' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {selectedPort.methanolSupply}
                                    <div className={`ml-2 w-3 h-3 rounded-full ${selectedPort.methanolSupply === 'High' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Port Specific Data */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                    <Anchor size={10} /> Congestion
                                </div>
                                <div className={`text-sm font-bold ${selectedPort.details.congestionLevel === 'High' ? 'text-red-500' : 'text-green-600'}`}>
                                    {selectedPort.details.congestionLevel}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">{selectedPort.details.avgWaitingTime}h wait avg</div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                    <Ship size={10} /> Supply
                                </div>
                                <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{selectedPort.details.forecastSupply}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">{selectedPort.details.activeBarges} active barges</div>
                            </div>
                        </div>

                        {/* Future Compliance & Projects */}
                        {selectedPort.details.upcomingProjects && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                    <TrendingUp size={10} /> Future Production Pipeline
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
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Methanol Price (7 Day)</h3>
                            <div className="h-24 flex items-end space-x-1">
                                {selectedPort.details.priceHistory.map((price, i) => {
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
                        </div>

                        {/* CTA */}
                        <button 
                            onClick={() => onPortSelect(selectedPort)}
                            className="w-full bg-[#5DADE2] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#4FA3D9] flex items-center justify-center space-x-2 transition-colors"
                        >
                            <span>View Market & Procure</span>
                            <ArrowRight size={16} />
                        </button>
                    </>
                ) : (
                    /* Global Default View */
                    <>
                        {/* AI Insight Card */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full opacity-50 blur-xl"></div>
                            <div className="flex items-start space-x-3 relative z-10">
                                <div className="bg-indigo-500 text-white p-1.5 rounded-md shadow-sm mt-1">
                                    <Info size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Arbitrage Opportunity (AI)</h4>
                                    </div>
                                    
                                    {isArbitrageLoading ? (
                                         <div className="space-y-2 mt-2">
                                            <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4 animate-pulse"></div>
                                            <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded w-1/2 animate-pulse"></div>
                                            <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded w-5/6 animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed mt-1 font-medium">
                                            <MarkdownRenderer content={arbitrageData?.narrative || "Analyzing market data..."} />
                                            {arbitrageData && (
                                                <button 
                                                    className="mt-3 text-[10px] bg-indigo-100 dark:bg-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded font-bold flex items-center gap-1 transition-colors" 
                                                    onClick={onShowArbitrage}
                                                >
                                                    <TrendingUp size={12} /> Visualize Flow
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Forward Curves */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forward Curves (Q4)</h3>
                                <LineChart size={14} className="text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Methanol (RTM)', change: '+2.4%', up: true, price: '$545', curve: 'Contango' },
                                    { label: 'Biofuel B24 (SIN)', change: '-0.8%', up: false, price: '$780', curve: 'Backwardation' },
                                ].map((item, i) => (
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
                    </>
                )}

                {/* Compliance Alert (Always Visible) */}
                <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg mt-auto">
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-500 mb-2">
                        <AlertCircle size={16} />
                        <span className="text-xs font-bold uppercase">Fleet Alert</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-400">
                        Vessel <span className="font-bold">Ocean Guardian</span> is projected to exceed FuelEU intensity limits by Dec 15.
                    </p>
                    <button 
                        onClick={() => onNavigate('FLEET')}
                        className="mt-3 w-full text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    >
                        View Fleet Status
                    </button>
                </div>
            </div>
        </div>
    );
};