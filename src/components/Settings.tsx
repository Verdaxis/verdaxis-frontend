import React, { useState } from 'react';
import { ViewMode } from '../types';
import { User, Bell, Shield, CreditCard, Sun, Moon, Monitor, Lock, Check, AlertCircle, Key, Eye, EyeOff, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ReferralsTab } from './ReferralsTab';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

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

export const Settings: React.FC<SettingsProps> = ({ viewMode }) => {
    const { theme, setTheme } = useTheme();
    const { user, token, login } = useAuth();
    const { t, ready } = useNamespace('settings');
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [notifPrefs, setNotifPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('verdaxis_notif_prefs');
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return {
            email_trade_updates: true,
            email_market_alerts: true,
            email_compliance_digest: true,
            email_system_announcements: true,
            inapp_trade_updates: true,
            inapp_market_alerts: true,
            inapp_order_matches: true,
        };
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
            setPwMessage({ type: 'error', text: t('security.errorMismatch') });
            return;
        }
        if (newPassword.length < 8) {
            setPwMessage({ type: 'error', text: t('security.errorTooShort') });
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
                setPwMessage({ type: 'success', text: t('security.successMsg') });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const err = await res.json().catch(() => null);
                setPwMessage({ type: 'error', text: err?.detail || t('security.errorGeneric') });
            }
        } catch {
            setPwMessage({ type: 'error', text: t('security.errorNetwork') });
        } finally {
            setPwLoading(false);
        }
    };

    const toggleNotifPref = (key: keyof typeof notifPrefs) => {
        setNotifPrefs((prev: typeof notifPrefs) => {
            const next = { ...prev, [key]: !prev[key] };
            localStorage.setItem('verdaxis_notif_prefs', JSON.stringify(next));
            return next;
        });
    };

    if (!ready) return null;

    const tabConfig: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { key: 'profile', label: t('tabs.profile'), icon: <User size={18} /> },
        { key: 'notifications', label: t('tabs.notifications'), icon: <Bell size={18} /> },
        { key: 'security', label: t('tabs.security'), icon: <Shield size={18} /> },
        { key: 'billing', label: t('tabs.billing'), icon: <CreditCard size={18} /> },
        { key: 'referrals', label: t('tabs.referrals'), icon: <Share2 size={18} /> },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-10">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">{t('title')}</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">{t('subtitle')}</p>
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
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('profile.title')}</h2>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 text-2xl font-bold flex-shrink-0">{initials}</div>
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="v-label">{t('profile.firstName')}</label><input type="text" value={firstName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                        <div><label className="v-label">{t('profile.lastName')}</label><input type="text" value={lastName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    </div>
                                    <div><label className="v-label">{t('profile.email')}</label><input type="email" value={email} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    {roleLabel && (<div><label className="v-label">{t('profile.role')}</label><div className="inline-flex items-center px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">{roleLabel}</div></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('preferences.title')}</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">{t('preferences.emailNotifications')}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t('preferences.emailNotificationsDesc')}</div></div><Toggle enabled={notifPrefs.email_compliance_digest} onToggle={() => toggleNotifPref('email_compliance_digest')} /></div>
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">{t('preferences.marketAlerts')}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t('preferences.marketAlertsDesc')}</div></div><Toggle enabled={notifPrefs.email_market_alerts} onToggle={() => toggleNotifPref('email_market_alerts')} /></div>
                                <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">{t('preferences.currency')}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t('preferences.currencyDesc')}</div></div><select className="p-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-[#334155] dark:text-slate-200 bg-transparent"><option>USD ($)</option><option>EUR</option><option>CNY</option></select></div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('preferences.appearance')}</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ThemeOption label={t('preferences.light')} icon={<Sun size={18} />} active={theme === 'light'} onClick={() => setTheme('light')} />
                                        <ThemeOption label={t('preferences.dark')} icon={<Moon size={18} />} active={theme === 'dark'} onClick={() => setTheme('dark')} />
                                        <ThemeOption label={t('preferences.system')} icon={<Monitor size={18} />} active={theme === 'system'} onClick={() => setTheme('system')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>)}

                    {activeTab === 'notifications' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('notifications.title')}</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('notifications.email.heading')}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.tradeUpdates')}</div><div className="text-xs text-slate-500">{t('notifications.tradeUpdatesDesc.email')}</div></div><Toggle enabled={notifPrefs.email_trade_updates} onToggle={() => toggleNotifPref('email_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.marketAlerts')}</div><div className="text-xs text-slate-500">{t('notifications.marketAlertsDesc.email')}</div></div><Toggle enabled={notifPrefs.email_market_alerts} onToggle={() => toggleNotifPref('email_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.complianceDigest')}</div><div className="text-xs text-slate-500">{t('notifications.complianceDigestDesc')}</div></div><Toggle enabled={notifPrefs.email_compliance_digest} onToggle={() => toggleNotifPref('email_compliance_digest')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.systemAnnouncements')}</div><div className="text-xs text-slate-500">{t('notifications.systemAnnouncementsDesc')}</div></div><Toggle enabled={notifPrefs.email_system_announcements} onToggle={() => toggleNotifPref('email_system_announcements')} /></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('notifications.inapp.heading')}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.tradeUpdates')}</div><div className="text-xs text-slate-500">{t('notifications.tradeUpdatesDesc.inapp')}</div></div><Toggle enabled={notifPrefs.inapp_trade_updates} onToggle={() => toggleNotifPref('inapp_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.marketAlerts')}</div><div className="text-xs text-slate-500">{t('notifications.marketAlertsDesc.inapp')}</div></div><Toggle enabled={notifPrefs.inapp_market_alerts} onToggle={() => toggleNotifPref('inapp_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.orderMatches')}</div><div className="text-xs text-slate-500">{t('notifications.orderMatchesDesc')}</div></div><Toggle enabled={notifPrefs.inapp_order_matches} onToggle={() => toggleNotifPref('inapp_order_matches')} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('security.changePassword')}</h2>
                                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                    {pwMessage && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${pwMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                            {pwMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                            {pwMessage.text}
                                        </div>
                                    )}
                                    <div><label className="v-label">{t('security.currentPassword')}</label><div className="relative"><input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.currentPasswordPlaceholder')} /><button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2 top-2 text-slate-400">{showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label className="v-label">{t('security.newPassword')}</label><div className="relative"><input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.newPasswordPlaceholder')} /><button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2 top-2 text-slate-400">{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label className="v-label">{t('security.confirmPassword')}</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.confirmPasswordPlaceholder')} /></div>
                                    <button type="submit" disabled={pwLoading} className="flex items-center gap-2 px-4 py-2 bg-[#5DADE2] hover:bg-[#4A9BD0] text-white rounded text-sm font-bold transition-colors disabled:opacity-50"><Lock size={14} />{pwLoading ? t('security.changingBtn') : t('security.changeBtn')}</button>
                                </form>
                            </div>
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('security.apiAccess')}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('security.apiAccessDesc')}</p>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"><Key size={18} className="text-slate-400" /><span className="text-sm text-slate-500 dark:text-slate-400">{t('security.apiKeyPending')}</span></div>
                            </div>
                            <div className="v-card p-6">
                                <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('security.twoFactor')}</h2>
                                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800"><Shield size={18} className="text-amber-500" /><span className="text-sm text-amber-700 dark:text-amber-400">{t('security.twoFactorPending')}</span></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('billing.title')}</h2>
                            <div className="space-y-6">
                                {/* Current Plan */}
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{t('billing.currentPlan')}</h3>
                                        <span className="text-xs font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">{t('billing.pilotBadge')}</span>
                                    </div>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('billing.pilotDesc')}</p>
                                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500/60 mt-1">Free during pilot period (first 6 months). Commission: $2/MT on executed trades.</p>
                                </div>

                                {/* Subscription Tiers */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('billing.availablePlans')}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Pilot (current) */}
                                        <div className="p-4 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/5 relative">
                                            <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">CURRENT</span>
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200 mt-1">Pilot</h4>
                                            <p className="text-xs text-slate-500 mt-1">Market intelligence, orderbook access, basic compliance tools</p>
                                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-3">Free</p>
                                            <p className="text-[10px] text-slate-400">+ $2/MT commission on trades</p>
                                        </div>

                                        {/* Professional */}
                                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-[#5DADE2]/30 transition-colors">
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">Professional</h4>
                                            <p className="text-xs text-slate-500 mt-1">Full terminal access, forward curves to 2030, price alerts, S&D analytics</p>
                                            <p className="text-2xl font-bold text-[#5DADE2] mt-3">$500<span className="text-xs font-normal text-slate-500">/seat/month</span></p>
                                            <p className="text-[10px] text-slate-400">+ $1.50/MT commission</p>
                                            <button className="mt-3 w-full py-2 rounded-lg bg-[#5DADE2]/10 text-[#5DADE2] text-xs font-bold hover:bg-[#5DADE2]/20 transition-colors border border-[#5DADE2]/20">
                                                Upgrade
                                            </button>
                                        </div>

                                        {/* Enterprise */}
                                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-500/30 transition-colors">
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">Enterprise</h4>
                                            <p className="text-xs text-slate-500 mt-1">Dedicated account manager, custom API access, OTC brokering, priority matching</p>
                                            <p className="text-2xl font-bold text-amber-500 mt-3">Custom</p>
                                            <p className="text-[10px] text-slate-400">Negotiated commission rates</p>
                                            <button
                                                onClick={() => window.open('mailto:sales@verdaxis.exchange', '_blank')}
                                                className="mt-3 w-full py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                                            >
                                                Contact Sales
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Commission Schedule */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Commission Schedule</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                                    <th className="text-left py-2 pr-4 font-medium">Tier</th>
                                                    <th className="text-right py-2 px-4 font-medium">Rate</th>
                                                    <th className="text-right py-2 pl-4 font-medium">Min. Monthly</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-700 dark:text-slate-300">
                                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 pr-4">Pilot</td>
                                                    <td className="py-2 px-4 text-right font-mono">$2.00/MT</td>
                                                    <td className="py-2 pl-4 text-right font-mono">—</td>
                                                </tr>
                                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 pr-4">Professional</td>
                                                    <td className="py-2 px-4 text-right font-mono">$1.50/MT</td>
                                                    <td className="py-2 pl-4 text-right font-mono">$500</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 pr-4">Enterprise</td>
                                                    <td className="py-2 px-4 text-right font-mono">Negotiated</td>
                                                    <td className="py-2 pl-4 text-right font-mono">Custom</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
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
