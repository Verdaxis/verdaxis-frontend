import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PanelRightClose, Anchor, Ship, Info, LineChart, ArrowRight, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Port, Page, Vessel } from '../../types';
import { generateMarketNarrative, generateArbitrageInsight } from '../../services/ai';
import { api } from '../../services/api';
import MarkdownRenderer from '../ui/MarkdownRenderer';

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
    const [aiNarrative, setAiNarrative] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    const [arbitrageData, setArbitrageData] = useState<{narrative: string, spread: number} | null>(null);
    const [isArbitrageLoading, setIsArbitrageLoading] = useState(false);
    const [fleetVessels, setFleetVessels] = useState<Vessel[]>([]);

    // Fetch fleet data for alerts
    useEffect(() => {
        api.vessels.list().then(setFleetVessels).catch(() => {});
    }, []);

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

    // Derive forward curve data from top ports
    const forwardCurves = ports.slice(0, 2).map(p => ({
        label: `Methanol (${p.name.substring(0, 3).toUpperCase()})`,
        change: p.priceTrend >= 0 ? `+${p.priceTrend.toFixed(1)}%` : `${p.priceTrend.toFixed(1)}%`,
        up: p.priceTrend >= 0,
        price: `$${p.priceMethanol}`,
        curve: p.priceTrend >= 0 ? 'Contango' : 'Backwardation',
    }));

    // Find the most at-risk vessel for fleet alert
    const atRiskVessel = fleetVessels.find(v =>
        v.complianceFuelEU === 'Non-Compliant' || v.complianceFuelEU === 'Warning' ||
        v.complianceEUETS === 'Non-Compliant' || v.complianceEUETS === 'Warning'
    );
    const alertType = atRiskVessel
        ? (atRiskVessel.complianceFuelEU === 'Non-Compliant' || atRiskVessel.complianceFuelEU === 'Warning' ? 'FuelEU' : 'EU ETS')
        : null;

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
                        {/* AI Narrative — hidden until AI integration is live */}

                        {/* Market Price & Trend */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Market Price</div>
                                <div className="text-2xl font-['Montserrat'] font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    ${selectedPort.priceMethanol}
                                    {selectedPort.priceTrend !== undefined && (
                                        <span className={`text-xs font-medium ${selectedPort.priceTrend >= 0 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'} px-1.5 py-0.5 rounded ml-2 flex items-center`}>
                                            {selectedPort.priceTrend >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                            {selectedPort.priceTrend >= 0 ? '+' : ''}{selectedPort.priceTrend.toFixed(1)}%
                                        </span>
                                    )}
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

                        {/* Port Specific Data — auto-hidden when no real data */}
                        {(selectedPort.details.avgWaitingTime > 0 || selectedPort.details.activeBarges > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                                {selectedPort.details.avgWaitingTime > 0 && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                            <Anchor size={10} /> Congestion
                                        </div>
                                        <div className={`text-sm font-bold ${selectedPort.details.congestionLevel === 'High' ? 'text-red-500' : 'text-green-600'}`}>
                                            {selectedPort.details.congestionLevel}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{selectedPort.details.avgWaitingTime}h wait avg</div>
                                    </div>
                                )}
                                {selectedPort.details.activeBarges > 0 && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                            <Ship size={10} /> Supply
                                        </div>
                                        <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{selectedPort.details.forecastSupply}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{selectedPort.details.activeBarges} active barges</div>
                                    </div>
                                )}
                            </div>
                        )}

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
                        {/* Arbitrage Opportunity hidden — pending real data integration */}

                        {/* Forward Curves */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forward Curves (Q4)</h3>
                                <LineChart size={14} className="text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {forwardCurves.map((item, i) => (
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

                {/* Compliance Alert - Dynamic from fleet data */}
                {atRiskVessel ? (
                    <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg mt-auto">
                        <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-500 mb-2">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase">Fleet Alert</span>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                            Vessel <span className="font-bold">{atRiskVessel.name}</span> has {alertType} status: <span className="font-bold">{alertType === 'FuelEU' ? atRiskVessel.complianceFuelEU : atRiskVessel.complianceEUETS}</span>. CII Grade: {atRiskVessel.ciiGrade}.
                        </p>
                        <button
                            onClick={() => onNavigate('FLEET')}
                            className="mt-3 w-full text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        >
                            View Fleet Status
                        </button>
                    </div>
                ) : (
                    <div className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mt-auto">
                        <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-500 mb-2">
                            <Ship size={16} />
                            <span className="text-xs font-bold uppercase">Fleet Status</span>
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-400">
                            All vessels are compliant. No alerts at this time.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};