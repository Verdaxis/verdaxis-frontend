import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MapPin, Ship, AlertCircle } from 'lucide-react';

export const MapLegend: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="absolute top-4 right-20 z-[20] flex flex-col items-end">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 text-slate-300 p-2 rounded-lg shadow-lg hover:text-emerald-400 transition-colors mb-2"
            >
                {isOpen ? <ChevronUp size={20} /> : <HelpCircle size={20} />}
            </button>

            {isOpen && (
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-4 w-64 text-slate-300">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 border-b border-slate-700 pb-2">Map Intelligence Legend</h4>
                    
                    <div className="space-y-4">
                        {/* Port Supply */}
                        <div>
                            <div className="text-[10px] font-bold text-emerald-400 mb-2">PORT METHANOL SUPPLY</div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span>High Availability (&gt;10kt)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                    <span>Moderate / Tightening</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                    <span>Critical Low Stock</span>
                                </div>
                            </div>
                        </div>

                        {/* Vessels */}
                        <div>
                            <div className="text-[10px] font-bold text-blue-400 mb-2">LIVE FLEET TRACKING</div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <Ship size={14} className="text-blue-500" />
                                    <span>Verdaxis Fleet (Compliant)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <Ship size={14} className="text-amber-500" />
                                    <span>Warning (CII/ETS Risk)</span>
                                </div>
                            </div>
                        </div>

                        {/* Routes */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 mb-2">INFRASTRUCTURE</div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-8 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-300"></div>
                                <span>Active Green Corridor</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
