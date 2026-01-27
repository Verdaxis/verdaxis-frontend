import React from 'react';
import { TrendingUp, FileText, PieChart, Download } from 'lucide-react';

interface ComplianceDashboardProps {
    onOpenLedger: () => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ onOpenLedger }) => {
    return (
        <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* EU ETS Widget */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155]">EU ETS Exposure</h2>
                            <p className="text-xs text-slate-500">Period: 2024 YTD</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-[#5DADE2]">
                            <PieChart size={20} />
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Current Balance</span>
                            <span className="font-bold text-[#334155]">1,200 EUAs</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Projected Deficit (Year End)</span>
                            <span className="font-bold text-red-500">350 EUAs</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold mb-2 text-slate-500">
                            <span>Possession</span>
                            <span>Deficit</span>
                        </div>
                        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                            <div className="bg-[#4CAF50] h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: '77%' }}>
                                77% Covered
                            </div>
                            <div className="bg-red-400 h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: '23%' }}>
                                23%
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex space-x-4">
                         <button 
                             className="flex-1 bg-[#334155] text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors"
                             title="🚧 Brokerage Integration under construction"
                         >
                            Buy Allowances
                        </button>
                        <button 
                            onClick={onOpenLedger}
                            className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            View Ledger
                        </button>
                    </div>
                </div>

                {/* FuelEU Widget */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155]">FuelEU Fleet Performance</h2>
                            <p className="text-xs text-slate-500">GHG Intensity (gCO2eq/MJ)</p>
                        </div>
                         <div className="bg-green-50 p-2 rounded-lg text-[#4CAF50]">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="relative h-48 w-full bg-slate-50 rounded-lg border border-slate-100 p-4 flex items-end justify-between">
                        {/* Regulatory Limit Line */}
                        <div className="absolute top-[30%] left-0 right-0 border-t-2 border-dashed border-red-400 z-10"></div>
                        <span className="absolute top-[25%] right-2 text-xs text-red-500 font-bold bg-white px-1">Limit: 89.3</span>

                        {/* Bars */}
                        {[
                            { q: 'Q1', val: '60%', color: 'bg-[#5DADE2]' },
                            { q: 'Q2', val: '55%', color: 'bg-[#5DADE2]' },
                            { q: 'Q3', val: '65%', color: 'bg-[#5DADE2]' },
                            { q: 'Q4 (Est)', val: '72%', color: 'bg-amber-400' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center h-full justify-end w-1/5 z-20 group">
                                <div className={`w-full rounded-t-md transition-all duration-500 ${item.color}`} style={{ height: item.val }}></div>
                                <span className="text-xs font-bold text-slate-500 mt-2">{item.q}</span>
                            </div>
                        ))}
                    </div>
                     <p className="text-xs text-slate-400 mt-3 text-center">
                        Q4 Estimate puts <span className="font-bold text-amber-500">MV Ocean Guardian</span> at risk of penalty.
                    </p>
                </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] mb-4">Regulatory Filings</h2>
                 <div className="space-y-3">
                    {[
                        { name: 'MRV Report 2023 - Final.pdf', type: 'Submission', date: 'Oct 12, 2023' },
                        { name: 'ETS Surrender Confirmation Q3.pdf', type: 'Receipt', date: 'Sep 30, 2023' },
                        { name: 'FuelEU Compliance Balance Statement.pdf', type: 'Report', date: 'Sep 15, 2023' },
                    ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[#334155]">{doc.name}</div>
                                    <div className="text-xs text-slate-500">{doc.type} • {doc.date}</div>
                                </div>
                            </div>
                            <button 
                                className="text-[#5DADE2] hover:text-[#4FA3D9]"
                                title="🚧 Download - Feature under construction"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};