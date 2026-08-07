import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Check, BellOff, Info, MessageSquare, Briefcase, UserCheck, CreditCard, FileText, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import clsx from 'clsx';
import { Notification } from '../../types';

interface NotificationListProps {
    onClose: () => void;
}

/**
 * Format a date string into a human-readable relative time.
 */
function timeAgo(dateStr: string, t: TFunction, locale: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;

    if (diffMs < 0) return t('notifications.time.justNow');

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return t('notifications.time.justNow');

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('notifications.time.minutesAgo', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.time.hoursAgo', { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.time.daysAgo', { count: days });

    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return t('notifications.time.weeksAgo', { count: weeks });
    }

    return new Date(dateStr).toLocaleDateString(locale);
}

export const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('common');
    const isEnglish = (i18n.resolvedLanguage || i18n.language).startsWith('en');

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        
        if (notification.type === 'ORDER_UPDATE' || notification.type === 'DIRECT_ORDER' || notification.type === 'DIRECT_ORDER_OFFER') {
            navigate('/app/home', {
                state: {
                    openOrderId: notification.data?.order_id || notification.data?.rfq_id
                }
            });
        }
        
        onClose();
    };

    const getIcon = (type: string, title: string) => {
        if (title.includes('Auto-Matched')) return <Zap size={16} className="text-amber-400" />;
        if (title.includes('Payment')) return <CreditCard size={16} className="text-emerald-400" />;
        if (title.includes('Delivered')) return <TrendingUp size={16} className="text-blue-400" />;
        if (title.includes('Confirmed')) return <Check size={16} className="text-emerald-400" />;
        if (title.includes('Order')) return <FileText size={16} className="text-blue-400" />;
        
        switch (type) {
            case 'DIRECT_ORDER': return <MessageSquare size={16} className="text-emerald-400" />;
            case 'DIRECT_ORDER_OFFER': return <Briefcase size={16} className="text-purple-400" />;
            case 'ORDER_UPDATE': return <FileText size={16} className="text-blue-400" />;
            case 'USER_STATUS': return <UserCheck size={16} className="text-yellow-400" />;
            default: return <Info size={16} className="text-slate-400" />;
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 w-full">
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <BellOff size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">{t('notifications.empty')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm rounded-t-lg sticky top-0 z-10">
                <h3 className="font-semibold text-slate-200">{t('notifications.title')}</h3>
                <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                    <Check size={12} />
                    {t('notifications.markAllRead')}
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {notifications.map((notification) => {
                    const typeLabel = t(`notifications.type.${notification.type}`, { defaultValue: t('notifications.type.default') });
                    const safeMessage = t(`notifications.message.${notification.type}`, { defaultValue: t('notifications.message.default') });
                    const title = isEnglish ? notification.title : typeLabel;
                    const message = isEnglish ? notification.message : safeMessage;
                    const ariaLabel = isEnglish
                        ? `${typeLabel}: ${title}. ${t(notification.is_read ? 'notifications.status.read' : 'notifications.status.unread')}`
                        : `${title}: ${message} ${t(notification.is_read ? 'notifications.status.read' : 'notifications.status.unread')}`;

                    return <button
                        type="button"
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        aria-label={ariaLabel}
                        className={clsx(
                            "group w-full p-3 rounded-md cursor-pointer text-left transition-all border",
                            "hover:bg-slate-800",
                            notification.is_read 
                                ? "bg-transparent border-transparent opacity-70" 
                                : "bg-slate-800/40 border-slate-700/50"
                        )}
                    >
                        <div className="flex gap-3">
                            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                {getIcon(notification.type, notification.title)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={clsx("text-sm font-medium truncate", notification.is_read ? "text-slate-400" : "text-white")}>
                                        {title}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                        {timeAgo(notification.created_at, t, i18n.language)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                    {message}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <div className="shrink-0 self-center">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                </div>
                            )}
                        </div>
                    </button>;
                })}
            </div>
        </div>
    );
};
