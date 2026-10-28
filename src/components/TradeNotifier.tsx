import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useMarketSupport } from '../context/MarketSupportContext';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import { useTradeAlerts } from '../hooks/useTradeAlerts';
import { PAGE_SLUGS } from '../types';

/**
 * Invisible component that listens to SSE trade events
 * and shows toast notifications + adds to notification panel.
 * It also feeds the same events to the optional sound and browser
 * notification alerts (`useTradeAlerts`), so the app keeps one trade stream.
 * It renders inside the router so a notification click can open My Trades.
 */
export const TradeNotifier: React.FC = () => {
    const { addToast } = useToast();
    const { user, isAuthenticated } = useAuth();
    const { context: marketSupportContext, isActive: isMarketSupportActive } = useMarketSupport();
    const { addNotification } = useNotifications();
    const { t, ready } = useNamespace('trading');
    const navigate = useNavigate();

    const openMyTrades = useCallback(() => navigate(`/app/${PAGE_SLUGS.TRADES}`), [navigate]);
    const alertForTradeEvent = useTradeAlerts({
        userId: user?.id ?? '',
        isMarketSupportActive,
        t,
        onOpenMyTrades: openMyTrades,
    });

    const handleTradeEvent = useCallback((event: string, data: any, eventId?: string) => {
        alertForTradeEvent(event, data, eventId);

        let title = '';
        let message = '';
        let toastType: 'trade' | 'success' | 'info' = 'info';

        switch (event) {
            case 'trade_auto_matched':
                title = t('tradeNotifier.autoMatched.title');
                message = t('tradeNotifier.autoMatched.message', {
                    quantity: data.quantity,
                    fuelType: data.fuel_type,
                    price: data.price,
                });
                toastType = 'trade';
                break;
            case 'trade_confirmed':
                title = t('tradeNotifier.confirmed.title');
                message = t('tradeNotifier.confirmed.message', {
                    quantity: data.quantity,
                    price: data.price,
                });
                toastType = 'success';
                break;
            case 'trade_delivered':
                title = t('tradeNotifier.delivered.title');
                message = t('tradeNotifier.delivered.message', {
                    quantity: data.final_quantity,
                    total: data.final_total,
                });
                toastType = 'info';
                break;
            case 'trade_paid':
                title = t('tradeNotifier.paid.title');
                message = t('tradeNotifier.paid.message', { quantity: data.quantity });
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
    }, [addToast, addNotification, alertForTradeEvent, t]);

    const streamScope = `${user?.id ?? ''}:${user?.organization_id ?? ''}:${marketSupportContext?.id ?? ''}`;
    useSSE('trades', handleTradeEvent, isAuthenticated && ready && !isMarketSupportActive, streamScope);

    return null; // Invisible — only listens
};
