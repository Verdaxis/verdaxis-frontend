
import React, { useState, useEffect } from 'react';
import { Vessel } from '../types';
import { AlertTriangle, CheckCircle2, Ship, Loader2, X } from 'lucide-react';
import { VesselDetailModal } from './fleet/VesselDetailModal';
import { api } from '../services/api';

interface ComplianceScore {
    vessel_id: string;
    overall_score: number;
    status: string;
    traffic_light: string;
    recommendations: string[];
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

const ComplianceScoreBadge: React.FC<{ score?: ComplianceScore }> = ({ score }) => {
    if (!score) return <span className="text-xs text-slate-400">--</span>;
    const colors = {
        GREEN: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        AMBER: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        RED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    };
    const light = score.traffic_light as keyof typeof colors;
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${colors[light] || colors.AMBER}`}>
            <span className="text-base">{score.overall_score}</span>
            <span className="text-[10px] opacity-70">/ 100</span>
        </div>
    );
};

import { useCopilotContext } from '../context/CopilotContext';

export const Fleet: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [complianceScores, setComplianceScores] = useState<Record<string, ComplianceScore>>({});

    useEffect(() => {
        if (!loading && vessels.length > 0) {
            setPageContext({
                view: 'Fleet Management',
                total_vessels: vessels.length,
                compliant_vessels: vessels.filter(v => v.complianceEUETS === 'Compliant').length,
                non_compliant_vessels: vessels.filter(v => v.complianceEUETS === 'Non-Compliant').length,
                summary: 'Real-time telemetry and compliance status for global fleet.'
            });
        }
    }, [vessels, loading, setPageContext]);

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
        const fetchCompliance = async () => {
            try {
                const data = await api.compliance.fleet();
                const scores: Record<string, ComplianceScore> = {};
                for (const v of data.vessels || []) {
                    scores[v.vessel_id] = v;
                }
                setComplianceScores(scores);
            } catch (e) {
                console.warn("Compliance scores unavailable", e);
            }
        };
        fetchVessels();
        fetchCompliance();
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
                    <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Fleet Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Real-time telemetry and compliance status for your global fleet.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#5DADE2] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#4FA3D9] transition-colors flex items-center space-x-2"
                >
                    <Ship size={18} />
                    <span>Add Vessel</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {vessels.length === 0 ? (
                    <div className="text-center py-16">
                        <Ship className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">No vessels in your fleet</h3>
                        <p className="text-slate-400 dark:text-slate-500 mt-1">Add your first vessel to start tracking compliance.</p>
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4">Vessel Details</th>
                                <th className="px-6 py-4">Location & Voyage</th>
                                <th className="px-6 py-4">CII Grade</th>
                                <th className="px-6 py-4">EU ETS Status</th>
                                <th className="px-6 py-4">FuelEU Status</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Next Dry Dock</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {vessels.map((vessel) => (
                                <tr key={vessel.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-300">
                                                <Ship size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#334155] dark:text-white text-base">{vessel.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">IMO: {vessel.imo} • {vessel.vesselType}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-[#334155] dark:text-white">{vessel.status}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{vessel.nextVoyage}</div>
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
                                    <td className="px-6 py-4">
                                        <ComplianceScoreBadge score={complianceScores[vessel.id]} />
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
                )}
            </div>

            {/* Vessel Detail Modal */}
            {selectedVessel && (
                <VesselDetailModal 
                    vessel={selectedVessel} 
                    onClose={() => setSelectedVessel(null)} 
                />
            )}

            {/* Add Vessel Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onKeyDown={(e) => e.stopPropagation()}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Add New Vessel</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vessel Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MV Pacific Voyager"
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">IMO Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 9876543"
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vessel Type</label>
                                <select className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white">
                                    <option value="">Select type...</option>
                                    <option value="Bulk Carrier">Bulk Carrier</option>
                                    <option value="Container Ship">Container Ship</option>
                                    <option value="Tanker">Tanker</option>
                                    <option value="General Cargo">General Cargo</option>
                                    <option value="RoRo">RoRo</option>
                                </select>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    Vessel management is under active development. Adding vessels will be fully functional in an upcoming release.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 text-sm"
                            >
                                Cancel
                            </button>
                            <div className="flex flex-col items-end">
                                <button
                                    type="button"
                                    disabled
                                    className="px-4 py-2 bg-[#5DADE2] text-white font-bold rounded-lg shadow-sm text-sm opacity-50 cursor-not-allowed"
                                >
                                    Save Vessel
                                </button>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">Vessel registration coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
