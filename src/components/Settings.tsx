import React, { useEffect, useState } from 'react';
import { FeeSchedule, Subscription, ViewMode } from '../types';
import { User, Bell, Shield, CreditCard, Sun, Moon, Monitor, Lock, Check, AlertCircle, Key, Eye, EyeOff, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ReferralsTab } from './ReferralsTab';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
import { useServerPreference } from '../hooks/useServerPreference';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

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
const NOTIFICATION_PREFS_KEY = 'verdaxis_notif_prefs';
const NOTIFICATION_PREF_KEYS = [
    'email_trade_updates',
    'email_market_alerts',
    'email_compliance_digest',
    'email_system_announcements',
    'inapp_trade_updates',
    'inapp_market_alerts',
    'inapp_order_matches',
] as const;

type NotificationPreferenceKey = typeof NOTIFICATION_PREF_KEYS[number];
type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
    email_trade_updates: true,
    email_market_alerts: true,
    email_compliance_digest: true,
    email_system_announcements: true,
    inapp_trade_updates: true,
    inapp_market_alerts: true,
    inapp_order_matches: true,
};

type BillingState = 'idle' | 'loading' | 'ready' | 'error';

const formatSellerRate = (rate: string | number | null | undefined): string | null => {
    if (rate === null || rate === undefined || rate === '') return null;
    const numericRate = Number(rate);
    return Number.isFinite(numericRate) && numericRate >= 0 ? `$${numericRate.toFixed(2)}/MT` : null;
};

const isCurrentSubscription = (subscription: Subscription): boolean => {
    if (!subscription.is_active) return false;
    if (!subscription.expires_at) return true;
    const expiresAt = Date.parse(subscription.expires_at);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

const sanitizeNotificationPreferences = (raw: unknown): NotificationPreferences | null => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    if (!NOTIFICATION_PREF_KEYS.every(key => typeof record[key] === 'boolean')) return null;

    return NOTIFICATION_PREF_KEYS.reduce<NotificationPreferences>((prefs, key) => ({
        ...prefs,
        [key]: record[key] === true,
    }), { ...DEFAULT_NOTIFICATION_PREFS });
};

const ThemeOption: React.FC<ThemeOptionProps> = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        aria-pressed={active}
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
    label: string;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle, label }) => (
    <button
        onClick={onToggle}
        aria-label={label}
        aria-pressed={enabled}
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
    useDashboardContentReady('SETTINGS', ready);
    const { i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [notifPrefs, setNotifPrefs] = useServerPreference<NotificationPreferences>(
        'notifications',
        NOTIFICATION_PREFS_KEY,
        sanitizeNotificationPreferences,
        DEFAULT_NOTIFICATION_PREFS,
    );
    const [billingState, setBillingState] = useState<BillingState>('idle');
    const [feeSchedule, setFeeSchedule] = useState<FeeSchedule | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);

    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    const email = user?.email || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
    const roleLabel = user?.role ? t(`profile.role${user.role.charAt(0)}${user.role.slice(1).toLowerCase()}`, { defaultValue: user.role }) : '';

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
                if (data.access_token) await login(data.access_token);
                setPwMessage({ type: 'success', text: t('security.successMsg') });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const err = await res.json().catch(() => null);
                console.error('Failed to change password', err);
                const detail = typeof err?.detail === 'string' ? err.detail : '';
                setPwMessage({
                    type: 'error',
                    text: detail === 'Current password is incorrect'
                        ? t('security.errorCurrentPassword')
                        : i18n.resolvedLanguage?.startsWith('zh') ? t('security.errorGeneric') : detail || t('security.errorGeneric'),
                });
            }
        } catch (error) {
            console.error('Password change network error', error);
            setPwMessage({ type: 'error', text: t('security.errorNetwork') });
        } finally {
            setPwLoading(false);
        }
    };

    const toggleNotifPref = (key: NotificationPreferenceKey) => {
        setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const loadBilling = (force = false) => {
        setBillingState('loading');
        Promise.all([
            api.subscriptions.fees(force ? { force: true } : undefined),
            api.subscriptions.me(force ? { force: true } : undefined),
        ]).then(([fees, currentSubscription]) => {
            setFeeSchedule(fees);
            setSubscription(currentSubscription);
            setBillingState('ready');
        }).catch(() => {
            setBillingState('error');
        });
    };

    useEffect(() => {
        if (activeTab === 'billing' && billingState === 'idle') loadBilling();
    }, [activeTab, billingState]);

    const currentTier: Subscription['tier'] = subscription && isCurrentSubscription(subscription) ? subscription.tier : 'free';
    const tierName = t(`billing.${currentTier === 'free' ? 'pilotName' : currentTier === 'standard' ? 'professional' : 'enterprise'}`);
    const currentRate = subscription && feeSchedule
        ? currentTier === 'enterprise'
            ? formatSellerRate(subscription.seller_fee_per_mt_usd)
            : formatSellerRate(feeSchedule.seller_fee_per_mt_usd[currentTier])
        : null;
    const pilotRate = feeSchedule ? formatSellerRate(feeSchedule.seller_fee_per_mt_usd.free) : null;
    const professionalRate = feeSchedule ? formatSellerRate(feeSchedule.seller_fee_per_mt_usd.standard) : null;
    const enterpriseRate = currentTier === 'enterprise' && subscription
        ? formatSellerRate(subscription.seller_fee_per_mt_usd)
        : null;

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
                                    aria-label={tab.label}
                                    aria-pressed={activeTab === tab.key}
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
                                        <div><label htmlFor="settings-first-name" className="v-label">{t('profile.firstName')}</label><input id="settings-first-name" type="text" value={firstName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                        <div><label htmlFor="settings-last-name" className="v-label">{t('profile.lastName')}</label><input id="settings-last-name" type="text" value={lastName} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    </div>
                                    <div><label htmlFor="settings-email" className="v-label">{t('profile.email')}</label><input id="settings-email" type="email" value={email} className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-sm font-medium dark:text-white" readOnly /></div>
                                    {roleLabel && (<div><p className="v-label">{t('profile.role')}</p><div className="inline-flex items-center px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold">{roleLabel}</div></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="v-card p-6">
                            <h2 className="text-lg v-heading mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{t('preferences.title')}</h2>
                            <div className="space-y-4">
                                <button onClick={() => setActiveTab('notifications')} className="text-sm font-bold text-blue-600 dark:text-blue-400 underline underline-offset-4">{t('notifications.title')}</button>
                                <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-bold text-[#334155] dark:text-slate-200">{t('preferences.currency')}</div><div className="text-xs text-slate-500 dark:text-slate-400">{t('preferences.currencyDesc')}</div></div><span className="text-sm font-bold text-[#334155] dark:text-slate-200 whitespace-nowrap">USD ($)</span></div>
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
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.tradeUpdates')}</div><div className="text-xs text-slate-500">{t('notifications.tradeUpdatesDesc.email')}</div></div><Toggle label={t('notifications.tradeUpdates')} enabled={notifPrefs.email_trade_updates} onToggle={() => toggleNotifPref('email_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.marketAlerts')}</div><div className="text-xs text-slate-500">{t('notifications.marketAlertsDesc.email')}</div></div><Toggle label={t('notifications.marketAlerts')} enabled={notifPrefs.email_market_alerts} onToggle={() => toggleNotifPref('email_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.complianceDigest')}</div><div className="text-xs text-slate-500">{t('notifications.complianceDigestDesc')}</div></div><Toggle label={t('notifications.complianceDigest')} enabled={notifPrefs.email_compliance_digest} onToggle={() => toggleNotifPref('email_compliance_digest')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.systemAnnouncements')}</div><div className="text-xs text-slate-500">{t('notifications.systemAnnouncementsDesc')}</div></div><Toggle label={t('notifications.systemAnnouncements')} enabled={notifPrefs.email_system_announcements} onToggle={() => toggleNotifPref('email_system_announcements')} /></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('notifications.inapp.heading')}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.tradeUpdates')}</div><div className="text-xs text-slate-500">{t('notifications.tradeUpdatesDesc.inapp')}</div></div><Toggle label={t('notifications.tradeUpdates')} enabled={notifPrefs.inapp_trade_updates} onToggle={() => toggleNotifPref('inapp_trade_updates')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.marketAlerts')}</div><div className="text-xs text-slate-500">{t('notifications.marketAlertsDesc.inapp')}</div></div><Toggle label={t('notifications.marketAlerts')} enabled={notifPrefs.inapp_market_alerts} onToggle={() => toggleNotifPref('inapp_market_alerts')} /></div>
                                        <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('notifications.orderMatches')}</div><div className="text-xs text-slate-500">{t('notifications.orderMatchesDesc')}</div></div><Toggle label={t('notifications.orderMatches')} enabled={notifPrefs.inapp_order_matches} onToggle={() => toggleNotifPref('inapp_order_matches')} /></div>
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
                                        <div role={pwMessage.type === 'success' ? 'status' : 'alert'} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${pwMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                            {pwMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                            {pwMessage.text}
                                        </div>
                                    )}
                                    <div><label htmlFor="settings-current-password" className="v-label">{t('security.currentPassword')}</label><div className="relative"><input id="settings-current-password" autoComplete="current-password" type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.currentPasswordPlaceholder')} /><button type="button" aria-label={t(showCurrentPw ? 'security.hidePassword' : 'security.showPassword')} onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2 top-2 text-slate-400">{showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label htmlFor="settings-new-password" className="v-label">{t('security.newPassword')}</label><div className="relative"><input id="settings-new-password" autoComplete="new-password" type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full p-2 pr-10 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.newPasswordPlaceholder')} /><button type="button" aria-label={t(showNewPw ? 'security.hidePassword' : 'security.showPassword')} onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2 top-2 text-slate-400">{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                    <div><label htmlFor="settings-confirm-password" className="v-label">{t('security.confirmPassword')}</label><input id="settings-confirm-password" autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm dark:text-white" placeholder={t('security.confirmPasswordPlaceholder')} /></div>
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
                            {billingState === 'loading' && (
                                <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{t('billing.loading')}</p>
                            )}
                            {billingState === 'error' && (
                                <div role="alert" className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/10 dark:text-rose-300">
                                    <p>{t('billing.loadError')}</p>
                                    <button type="button" onClick={() => loadBilling(true)} className="rounded border border-rose-300 px-3 py-1.5 text-xs font-bold hover:bg-rose-100 dark:border-rose-700 dark:hover:bg-rose-900/30">{t('billing.retry')}</button>
                                </div>
                            )}
                            {billingState === 'ready' && feeSchedule && subscription && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{t('billing.currentPlan')}</h3>
                                            <span className="text-xs font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">{tierName}</span>
                                        </div>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('billing.currentPlanDesc', { plan: tierName })}</p>
                                        <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">{t('billing.currentSellerRate', { rate: currentRate || t('billing.rateUnavailable') })}</p>
                                    </div>

                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-300">
                                        <p className="font-bold">{t('billing.buyerAlwaysFree')}</p>
                                        <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">{t('billing.sellerPays')}</p>
                                    </div>

                                {/* Subscription Tiers */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#334155] dark:text-slate-200 mb-3">{t('billing.availablePlans')}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        <div className={`p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/5 relative ${currentTier === 'free' ? 'border-2 border-emerald-300 dark:border-emerald-700' : 'border border-slate-200 dark:border-slate-700'}`}>
                                            {currentTier === 'free' && <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-emerald-700 text-white text-[11px] font-bold rounded">{t('billing.currentBadge')}</span>}
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200 mt-1">{t('billing.pilotName')}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('billing.pilotFeatures')}</p>
                                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-3">{t('billing.free')}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{t('billing.sellerRate', { rate: pilotRate || t('billing.rateUnavailable') })}</p>
                                        </div>

                                        {/* Professional */}
                                        <div className={`p-4 rounded-lg hover:border-[#5DADE2]/30 transition-colors ${currentTier === 'standard' ? 'border-2 border-[#5DADE2]' : 'border border-slate-200 dark:border-slate-700'}`}>
                                            {currentTier === 'standard' && <span className="inline-block -mt-1 mb-1 px-2 py-0.5 bg-blue-700 text-white text-[11px] font-bold rounded">{t('billing.currentBadge')}</span>}
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">{t('billing.professional')}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('billing.professionalFeatures')}</p>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-3">$500<span className="text-xs font-normal text-slate-500 dark:text-slate-400">{t('billing.perSeatMonth')}</span></p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{t('billing.sellerRate', { rate: professionalRate || t('billing.rateUnavailable') })}</p>
                                            {currentTier === 'free' && (
                                                <a href="mailto:sales@verdaxis.exchange" className="block text-center mt-3 w-full py-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800">
                                                    {t('billing.upgrade')}
                                                </a>
                                            )}
                                        </div>

                                        {/* Enterprise */}
                                        <div className={`p-4 rounded-lg hover:border-amber-500/30 transition-colors ${currentTier === 'enterprise' ? 'border-2 border-amber-500' : 'border border-slate-200 dark:border-slate-700'}`}>
                                            {currentTier === 'enterprise' && <span className="inline-block -mt-1 mb-1 px-2 py-0.5 bg-amber-700 text-white text-[11px] font-bold rounded">{t('billing.currentBadge')}</span>}
                                            <h4 className="font-bold text-sm text-[#334155] dark:text-slate-200">{t('billing.enterprise')}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('billing.enterpriseFeatures')}</p>
                                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-3">{t('billing.custom')}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{t('billing.sellerRate', { rate: enterpriseRate || t('billing.negotiated') })}</p>
                                            <a
                                                href="mailto:sales@verdaxis.exchange"
                                                className="block text-center mt-3 w-full py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                                            >
                                                {t('billing.contactSales')}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Commission Schedule */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('billing.commissionSchedule')}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                                    <th className="text-left py-2 pr-4 font-medium">{t('billing.tier')}</th>
                                                    <th className="text-right py-2 px-4 font-medium">{t('billing.rate')}</th>
                                                    <th className="text-right py-2 pl-4 font-medium">{t('billing.minimumMonthly')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-700 dark:text-slate-300">
                                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 pr-4">{t('billing.pilotName')}</td>
                                                    <td className="py-2 px-4 text-right font-mono">{pilotRate || t('billing.rateUnavailable')}</td>
                                                    <td className="py-2 pl-4 text-right font-mono">—</td>
                                                </tr>
                                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 pr-4">{t('billing.professional')}</td>
                                                    <td className="py-2 px-4 text-right font-mono">{professionalRate || t('billing.rateUnavailable')}</td>
                                                    <td className="py-2 pl-4 text-right font-mono">$500</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 pr-4">{t('billing.enterprise')}</td>
                                                    <td className="py-2 px-4 text-right font-mono">{enterpriseRate || t('billing.negotiated')}</td>
                                                    <td className="py-2 pl-4 text-right font-mono">{t('billing.custom')}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'referrals' && <ReferralsTab />}
                </div>
            </div>
        </div>
    );
};
