import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { attachQueryInvalidation } from '../lib/query/invalidation';
import { registerQueryRefresh } from '../lib/query/refreshRegistry';
import { queuePublicMarketRefresh, subscribePublicMarketRefresh } from '../services/publicMarketSync';
import { createRefreshCoordinator } from '../lib/query/refreshCoordinator';
import { invalidateReadCache, invalidateReadCacheWithCause, subscribeReadInvalidations } from '../services/readCache';

afterEach(() => vi.useRealTimers());

describe('registered Query refresh bridge', () => {
    it('resumes hidden signals once, then reads exactly once more for an event during force', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'snapshot', 'registered'];
        client.setQueryData(key, 'seed');
        const ordinary = vi.fn().mockResolvedValue('after-event');
        let finish!: (value: string) => void;
        const forced = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
        const registration = registerQueryRefresh(client, key, { ordinary, forced });
        const observer = new QueryObserver(client, { queryKey: key, queryFn: registration.ordinary, staleTime: Infinity, enabled: false });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client, false);
        try {
            invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
            await vi.advanceTimersByTimeAsync(500);
            const resume = registration.force();
            observer.setOptions({ queryKey: key, queryFn: registration.ordinary, staleTime: Infinity, enabled: true });
            bridge.setVisible(true);
            await vi.advanceTimersByTimeAsync(500);
            expect(forced).toHaveBeenCalledTimes(1); expect(ordinary).not.toHaveBeenCalled();
            invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
            await vi.advanceTimersByTimeAsync(500);
            finish('resume'); await resume;
            await vi.advanceTimersByTimeAsync(500);
            expect(forced).toHaveBeenCalledTimes(1); expect(ordinary).toHaveBeenCalledTimes(1);
        } finally { registration.dispose(); bridge.dispose(); unobserve(); client.clear(); }
    });

    it('detaches registration when the client cache is cleared, with or without a bridge', async () => {
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'snapshot', 'removed'];
        client.setQueryData(key, 'seed');
        const read = vi.fn().mockResolvedValue('value');
        const registration = registerQueryRefresh(client, key, { ordinary: read, forced: read });
        client.clear();
        await expect(registration.force()).rejects.toMatchObject({ name: 'AbortError' });
        await expect(registration.flush()).resolves.toBeUndefined();
        expect(read).not.toHaveBeenCalled();
    });

    it('replaces an earlier registration of the same key and ignores its late disposal', async () => {
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'snapshot', 'replaced'];
        const oldRead = vi.fn().mockResolvedValue('old');
        const newRead = vi.fn().mockResolvedValue('new');
        const first = registerQueryRefresh(client, key, { ordinary: oldRead, forced: oldRead });
        const second = registerQueryRefresh(client, key, { ordinary: newRead, forced: newRead });
        await expect(first.ordinary()).rejects.toMatchObject({ name: 'AbortError' });
        first.dispose();
        await expect(second.ordinary()).resolves.toBe('new');
        expect(oldRead).not.toHaveBeenCalled();
        expect(newRead).toHaveBeenCalledTimes(1);
        second.dispose();
        client.clear();
    });
});

describe('Query invalidation bridge', () => {
    it('marks stale synchronously then shares one public batch with legacy subscribers', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'snapshot', 'B30', 'sg', 'SPOT'];
        const load = vi.fn().mockResolvedValue(['new']);
        client.setQueryData(key, ['old']);
        client.setQueryData(['public', 'catalog', 'products'], ['B30']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        const legacy = vi.fn();
        const unlegacy = subscribePublicMarketRefresh(legacy);
        invalidateReadCacheWithCause('event', 'orderbook:');
        expect(client.getQueryState(key)?.isInvalidated).toBe(true);
        expect(client.getQueryState(['public', 'catalog', 'products'])?.isInvalidated).toBe(false);
        expect(load).not.toHaveBeenCalled();
        queuePublicMarketRefresh(); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
        expect(load).toHaveBeenCalledTimes(1);
        expect(legacy).toHaveBeenCalledTimes(1);
        unlegacy(); bridge.dispose(); unobserve(); client.clear();
    });

    it('does not fetch hidden or inactive keys; resume reads one active key', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const active = ['public', 'orderbook', 'listings', 'ASK'];
        const inactive = ['public', 'orderbook', 'snapshot', 'B30'];
        client.setQueryData(active, ['old']); client.setQueryData(inactive, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: active, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client, false);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
        expect(load).not.toHaveBeenCalled();
        bridge.setVisible(true);
        await vi.advanceTimersByTimeAsync(500);
        expect(load).toHaveBeenCalledTimes(1);
        expect(client.getQueryState(inactive)?.isInvalidated).toBe(true);
        bridge.dispose(); unobserve(); client.clear();
    });

    it('coalesces mutation settlement and an event and preserves a dirty rerun during a read', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'snapshot'];
        let finish!: () => void;
        const load = vi.fn().mockImplementationOnce(() => new Promise<string>(resolve => { finish = () => resolve('first'); })).mockResolvedValue('new');
        client.setQueryData(key, 'old');
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        invalidateReadCacheWithCause('mutation-start', 'orderbook:');
        await vi.advanceTimersByTimeAsync(500); expect(load).not.toHaveBeenCalled();
        invalidateReadCacheWithCause('mutation-settled', 'orderbook:');
        // The event arrives before the mutation read starts; that read covers it.
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500); expect(load).toHaveBeenCalledTimes(1);
        // This event arrives after the read started; it must cause one more read.
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
        finish(); await vi.advanceTimersByTimeAsync(500);
        expect(load).toHaveBeenCalledTimes(2);
        bridge.dispose(); unobserve(); client.clear();
    });

    it('skips the batch when the bridge read started after the last event arrived', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'listings', 'ASK', 'echo-before-read'];
        client.setQueryData(key, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        invalidateReadCacheWithCause('mutation-settled', 'orderbook:');
        // The echo arrives at 100 ms; the mutation read starts at 500 ms.
        await vi.advanceTimersByTimeAsync(100);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(400);
        expect(load).toHaveBeenCalledTimes(1);
        // The batch at 600 ms sees the read started after the echo: no new read.
        await vi.advanceTimersByTimeAsync(100);
        expect(load).toHaveBeenCalledTimes(1);
        bridge.dispose(); unobserve(); client.clear();
    });

    it('reads once more when the event arrives after the bridge read started', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'listings', 'ASK', 'echo-after-read'];
        client.setQueryData(key, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        invalidateReadCacheWithCause('mutation-settled', 'orderbook:');
        // The mutation read starts at 500 ms; the echo arrives at 600 ms.
        await vi.advanceTimersByTimeAsync(500);
        expect(load).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(100);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
        expect(load).toHaveBeenCalledTimes(2);
        bridge.dispose(); unobserve(); client.clear();
    });

    it('reads once more when a later event in the same batch arrived after the read started', async () => {
        vi.useFakeTimers();
        const client = createQueryClient();
        const key = ['public', 'orderbook', 'listings', 'ASK', 'later-event'];
        client.setQueryData(key, ['old']);
        const load = vi.fn().mockResolvedValue(['new']);
        const observer = new QueryObserver(client, { queryKey: key, queryFn: load, staleTime: Infinity });
        const unobserve = observer.subscribe(() => {});
        const bridge = attachQueryInvalidation(client);
        invalidateReadCacheWithCause('mutation-settled', 'orderbook:');
        // First event at 400 ms, before the read starts at 500 ms.
        await vi.advanceTimersByTimeAsync(400);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        // Second event at 600 ms, after the read started, in the same batch at 900 ms.
        await vi.advanceTimersByTimeAsync(200);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(300);
        expect(load).toHaveBeenCalledTimes(2);
        bridge.dispose(); unobserve(); client.clear();
    });
});

describe('Query refresh coordination primitives', () => {
    it('batches a burst and preserves one dirty rerun while a read is busy', async () => {
        vi.useFakeTimers();
        let finish!: () => void;
        const refresh = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }))
            .mockResolvedValue(undefined);
        const coordinator = createRefreshCoordinator();
        const detach = coordinator.subscribe('snapshot', refresh);
        for (let index = 0; index < 5; index += 1) coordinator.markDirty('snapshot');
        await vi.advanceTimersByTimeAsync(500);
        expect(refresh).toHaveBeenCalledTimes(1);
        for (let index = 0; index < 5; index += 1) coordinator.markDirty('snapshot');
        finish();
        await vi.advanceTimersByTimeAsync(500);
        expect(refresh).toHaveBeenCalledTimes(2);
        detach();
        coordinator.dispose();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('marks hidden work dirty without fetching and runs once on resume', async () => {
        vi.useFakeTimers();
        const refresh = vi.fn().mockResolvedValue(undefined);
        const coordinator = createRefreshCoordinator(false);
        coordinator.subscribe('listings', refresh);
        coordinator.markDirty('listings');
        await vi.advanceTimersByTimeAsync(60_000);
        expect(refresh).not.toHaveBeenCalled();
        coordinator.setVisible(true);
        await vi.advanceTimersByTimeAsync(500);
        expect(refresh).toHaveBeenCalledTimes(1);
        coordinator.dispose();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('detaches pending work and does not rerun after disposal', async () => {
        vi.useFakeTimers();
        const refresh = vi.fn().mockResolvedValue(undefined);
        const coordinator = createRefreshCoordinator();
        const detach = coordinator.subscribe('a', refresh);
        coordinator.markDirty('a');
        detach();
        await vi.advanceTimersByTimeAsync(500);
        expect(refresh).not.toHaveBeenCalled();
        coordinator.dispose();
    });

    it('publishes typed causes while preserving legacy invalidation calls', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeReadInvalidations(listener);
        invalidateReadCache('orderbook:');
        invalidateReadCacheWithCause('mutation-start', 'orderbook:');
        invalidateReadCacheWithCause('mutation-settled', 'orderbook:');
        expect(listener.mock.calls.map(([event]) => event)).toEqual([
            { prefixes: ['orderbook:'], cause: 'explicit' },
            { prefixes: ['orderbook:'], cause: 'mutation-start' },
            { prefixes: ['orderbook:'], cause: 'mutation-settled' },
        ]);
        unsubscribe();
        invalidateReadCache('orderbook:');
        expect(listener).toHaveBeenCalledTimes(3);
    });
});
