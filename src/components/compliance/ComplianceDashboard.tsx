import React, { useEffect, useState, useCallback } from 'react';
import {
    TrendingUp,
    FileText,
    PieChart,
    Download,
    Loader2,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    Ship,
    Beaker,
    AlertTriangle,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Cell,
} from 'recharts';
import { api } from '../../services/api';

// --- Types matching backend response ---

interface FuelEUData {
    ghg_intensity_gco2_mj: string;
    target_intensity_gco2_mj: string;
    reduction_pct: string;
    compliance_balance_gco2: string;
    estimated_penalty_eur: string;
    score: number;
}

interface EUETSData {
    total_co2_tonnes: string;
    ets_price_per_tonne_eur: string;
    phase_in_pct: string;
    estimated_cost_eur: string;
    score: number;
}

interface CIIData {
    rating: string;
    score: number;
}

interface VesselCompliance {
    vessel_id: string;
    vessel_name: string;
    overall_score: number;
    status: string;
    traffic_light: string;
    fueleu: FuelEUData;
    eu_ets: EUETSData;
    cii: CIIData;
    recommendations: string[];
}

interface FleetCompliance {
    total_vessels: number;
    green_count: number;
    amber_count: number;
    red_count: number;
    average_score: number;
    vessels: VesselCompliance[];
}

interface FuelReference {
    fuels: Record<string, string>;
    unit: string;
    source: string;
}

interface ComplianceDashboardProps {
    onOpenLedger: () => void;
}

// --- Helpers ---

const trafficColor = (light: string): string => {
    if (light === 'GREEN') return '#4CAF50';
    if (light === 'AMBER') return '#FFB020';
    return '#EF4444';
};

const trafficBg = (light: string): string => {
    if (light === 'GREEN') return 'bg-green-100 dark:bg-green-900/30';
    if (light === 'AMBER') return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
};

const trafficText = (light: string): string => {
    if (light === 'GREEN') return 'text-green-700 dark:text-green-400';
    if (light === 'AMBER') return 'text-amber-700 dark:text-amber-400';
    return 'text-red-700 dark:text-red-400';
};

const TrafficIcon: React.FC<{ light: string; size?: number }> = ({ light, size = 16 }) => {
    if (light === 'GREEN') return <ShieldCheck size={size} className="text-green-500" />;
    if (light === 'AMBER') return <ShieldAlert size={size} className="text-amber-500" />;
    return <ShieldX size={size} className="text-red-500" />;
};

const formatEur = (val: string | number): string => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '\u20AC0';
    return new Intl.NumberFormat('en-EU', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(num);
};

const formatNum = (val: string | number, decimals = 1): string => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
};

// --- Component ---

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ onOpenLedger }) => {
    const [fleet, setFleet] = useState<FleetCompliance | null>(null);
    const [fuels, setFuels] = useState<FuelReference | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Scenario state
    const [scenarioVesselId, setScenarioVesselId] = useState<string>('');
    const [scenarioFuelMix, setScenarioFuelMix] = useState<Record<string, string>>({});
    const [scenarioResult, setScenarioResult] = useState<VesselCompliance | null>(null);
    const [scenarioLoading, setScenarioLoading] = useState(false);
    const [scenarioError, setScenarioError] = useState<string | null>(null);

    // Fetch fleet compliance + fuel reference on mount
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [fleetData, fuelData] = await Promise.all([
                    api.compliance.fleet(),
                    api.compliance.fuels(),
                ]);
                if (!cancelled) {
                    setFleet(fleetData);
                    setFuels(fuelData);
                    // Default scenario vessel to first vessel
                    if (fleetData.vessels?.length > 0) {
                        setScenarioVesselId(fleetData.vessels[0].vessel_id);
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load compliance data');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // Run scenario
    const runScenario = useCallback(async () => {
        if (!scenarioVesselId) return;
        // Validate fuel mix sums to ~1.0
        const entries = (Object.entries(scenarioFuelMix) as [string, string][]).filter(([, v]) => parseFloat(v) > 0);
        if (entries.length === 0) {
            setScenarioError('Add at least one fuel to the mix');
            return;
        }
        const total = entries.reduce((sum: number, [, v]: [string, string]) => sum + parseFloat(v), 0);
        if (Math.abs(total - 1.0) > 0.05) {
            setScenarioError(`Fuel fractions must sum to 1.0 (currently ${total.toFixed(2)})`);
            return;
        }

        setScenarioLoading(true);
        setScenarioError(null);
        setScenarioResult(null);
        try {
            const mix: Record<string, string> = {};
            for (const [fuel, frac] of entries as [string, string][]) {
                mix[fuel] = frac;
            }
            const result = await api.compliance.scenario(scenarioVesselId, mix);
            setScenarioResult(result);
        } catch (err: any) {
            setScenarioError(err.message || 'Scenario calculation failed');
        } finally {
            setScenarioLoading(false);
        }
    }, [scenarioVesselId, scenarioFuelMix]);

    // Update a fuel fraction in the scenario mix
    const updateFuelFraction = (fuel: string, value: string) => {
        setScenarioFuelMix(prev => {
            const next = { ...prev };
            if (value === '' || parseFloat(value) <= 0) {
                delete next[fuel];
            } else {
                next[fuel] = value;
            }
            return next;
        });
        setScenarioResult(null);
    };

    // --- Loading state ---
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
                <Loader2 size={40} className="text-[#5DADE2] animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading compliance data...</p>
            </div>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
                <AlertTriangle size={40} className="text-amber-500 mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">Could not load compliance data</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            </div>
        );
    }

    // --- Empty state ---
    if (!fleet || fleet.total_vessels === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
                <Ship size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-bold text-lg mb-1">No Vessels Found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center">
                    No vessels are registered in your fleet. Add vessels to start monitoring compliance.
                </p>
            </div>
        );
    }

    // --- Computed values ---
    const totalETSCost = fleet.vessels.reduce(
        (sum, v) => sum + parseFloat(v.eu_ets.estimated_cost_eur || '0'),
        0,
    );
    const totalCO2 = fleet.vessels.reduce(
        (sum, v) => sum + parseFloat(v.eu_ets.total_co2_tonnes || '0'),
        0,
    );
    const avgEtsPrice = fleet.vessels.length > 0
        ? parseFloat(fleet.vessels[0].eu_ets.ets_price_per_tonne_eur || '68')
        : 68;

    // Bar chart data for FuelEU per-vessel
    const vesselBarData = fleet.vessels.map(v => ({
        name: v.vessel_name.length > 14 ? v.vessel_name.slice(0, 12) + '...' : v.vessel_name,
        fullName: v.vessel_name,
        intensity: parseFloat(v.fueleu.ghg_intensity_gco2_mj),
        target: parseFloat(v.fueleu.target_intensity_gco2_mj),
        score: v.overall_score,
        light: v.traffic_light,
    }));

    const fuelTarget = fleet.vessels.length > 0
        ? parseFloat(fleet.vessels[0].fueleu.target_intensity_gco2_mj)
        : 89.34;

    return (
        <div className="animate-in fade-in duration-300">
            {/* Fleet Summary Banner */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white mb-1">Fleet Compliance Overview</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {fleet.total_vessels} vessel{fleet.total_vessels !== 1 ? 's' : ''} &middot; {new Date().getFullYear()} YTD
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Average Score */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#334155] dark:text-white">{fleet.average_score}</div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Score</div>
                        </div>
                        {/* Traffic light counts */}
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
                                <ShieldCheck size={16} className="text-green-500" />
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">{fleet.green_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                                <ShieldAlert size={16} className="text-amber-500" />
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{fleet.amber_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
                                <ShieldX size={16} className="text-red-500" />
                                <span className="text-sm font-bold text-red-700 dark:text-red-400">{fleet.red_count}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* EU ETS Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white">EU ETS Exposure</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Period: {new Date().getFullYear()} YTD</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-[#5DADE2] dark:text-blue-400">
                            <PieChart size={20} />
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-400">Total Fleet CO2</span>
                            <span className="font-bold text-[#334155] dark:text-white">{formatNum(totalCO2, 0)} tonnes</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-400">EUA Price</span>
                            <span className="font-bold text-[#334155] dark:text-white">{formatEur(avgEtsPrice)}/t</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-400">Estimated Fleet Cost</span>
                            <span className="font-bold text-red-500 dark:text-red-400">{formatEur(totalETSCost)}</span>
                        </div>
                    </div>

                    {/* Per-vessel ETS breakdown */}
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                        {fleet.vessels.map(v => {
                            const cost = parseFloat(v.eu_ets.estimated_cost_eur || '0');
                            const pct = totalETSCost > 0 ? (cost / totalETSCost) * 100 : 0;
                            return (
                                <div key={v.vessel_id} className="flex items-center gap-2 text-xs">
                                    <TrafficIcon light={v.traffic_light} size={14} />
                                    <span className="flex-1 font-medium text-slate-600 dark:text-slate-400 truncate">{v.vessel_name}</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatEur(cost)}</span>
                                    <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#5DADE2] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex space-x-4">
                        <button
                            className="flex-1 bg-[#334155] dark:bg-slate-700 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                            title="Brokerage Integration under construction"
                        >
                            Buy Allowances
                        </button>
                        <button
                            onClick={onOpenLedger}
                            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            View Ledger
                        </button>
                    </div>
                </div>

                {/* FuelEU Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white">FuelEU Fleet Performance</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">GHG Intensity (gCO2eq/MJ) vs Target: {fuelTarget}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-[#4CAF50] dark:text-green-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    {/* Recharts bar chart */}
                    <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={vesselBarData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    domain={[0, 100]}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px',
                                    }}
                                    formatter={(value: number, name: string, props: any) => {
                                        const item = props.payload;
                                        return [
                                            `${value.toFixed(1)} gCO2eq/MJ`,
                                            item.fullName,
                                        ];
                                    }}
                                    labelFormatter={() => ''}
                                />
                                {/* Reference line for target */}
                                <Bar dataKey="intensity" radius={[4, 4, 0, 0]}>
                                    {vesselBarData.map((entry, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={trafficColor(entry.light)}
                                            opacity={0.85}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="w-3 h-0.5 bg-red-400 border-t-2 border-dashed border-red-400" />
                        <span className="text-xs text-red-500 font-medium">Target: {fuelTarget} gCO2eq/MJ</span>
                    </div>
                </div>
            </div>

            {/* Vessel Compliance Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors">
                <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white mb-4">Vessel Scores</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-4 py-3">Vessel</th>
                                <th className="px-4 py-3 text-center">Score</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">CII</th>
                                <th className="px-4 py-3 text-right">FuelEU Intensity</th>
                                <th className="px-4 py-3 text-right">ETS Cost</th>
                                <th className="px-4 py-3">Recommendation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {fleet.vessels.map(v => (
                                <tr key={v.vessel_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-[#334155] dark:text-slate-200">{v.vessel_name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono font-bold text-lg" style={{ color: trafficColor(v.traffic_light) }}>
                                            {v.overall_score}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${trafficBg(v.traffic_light)} ${trafficText(v.traffic_light)}`}>
                                            <TrafficIcon light={v.traffic_light} size={12} />
                                            {v.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                            v.cii.rating <= 'B'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : v.cii.rating === 'C'
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                            {v.cii.rating}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                        {formatNum(v.fueleu.ghg_intensity_gco2_mj)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                        {formatEur(v.eu_ets.estimated_cost_eur)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                        {v.recommendations[0] || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* What-If Scenario Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white">What-If Fuel Scenario</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Model how different fuel mixes affect compliance scores</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-500 dark:text-purple-400">
                        <Beaker size={20} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Inputs */}
                    <div className="space-y-4">
                        {/* Vessel selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Vessel</label>
                            <select
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-[#334155] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DADE2]"
                                value={scenarioVesselId}
                                onChange={e => {
                                    setScenarioVesselId(e.target.value);
                                    setScenarioResult(null);
                                }}
                            >
                                {fleet.vessels.map(v => (
                                    <option key={v.vessel_id} value={v.vessel_id}>{v.vessel_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fuel mix sliders */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Fuel Mix (fractions, sum to 1.0)</label>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {fuels && (Object.entries(fuels.fuels) as [string, string][]).map(([fuel, intensity]) => (
                                    <div key={fuel} className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 truncate" title={fuel}>
                                            {fuel}
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            placeholder="0"
                                            className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono text-center text-[#334155] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DADE2]"
                                            value={scenarioFuelMix[fuel] || ''}
                                            onChange={e => updateFuelFraction(fuel, e.target.value)}
                                        />
                                        <span className="text-[10px] text-slate-400">{intensity} gCO2eq/MJ</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Total: <span className={`font-mono font-bold ${
                                        Math.abs((Object.values(scenarioFuelMix) as string[]).reduce((s: number, v: string) => s + (parseFloat(v) || 0), 0) - 1.0) <= 0.05
                                            ? 'text-green-600'
                                            : 'text-amber-600'
                                    }`}>
                                        {(Object.values(scenarioFuelMix) as string[]).reduce((s: number, v: string) => s + (parseFloat(v) || 0), 0).toFixed(2)}
                                    </span>
                                </span>
                                <button
                                    onClick={runScenario}
                                    disabled={scenarioLoading}
                                    className="px-4 py-2 bg-[#334155] dark:bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {scenarioLoading && <Loader2 size={14} className="animate-spin" />}
                                    Calculate
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div>
                        {scenarioError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                                <p className="text-xs font-medium text-red-700 dark:text-red-400">{scenarioError}</p>
                            </div>
                        )}
                        {scenarioResult ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: `${trafficColor(scenarioResult.traffic_light)}15` }}>
                                    <TrafficIcon light={scenarioResult.traffic_light} size={28} />
                                    <div>
                                        <div className="text-2xl font-bold" style={{ color: trafficColor(scenarioResult.traffic_light) }}>
                                            {scenarioResult.overall_score}
                                        </div>
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {scenarioResult.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">FuelEU</div>
                                        <div className="text-lg font-bold text-[#334155] dark:text-white">{scenarioResult.fueleu.score}</div>
                                        <div className="text-[10px] text-slate-400">{formatNum(scenarioResult.fueleu.ghg_intensity_gco2_mj)} gCO2/MJ</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">EU ETS</div>
                                        <div className="text-lg font-bold text-[#334155] dark:text-white">{scenarioResult.eu_ets.score}</div>
                                        <div className="text-[10px] text-slate-400">{formatEur(scenarioResult.eu_ets.estimated_cost_eur)}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-center">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">CII</div>
                                        <div className="text-lg font-bold text-[#334155] dark:text-white">{scenarioResult.cii.rating}</div>
                                        <div className="text-[10px] text-slate-400">Score: {scenarioResult.cii.score}</div>
                                    </div>
                                </div>

                                {scenarioResult.fueleu.estimated_penalty_eur && parseFloat(scenarioResult.fueleu.estimated_penalty_eur) > 0 && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            Projected FuelEU Penalty: {formatEur(scenarioResult.fueleu.estimated_penalty_eur)}
                                        </p>
                                    </div>
                                )}

                                {scenarioResult.recommendations.length > 0 && (
                                    <div className="space-y-1">
                                        {scenarioResult.recommendations.map((rec, i) => (
                                            <p key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                                                <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                {rec}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                                <Beaker size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Configure a fuel mix and click <strong>Calculate</strong> to see projected compliance scores.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Regulatory Filings (keep existing mock) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-white mb-4">Regulatory Filings</h2>
                <div className="space-y-3">
                    {[
                        { name: 'MRV Report 2025 - Final.pdf', type: 'Submission', date: 'Jan 15, 2026' },
                        { name: 'ETS Surrender Confirmation Q4.pdf', type: 'Receipt', date: 'Dec 31, 2025' },
                        { name: 'FuelEU Compliance Balance Statement.pdf', type: 'Report', date: 'Dec 15, 2025' },
                    ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{doc.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{doc.type} &bull; {doc.date}</div>
                                </div>
                            </div>
                            <button
                                className="text-[#5DADE2] hover:text-[#4FA3D9]"
                                title="Download - Feature under construction"
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
