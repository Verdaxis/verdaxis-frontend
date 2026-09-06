import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../services/config';
import { getAccessToken, refreshAccessToken } from '../services/authToken';

type SSEChannel = 'prices' | 'orderbook' | 'trades';
type SSEHandler = (event: string, data: any) => void;

const EVENT_TYPES: Record<SSEChannel, string[]> = {
    prices: ['price_update'],
    orderbook: ['order_created', 'order_cancelled', 'orders_matched'],
    trades: ['trade_created', 'trade_confirmed', 'trade_delivered', 'trade_paid', 'trade_auto_matched'],
};

const CONTROL_EVENTS = ['auth_expired', 'auth_revoked', 'reconnect', 'reset'];
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

async function requestStreamToken(parentSignal: AbortSignal): Promise<string | null> {
    const requestController = new AbortController();
    if (parentSignal.aborted) return null;
    const abortRequest = () => requestController.abort();
    parentSignal.addEventListener('abort', abortRequest, { once: true });
    const timeout = setTimeout(() => requestController.abort(), 15000);

    try {
        let accessToken = getAccessToken();
        if (!accessToken) accessToken = await refreshAccessToken();
        if (!accessToken) return null;

        let response = await fetch(`${API_URL}/auth/stream-token`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            signal: requestController.signal,
        });

        // The access token can expire between the auth check and this request.
        if (response.status === 401) {
            // Do not refresh an account that has already been replaced while
            // the request was in flight.
            if (getAccessToken() !== accessToken) return null;
            const refreshedToken = await refreshAccessToken();
            if (!refreshedToken) return null;
            const currentToken = getAccessToken();
            if (currentToken !== accessToken && currentToken !== refreshedToken) return null;
            accessToken = refreshedToken;
            response = await fetch(`${API_URL}/auth/stream-token`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                signal: requestController.signal,
            });
        }

        if (!response.ok) return null;
        const body = await response.json().catch(() => null);
        return typeof body?.stream_token === 'string' ? body.stream_token : null;
    } finally {
        clearTimeout(timeout);
        parentSignal.removeEventListener('abort', abortRequest);
    }
}

/**
 * Hook for subscribing to Server-Sent Events streams.
 * Auto-reconnects on disconnection with exponential backoff + jitter.
 * Returns connection status for UI indicators.
 */
export function useSSE(channel: SSEChannel, onEvent: SSEHandler, enabled = true, scopeKey = '') {
    const [isConnected, setIsConnected] = useState(false);
    const sourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlerRef = useRef(onEvent);
    handlerRef.current = onEvent;
    const backoffRef = useRef(INITIAL_RECONNECT_DELAY);
    const lastEventIdRef = useRef<string | null>(null);
    const generationRef = useRef(0);

    useEffect(() => {
        const generation = ++generationRef.current;
        let disposed = false;
        const tokenRequestController = new AbortController();

        const isActive = () => (
            enabled
            && !disposed
            && generationRef.current === generation
        );

        const clearReconnectTimeout = () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        const scheduleReconnect = () => {
            if (!isActive() || reconnectTimeoutRef.current) return;

            const delay = backoffRef.current + Math.random() * 1000;
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                void connect();
            }, delay);
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_RECONNECT_DELAY);
        };

        const closeSource = (source: EventSource) => {
            if (sourceRef.current !== source) return false;
            sourceRef.current = null;
            source.close();
            setIsConnected(false);
            return true;
        };

        const handleControlEvent = (source: EventSource, event: string) => {
            if (!closeSource(source)) return;

            // Authorization changes can also mean an organization switch. A
            // new token must start with a fresh cursor for the new scope.
            if (event === 'auth_revoked' || event === 'reset') {
                lastEventIdRef.current = null;
            }
            if (event === 'auth_revoked') {
                // Avoid a tight retry loop while a revoked session is being
                // cleared; a later attempt can obtain a token after login.
                backoffRef.current = MAX_RECONNECT_DELAY;
            }
            scheduleReconnect();
        };

        async function connect() {
            if (!isActive() || sourceRef.current) return;

            let streamToken: string | null = null;
            if (channel === 'trades') {
                try {
                    streamToken = await requestStreamToken(tokenRequestController.signal);
                } catch {
                    streamToken = null;
                }
                if (!streamToken) {
                    scheduleReconnect();
                    return;
                }
            }

            // The token request may finish after unmount, logout, or an org
            // change. Never create a source for that stale generation.
            if (!isActive()) return;

            const params = new URLSearchParams();
            if (streamToken) params.set('stream_token', streamToken);
            if (channel === 'trades' && lastEventIdRef.current !== null) {
                params.set('last_event_id', lastEventIdRef.current);
            }
            const query = params.toString();
            const url = `${API_URL}/stream/${channel}${query ? `?${query}` : ''}`;
            const source = new EventSource(url);
            sourceRef.current = source;

            source.onopen = () => {
                if (sourceRef.current !== source || !isActive()) return;
                setIsConnected(true);
                backoffRef.current = INITIAL_RECONNECT_DELAY;
            };

            const handleMessage = (type: string, event: MessageEvent<string>) => {
                if (sourceRef.current !== source || !isActive()) return;
                if (event.lastEventId) lastEventIdRef.current = event.lastEventId;
                try {
                    const data = JSON.parse(event.data);
                    handlerRef.current(type, data);
                } catch {
                    handlerRef.current(type, event.data);
                }
            };

            for (const type of EVENT_TYPES[channel]) {
                source.addEventListener(type, handleMessage.bind(null, type) as EventListener);
            }
            for (const type of CONTROL_EVENTS) {
                source.addEventListener(type, () => handleControlEvent(source, type));
            }

            source.onerror = () => {
                if (!closeSource(source)) return;
                scheduleReconnect();
            };
        }

        clearReconnectTimeout();
        setIsConnected(false);
        if (enabled) void connect();

        return () => {
            disposed = true;
            ++generationRef.current;
            tokenRequestController.abort();
            clearReconnectTimeout();
            const source = sourceRef.current;
            sourceRef.current = null;
            source?.close();
            lastEventIdRef.current = null;
            setIsConnected(false);
        };
    }, [channel, enabled, scopeKey]);

    return { isConnected };
}
