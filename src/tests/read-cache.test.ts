import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import { cachedRead, invalidateReadCache, setReadCachePrincipal } from '../services/readCache';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((next, fail) => {
        resolve = next;
        reject = fail;
    });
    return { promise, resolve, reject };
};

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
});

describe('bounded API read cache', () => {
    beforeEach(() => {
        invalidateReadCache();
        clearMarketSupportContextId();
        clearAccessToken();
        setReadCachePrincipal(null, null);
        vi.restoreAllMocks();
    });

    afterEach(() => {
        invalidateReadCache();
        clearMarketSupportContextId();
        clearAccessToken();
        setReadCachePrincipal(null, null);
        vi.restoreAllMocks();
    });

    it('deduplicates in-flight reads and expires values at the configured TTL', async () => {
        let now = 1_000;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        const request = deferred<number>();
        const load = vi.fn(() => request.promise);

        const first = cachedRead('catalog:test', 'public', 100, load);
        const duplicate = cachedRead('catalog:test', 'public', 100, load);
        request.resolve(1);

        await expect(Promise.all([first, duplicate])).resolves.toEqual([1, 1]);
        await expect(cachedRead('catalog:test', 'public', 100, load)).resolves.toBe(1);
        expect(load).toHaveBeenCalledTimes(1);

        now += 101;
        load.mockResolvedValueOnce(2);
        await expect(cachedRead('catalog:test', 'public', 100, load)).resolves.toBe(2);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('evicts the least recently used value after 64 entries', async () => {
        const load = vi.fn(async (value: number) => value);
        for (let index = 0; index < 65; index += 1) {
            await cachedRead(`reference:${index}`, 'public', 1_000, () => load(index));
        }

        await cachedRead('reference:0', 'public', 1_000, () => load(0));
        expect(load).toHaveBeenCalledTimes(66);
    });

    it('does not let an invalidated old promise replace a newer value', async () => {
        const oldRequest = deferred<string>();
        const oldRead = cachedRead('orderbook:list', 'public', 1_000, () => oldRequest.promise);

        invalidateReadCache('orderbook:');
        await expect(cachedRead('orderbook:list', 'public', 1_000, async () => 'new')).resolves.toBe('new');
        oldRequest.resolve('old');
        await expect(oldRead).resolves.toBe('old');

        const unexpectedLoad = vi.fn(async () => 'unexpected');
        await expect(cachedRead('orderbook:list', 'public', 1_000, unexpectedLoad)).resolves.toBe('new');
        expect(unexpectedLoad).not.toHaveBeenCalled();
    });

    it('caches concurrent forced reads for unrelated resources', async () => {
        const ordersRequest = deferred<string>();
        const countsRequest = deferred<string>();
        const orders = cachedRead('orderbook:list', 'public', 1_000, () => ordersRequest.promise, true);
        const counts = cachedRead('orderbook:counts', 'public', 1_000, () => countsRequest.promise, true);

        ordersRequest.resolve('orders');
        countsRequest.resolve('counts');
        await expect(Promise.all([orders, counts])).resolves.toEqual(['orders', 'counts']);

        const unexpectedLoad = vi.fn(async () => 'unexpected');
        await expect(cachedRead('orderbook:list', 'public', 1_000, unexpectedLoad)).resolves.toBe('orders');
        await expect(cachedRead('orderbook:counts', 'public', 1_000, unexpectedLoad)).resolves.toBe('counts');
        expect(unexpectedLoad).not.toHaveBeenCalled();
    });

    it('rejects private results completed after account or assisted-context switches', async () => {
        setAccessToken('account-a');
        const accountRequest = deferred<string>();
        const accountRead = cachedRead('trades:mine', 'private', 1_000, () => accountRequest.promise);
        setAccessToken('account-b');
        accountRequest.resolve('account-a-data');
        await expect(accountRead).rejects.toMatchObject({ name: 'AbortError' });

        setMarketSupportContextId('context-a');
        const contextRequest = deferred<string>();
        const contextRead = cachedRead('trades:mine', 'private', 1_000, () => contextRequest.promise);
        setMarketSupportContextId('context-b');
        contextRequest.resolve('context-a-data');
        await expect(contextRead).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('separates profile organization changes that reuse the same access token', async () => {
        setAccessToken('same-user-token');
        setReadCachePrincipal('user-1', 'organization-a');
        const oldRequest = deferred<string>();
        const oldRead = cachedRead('trades:mine', 'private', 1_000, () => oldRequest.promise);

        setReadCachePrincipal('user-1', 'organization-b');
        oldRequest.resolve('organization-a-data');
        await expect(oldRead).rejects.toMatchObject({ name: 'AbortError' });
        await expect(cachedRead('trades:mine', 'private', 1_000, async () => 'organization-b-data'))
            .resolves.toBe('organization-b-data');
    });

    it('rejects a cached private value when the account changes before delivery', async () => {
        setAccessToken('same-user-token');
        setReadCachePrincipal('user-1', 'organization-a');
        await cachedRead('trades:mine', 'private', 1_000, async () => 'organization-a-data');

        const cached = cachedRead('trades:mine', 'private', 1_000, async () => 'unexpected');
        setReadCachePrincipal('user-1', 'organization-b');

        await expect(cached).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('clears cached private data on logout events', async () => {
        setAccessToken('account-a');
        const load = vi.fn()
            .mockResolvedValueOnce('before-logout')
            .mockResolvedValueOnce('after-logout');

        await expect(cachedRead('trades:mine', 'private', 1_000, load)).resolves.toBe('before-logout');
        window.dispatchEvent(new CustomEvent('verdaxis:auth-logout'));
        await expect(cachedRead('trades:mine', 'private', 1_000, load)).resolves.toBe('after-logout');
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('invalidates before and after a successful mutation', async () => {
        setAccessToken('account-a');
        const oldGet = deferred<Response>();
        const mutation = deferred<Response>();
        const failedMutation = deferred<Response>();
        let getCount = 0;
        let mutationCount = 0;
        vi.spyOn(globalThis, 'fetch').mockImplementation((_input, options) => {
            if (options?.method === 'POST') {
                mutationCount += 1;
                return mutationCount === 1 ? mutation.promise : failedMutation.promise;
            }
            getCount += 1;
            if (getCount === 1) return oldGet.promise;
            if (getCount === 2) return Promise.resolve(jsonResponse({ items: [{ id: 'during' }] }));
            if (getCount === 3) return Promise.resolve(jsonResponse({ items: [{ id: 'after' }] }));
            if (getCount === 4) return Promise.resolve(jsonResponse({ items: [{ id: 'during-failure' }] }));
            return Promise.resolve(jsonResponse({ items: [{ id: 'after-failure' }] }));
        });

        const oldRead = api.orderbook.myOrders();
        const cancel = api.orderbook.cancel('order-1');
        await expect(api.orderbook.myOrders()).resolves.toEqual([{ id: 'during' }]);

        mutation.resolve(new Response(null, { status: 204 }));
        await expect(cancel).resolves.toBeUndefined();
        await expect(api.orderbook.myOrders()).resolves.toEqual([{ id: 'after' }]);

        oldGet.resolve(jsonResponse({ items: [{ id: 'old' }] }));
        await expect(oldRead).resolves.toEqual([{ id: 'old' }]);
        await expect(api.orderbook.myOrders()).resolves.toEqual([{ id: 'after' }]);

        const failedCancel = api.orderbook.cancel('order-2');
        await expect(api.orderbook.myOrders()).resolves.toEqual([{ id: 'during-failure' }]);
        const rejection = expect(failedCancel).rejects.toThrow('network failed');
        failedMutation.reject(new TypeError('network failed'));
        await rejection;
        await expect(api.orderbook.myOrders()).resolves.toEqual([{ id: 'after-failure' }]);
    });

    it('invalidates watchlists for every trade transition and market reads for declines', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
        const loads = new Map<string, ReturnType<typeof vi.fn>>();
        const read = async (resourceKey: string) => {
            let load = loads.get(resourceKey);
            if (!load) {
                load = vi.fn(async () => resourceKey);
                loads.set(resourceKey, load);
            }
            return cachedRead(resourceKey, 'public', 1_000, load);
        };
        const marketResources = ['orderbook:test', 'prices:test', 'curves:test'];
        for (const resourceKey of [...marketResources, 'watchlists:test', 'trades:test']) await read(resourceKey);

        const transitions = [
            () => api.trades.confirm('trade-1'),
            () => api.trades.decline('trade-1'),
            () => api.trades.deliver('trade-1', { final_quantity_mt: 1, final_price_per_mt: 1 }),
            () => api.trades.pay('trade-1'),
        ];
        for (const transition of transitions) {
            await transition();
            for (const resourceKey of [...marketResources, 'watchlists:test', 'trades:test']) await read(resourceKey);
        }

        expect(loads.get('watchlists:test')).toHaveBeenCalledTimes(5);
        expect(loads.get('trades:test')).toHaveBeenCalledTimes(5);
        for (const resourceKey of marketResources) {
            expect(loads.get(resourceKey)).toHaveBeenCalledTimes(3);
        }

        await api.orderbook.create({
            side: 'BID',
            product_id: 'product-1',
            quantity_mt: 1,
            price_per_mt_usd: 1,
            availability_window: 'SPOT',
        });
        for (const resourceKey of [...marketResources, 'watchlists:test', 'trades:test']) await read(resourceKey);
        expect(loads.get('trades:test')).toHaveBeenCalledTimes(6);
        expect(loads.get('orderbook:test')).toHaveBeenCalledTimes(4);
    });
});
