import React, { useState } from 'react';
import { ComplianceDashboard } from './compliance/ComplianceDashboard';
import { ComplianceTracing } from './compliance/ComplianceTracing';
import { ComplianceDataInput } from './compliance/ComplianceDataInput';
import { ComplianceLedgerModal } from './compliance/ComplianceLedgerModal';

type ComplianceTab = 'DASHBOARD' | 'TRACING' | 'DATA_INPUT';

export const Compliance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ComplianceTab>('DASHBOARD');
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    return (
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155]">Compliance Hub</h1>
                    <p className="text-slate-500 mt-2">Monitor EU ETS exposure, trace green fuels, and manage reporting.</p>
                </div>
                
                {/* Tab Switcher */}
                <div className="bg-white p-1 rounded-lg border border-slate-200 flex">
                    <button 
                        onClick={() => setActiveTab('DASHBOARD')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'DASHBOARD' ? 'bg-[#334155] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('TRACING')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'TRACING' ? 'bg-[#334155] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Fuel Tracing
                    </button>
                    <button 
                        onClick={() => setActiveTab('DATA_INPUT')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'DATA_INPUT' ? 'bg-[#334155] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Data Input
                    </button>
                </div>
            </div>

            {activeTab === 'DASHBOARD' && <ComplianceDashboard onOpenLedger={() => setIsLedgerOpen(true)} />}
            {activeTab === 'TRACING' && <ComplianceTracing />}
            {activeTab === 'DATA_INPUT' && <ComplianceDataInput />}

            {/* Ledger Modal */}
            {isLedgerOpen && <ComplianceLedgerModal onClose={() => setIsLedgerOpen(false)} />}
        </div>
    );
};