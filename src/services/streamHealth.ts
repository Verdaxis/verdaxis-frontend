/**
 * App-wide health of the Server-Sent Events streams, shared by every `useSSE`
 * call. Several components open their own stream (orderbook, trades, ...), so
 * one module-level store collects what each of them reports and the UI reads a
 * single aggregate.
 *
 * Aggregation rules (see the derive functions at the bottom):
 * - Connection: the app is connected when ANY enabled stream is open. Streams
 *   that are disabled (logged out, Market Support) do not count at all.
 * - Server status: the WORST status among the latest heartbeat of each stream
 *   (operational < degraded < maintenance). Only recent heartbeats count.
 */

export type ServerStatus = 'operational' | 'degraded' | 'maintenance';

export interface Heartbeat {
    status: ServerStatus;
    message: string | null;
    /** `server_time` from the payload, kept for display only. */
    serverTime: string;
    /** Client clock (ms since epoch) when the heartbeat arrived. All timing uses this. */
    receivedAt: number;
}

export interface StreamSnapshotEntry {
    connected: boolean;
    heartbeat: Heartbeat | null;
}

export interface StreamHealthSnapshot {
    streams: readonly StreamSnapshotEntry[];
    /** Client time when no enabled stream was open any more; null while one is open or none is enabled. */
    allDownSince: number | null;
    /** Client time when the app last went from "no stream open" to "a stream is open". */
    connectedSince: number | null;
}

/**
 * The backend sends a heartbeat every 30 s on an idle stream. A connection is
 * called stale after two missed beats (2 x 30 s) plus 15 s of margin for
 * network jitter and a slow tick, so 75 s.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const STALE_AFTER_MS = 2 * HEARTBEAT_INTERVAL_MS + 15_000;

/**
 * Reconnect backoff in useSSE grows 1 s, 2 s, 4 s ... up to 30 s. After 30 s
 * without any open stream, several attempts have failed and "reconnecting"
 * stops being an honest description, so the indicator says "offline".
 */
export const OFFLINE_AFTER_MS = 30_000;

/**
 * How long a heartbeat may keep describing the server when no stream is open.
 * It must outlast a reconnect cycle or a short server restart, so that a
 * maintenance banner does not vanish exactly while the server restarts. It is
 * not forever, so an old banner cannot stay pinned after the app lost contact.
 */
export const STATUS_TTL_MS = 5 * 60_000;

const MAX_MESSAGE_LENGTH = 500;
const STATUS_SEVERITY: Record<ServerStatus, number> = {
    operational: 0,
    degraded: 1,
    maintenance: 2,
};

const isServerStatus = (value: unknown): value is ServerStatus => (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATUS_SEVERITY, value)
);

/**
 * Validate a decoded `heartbeat` event payload. Returns null for anything that
 * does not match the contract, so a malformed heartbeat is ignored instead of
 * changing the UI. The message is kept as plain text; it is never HTML.
 */
export function parseHeartbeat(raw: unknown, receivedAt: number): Heartbeat | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const payload = raw as Record<string, unknown>;

    if (!isServerStatus(payload.status)) return null;
    if (typeof payload.server_time !== 'string' || Number.isNaN(Date.parse(payload.server_time))) return null;

    const rawMessage = payload.message;
    if (rawMessage !== undefined && rawMessage !== null && typeof rawMessage !== 'string') return null;
    const trimmed = typeof rawMessage === 'string' ? rawMessage.trim() : '';

    return {
        status: payload.status,
        message: trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : null,
        serverTime: payload.server_time,
        receivedAt,
    };
}

// --- Store -----------------------------------------------------------------

interface StreamEntry {
    connected: boolean;
    heartbeat: Heartbeat | null;
}

const entries = new Map<symbol, StreamEntry>();
const listeners = new Set<() => void>();
let allDownSince: number | null = null;
let connectedSince: number | null = null;
let snapshot: StreamHealthSnapshot = { streams: [], allDownSince: null, connectedSince: null };

const anyConnected = () => {
    for (const entry of entries.values()) {
        if (entry.connected) return true;
    }
    return false;
};

/** Rebuild the immutable snapshot and notify. Call after every real change. */
function commit(wasAnyConnected: boolean, wasEmpty: boolean, now: number) {
    const isAnyConnected = anyConnected();
    const isEmpty = entries.size === 0;

    if (isEmpty) {
        allDownSince = null;
        connectedSince = null;
    } else if (isAnyConnected) {
        allDownSince = null;
        if (!wasAnyConnected) connectedSince = now;
    } else if (wasAnyConnected || wasEmpty) {
        // Everything just went down, or the first stream registered unconnected.
        allDownSince = now;
        connectedSince = null;
    }

    snapshot = {
        streams: Array.from(entries.values(), ({ connected, heartbeat }) => ({ connected, heartbeat })),
        allDownSince,
        connectedSince,
    };
    listeners.forEach((listener) => listener());
}

/** Register one enabled stream. Returns its handle; call `unregister` on cleanup. */
export function registerStream(now: number = Date.now()) {
    const id = Symbol('stream');
    const wasAnyConnected = anyConnected();
    const wasEmpty = entries.size === 0;
    entries.set(id, { connected: false, heartbeat: null });
    commit(wasAnyConnected, wasEmpty, now);

    return {
        setConnected(connected: boolean, at: number = Date.now()) {
            const entry = entries.get(id);
            if (!entry || entry.connected === connected) return;
            const wasConnected = anyConnected();
            entry.connected = connected;
            commit(wasConnected, false, at);
        },
        recordHeartbeat(heartbeat: Heartbeat) {
            const entry = entries.get(id);
            if (!entry) return;
            entry.heartbeat = heartbeat;
            commit(anyConnected(), false, heartbeat.receivedAt);
        },
        unregister(at: number = Date.now()) {
            if (!entries.has(id)) return;
            const wasConnected = anyConnected();
            entries.delete(id);
            commit(wasConnected, false, at);
        },
    };
}

export const subscribeStreamHealth = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

export const getStreamHealthSnapshot = (): StreamHealthSnapshot => snapshot;

/** Test helper: forget every stream. */
export function resetStreamHealth() {
    entries.clear();
    allDownSince = null;
    connectedSince = null;
    snapshot = { streams: [], allDownSince: null, connectedSince: null };
    listeners.forEach((listener) => listener());
}

// --- Derived values ----------------------------------------------------------

/**
 * live          a stream is open and heartbeats (if the server sends them) are fresh
 * stale         a stream is open, heartbeats were seen before, but none for STALE_AFTER_MS
 * reconnecting  no stream is open yet, for less than OFFLINE_AFTER_MS
 * offline       no stream open for OFFLINE_AFTER_MS, or the browser reports no network
 * none          no stream is enabled, so there is nothing to judge
 */
export type ConnectionState = 'live' | 'stale' | 'reconnecting' | 'offline' | 'none';

export function deriveConnectionState(
    snap: StreamHealthSnapshot,
    now: number,
    browserOnline = true,
): ConnectionState {
    if (snap.streams.length === 0) return 'none';

    if (snap.streams.some((stream) => stream.connected)) {
        const lastHeartbeatAt = snap.streams.reduce<number | null>((latest, stream) => (
            stream.heartbeat && (latest === null || stream.heartbeat.receivedAt > latest)
                ? stream.heartbeat.receivedAt
                : latest
        ), null);
        // A backend that never sent a heartbeat is judged only on the connection.
        if (lastHeartbeatAt === null) return 'live';
        // Heartbeats from before the current connection do not count against a
        // fresh one: the server sends the first heartbeat right after opening.
        const reference = Math.max(lastHeartbeatAt, snap.connectedSince ?? 0);
        return now - reference > STALE_AFTER_MS ? 'stale' : 'live';
    }

    if (!browserOnline) return 'offline';
    const downFor = now - (snap.allDownSince ?? now);
    return downFor >= OFFLINE_AFTER_MS ? 'offline' : 'reconnecting';
}

export interface ServerStatusInfo {
    status: ServerStatus;
    message: string | null;
}

/**
 * Worst status among the latest heartbeat of each stream, or null when no
 * recent heartbeat exists (unknown, not an error). While any stream is open,
 * only open streams count, so a stream that dropped with an old "degraded"
 * cannot contradict a reconnected stream that reports "operational". With no
 * open stream, remembered heartbeats still count until STATUS_TTL_MS.
 */
export function deriveServerStatus(snap: StreamHealthSnapshot, now: number): ServerStatusInfo | null {
    const open = snap.streams.filter((stream) => stream.connected);
    const candidates = (open.length > 0 ? open : snap.streams)
        .flatMap((stream) => (
            stream.heartbeat && now - stream.heartbeat.receivedAt <= STATUS_TTL_MS
                ? [stream.heartbeat]
                : []
        ));
    if (candidates.length === 0) return null;

    const worst = Math.max(...candidates.map((heartbeat) => STATUS_SEVERITY[heartbeat.status]));
    const atWorst = candidates
        .filter((heartbeat) => STATUS_SEVERITY[heartbeat.status] === worst)
        .sort((a, b) => b.receivedAt - a.receivedAt);
    // Prefer the newest heartbeat at that status that actually has a message.
    const chosen = atWorst.find((heartbeat) => heartbeat.message !== null) ?? atWorst[0];
    return { status: chosen.status, message: chosen.message };
}
