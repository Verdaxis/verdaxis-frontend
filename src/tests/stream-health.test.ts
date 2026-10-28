import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    deriveConnectionState,
    deriveServerStatus,
    getStreamHealthSnapshot,
    INITIAL_CONNECT_GRACE_MS,
    OFFLINE_AFTER_MS,
    parseHeartbeat,
    registerStream,
    resetStreamHealth,
    STALE_AFTER_MS,
    STATUS_TTL_MS,
    type Heartbeat,
} from '../services/streamHealth';

const T0 = 1_000_000;
const beat = (status: Heartbeat['status'], receivedAt: number, message: string | null = null): Heartbeat => ({
    status,
    message,
    serverTime: '2026-10-28T10:00:00Z',
    receivedAt,
});

describe('parseHeartbeat', () => {
    it('parses a valid heartbeat and stamps the client receive time', () => {
        expect(parseHeartbeat(
            { status: 'degraded', message: ' Slow orders ', server_time: '2026-10-28T10:00:00Z' },
            T0,
        )).toEqual({ status: 'degraded', message: 'Slow orders', serverTime: '2026-10-28T10:00:00Z', receivedAt: T0 });
    });

    it('treats null, missing and blank messages as no message', () => {
        for (const message of [null, undefined, '   ']) {
            const parsed = parseHeartbeat({ status: 'operational', message, server_time: '2026-10-28T10:00:00Z' }, T0);
            expect(parsed?.message).toBeNull();
        }
    });

    it('keeps markup as plain text and caps very long messages', () => {
        const parsed = parseHeartbeat(
            { status: 'degraded', message: `<img src=x onerror=alert(1)>${'a'.repeat(1000)}`, server_time: '2026-10-28T10:00:00Z' },
            T0,
        );
        expect(parsed?.message?.startsWith('<img src=x')).toBe(true);
        expect(parsed?.message).toHaveLength(500);
    });

    it.each([
        ['a string', 'heartbeat'],
        ['null', null],
        ['an array', []],
        ['an unknown status', { status: 'outage', message: null, server_time: '2026-10-28T10:00:00Z' }],
        ['a missing status', { message: null, server_time: '2026-10-28T10:00:00Z' }],
        ['an inherited status key', { status: 'toString', server_time: '2026-10-28T10:00:00Z' }],
        ['a non-string message', { status: 'degraded', message: 42, server_time: '2026-10-28T10:00:00Z' }],
        ['a missing server_time', { status: 'degraded', message: null }],
        ['an unparseable server_time', { status: 'degraded', message: null, server_time: 'yesterday' }],
    ])('rejects %s', (_label, payload) => {
        expect(parseHeartbeat(payload, T0)).toBeNull();
    });
});

describe('stream health store', () => {
    beforeEach(() => resetStreamHealth());
    afterEach(() => resetStreamHealth());

    it('tracks when no stream is open and when one first opens', () => {
        expect(getStreamHealthSnapshot().streams).toHaveLength(0);
        const a = registerStream(T0);
        expect(getStreamHealthSnapshot().allDownSince).toBe(T0);

        a.setConnected(true, T0 + 100);
        expect(getStreamHealthSnapshot()).toMatchObject({ allDownSince: null, connectedSince: T0 + 100 });

        a.setConnected(false, T0 + 500);
        expect(getStreamHealthSnapshot()).toMatchObject({ allDownSince: T0 + 500, connectedSince: null });

        a.unregister(T0 + 600);
        expect(getStreamHealthSnapshot()).toMatchObject({ streams: [], allDownSince: null });
    });

    it('keeps the original down time when a second stream registers while none is open', () => {
        registerStream(T0);
        registerStream(T0 + 5_000);
        expect(getStreamHealthSnapshot().allDownSince).toBe(T0);
    });

    it('stays connected while at least one stream is open', () => {
        const a = registerStream(T0);
        const b = registerStream(T0);
        a.setConnected(true, T0 + 10);
        b.setConnected(true, T0 + 20);
        a.setConnected(false, T0 + 30);
        const snap = getStreamHealthSnapshot();
        expect(deriveConnectionState(snap, T0 + 40)).toBe('live');
        expect(snap.connectedSince).toBe(T0 + 10);
    });

    it('does not notify for a no-op change and notifies for a real one', async () => {
        const { subscribeStreamHealth } = await import('../services/streamHealth');
        const listener = vi.fn();
        const stream = registerStream(T0);
        const unsubscribe = subscribeStreamHealth(listener);
        stream.setConnected(false);
        expect(listener).not.toHaveBeenCalled();
        stream.setConnected(true);
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it('ignores heartbeats from an unregistered stream', () => {
        const stream = registerStream(T0);
        stream.unregister();
        stream.recordHeartbeat(beat('maintenance', T0));
        expect(getStreamHealthSnapshot().streams).toHaveLength(0);
    });
});

describe('deriveConnectionState', () => {
    beforeEach(() => resetStreamHealth());
    afterEach(() => resetStreamHealth());

    it('is none without enabled streams', () => {
        expect(deriveConnectionState(getStreamHealthSnapshot(), T0)).toBe('none');
    });

    it('is live when connected and no heartbeat was ever received, however long it lasts', () => {
        const stream = registerStream(T0);
        stream.setConnected(true, T0);
        expect(deriveConnectionState(getStreamHealthSnapshot(), T0 + 60 * 60_000)).toBe('live');
    });

    it('turns stale only after the threshold since the last heartbeat', () => {
        const stream = registerStream(T0);
        stream.setConnected(true, T0);
        stream.recordHeartbeat(beat('operational', T0 + 1_000));
        const snap = getStreamHealthSnapshot();
        expect(deriveConnectionState(snap, T0 + 1_000 + STALE_AFTER_MS)).toBe('live');
        expect(deriveConnectionState(snap, T0 + 1_000 + STALE_AFTER_MS + 1)).toBe('stale');
    });

    it('gives a fresh connection a full grace period even if the last heartbeat is old', () => {
        const stream = registerStream(T0);
        stream.setConnected(true, T0);
        stream.recordHeartbeat(beat('operational', T0));
        stream.setConnected(false, T0 + 200_000);
        stream.setConnected(true, T0 + 300_000);
        expect(deriveConnectionState(getStreamHealthSnapshot(), T0 + 301_000)).toBe('live');
    });

    it('is connecting, then offline, while no stream has opened yet', () => {
        registerStream(T0);
        const snap = getStreamHealthSnapshot();
        expect(snap.everConnected).toBe(false);
        // A server without the heartbeat opens only at its first 30 s keep-alive.
        expect(deriveConnectionState(snap, T0 + 31_000)).toBe('connecting');
        expect(deriveConnectionState(snap, T0 + INITIAL_CONNECT_GRACE_MS - 1)).toBe('connecting');
        expect(deriveConnectionState(snap, T0 + INITIAL_CONNECT_GRACE_MS)).toBe('offline');
    });

    it('is reconnecting, then offline, after an open stream drops', () => {
        const stream = registerStream(T0);
        stream.setConnected(true, T0 + 100);
        stream.setConnected(false, T0 + 1_000);
        const snap = getStreamHealthSnapshot();
        expect(snap.everConnected).toBe(true);
        expect(deriveConnectionState(snap, T0 + 1_000 + OFFLINE_AFTER_MS - 1)).toBe('reconnecting');
        expect(deriveConnectionState(snap, T0 + 1_000 + OFFLINE_AFTER_MS)).toBe('offline');
    });

    it('forgets an earlier connection once every stream is disabled', () => {
        const stream = registerStream(T0);
        stream.setConnected(true, T0 + 100);
        stream.unregister(T0 + 200);
        registerStream(T0 + 300);
        expect(getStreamHealthSnapshot().everConnected).toBe(false);
        expect(deriveConnectionState(getStreamHealthSnapshot(), T0 + 400)).toBe('connecting');
    });

    it('is offline at once when the browser reports no network and nothing is open', () => {
        registerStream(T0);
        expect(deriveConnectionState(getStreamHealthSnapshot(), T0 + 1, false)).toBe('offline');
    });
});

describe('deriveServerStatus', () => {
    beforeEach(() => resetStreamHealth());
    afterEach(() => resetStreamHealth());

    it('is unknown (null) when no heartbeat was ever received', () => {
        registerStream(T0).setConnected(true, T0);
        expect(deriveServerStatus(getStreamHealthSnapshot(), T0 + 1)).toBeNull();
    });

    it('returns the worst status across open streams, with that status message', () => {
        const a = registerStream(T0);
        const b = registerStream(T0);
        const c = registerStream(T0);
        [a, b, c].forEach((s) => s.setConnected(true, T0));
        a.recordHeartbeat(beat('operational', T0 + 1));
        b.recordHeartbeat(beat('degraded', T0 + 2, 'Slow'));
        c.recordHeartbeat(beat('maintenance', T0 + 3, 'Back at 12:00'));
        expect(deriveServerStatus(getStreamHealthSnapshot(), T0 + 10)).toEqual({
            status: 'maintenance',
            message: 'Back at 12:00',
        });
    });

    it('uses only the latest heartbeat of a stream, so recovery clears the status', () => {
        const a = registerStream(T0);
        a.setConnected(true, T0);
        a.recordHeartbeat(beat('maintenance', T0 + 1, 'Down'));
        a.recordHeartbeat(beat('operational', T0 + 2));
        expect(deriveServerStatus(getStreamHealthSnapshot(), T0 + 3)).toEqual({ status: 'operational', message: null });
    });

    it('prefers a message over a newer heartbeat without one at the same status', () => {
        const a = registerStream(T0);
        const b = registerStream(T0);
        a.setConnected(true, T0);
        b.setConnected(true, T0);
        a.recordHeartbeat(beat('degraded', T0 + 1, 'Slow matching'));
        b.recordHeartbeat(beat('degraded', T0 + 2, null));
        expect(deriveServerStatus(getStreamHealthSnapshot(), T0 + 3)?.message).toBe('Slow matching');
    });

    it('lets open streams override a dropped stream with an old status', () => {
        const dropped = registerStream(T0);
        const open = registerStream(T0);
        dropped.setConnected(true, T0);
        open.setConnected(true, T0);
        dropped.recordHeartbeat(beat('degraded', T0 + 1, 'Slow'));
        open.recordHeartbeat(beat('operational', T0 + 2));
        dropped.setConnected(false, T0 + 3);
        expect(deriveServerStatus(getStreamHealthSnapshot(), T0 + 4)?.status).toBe('operational');
    });

    it('remembers the last status while nothing is open, until the TTL passes', () => {
        const a = registerStream(T0);
        a.setConnected(true, T0);
        a.recordHeartbeat(beat('maintenance', T0 + 1, 'Restarting'));
        a.setConnected(false, T0 + 2);
        const snap = getStreamHealthSnapshot();
        expect(deriveServerStatus(snap, T0 + 1 + STATUS_TTL_MS)?.status).toBe('maintenance');
        expect(deriveServerStatus(snap, T0 + 1 + STATUS_TTL_MS + 1)).toBeNull();
    });
});
