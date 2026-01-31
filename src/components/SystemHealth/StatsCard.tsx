import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    status?: 'normal' | 'warning' | 'critical' | 'success';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, status = 'normal' }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'success': return 'text-emerald-500';
            case 'warning': return 'text-amber-500';
            case 'critical': return 'text-red-500';
            default: return 'text-slate-700 dark:text-slate-200';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50 dark:hover:bg-slate-750">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
            <div className={`text-3xl font-bold font-mono ${getStatusColor()}`}>
                {value}
            </div>
            {subtitle && (
                <div className="text-xs text-slate-400 mt-2 font-medium">
                    {subtitle}
                </div>
            )}
        </div>
    );
};
