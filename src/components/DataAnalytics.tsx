import React, { useMemo, useState, useEffect } from 'react';
import { Database, TrendingUp, Ship, Factory, Lock, BarChart3 } from 'lucide-react';
import { producerProjects, fuelTypeColors } from '../data/producerProjects';
import { api } from '../services/api';
import { Subscription } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNamespace } from '../hooks/useNamespace';

// Fallback demand data (used while API loads)
const DEMAND_FLEET_FALLBACK = [
    { fuel: 'Methanol', orderedVessels: 323, deliveredVessels: 112, avgConsumptionMt: 9500, color: '#5DADE2' },
    { fuel: 'Biofuel', orderedVessels: 20, deliveredVessels: 11, avgConsumptionMt: 6800, color: '#4CAF50' },
    { fuel: 'Ammonia', orderedVessels: 45, deliveredVessels: 2, avgConsumptionMt: 12000, color: '#9C27B0' },
    { fuel: 'Ethanol', orderedVessels: 8, deliveredVessels: 2, avgConsumptionMt: 7200, color: '#FF9800' },
    { fuel: 'Biomethane', orderedVessels: 12, deliveredVessels: 5, avgConsumptionMt: 6500, color: '#26A69A' },
];

interface FleetEntry { fuel: string; orderedVessels: number; deliveredVessels: number; avgConsumptionMt: number; color: string }

const translationKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const CANONICAL_TRADED_PRODUCTS = new Set([
    'Bio Methanol',
    'E-Methanol',
    'e-Methanol',
    'Bio Ethanol',
    'e-Ethanol',
]);

export const DataAnalytics: React.FC = () => {
    const { user } = useAuth();
    const { t, ready } = useNamespace('dashboard');
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [demandFleet, setDemandFleet] = useState<FleetEntry[]>(DEMAND_FLEET_FALLBACK);
    const [fleetSources, setFleetSources] = useState<string[]>([]);
    const [fleetLastUpdated, setFleetLastUpdated] = useState<string>('');

    useEffect(() => {
        if (user?.role !== 'ADMIN') {
            api.subscriptions.me()
                .then(setSubscription)
                .catch(() => setSubscription({ id: '', org_id: '', tier: 'free', is_active: true }));
        }

        // Fetch live fleet demand data
        api.fleetIntelligence.get()
            .then(data => {
                setDemandFleet(data.entries.map(e => ({
                    fuel: e.fuel,
                    orderedVessels: e.ordered_vessels,
                    deliveredVessels: e.delivered_vessels,
                    avgConsumptionMt: e.avg_consumption_mt,
                    color: e.color,
                })));
                setFleetSources(data.sources);
                setFleetLastUpdated(data.last_updated);
            })
            .catch(() => { /* keep fallback */ });
    }, [user?.role]);
    const hasPremiumAccess = user?.role === 'ADMIN' || !!(subscription && subscription.tier !== 'free');
    const DEMAND_FLEET = demandFleet;
    const supplyByStatus = useMemo(() => {
        const map: Record<string, { count: number; capacity: number }> = {};
        for (const p of producerProjects) {
            const s = p.status;
            if (!map[s]) map[s] = { count: 0, capacity: 0 };
            map[s].count++;
            map[s].capacity += p.capacityKtpa;
        }
        return map;
    }, []);

    const supplyByFuel = useMemo(() => {
        const map: Record<string, { count: number; capacity: number }> = {};
        for (const p of producerProjects) {
            const f = p.fuelType;
            if (!map[f]) map[f] = { count: 0, capacity: 0 };
            map[f].count++;
            map[f].capacity += p.capacityKtpa;
        }
        return map;
    }, []);

    const totalCapacity = producerProjects.reduce((s, p) => s + p.capacityKtpa, 0);
    const operationalCapacity = (supplyByStatus['Operational']?.capacity ?? 0);
    const pipelineCapacity = totalCapacity - operationalCapacity;
    const totalOrderedVessels = DEMAND_FLEET.reduce((s, d) => s + d.orderedVessels, 0);
    const totalDelivered = DEMAND_FLEET.reduce((s, d) => s + d.deliveredVessels, 0);
    const estDemandMt = DEMAND_FLEET.reduce((s, d) => s + d.deliveredVessels * d.avgConsumptionMt, 0);

    const maxOrdered = Math.max(...DEMAND_FLEET.map(d => d.orderedVessels));

    if (!ready) return null;

    const fuelLabel = (fuel: string) => CANONICAL_TRADED_PRODUCTS.has(fuel)
        ? fuel
        : t(`dataAnalytics.fuels.${translationKey(fuel)}`, { defaultValue: t('dataAnalytics.fuels.other') });
    const statusLabel = (status: string) => t(`dataAnalytics.status.${translationKey(status)}`, { defaultValue: t('dataAnalytics.status.unknown') });
    const countryLabel = (country: string) => t(`countries.${translationKey(country)}`, { defaultValue: t('countries.unknown') });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-['Montserrat'] flex items-center gap-2">
                    <Database size={20} className="text-verdaxis" />
                    {t('dataAnalytics.title')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {t('dataAnalytics.subtitle')}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4 shadow-sm dark:shadow-none">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('dataAnalytics.kpi.projectsTracked')}</div>
                    <div className="text-2xl font-bold text-verdaxis">{producerProjects.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4 shadow-sm dark:shadow-none">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('dataAnalytics.kpi.operational')}</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{operationalCapacity.toLocaleString()} <span className="text-sm font-normal text-slate-500">ktpa</span></div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4 shadow-sm dark:shadow-none">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('dataAnalytics.kpi.pipeline')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pipelineCapacity.toLocaleString()} <span className="text-sm font-normal text-slate-500">ktpa</span></div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4 shadow-sm dark:shadow-none">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('dataAnalytics.kpi.dualFuelOrders')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrderedVessels} <span className="text-sm font-normal text-slate-500">{t('dataAnalytics.vessels')}</span></div>
                </div>
            </div>

            {/* Detailed data — blurred for free tier with paywall overlay */}
            <div className="relative">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6${hasPremiumAccess ? '' : ' select-none pointer-events-none'}`} style={hasPremiumAccess ? undefined : { filter: 'blur(4px)' }}>
                {/* Supply: Producer Pipeline */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden shadow-sm dark:shadow-none">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                        <Factory size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('dataAnalytics.supply.title')}</span>
                        <span className="ml-auto text-xs text-slate-500">{t('dataAnalytics.projectsCount', { count: producerProjects.length })}</span>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                                <tr className="border-b border-slate-200 dark:border-slate-700/50 text-slate-500">
                                    <th className="text-left pl-4 pr-2 py-2 font-medium">{t('dataAnalytics.table.project')}</th>
                                    <th className="text-left px-2 py-2 font-medium">{t('dataAnalytics.table.fuel')}</th>
                                    <th className="text-left px-2 py-2 font-medium">{t('dataAnalytics.table.country')}</th>
                                    <th className="text-right px-2 py-2 font-medium">{t('dataAnalytics.table.capacity')}</th>
                                    <th className="text-left px-2 pr-4 py-2 font-medium">{t('dataAnalytics.table.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {producerProjects.slice(0, 25).map((p) => {
                                    const statusColor =
                                        p.status === 'Operational' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/30' :
                                        p.status === 'Under Construction' ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/30' :
                                        p.status === 'Engineering' ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/30' :
                                        'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/30';
                                    return (
                                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="pl-4 pr-2 py-2 text-slate-700 dark:text-slate-300">{p.name}</td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: fuelTypeColors[p.fuelType] || '#888' }} />
                                                <span className="text-slate-600 dark:text-slate-400">{fuelLabel(p.fuelType)}</span>
                                            </td>
                                            <td className="px-2 py-2 text-slate-500">{countryLabel(p.country)}</td>
                                            <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300 font-mono">{p.capacityKtpa}</td>
                                            <td className="px-2 pr-4 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                                                    {statusLabel(p.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Capacity by fuel summary */}
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">{t('dataAnalytics.supply.capacityByFuel')}</div>
                        <div className="space-y-1.5">
                            {Object.entries(supplyByFuel).map(([fuel, data]) => (
                                <div key={fuel} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">{fuelLabel(fuel)}</span>
                                    <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{data.capacity.toLocaleString()} ktpa ({data.count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Demand: Fleet Intelligence */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden shadow-sm dark:shadow-none">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                        <Ship size={14} className="text-amber-500 dark:text-amber-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('dataAnalytics.demand.title')}</span>
                        <span className="ml-auto text-xs text-slate-500">{t('dataAnalytics.deliveredCount', { delivered: totalDelivered, ordered: totalOrderedVessels })}</span>
                    </div>
                    <div className="p-4 space-y-4">
                        {DEMAND_FLEET.map((d) => {
                            const estDemand = d.deliveredVessels * d.avgConsumptionMt;
                            return (
                                <div key={d.fuel}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{fuelLabel(d.fuel)}</span>
                                        <span className="text-xs text-slate-500">
                                            {t('dataAnalytics.deliveredCount', { delivered: d.deliveredVessels, ordered: d.orderedVessels })}
                                        </span>
                                    </div>
                                    <div className="w-full h-5 rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden flex">
                                        <div
                                            className="h-full transition-all"
                                            style={{ width: `${(d.deliveredVessels / maxOrdered) * 100}%`, backgroundColor: d.color, opacity: 0.8 }}
                                        />
                                        <div
                                            className="h-full transition-all"
                                            style={{ width: `${((d.orderedVessels - d.deliveredVessels) / maxOrdered) * 100}%`, backgroundColor: d.color, opacity: 0.25 }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-slate-500">
                                            {t('dataAnalytics.demand.averageConsumption', { amount: d.avgConsumptionMt.toLocaleString() })}
                                        </span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                            {estDemand > 0
                                                ? t('dataAnalytics.demand.estimatedDemand', { amount: `${(estDemand / 1000).toFixed(0)}k MT/yr` })
                                                : t('dataAnalytics.demand.pendingDeliveries')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* S&D Balance */}
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                            <TrendingUp size={10} className="inline mr-1" />
                            {t('dataAnalytics.balance.title')}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded">
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{operationalCapacity.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500">{t('dataAnalytics.balance.producing')}</div>
                            </div>
                            <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded">
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{(estDemandMt / 1000).toFixed(0)}k</div>
                                <div className="text-[10px] text-slate-500">{t('dataAnalytics.balance.estimatedDemand')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Paywall overlay — only shown for free tier */}
            {!hasPremiumAccess && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="p-6 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-verdaxis/30 shadow-xl text-center max-w-sm">
                    <Lock size={24} className="mx-auto mb-3 text-verdaxis" />
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {t('dataAnalytics.paywall.title')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        {t('dataAnalytics.paywall.body')}
                    </p>
                    <button className="px-5 py-2 bg-verdaxis hover:bg-verdaxis/90 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                        {t('dataAnalytics.paywall.cta')}
                    </button>
                </div>
            </div>
            )}
            </div>
        </div>
    );
};
