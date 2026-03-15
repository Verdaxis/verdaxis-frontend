import React, { useState } from 'react';
import { ViewMode } from '../types';
import { User, Bell, Shield, CreditCard, Sun, Moon, Monitor, Lock, Check, AlertCircle, Key, Eye, EyeOff, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ReferralsTab } from './ReferralsTab';
import { API_URL } from '../services/config';

interface SettingsProps {
    viewMode: ViewMode;
}

interface ThemeOptionProps {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing' | 'referrals';

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

interface ToggleProps {
    enabled: boolean;
    onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle }) => (
    <button
        onClick={onToggle}
        className={`w-10 h-6 rounded-full relative transition-colors ${
            enabled ? 'bg-[#5DADE2]' : 'bg-slate-300 dark:bg-slate-600'
        }`}
    >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            enabled ? 'right-1' : 'left-1'
        }`} />
    </button>
);

const tabConfig: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile & Team', icon: <User size={18} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { key: 'security', label: 'Security', icon: <Shield size={18} /> },
    { key: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
    { key: 'referrals', label: 'Referrals', icon: <Share2 size={18} /> },
];

export const Settings: React.FC<SettingsProps> = ({ viewMode }) => {
    const { theme, setTheme } = useTheme();
    const { user, token, login } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [notifPrefs, setNotifPrefs] = useState({
        email_trade_updates: true,
        email_market_alerts: true,
        email_compliance_digest: true,
        email_system_announcements: true,
        inapp_trade_updates: true,
        inapp_market_alerts: true,
        inapp_order_matches: true,
    });

    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    const email = user?.email || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
    const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : '';

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMessage(null);
        if (newPassword !== confirmPassword) {
            setPwMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }
        setPwLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/me/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access_token) await login(data.access_token, data.refresh_token);
                setPwMessage({ type: 'success', text: 'Password changed successfully.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const err = await res.json().catch(() => null);
                setPwMessage({ type: 'error', text: err?.detail || 'Failed to change password.' });
            }
        } catch {
            setPwMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setPwLoading(false);
        }
    };

    const toggleNotifPref = (key: keyof typeof notifPrefs) => {
        setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-10">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">System Settings</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">Manage your profile, notifications, and Verdaxis platform preferences.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-1">
                    <div className="v-card overflow-hidden p-2">
                        <div className="relative flex flex-row lg:flex-col bg-white/30 dark:bg-slate-800/30 rounded-lg p-0.5 backdrop-blur-sm border border-white/20 dark:border-slate-700/40">
                            {/* Sliding glass indicator */}
                            <div
                                className="absolute rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out hidden lg:block"
                                style={{
                                    top: `calc(${tabConfig.findIndex(t => t.key === activeTab) * (100 / tabConfig.length)}% + 2px)`,
                                    height: `calc(${100 / tabConfig.length}% - 4px)`,
                                    left: '2px',
                                    right: '2px',
                                }}
                            />
                            {/* Horizontal sliding indicator (mobile) */}
                            <div
                                className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out lg:hidden"
                                style={{
                                    left: `calc(${tabConfig.findIndex(t => t.key === activeTab) * (100 / tabConfig.length)}% + 2px)`,
                                    width: `calc(${100 / tabConfig.length}% - 4px)`,
                                }}
                            />
                            {tabConfig.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative z-10 flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        activeTab === tab.key
                                            ? 'text-slate-900 dark:text-white'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {tab.icon}
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'profile' && (<>
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">User Profile</h2>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 text-2xl font-bold flex-shrink-0">{initials}</div>
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="v-label">First Name</label><input type="text" value={firstName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                        <div><label className="v-label">Last Name</label><input type="text" value={lastName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    </div>
                                    <div><label className="v-label">Email Address</label><input type="email" value={email} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    {roleLabel && (<div><label className="v-label">Role</label><div className="inline-flex items-center px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">{roleLabel}</div></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Preferences</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">Email Notifications</div><div className="text-xs text-slate-500 dark:text-slate-400">Receive daily digests of fleet compliance</div></div><Toggle enabled={notifPrefs.email_compliance_digest} onToggle={() => toggleNotifPref('email_compliance_digest')} /></div>
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">Market Alerts</div><div className="text-xs text-slate-500 dark:text-slate-400">Notify on &gt;5% price shifts</div></div><Toggle enabled={notifPrefs.email_market_alerts} onToggle={() => toggleNotifPref('email_market_alerts')} /></div>
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">Currency</div><div className="text-xs text-slate-500 dark:text-slate-400">Display prices in</div></div><select className="p-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-[#334155] dark:text-slate-200 bg-transparent"><option>USD ($)</option><option>EUR</option><option>CNY</option></select></div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">Appearance</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ThemeOption label="Light" icon={<Sun size={18} />} active={theme === 'light'} onClick={() => setTheme('light')} />
                                        <ThemeOption label="Dark" icon={<Moon size={18} />} active={theme === 'dark'} onClick={() => setTheme('dark')} />
                                        <ThemeOption label="System" icon={<Monitor size={18} />} active={theme === 'system'} onClick={() => setTheme('system')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>)}

                    {activeTab === 'notifications' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Notification Preferences</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">Email Notifications</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Trade Updates</div><div className="text-xs text-slate-500">New trades, confirmations, deliveries, payments</div></div><Toggle enabled={notifPrefs.email_trade_updates} onToggle={() => toggleNotifPref('email_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Market Alerts</div><div className="text-xs text-slate-500">Price movements, new listings matching your criteria</div></div><Toggle enabled={notifPrefs.email_market_alerts} onToggle={() => toggleNotifPref('email_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Compliance Digest</div><div className="text-xs text-slate-500">Weekly compliance status summary</div></div><Toggle enabled={notifPrefs.email_compliance_digest} onToggle={() => toggleNotifPref('email_compliance_digest')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">System Announcements</div><div className="text-xs text-slate-500">Platform updates, maintenance, new features</div></div><Toggle enabled={notifPrefs.email_system_announcements} onToggle={() => toggleNotifPref('email_system_announcements')} /></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">In-App Notifications</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Trade Updates</div><div className="text-xs text-slate-500">Real-time trade lifecycle notifications</div></div><Toggle enabled={notifPrefs.inapp_trade_updates} onToggle={() => toggleNotifPref('inapp_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Market Alerts</div><div className="text-xs text-slate-500">Price movements and market activity</div></div><Toggle enabled={notifPrefs.inapp_market_alerts} onToggle={() => toggleNotifPref('inapp_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Order Matches</div><div className="text-xs text-slate-500">Auto-matched orders and match suggestions</div></div><Toggle enabled={notifPrefs.inapp_order_matches} onToggle={() => toggleNotifPref('inapp_order_matches')} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Change Password</h2>
                                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                    {pwMessage && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${pwMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                            {pwMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                            {pwMessage.text}
                                        </div>
                                    )}
                                    <div><label className="v-label">Current Password</label><div className="relative"><input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder="Enter current password" /><button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2 top-2 text-slate-400">{showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label className="v-label">New Password</label><div className="relative"><input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder="Minimum 8 characters" /><button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2 top-2 text-slate-400">{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label className="v-label">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder="Re-enter new password" /></div>
                                    <button type="submit" disabled={pwLoading} className="flex items-center gap-2 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD0] text-white rounded text-sm font-bold transition-colors disabled:opacity-50"><Lock size={14} />{pwLoading ? 'Changing...' : 'Change Password'}</button>
                                </form>
                            </div>
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">API Access</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Generate API keys for programmatic access to the Verdaxis trading platform.</p>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"><Key size={18} className="text-slate-400" /><span className="text-sm text-slate-500 dark:text-slate-400">API key management will be available with the Verdaxis Terminal subscription.</span></div>
                            </div>
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Two-Factor Authentication</h2>
                                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800"><Shield size={18} className="text-amber-500" /><span className="text-sm text-amber-700 dark:text-amber-400">2FA is recommended for all trading accounts. Coming soon.</span></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Billing & Subscription</h2>
                            <div className="space-y-6">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Current Plan</h3><span className="text-xs font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">PILOT</span></div>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400">You are on the Verdaxis Pilot program. Full marketplace access with 0.5% transaction fees.</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">Available Plans</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"><h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">Compliance Pro</h4><p className="text-xs text-slate-500 mt-1">Full compliance dashboard, automated reporting, FuelEU & EU ETS tracking</p><p className="text-lg font-bold text-[#5DADE2] mt-2">$200<span className="text-xs font-normal text-slate-500">/vessel/month</span></p></div>
                                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"><h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">Verdaxis Terminal</h4><p className="text-xs text-slate-500 mt-1">Bloomberg-style data terminal, API access, advanced analytics</p><p className="text-lg font-bold text-[#5DADE2] mt-2">$1,000<span className="text-xs font-normal text-slate-500">/seat/month</span></p></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-3">Contact sales@verdaxis.exchange for Enterprise pricing.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'referrals' && <ReferralsTab />}
                </div>
            </div>
        </div>
    );
};
