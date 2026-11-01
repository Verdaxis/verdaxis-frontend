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
        const products = [
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL', min_lot_size: 200 },
        ];
        fetchMock.mockResolvedValue(jsonResponse(products));
        vi.stubGlobal('fetch', fetchMock);

        const result = await api.catalog.products();

        expect(result).toEqual(products);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/catalog/products');
    });

    const catalogMinimum = async (wireValue: unknown) => {
        fetchMock.mockResolvedValue(jsonResponse([
            { id: 'product-1', name: 'Bio Methanol', market_product: 'BIO_METHANOL', min_lot_size: wireValue },
        ]));
        vi.stubGlobal('fetch', fetchMock);
        const [product] = await api.catalog.products();
        return product?.min_lot_size;
    };

    it.each([
        ['200.00', 200],
        ['1.00', 1],
        [200, 200],
    ])('reads the catalog minimum %j as the number %d', async (wireValue, expected) => {
        await expect(catalogMinimum(wireValue)).resolves.toBe(expected);
    });

    it.each([
        undefined, null, '', 'abc', '1e3', ' 200.00 ', '0.00', 0, '-5.00', -5, 'NaN', 'Infinity',
    ])('refuses the unusable catalog minimum %j', async wireValue => {
        await expect(catalogMinimum(wireValue)).resolves.toBeNull();
    });

    it('keeps the other product fields unchanged', async () => {
        const wireProduct = {
            id: 'product-1', name: 'B30', market_product: 'B30', fuel_type: 'Biofuel', fuel_grade: 'B30',
            unit: 'MT', min_lot_size: '200.00', is_active: true, available_delivery_point_ids: ['dp-1'],
        };
        fetchMock.mockResolvedValue(jsonResponse([wireProduct]));
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.catalog.products()).resolves.toEqual([{ ...wireProduct, min_lot_size: 200 }]);
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
