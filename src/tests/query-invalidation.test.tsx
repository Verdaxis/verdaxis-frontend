import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { attachQueryInvalidation } from '../lib/query/invalidation';
import { queuePublicMarketRefresh, subscribePublicMarketRefresh } from '../services/publicMarketSync';
import { createRefreshCoordinator } from '../lib/query/refreshCoordinator';
import { invalidateReadCache, invalidateReadCacheWithCause, subscribeReadInvalidations } from '../services/readCache';

afterEach(() => vi.useRealTimers());

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
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500); expect(load).toHaveBeenCalledTimes(1);
        invalidateReadCacheWithCause('event', 'orderbook:'); queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
        finish(); await vi.advanceTimersByTimeAsync(500);
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
