import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { invalidateReadCache } from '../services/readCache';

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('catalog API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
        // The read cache is module state; each test must start from a cold read.
        invalidateReadCache();
    });

    it('loads product catalog reads from the catalog endpoint', async () => {
        const wireProducts = [
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL', min_lot_size: '200.00' },
        ];
        fetchMock.mockResolvedValue(jsonResponse(wireProducts));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.catalog.products();

        // The catalog boundary converts `min_lot_size` from the wire decimal
        // string into the number the hand-written `Product` type declares.
        expect(result).toEqual([{ ...wireProducts[0], min_lot_size: 200 }]);
        expect(typeof result[0]?.min_lot_size).toBe('number');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/products');
    });

    it('keeps an unusable catalog minimum out of the number reader', async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL' },
        ]));
        vi.stubGlobal('fetch', fetchMock);

        const [product] = await api.catalog.products();

        expect(product?.min_lot_size).toBeNaN();
    });

    it('loads delivery-point catalog reads from the catalog endpoint', async () => {
        const deliveryPoints = [
            { id: 'dp-1', name: 'Singapore', country: 'Singapore', active: true },
        ];
        fetchMock.mockResolvedValue(jsonResponse(deliveryPoints));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.catalog.deliveryPoints();

        expect(result).toEqual(deliveryPoints);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/delivery-points');
    });
});
