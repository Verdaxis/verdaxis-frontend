import React, { useState } from 'react';
import { ViewMode } from '../types';
import { User, Bell, Shield, CreditCard, Sun, Moon, Monitor, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
    viewMode: ViewMode;
}

interface ThemeOptionProps {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing';

const ThemeOption: React.FC<ThemeOptionProps> = ({ label, icon, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
            active 
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-blue-400' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
    >
        <div className="mb-2">{icon}</div>
        <span className="text-xs font-bold">{label}</span>
    </button>
);

const tabConfig: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile & Team', icon: <User size={18} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { key: 'security', label: 'Security', icon: <Shield size={18} /> },
    { key: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
];

export const Settings: React.FC<SettingsProps> = ({ viewMode }) => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    const email = user?.email || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
    const roleLabel = user?.role
        ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
        : '';

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-10">
             <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">System Settings</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">Manage your profile, notifications, and Verdaxis platform preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="v-card overflow-hidden">
                        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible">
                            {tabConfig.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 text-sm transition-colors ${
                                        activeTab === tab.key
                                            ? 'bg-slate-50 dark:bg-slate-700 text-[#334155] dark:text-white border-b-4 lg:border-b-0 lg:border-l-4 border-[#5DADE2] font-bold'
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium border-b-4 lg:border-b-0 border-transparent'
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'profile' && (
                        <>
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">User Profile</h2>
                                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 text-2xl font-bold flex-shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 space-y-4 w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="v-label">First Name</label>
                                                <input type="text" value={firstName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly />
                                            </div>
                                            <div>
                                                <label className="v-label">Last Name</label>
                                                <input type="text" value={lastName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="v-label">Email Address</label>
                                            <input type="email" value={email} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly />
                                        </div>
                                        {roleLabel && (
                                            <div>
                                                <label className="v-label">Role</label>
                                                <div className="inline-flex items-center px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
                                                    {roleLabel}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Preferences</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-[#334155] dark:text-slate-200">Email Notifications</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Receive daily digests of fleet compliance</div>
                                        </div>
                                        <div className="w-10 h-6 bg-[#5DADE2] rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                     <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-[#334155] dark:text-slate-200">Market Alerts</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Notify on &gt;5% price shifts in Methanol</div>
                                        </div>
                                        <div className="w-10 h-6 bg-[#5DADE2] rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-[#334155] dark:text-slate-200">Currency</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Display prices in</div>
                                        </div>
                                        <select className="p-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-[#334155] dark:text-slate-200 bg-transparent">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>CNY (¥)</option>
                                        </select>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">Appearance</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <ThemeOption 
                                                label="Light" 
                                                icon={<Sun size={18} />} 
                                                active={theme === 'light'} 
                                                onClick={() => setTheme('light')} 
                                            />
                                            <ThemeOption 
                                                label="Dark" 
                                                icon={<Moon size={18} />} 
                                                active={theme === 'dark'} 
                                                onClick={() => setTheme('dark')} 
                                            />
                                            <ThemeOption 
                                                label="System" 
                                                icon={<Monitor size={18} />} 
                                                active={theme === 'system'} 
                                                onClick={() => setTheme('system')} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Notification Preferences</h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Bell size={40} className="text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-base font-bold text-slate-500 dark:text-slate-400">Coming Soon</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                                    Notification preferences including email digests, market alerts, and push notifications will be available here.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Security Settings</h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Lock size={40} className="text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-base font-bold text-slate-500 dark:text-slate-400">Coming Soon</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                                    Password management, two-factor authentication, and session controls will be configurable here.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Billing & Subscription</h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <CreditCard size={40} className="text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-base font-bold text-slate-500 dark:text-slate-400">Coming Soon</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                                    Subscription plans, payment methods, and billing history will be managed here.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
