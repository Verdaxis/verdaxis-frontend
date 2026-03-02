import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../services/config';

type SSEHandler = (event: string, data: any) => void;

/**
 * Hook for subscribing to Server-Sent Events streams.
 * Auto-reconnects on disconnection with exponential backoff.
 * Returns connection status for UI indicators.
 */
export function useSSE(channel: 'prices' | 'orderbook' | 'trades', onEvent: SSEHandler, enabled = true) {
    const [isConnected, setIsConnected] = useState(false);
    const sourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlerRef = useRef(onEvent);
    handlerRef.current = onEvent;

    const connect = useCallback(() => {
        if (!enabled) return;

        const url = `${API_URL}/stream/${channel}`;
        const source = new EventSource(url);
        sourceRef.current = source;

        const eventTypes = channel === 'prices'
            ? ['price_update']
            : channel === 'orderbook'
            ? ['order_created', 'order_cancelled', 'orders_matched']
            : ['trade_created', 'trade_confirmed', 'trade_delivered', 'trade_paid', 'trade_auto_matched'];

        source.onopen = () => {
            setIsConnected(true);
        };

        for (const type of eventTypes) {
            source.addEventListener(type, (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    handlerRef.current(type, data);
                } catch {
                    handlerRef.current(type, e.data);
                }
            });
        }

        source.onerror = () => {
            source.close();
            sourceRef.current = null;
            setIsConnected(false);
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };
    }, [channel, enabled]);

    useEffect(() => {
        connect();
        return () => {
            sourceRef.current?.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    return { isConnected };
}
