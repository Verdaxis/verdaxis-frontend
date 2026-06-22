import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

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
    });

    it('loads product catalog reads from the catalog endpoint', async () => {
        const products = [
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL' },
        ];
        fetchMock.mockResolvedValue(jsonResponse(products));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.catalog.products();

        expect(result).toEqual(products);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/products');
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
