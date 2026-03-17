import React, { useCallback } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types';
import { useNamespace } from '../hooks/useNamespace';

/**
 * Invisible component that listens to SSE trade events
 * and shows toast notifications + adds to notification panel.
 */
export const TradeNotifier: React.FC = () => {
    const { addToast } = useToast();
    const { isAuthenticated } = useAuth();
    const { addNotification } = useNotifications();
    const { t } = useNamespace('trading');

    const handleTradeEvent = useCallback((event: string, data: any) => {
        let title = '';
        let message = '';
        let toastType: 'trade' | 'success' | 'info' = 'info';

        switch (event) {
            case 'trade_auto_matched':
                title = t('tradeNotifier.autoMatched.title');
                message = `${data.quantity} MT of ${data.fuel_type} at $${data.price}/MT`;
                toastType = 'trade';
                break;
            case 'trade_confirmed':
                title = t('tradeNotifier.confirmed.title');
                message = `${data.quantity} MT confirmed at $${data.price}/MT`;
                toastType = 'success';
                break;
            case 'trade_delivered':
                title = t('tradeNotifier.delivered.title');
                message = `${data.final_quantity} MT delivered — $${data.final_total} total`;
                toastType = 'info';
                break;
            case 'trade_paid':
                title = t('tradeNotifier.paid.title');
                message = `Trade for ${data.quantity} MT marked as paid`;
                toastType = 'success';
                break;
            default:
                return;
        }

        // Show toast
        addToast({ type: toastType, title, message, duration: 8000 });

        // Add to notification panel
        const notification: Notification = {
            id: `sse-${event}-${Date.now()}`,
            type: 'ORDER_UPDATE',
            title,
            message,
            data,
            is_read: false,
            created_at: new Date().toISOString(),
        };
        addNotification(notification);
    }, [addToast, addNotification, t]);

    useSSE('trades', handleTradeEvent, isAuthenticated);

    return null; // Invisible — only listens
};
