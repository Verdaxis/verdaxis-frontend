import React, { useEffect, useState } from 'react';
import { MOCK_REQUESTS } from '../data';
import { QuoteRequest } from '../types';
import { TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react';
import { SystemHealthPanel } from './SystemHealth/SystemHealthPanel';
import { LogViewer } from './SystemHealth/LogViewer';

export const Stats: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'business' | 'system'>('business');
    
    // Filter for completed/confirmed/quoted requests to show history
    const [history, setHistory] = useState<QuoteRequest[]>([]);

    useEffect(() => {
        // Simulate fetching history
        const completed = MOCK_REQUESTS.filter(r => r.status === 'Confirmed' || r.status === 'Quoted');
        setHistory(completed);
    }, []);

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">
                        {activeTab === 'business' ? 'Business Intelligence' : 'System Health'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">
                        {activeTab === 'business' 
                            ? 'Analyze your previous orders and compare performance against market indices.' 
                            : 'Monitor server performance, resource usage, and application logs.'}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                    <button
                        onClick={() => setActiveTab('business')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'business' 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <BarChart2 size={16} />
                        Business
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'system' 
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Activity size={16} />
                        System
                    </button>
                </div>
            </div>

            {activeTab === 'system' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <SystemHealthPanel />
                    <LogViewer />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Volume Lifted</div>
                            <div className="text-3xl font-bold text-[#334155] dark:text-white">3,450 MT</div>
                            <div className="text-xs text-green-600 dark:text-green-400 font-bold mt-1 flex items-center">
                                <TrendingUp size={12} className="mr-1" /> +12% vs last quarter
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Price Performance</div>
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">-1.2%</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Below Market Average (Savings)</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Orders</div>
                            <div className="text-3xl font-bold text-[#334155] dark:text-white">{history.length}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across 4 Ports</div>
                        </div>
                    </div>

                    {/* Order History Table with Market Comparison */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="font-bold text-lg text-[#334155] dark:text-white">Order History & Market Comparison</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-5 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Port</th>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">My Price</th>
                                        <th className="px-6 py-4">Market Avg</th>
                                        <th className="px-6 py-4">Performance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {history.map((req) => {
                                        // Mock comparison logic
                                        const myPrice = req.price ? req.price / req.quantity : 0;
                                        const marketPrice = myPrice * (1 + (Math.random() * 0.05 - 0.025)); // +/- 2.5% diff
                                        const diff = ((myPrice - marketPrice) / marketPrice) * 100;
                                        const isBetter = diff < 0;

                                        return (
                                            <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{req.deliveryDate}</td>
                                                <td className="px-6 py-4 font-mono font-medium text-[#334155] dark:text-slate-200">{req.id}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold uppercase">{req.portId.split('-')[1]}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[#334155] dark:text-slate-200">{req.fuelType}</div>
                                                    <div className="text-xs text-slate-400">{req.quantity} MT</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-[#334155] dark:text-emerald-400">${myPrice.toFixed(0)}</td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">${marketPrice.toFixed(0)}</td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center font-bold text-xs ${isBetter ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isBetter ? <TrendingDown size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
                                                        {Math.abs(diff).toFixed(1)}% {isBetter ? 'Lower' : 'Higher'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">vs Day Index</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
