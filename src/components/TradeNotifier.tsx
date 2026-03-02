import React, { useCallback } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

/**
 * Invisible component that listens to SSE trade events
 * and shows toast notifications for relevant trades.
 */
export const TradeNotifier: React.FC = () => {
    const { addToast } = useToast();
    const { isAuthenticated } = useAuth();

    const handleTradeEvent = useCallback((event: string, data: any) => {
        switch (event) {
            case 'trade_auto_matched':
                addToast({
                    type: 'trade',
                    title: 'Order Auto-Matched',
                    message: `${data.quantity} MT of ${data.fuel_type} at $${data.price}/MT`,
                    duration: 8000,
                });
                break;
            case 'trade_confirmed':
                addToast({
                    type: 'success',
                    title: 'Trade Confirmed',
                    message: `${data.quantity} MT confirmed at $${data.price}/MT`,
                });
                break;
            case 'trade_delivered':
                addToast({
                    type: 'info',
                    title: 'Trade Delivered',
                    message: `${data.final_quantity} MT delivered — $${data.final_total} total`,
                });
                break;
            case 'trade_paid':
                addToast({
                    type: 'success',
                    title: 'Payment Received',
                    message: `Trade for ${data.quantity} MT marked as paid`,
                });
                break;
        }
    }, [addToast]);

    useSSE('trades', handleTradeEvent, isAuthenticated);

    return null; // Invisible — only listens
};
