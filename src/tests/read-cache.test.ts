import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { api } from '../services/api';
import { marketplaceApi } from '../features/marketplace/api/marketplaceApi';
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

    it('shares forced reads until invalidation, without reusing an older ordinary read', async () => {
        const oldRequest = deferred<string>();
        const freshRequest = deferred<string>();
        const old = cachedRead('orderbook:list', 'public', 1_000, () => oldRequest.promise);
        const freshLoad = vi.fn(() => freshRequest.promise);
        const firstRefresh = cachedRead('orderbook:list', 'public', 1_000, freshLoad, true);
        const secondRefresh = cachedRead('orderbook:list', 'public', 1_000, freshLoad, true);
        expect(secondRefresh).toBe(firstRefresh);
        expect(freshLoad).toHaveBeenCalledTimes(1);

        // A mutation or stream event must make the pending refresh obsolete.
        invalidateReadCache('orderbook:');
        await expect(cachedRead('orderbook:list', 'public', 1_000, async () => 'after-event', true))
            .resolves.toBe('after-event');
        freshRequest.resolve('before-event');
        oldRequest.resolve('old');
        await expect(Promise.all([old, firstRefresh, secondRefresh]))
            .resolves.toEqual(['old', 'before-event', 'before-event']);
        const unexpectedLoad = vi.fn(async () => 'unexpected');
        await expect(cachedRead('orderbook:list', 'public', 1_000, unexpectedLoad)).resolves.toBe('after-event');
        expect(unexpectedLoad).not.toHaveBeenCalled();
    });

    it('allows a fresh forced read after a shared refresh fails', async () => {
        const request = deferred<string>();
        const first = cachedRead('curves:table', 'public', 1_000, () => request.promise, true);
        const second = cachedRead('curves:table', 'public', 1_000, () => request.promise, true);
        const failure = Promise.allSettled([first, second]);
        request.reject(new Error('offline'));
        expect((await failure).every(result => result.status === 'rejected')).toBe(true);
        await expect(cachedRead('curves:table', 'public', 1_000, async () => 'recovered', true))
            .resolves.toBe('recovered');
    });

    it('caches the public book snapshot and lets an explicit refresh bypass it', async () => {
        const first = { generated_at: '2026-10-03T12:00:00Z', bids: [], asks: [] };
        const refreshed = { generated_at: '2026-10-03T12:00:10Z', bids: [], asks: [] };
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(jsonResponse(first))
            .mockResolvedValueOnce(jsonResponse(refreshed));
        const params = {
            market_product: 'BIO_METHANOL',
            delivery_point_id: 'delivery-point',
            availability_window: 'SPOT',
        };

        await expect(api.orderbook.snapshot(params)).resolves.toEqual(first);
        await expect(api.orderbook.snapshot(params)).resolves.toEqual(first);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await expect(api.orderbook.snapshot(params, { force: true })).resolves.toEqual(refreshed);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(String(fetchMock.mock.calls[0][0])).toContain('/orderbook/snapshot?');
        expect(String(fetchMock.mock.calls[0][0])).toContain('availability_window=SPOT');
    });

    it('keeps credentialless catalog reads cached after an access-token replacement advances auth generation', async () => {
        const products = [{
            id: 'product-1',
            name: 'Bio Methanol',
            fuel_type: 'METHANOL',
            fuel_grade: 'Bio',
            unit: 'MT',
            min_lot_size: 1,
            is_active: true,
        }];
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(products));

        setAccessToken('access-token-a');
        await expect(api.catalog.products()).resolves.toEqual(products);

        setAccessToken('access-token-b');
        await expect(api.catalog.products()).resolves.toEqual(products);
        expect(fetchMock).toHaveBeenCalledTimes(1);
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
            if (getCount === 2) return Promise.resolve(jsonResponse({ items: [{ id: 'during', quantity_mt: '10.00' }] }));
            if (getCount === 3) return Promise.resolve(jsonResponse({ items: [{ id: 'after', quantity_mt: '20.00' }] }));
            if (getCount === 4) return Promise.resolve(jsonResponse({ items: [{ id: 'during-failure', quantity_mt: '30.00' }] }));
            return Promise.resolve(jsonResponse({ items: [{ id: 'after-failure', quantity_mt: '40.00' }] }));
        });

        const oldRead = api.orderbook.myOrders();
        const cancel = api.orderbook.cancel('order-1');
        await expect(api.orderbook.myOrders()).resolves.toMatchObject([{ id: 'during', quantity_mt: 10 }]);

        mutation.resolve(new Response(null, { status: 204 }));
        await expect(cancel).resolves.toBeUndefined();
        await expect(api.orderbook.myOrders()).resolves.toMatchObject([{ id: 'after', quantity_mt: 20 }]);

        oldGet.resolve(jsonResponse({ items: [{ id: 'old' }] }));
        await expect(oldRead).resolves.toMatchObject([{ id: 'old', quantity_mt: NaN }]);
        await expect(api.orderbook.myOrders()).resolves.toMatchObject([{ id: 'after', quantity_mt: 20 }]);

        const failedCancel = api.orderbook.cancel('order-2');
        await expect(api.orderbook.myOrders()).resolves.toMatchObject([{ id: 'during-failure', quantity_mt: 30 }]);
        const rejection = expect(failedCancel).rejects.toThrow('The request was sent, but the server did not confirm the outcome.');
        failedMutation.reject(new TypeError('network failed'));
        await rejection;
        await expect(api.orderbook.myOrders()).resolves.toMatchObject([{ id: 'after-failure', quantity_mt: 40 }]);
    });

    it('invalidates watchlists for every trade transition and market reads for declines', async () => {
        // One fresh Response per call: a Response body can be read only once,
        // and the trade transition endpoints are mutations that retry refreshes.
        const tradeBody = () => JSON.stringify({ id: 'trade-1', quantity_mt: '1.00', price_per_mt_usd: '1.00' });
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(tradeBody(), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const loads = new Map<string, Mock<() => Promise<string>>>();
        const read = async (resourceKey: string) => {
            let load = loads.get(resourceKey);
            if (!load) {
                load = vi.fn<() => Promise<string>>(async () => resourceKey);
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

    it('lets a legacy catalog read reuse the Query-owned marketplace read', async () => {
        setAccessToken('access-token-catalog');
        const wireProducts = [{
            id: 'product-1', name: 'B30', market_product: 'B30', fuel_type: 'Biofuel',
            fuel_grade: 'B30', unit: 'MT', min_lot_size: '200.00', is_active: true,
            execution_mode: 'ORDERBOOK',
        }];
        const wirePoints = [
            { id: 'dp-sg', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
        ];
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/catalog/products')) return jsonResponse(wireProducts);
            if (url.includes('/catalog/delivery-points')) return jsonResponse(wirePoints);
            throw new Error(`unexpected catalog read: ${url}`);
        });

        const products = await marketplaceApi.products();
        const points = await marketplaceApi.deliveryPoints();
        expect(fetchMock).toHaveBeenCalledTimes(2);

        // The order window still reads the catalog through the shared cache.
        await expect(api.catalog.products()).resolves.toEqual(products);
        await expect(api.catalog.deliveryPoints()).resolves.toEqual(points);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
