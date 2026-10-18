import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRefreshCoordinator } from '../lib/query/refreshCoordinator';
import { invalidateReadCache, invalidateReadCacheWithCause, subscribeReadInvalidations } from '../services/readCache';

afterEach(() => vi.useRealTimers());

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
