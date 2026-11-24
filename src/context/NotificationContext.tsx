import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useMarketSupport } from './MarketSupportContext';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { isActive: isMarketSupportActive } = useMarketSupport();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const userId = user?.id;
    const pendingRead = useRef<Promise<void> | null>(null);
    const readScope = useRef<object | null>(null);
    const fetchNotifications = useCallback(() => {
        const scope = readScope.current;
        if (!scope || document.visibilityState !== 'visible') return Promise.resolve();
        if (pendingRead.current) return pendingRead.current;

        const read = Promise.allSettled([
            api.notifications.list(),
            api.notifications.getUnreadCount(),
        ]).then(([listResult, countResult]) => {
            if (readScope.current !== scope) return;
            if (listResult.status === 'fulfilled') {
                setNotifications(listResult.value);
            } else {
                console.error("Failed to fetch notifications", listResult.reason);
            }

            if (countResult.status === 'fulfilled') {
                setUnreadCount(countResult.value);
            } else {
                console.error("Failed to fetch unread notification count", countResult.reason);
            }
        }).finally(() => { pendingRead.current = null; });
        pendingRead.current = read;
        return read;
    }, []);

    const markAsRead = async (id: string) => {
        if (isMarketSupportActive) return;
        try {
            await api.notifications.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const markAllAsRead = async () => {
        if (isMarketSupportActive) return;
        try {
            await api.notifications.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const addNotification = useCallback((notification: Notification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 100));
        if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
        }
    }, []);

    useEffect(() => {
        if (!userId || isMarketSupportActive) return;
        const scope = {};
        readScope.current = scope;
        let resumeQueued = false;
        const refreshWhenVisible = () => {
            if (document.visibilityState !== 'visible' || resumeQueued) return;
            const pending = pendingRead.current;
            if (!pending) {
                void fetchNotifications();
                return;
            }
            resumeQueued = true;
            void pending.then(() => {
                resumeQueued = false;
                if (readScope.current === scope) void fetchNotifications();
            });
        };

        refreshWhenVisible();
        const interval = window.setInterval(fetchNotifications, 30_000);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            readScope.current = null;
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [userId, isMarketSupportActive, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
