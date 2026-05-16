import { afterEach, describe, expect, it, vi } from 'vitest';

import { __resetApiReadCachesForTests, api } from '../services/api';

const fetchMock = vi.fn();

describe('catalog API read cache', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
        __resetApiReadCachesForTests();
    });

    it('dedupes and reuses product catalog reads while fresh', async () => {
        const products = [
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL' },
        ];
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(products), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const [first, second] = await Promise.all([
            api.catalog.products(),
            api.catalog.products(),
        ]);
        const third = await api.catalog.products();

        expect(first).toEqual(products);
        expect(second).toEqual(products);
        expect(third).toEqual(products);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/products');
    });

    it('dedupes and reuses delivery-point catalog reads while fresh', async () => {
        const deliveryPoints = [
            { id: 'dp-1', name: 'Singapore', country: 'Singapore', active: true },
        ];
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(deliveryPoints), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const [first, second] = await Promise.all([
            api.catalog.deliveryPoints(),
            api.catalog.deliveryPoints(),
        ]);
        const third = await api.catalog.deliveryPoints();

        expect(first).toEqual(deliveryPoints);
        expect(second).toEqual(deliveryPoints);
        expect(third).toEqual(deliveryPoints);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/delivery-points');
    });
});
