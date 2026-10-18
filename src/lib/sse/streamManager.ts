import { API_URL } from '../../services/config';
import { getAccessToken, getAuthGeneration, refreshAccessToken } from '../../services/authToken';
import { invalidateReadCache, invalidateReadsForEvent } from '../../services/readCache';
import { toTradeStreamPayload } from '../../api/mappers';

export type SSEChannel = 'prices' | 'orderbook' | 'trades';
export type SSEHandler = (event: string, data: unknown) => void;
interface Subscriber { onEvent: SSEHandler; onStatus: (connected: boolean) => void }

const EVENT_TYPES: Record<SSEChannel, string[]> = {
    prices: ['price_update'],
    orderbook: ['order_created', 'order_cancelled', 'orders_matched', 'market_invalidated'],
    trades: ['trade_created', 'trade_confirmed', 'trade_declined', 'trade_delivered', 'trade_paid', 'trade_auto_matched'],
};

const CONTROL_EVENTS = ['auth_expired', 'auth_revoked', 'reconnect', 'reset'];
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

const decodeEventData = (data: string): unknown => {
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

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

const channels = new Map<string, { subscribers: Set<Subscriber>; stop: () => void; connected: boolean }>();

export function subscribeStream(channel: SSEChannel, scope: string, subscriber: Subscriber): () => void {
    const key = channel === 'trades' ? `${channel}:${scope}` : channel;
    if (channel === 'trades') {
        for (const [previousKey, previous] of channels) {
            if (previousKey.startsWith('trades:') && previousKey !== key) {
                previous.stop();
                channels.delete(previousKey);
            }
        }
    }
    let entry = channels.get(key);
    if (!entry) {
        entry = { subscribers: new Set(), stop: () => {}, connected: false };
        channels.set(key, entry);
    }
    entry.subscribers.add(subscriber);
    subscriber.onStatus(entry.connected);
    if (entry.subscribers.size === 1) {
        const current = entry;
        const notify: SSEHandler = (event, data) => {
            for (const listener of [...current.subscribers]) {
                try { listener.onEvent(event, data); } catch { /* A consumer must not stop transport recovery. */ }
            }
        };
        const setIsConnected = (connected: boolean) => {
            current.connected = connected;
            for (const listener of current.subscribers) listener.onStatus(connected);
        };
        const sourceRef = { current: null as EventSource | null };
        const reconnectTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
        const backoffRef = { current: INITIAL_RECONNECT_DELAY };
        const lastEventIdRef = { current: null as string | null };
        const acceptedGeneration = getAuthGeneration();
        current.stop = (() => {
            let disposed = false;
            let sourceAttempts = 0;
            const tokenRequestController = new AbortController();

            const isActive = () => (
                !disposed
                && (channel !== 'trades' || acceptedGeneration === getAuthGeneration())
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

            const handleControlEvent = (source: EventSource, event: string, message: MessageEvent<string>) => {
                if (!closeSource(source)) return;

                const data = event === 'reset'
                    ? decodeEventData(message.data)
                    : message.data;
                // Overflow recovery uses both paths: the reset callback refreshes
                // REST snapshots, and reconnect replays retained private history
                // after the last acknowledged cursor.
                const preservesPrivateCursor = (
                    channel === 'trades'
                    && event === 'reset'
                    && typeof data === 'object'
                    && data !== null
                    && 'reason' in data
                    && data.reason === 'subscriber_overflow'
                );

                // Authorization changes can also mean an organization switch. A
                // new token must start with a fresh cursor for the new scope.
                if (event === 'auth_revoked' || (event === 'reset' && !preservesPrivateCursor)) {
                    lastEventIdRef.current = null;
                }
                if (event === 'auth_revoked') {
                    // Avoid a tight retry loop while a revoked session is being
                    // cleared; a later attempt can obtain a token after login.
                    backoffRef.current = MAX_RECONNECT_DELAY;
                    invalidateReadCache();
                    window.dispatchEvent(new Event('verdaxis:query-auth-revoked'));
                }
                scheduleReconnect();
                if (event === 'reset') {
                    invalidateReadsForEvent(channel, event);
                    notify(event, data);
                }
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
                const isReconnect = sourceAttempts > 0;
                sourceAttempts += 1;
                const source = new EventSource(url);
                sourceRef.current = source;

                source.onopen = () => {
                    if (sourceRef.current !== source || !isActive()) return;
                    setIsConnected(true);
                    backoffRef.current = INITIAL_RECONNECT_DELAY;
                    if (isReconnect) {
                        invalidateReadsForEvent(channel, 'reconnect');
                        notify('reconnect', { reason: 'transport_reconnected' });
                    }
                };

                const handleMessage = (type: string, event: MessageEvent<string>) => {
                    if (sourceRef.current !== source || !isActive()) return;
                    if (event.lastEventId) lastEventIdRef.current = event.lastEventId;
                    const decoded = decodeEventData(event.data);
                    // A trade payload carries wire decimals; convert them here so no
                    // consumer below sees a wire string (DRIFT-1).
                    const data = channel === 'trades' ? toTradeStreamPayload(type, decoded) : decoded;
                    invalidateReadsForEvent(channel, type);
                    notify(type, data);
                };

                for (const type of EVENT_TYPES[channel]) {
                    source.addEventListener(type, handleMessage.bind(null, type) as EventListener);
                }
                for (const type of CONTROL_EVENTS) {
                    source.addEventListener(type, (event) => handleControlEvent(source, type, event as MessageEvent<string>));
                }

                source.onerror = () => {
                    if (!closeSource(source)) return;
                    scheduleReconnect();
                };
            }

            clearReconnectTimeout();
            setIsConnected(false);
            void connect();

            return () => {
                disposed = true;
                tokenRequestController.abort();
                clearReconnectTimeout();
                const source = sourceRef.current;
                sourceRef.current = null;
                source?.close();
                lastEventIdRef.current = null;
                setIsConnected(false);
            };

        })();
    }
    const owned = entry;
    return () => {
        owned.subscribers.delete(subscriber);
        if (!owned.subscribers.size) {
            owned.stop();
            if (channels.get(key) === owned) channels.delete(key);
        }
    };
}
