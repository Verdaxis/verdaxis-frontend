import React, { useState, useMemo } from 'react';
import { X, Ship, Gauge, Navigation, Calendar, BarChart3, AlertTriangle, CheckCircle2, Calculator, Droplets, Leaf, ArrowRight, Info } from 'lucide-react';
import { Vessel } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface VesselDetailModalProps {
    vessel: Vessel;
    onClose: () => void;
}

const StatusBadge: React.FC<{ status: Vessel['complianceEUETS'] }> = ({ status }) => {
    const styles = {
        'Compliant': 'bg-green-100 text-green-700 border-green-200',
        'Warning': 'bg-amber-100 text-amber-700 border-amber-200',
        'Non-Compliant': 'bg-red-100 text-red-700 border-red-200'
    };
    
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]} flex items-center w-fit`}>
            {status === 'Compliant' && <CheckCircle2 size={12} className="mr-1" />}
            {status === 'Warning' && <AlertTriangle size={12} className="mr-1" />}
            {status}
        </span>
    );
};

// Simulation constants for the calculator
const CII_BOUNDARIES = {
    'A': 4.0,
    'B': 5.5,
    'C': 7.0,
    'D': 8.5,
    'E': 100.0
};

const FUEL_PRICES = {
    'B24': 780,  // USD/MT
    'B30': 810,
    'B100': 1150
};

const EMISSION_FACTORS = {
    'VLSFO': 3.114,
    'B24': 2.50, // Approx 20% reduction
    'B30': 2.35,
    'B100': 0.50 // Net ~85% reduction (Lifecycle)
};

export const VesselDetailModal: React.FC<VesselDetailModalProps> = ({ vessel, onClose }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CII_OPTIMIZER'>('OVERVIEW');
    
    // Calculator State
    const [targetRating, setTargetRating] = useState<'A' | 'B' | 'C'>('C');
    const [selectedBlend, setSelectedBlend] = useState<'B24' | 'B30' | 'B100'>('B100');

    // Derived Calculator Values
    const calculation = useMemo(() => {
        // Mock current values based on vessel grade
        let currentScore = 0;
        let annualConsumption = 5000; // MT per year

        switch(vessel.ciiGrade) {
            case 'A': currentScore = 3.5; break;
            case 'B': currentScore = 4.8; break;
            case 'C': currentScore = 6.2; break;
            case 'D': currentScore = 7.8; break;
            case 'E': currentScore = 9.2; break;
        }

        const targetLimit = CII_BOUNDARIES[targetRating];
        const isAlreadyAchieved = currentScore <= targetLimit;

        if (isAlreadyAchieved) {
            return { requiredVol: 0, cost: 0, savings: 0, currentScore, targetLimit };
        }

        // Simplified Physics Logic:
        // We need to reduce the weighted average emission factor.
        // Current Total Emissions = Vol * Factor_VLSFO
        // Target Total Emissions = Vol * Factor_Target (derived from Score reduction)
        // Reduction Needed % = (CurrentScore - TargetScore) / CurrentScore
        
        const reductionNeededPct = (currentScore - targetLimit) / currentScore;
        
        // How much of the selected blend is needed to replace VLSFO to achieve this reduction?
        // Blend Benefit = (Factor_VLSFO - Factor_Blend) / Factor_VLSFO
        const vlsfoFactor = EMISSION_FACTORS['VLSFO'];
        const blendFactor = EMISSION_FACTORS[selectedBlend];
        const blendBenefitPct = (vlsfoFactor - blendFactor) / vlsfoFactor;

        // Required Replacement % = Reduction Needed / Blend Benefit
        let replacementPct = reductionNeededPct / blendBenefitPct;
        
        // Cap at 100% (if it's impossible with this blend, theoretically)
        if (replacementPct > 1) replacementPct = 1;

        const requiredVol = Math.round(annualConsumption * replacementPct);
        const cost = requiredVol * FUEL_PRICES[selectedBlend];
        
        // EU ETS Savings (approx $80/ton CO2)
        const co2Saved = requiredVol * (vlsfoFactor - blendFactor);
        const etsSavings = co2Saved * 85; // $85 per EUA

        return {
            requiredVol,
            cost,
            etsSavings,
            currentScore,
            targetLimit
        };

    }, [vessel.ciiGrade, targetRating, selectedBlend]);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                            <Ship size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-['Montserrat'] font-bold text-[#334155]">{vessel.name}</h2>
                            <p className="text-slate-500 font-mono text-sm">IMO: {vessel.imo} • {vessel.vesselType}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-2 border-b border-slate-100 flex space-x-6 flex-shrink-0">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'OVERVIEW' ? 'border-[#334155] text-[#334155]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Overview & Telemetry
                    </button>
                    <button 
                        onClick={() => setActiveTab('CII_OPTIMIZER')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'CII_OPTIMIZER' ? 'border-[#4CAF50] text-[#4CAF50]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <Leaf size={14} />
                        CII Biofuel Recommendations
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'OVERVIEW' ? (
                        <div className="p-6 grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase">
                                        <Gauge size={16} />
                                        <span>Current CII Rating</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-3xl font-bold text-[#334155]">{vessel.ciiGrade}</div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${vessel.ciiGrade === 'A' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {vessel.ciiGrade === 'A' ? 'Excellent' : 'Review Needed'}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase">
                                        <Navigation size={16} />
                                        <span>Current Status</span>
                                    </div>
                                    <div className="text-lg font-bold text-[#334155]">{vessel.status}</div>
                                    <div className="text-xs text-slate-500 mt-1">En route to {vessel.nextVoyage.split('->')[1]}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase">
                                        <Calendar size={16} />
                                        <span>Next Dry Dock</span>
                                    </div>
                                    <div className="text-lg font-bold text-[#334155]">{vessel.nextDryDock}</div>
                                    <div className="text-xs text-slate-500 mt-1">Scheduled Maintenance</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#334155] mb-4 flex items-center space-x-2">
                                    <BarChart3 size={18} />
                                    <span>Compliance Telemetry</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-600">EU ETS Allowances (2024)</span>
                                            <StatusBadge status={vessel.complianceEUETS} />
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">85% of required allowances surrendered.</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-600">FuelEU Intensity Limit</span>
                                            <StatusBadge status={vessel.complianceFuelEU} />
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full ${vessel.complianceFuelEU === 'Warning' ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: vessel.complianceFuelEU === 'Warning' ? '92%' : '60%' }}></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">Current intensity: 88.2 gCO2eq/MJ (Limit: 89.3)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- CII OPTIMIZER TAB ---
                        <div className="p-6">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6 mb-8">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-3 rounded-full shadow-sm text-green-600">
                                        <Leaf size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-green-900">Optimize CII Rating</h3>
                                        <p className="text-green-800 text-sm mt-1 max-w-lg">
                                            Calculate exactly how much biofuel you need to improve {vessel.name}'s CII rating. 
                                            Avoid operational speed limits and preserve asset value.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Inputs */}
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">1. Select Target CII Rating</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['A', 'B', 'C'].map((rating) => (
                                                <button
                                                    key={rating}
                                                    onClick={() => setTargetRating(rating as any)}
                                                    className={`py-3 rounded-lg font-bold text-sm transition-all border-2 ${
                                                        targetRating === rating 
                                                        ? 'border-green-500 bg-green-50 text-green-700' 
                                                        : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                                    }`}
                                                >
                                                    Grade {rating}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                            <Info size={12} />
                                            <span>Current Rating: <strong>{vessel.ciiGrade}</strong> ({calculation.currentScore} gCO2/dwt-nm)</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">2. Select Biofuel Blend</label>
                                        <div className="space-y-3">
                                            {[
                                                { id: 'B24', name: 'B24 Biofuel', desc: '24% Bio-component', price: '$780/mt' },
                                                { id: 'B30', name: 'B30 Biofuel', desc: '30% Bio-component', price: '$810/mt' },
                                                { id: 'B100', name: 'B100 (Pure)', desc: '100% Bio-component', price: '$1150/mt' }
                                            ].map((fuel) => (
                                                <div 
                                                    key={fuel.id}
                                                    onClick={() => setSelectedBlend(fuel.id as any)}
                                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center ${
                                                        selectedBlend === fuel.id
                                                        ? 'border-[#5DADE2] bg-blue-50'
                                                        : 'border-slate-100 hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded-full border ${selectedBlend === fuel.id ? 'border-[#5DADE2] bg-[#5DADE2]' : 'border-slate-300'}`}></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-[#334155]">{fuel.name}</div>
                                                            <div className="text-xs text-slate-500">{fuel.desc}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-600">{fuel.price}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Results */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col h-full">
                                    <h4 className="font-['Montserrat'] font-bold text-[#334155] mb-6 flex items-center gap-2">
                                        <Calculator size={18} />
                                        <span>Compliance Calculator</span>
                                    </h4>

                                    {calculation.requiredVol <= 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircle2 size={32} className="text-green-600" />
                                            </div>
                                            <h3 className="font-bold text-green-700">Target Already Achieved</h3>
                                            <p className="text-sm text-green-600 mt-2">
                                                The vessel is already performing at or better than Grade {targetRating}. No biofuel substitution required.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 flex-1">
                                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Biofuel Required</div>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl font-bold text-[#334155]">{calculation.requiredVol.toLocaleString()}</span>
                                                    <span className="text-lg font-medium text-slate-500 mb-1">MT</span>
                                                </div>
                                                <div className="text-xs text-[#5DADE2] font-bold mt-2 flex items-center gap-1">
                                                    <Droplets size={12} />
                                                    <span>of {selectedBlend} blend</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Est. Cost</div>
                                                    <div className="text-lg font-bold text-[#334155]">${calculation.cost.toLocaleString()}</div>
                                                </div>
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                                    <div className="text-[10px] font-bold text-green-600 uppercase mb-1">EU ETS Savings</div>
                                                    <div className="text-lg font-bold text-green-700">-${calculation.etsSavings.toLocaleString()}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto pt-6">
                                                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                                    <span>Current: <strong>{calculation.currentScore.toFixed(2)}</strong></span>
                                                    <ArrowRight size={14} className="text-slate-300" />
                                                    <span className="text-green-600">Target: <strong>{calculation.targetLimit.toFixed(2)}</strong></span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-3">
                                                    <div className="bg-slate-400 h-3 rounded-l-full" style={{ width: '40%' }}></div>
                                                </div>
                                                <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
                                                    <span>E</span>
                                                    <span>D</span>
                                                    <span>C</span>
                                                    <span>B</span>
                                                    <span>A</span>
                                                </div>
                                            </div>

                                            <button className="w-full py-4 bg-[#334155] text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                                                <span>Create Biofuel Order</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'OVERVIEW' && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl flex-shrink-0">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-600 font-bold hover:text-slate-800"
                        >
                            Close
                        </button>
                        <button className="px-6 py-2.5 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm">
                            View Full Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};