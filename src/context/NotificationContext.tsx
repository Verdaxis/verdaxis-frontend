import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { replaceEqualDeep } from '@tanstack/react-query';
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
    const userId = user?.id;
    const [account, setAccount] = useState(() => ({ userId }));
    const [state, setState] = useState(() => ({ account, notifications: [] as Notification[], unreadCount: 0 }));
    if (account.userId !== userId) {
        const nextAccount = { userId };
        setAccount(nextAccount);
        setState({ account: nextAccount, notifications: [], unreadCount: 0 });
    }
    const { notifications, unreadCount } = state;

    const pendingRead = useRef<{ userId: string; promise: Promise<void> } | null>(null);
    const readScope = useRef<typeof account | null>(null);
    const fetchNotifications = useCallback(() => {
        const scope = readScope.current;
        if (!scope?.userId || document.visibilityState !== 'visible') return Promise.resolve();
        if (pendingRead.current?.userId === scope.userId) return pendingRead.current.promise;

        const read = Promise.allSettled([
            api.notifications.list(),
            api.notifications.getUnreadCount(),
        ]).then(([listResult, countResult]) => {
            if (readScope.current !== scope) return;
            if (listResult.status === 'rejected') {
                console.error("Failed to fetch notifications", listResult.reason);
            }
            if (countResult.status === 'rejected') {
                console.error("Failed to fetch unread notification count", countResult.reason);
            }
            setState(previous => {
                if (previous.account !== scope) return previous;
                const notifications = listResult.status === 'fulfilled'
                    ? replaceEqualDeep(previous.notifications, listResult.value) : previous.notifications;
                const unreadCount = countResult.status === 'fulfilled' ? countResult.value : previous.unreadCount;
                return notifications === previous.notifications && unreadCount === previous.unreadCount
                    ? previous : { ...previous, notifications, unreadCount };
            });
        }).finally(() => {
            if (pendingRead.current?.promise === read) pendingRead.current = null;
        });
        pendingRead.current = { userId: scope.userId, promise: read };
        return read;
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        const scope = readScope.current;
        if (!scope) return;
        try {
            await api.notifications.markRead(id);
            if (readScope.current !== scope) return;
            setState(previous => previous.account !== scope ? previous : {
                ...previous,
                notifications: previous.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
                unreadCount: Math.max(0, previous.unreadCount - 1),
            });
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const scope = readScope.current;
        if (!scope) return;
        try {
            await api.notifications.markAllRead();
            if (readScope.current !== scope) return;
            setState(previous => previous.account !== scope ? previous : {
                ...previous,
                notifications: previous.notifications.map(n => ({ ...n, is_read: true })),
                unreadCount: 0,
            });
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    }, []);

    const addNotification = useCallback((notification: Notification) => {
        setState(previous => previous.account !== account ? previous : {
            ...previous,
            notifications: [notification, ...previous.notifications].slice(0, 100),
            unreadCount: previous.unreadCount + (notification.is_read ? 0 : 1),
        });
    }, [account]);

    useEffect(() => {
        if (!userId || isMarketSupportActive) return;
        const scope = account;
        readScope.current = scope;
        let resumeQueued = false;
        const refreshWhenVisible = () => {
            if (document.visibilityState !== 'visible' || resumeQueued) return;
            const pending = pendingRead.current;
            if (pending?.userId !== userId) {
                void fetchNotifications();
                return;
            }
            resumeQueued = true;
            void pending.promise.then(() => {
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
    }, [account, userId, isMarketSupportActive, fetchNotifications]);

    const value = useMemo(() => ({
        notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, addNotification,
    }), [notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, addNotification]);

    return (
        <NotificationContext.Provider value={value}>
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
