import { useEffect, useState, useSyncExternalStore } from 'react';
import {
    deriveConnectionState,
    deriveServerStatus,
    getStreamHealthSnapshot,
    subscribeStreamHealth,
    type ConnectionState,
    type ServerStatusInfo,
} from '../services/streamHealth';

/**
 * Staleness and expiry depend on the passage of time, not only on events, so
 * the hook re-evaluates on a timer. 5 s keeps the 75 s stale threshold accurate
 * to within a few seconds at negligible cost.
 */
const TICK_MS = 5_000;

const isBrowserOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

export interface StreamHealth {
    connection: ConnectionState;
    /** Aggregated server status; null while unknown (no recent heartbeat). */
    serverStatus: ServerStatusInfo | null;
}

/** Aggregate stream health for the whole app. See `services/streamHealth`. */
export function useStreamHealth(): StreamHealth {
    const snapshot = useSyncExternalStore(subscribeStreamHealth, getStreamHealthSnapshot, getStreamHealthSnapshot);
    const [now, setNow] = useState(() => Date.now());
    const [online, setOnline] = useState(isBrowserOnline);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
        const syncOnline = () => {
            setOnline(isBrowserOnline());
            setNow(Date.now());
        };
        window.addEventListener('online', syncOnline);
        window.addEventListener('offline', syncOnline);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('online', syncOnline);
            window.removeEventListener('offline', syncOnline);
        };
    }, []);

    // Snapshot changes (an event just happened) must be judged against the
    // current time, not the last tick, so never use an older `now` than Date.now().
    const evaluatedAt = Math.max(now, Date.now());
    return {
        connection: deriveConnectionState(snapshot, evaluatedAt, online),
        serverStatus: deriveServerStatus(snapshot, evaluatedAt),
    };
}
