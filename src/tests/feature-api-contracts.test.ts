import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { marketplaceApi } from '../features/marketplace/api/marketplaceApi';
import { orderbookApi } from '../features/orderbook/api/orderbookApi';
import { api } from '../services/api';
import { invalidateReadCache } from '../services/readCache';
import { setAccessToken } from '../services/authToken';

const wire = { id: 'order', quantity_mt: '500.00', remaining_quantity_mt: '500.00', price_per_mt_usd: '915.00' };
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { invalidateReadCache(); setAccessToken('token'); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe('feature read contracts', () => {
    it.each(['ASK', 'BID'] as const)('keeps %s pagination and public transport policy', async side => {
        vi.mocked(fetch).mockResolvedValue(response({ items: [wire], total: 1, skip: 8, limit: 8 }));
        const result = await marketplaceApi.listings({ side, region: 'Rotterdam', deliveryPointId: 'sg', product: 'B30', window: 'SPOT', sort: 'price_asc', skip: 8 });
        expect(result.items[0]).toMatchObject({ quantity_mt: 500, price_per_mt_usd: 915 });
        const [url, options] = vi.mocked(fetch).mock.calls[0];
        expect(url).toBe(`/api/orderbook/${side === 'ASK' ? 'asks' : 'bids'}?delivery_point_id=sg&market_product=B30&availability_window=SPOT&sort_by=price_asc&skip=8&limit=8`);
        expect(options?.credentials).toBe('omit');
        expect(new Headers(options?.headers).has('Authorization')).toBe(false);
        expect(new Headers(options?.headers).has('Content-Type')).toBe(false);
    });

    it('bypasses legacy values and pending work without invalidating them', async () => {
        vi.mocked(fetch).mockImplementation(async () => response([{ ...wire, quantity_mt: '500.00' }]));
        await api.orderbook.listAsksPaged({ limit: 8 });
        vi.mocked(fetch).mockImplementation(async () => response({ items: [{ ...wire, quantity_mt: '700.00' }], total: 1 }));
        const result = await marketplaceApi.listings({ side: 'ASK' });
        expect(result.items[0].quantity_mt).toBe(700);
        expect(fetch).toHaveBeenCalledTimes(2);
        await api.orderbook.listAsksPaged({ limit: 8 });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('uses exact snapshot params and maps coherent depth', async () => {
        vi.mocked(fetch).mockResolvedValue(response({ bids: [wire], asks: [wire], generated_at: '2026-10-19T00:00:00Z' }));
        const snapshot = await orderbookApi.snapshot({ product: 'B30', deliveryPointId: 'sg', window: 'SPOT' });
        expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/orderbook/snapshot?market_product=B30&delivery_point_id=sg&availability_window=SPOT');
        expect(snapshot.bids[0].quantity_mt).toBe(500);
        expect(snapshot.generated_at).toBe('2026-10-19T00:00:00Z');
    });

    it('keeps overlay POST body and rejects a late private scope', async () => {
        let finish!: (response: Response) => void;
        vi.mocked(fetch).mockReturnValue(new Promise(resolve => { finish = resolve; }));
        const pending = marketplaceApi.pricingOverlay(['b', 'a']);
        const [, options] = vi.mocked(fetch).mock.calls[0];
        expect(options?.method).toBe('POST');
        expect(options?.body).toBe(JSON.stringify({ order_ids: ['b', 'a'] }));
        expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer token');
        setAccessToken('next-token'); finish(response({ items: [] }));
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('preserves catalog, counts and owned-order request contracts', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(response([{ id: 'b30', min_lot_size: '200.00' }]))
            .mockResolvedValueOnce(response([{ id: 'sg', name: 'Singapore' }]))
            .mockResolvedValueOnce(response({ counts: { B30: 1 }, total: 1 }))
            .mockResolvedValueOnce(response({ items: [wire] }));
        expect((await marketplaceApi.products())[0].min_lot_size).toBe(200);
        await marketplaceApi.deliveryPoints();
        await marketplaceApi.counts({ side: 'ASK', region: 'ignored', deliveryPointId: 'sg', window: 'SPOT' });
        expect((await marketplaceApi.myOrders())[0].quantity_mt).toBe(500);
        expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
            '/api/catalog/products', '/api/catalog/delivery-points',
            '/api/orderbook/product-counts?side=ASK&delivery_point_id=sg&availability_window=SPOT&include_off_spec=false',
            '/api/orderbook/my',
        ]);
        expect(new Headers(vi.mocked(fetch).mock.calls[3][1]?.headers).get('Authorization')).toBe('Bearer token');
    });

    it('passes caller cancellation through the existing transport', async () => {
        const controller = new AbortController();
        vi.mocked(fetch).mockImplementation(async (_url, options) => {
            expect(options?.signal).toBeDefined();
            controller.abort();
            throw new DOMException('Cancelled', 'AbortError');
        });
        await expect(marketplaceApi.products(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    });
});
