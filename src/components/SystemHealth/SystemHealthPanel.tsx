import React, { useEffect, useState } from 'react';
import { StatsCard } from './StatsCard';
import { useAuth } from '../../context/AuthContext';
import { Activity, HardDrive, Cpu, Clock, Server } from 'lucide-react';

import { API_URL } from '../../services/config';

interface HealthData {
    status: string;
    uptime_seconds: number;
    cpu_usage_pct: number;
    memory_usage_pct: number;
    disk_free_gb: number;
    disk_used_pct: number;
    platform: string;
}

export const SystemHealthPanel: React.FC = () => {
    const { token } = useAuth(); // Assuming AuthContext provides token
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = async () => {
        try {
            const response = await fetch(`${API_URL}/dashboard/health`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Failed to fetch health data');
            const data = await response.json();
            setHealth(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('System offline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    if (loading && !health) return <div className="p-4 text-slate-400 animate-pulse">Loading system stats...</div>;
    if (error && !health) return <div className="p-4 text-red-400 font-mono border border-red-500/20 rounded-lg bg-red-500/5">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
                <Activity className="text-emerald-500" size={20} />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">System Status</h2>
                {health && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider">
                        {health.status}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard 
                    title="Uptime" 
                    value={health ? formatUptime(health.uptime_seconds) : '-'} 
                    status="success"
                />
                <StatsCard 
                    title="CPU Usage" 
                    value={health ? `${health.cpu_usage_pct}%` : '-'} 
                    status={health && health.cpu_usage_pct > 80 ? 'critical' : health && health.cpu_usage_pct > 50 ? 'warning' : 'normal'}
                    subtitle={`${health?.platform || 'Linux'}`}
                />
                <StatsCard 
                    title="Memory" 
                    value={health ? `${health.memory_usage_pct}%` : '-'} 
                    status={health && health.memory_usage_pct > 80 ? 'critical' : 'normal'}
                />
                <StatsCard 
                    title="Storage Free" 
                    value={health ? `${health.disk_free_gb} GB` : '-'} 
                    subtitle={health ? `${health.disk_used_pct}% Used` : ''}
                    status={health && health.disk_used_pct > 90 ? 'critical' : 'normal'}
                />
            </div>
        </div>
    );
};
