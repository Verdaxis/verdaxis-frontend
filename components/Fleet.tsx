
import React, { useState, useEffect } from 'react';
import { Vessel } from '../types';
import { AlertTriangle, CheckCircle2, Ship, Loader2 } from 'lucide-react';
import { VesselDetailModal } from './fleet/VesselDetailModal';
import { api } from '../services/api';

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

const CIIBadge: React.FC<{ grade: Vessel['ciiGrade'] }> = ({ grade }) => {
    const colors = {
        'A': 'bg-green-500',
        'B': 'bg-[#81C784]',
        'C': 'bg-amber-400',
        'D': 'bg-orange-500',
        'E': 'bg-red-500'
    };

    return (
        <div className={`w-8 h-8 rounded-lg ${colors[grade]} flex items-center justify-center text-white font-bold shadow-sm`}>
            {grade}
        </div>
    );
};

export const Fleet: React.FC = () => {
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);

    useEffect(() => {
        const fetchVessels = async () => {
            try {
                const data = await api.vessels.list();
                setVessels(data);
            } catch (e) {
                console.error("Error fetching fleet", e);
            } finally {
                setLoading(false);
            }
        };
        fetchVessels();
    }, []);

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 size={40} className="animate-spin text-verdaxis" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155]">Fleet Management</h1>
                    <p className="text-slate-500 mt-2">Real-time telemetry and compliance status for your global fleet.</p>
                </div>
                <button className="bg-[#5DADE2] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#4FA3D9] transition-colors flex items-center space-x-2">
                    <Ship size={18} />
                    <span>Add Vessel</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Vessel Details</th>
                                <th className="px-6 py-4">Location & Voyage</th>
                                <th className="px-6 py-4">CII Grade</th>
                                <th className="px-6 py-4">EU ETS Status</th>
                                <th className="px-6 py-4">FuelEU Status</th>
                                <th className="px-6 py-4">Next Dry Dock</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {vessels.map((vessel) => (
                                <tr key={vessel.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <Ship size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#334155] text-base">{vessel.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">IMO: {vessel.imo} • {vessel.vesselType}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-[#334155]">{vessel.status}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{vessel.nextVoyage}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <CIIBadge grade={vessel.ciiGrade} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={vessel.complianceEUETS} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={vessel.complianceFuelEU} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">
                                        {vessel.nextDryDock}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedVessel(vessel)}
                                            className="text-[#5DADE2] hover:text-[#4FA3D9] font-bold text-xs"
                                        >
                                            VIEW DETAILS
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vessel Detail Modal */}
            {selectedVessel && (
                <VesselDetailModal 
                    vessel={selectedVessel} 
                    onClose={() => setSelectedVessel(null)} 
                />
            )}
        </div>
    );
};
