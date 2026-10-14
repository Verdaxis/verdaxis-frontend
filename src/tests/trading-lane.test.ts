import { describe, expect, it } from 'vitest';

import { isPointInLane, resolveTradingLane } from '../utils/tradingLane';
import type { DeliveryPoint, Product } from '../types';

const deliveryPoints: DeliveryPoint[] = [
    { id: 'dp-singapore', name: 'Singapore', region: 'Asia', is_active: true },
    { id: 'dp-rotterdam', name: 'Rotterdam', region: 'Europe', is_active: true },
    { id: 'dp-santos', name: 'Santos', region: 'South America', is_active: true },
];

const product = (marketProduct: string, available_delivery_point_ids?: string[] | null): Product => ({
    id: `prod-${marketProduct}`,
    name: marketProduct,
    market_product: marketProduct as Product['market_product'],
    fuel_type: 'LNG',
    fuel_grade: 'Bio',
    unit: 'MT',
    min_lot_size: 1,
    is_active: true,
    ...(available_delivery_point_ids === undefined ? {} : { available_delivery_point_ids }),
});

describe('resolveTradingLane', () => {
    it('returns null when no product is selected', () => {
        expect(resolveTradingLane([product('BIO_LNG', ['dp-rotterdam'])], deliveryPoints, null)).toBeNull();
        expect(resolveTradingLane([product('BIO_LNG', ['dp-rotterdam'])], deliveryPoints, undefined)).toBeNull();
    });

    it('returns null when the product declares no lane', () => {
        expect(resolveTradingLane([product('BIO_METHANOL')], deliveryPoints, 'BIO_METHANOL')).toBeNull();
        expect(resolveTradingLane([product('BIO_METHANOL', null)], deliveryPoints, 'BIO_METHANOL')).toBeNull();
    });

    it('keeps the declared order of a restricted lane', () => {
        const lane = resolveTradingLane(
            [product('BIO_LNG', ['dp-rotterdam', 'dp-santos'])],
            deliveryPoints,
            'BIO_LNG',
        );
        expect(lane?.points.map(point => point.name)).toEqual(['Rotterdam', 'Santos']);
    });

    it('fails closed when the declared lane resolves to nothing', () => {
        // An empty declaration must not widen to every port.
        expect(resolveTradingLane([product('BIO_LNG', [])], deliveryPoints, 'BIO_LNG')?.points).toEqual([]);
        // Ids the catalog does not recognise are dropped, not assumed.
        expect(resolveTradingLane([product('BIO_LNG', ['dp-unknown'])], deliveryPoints, 'BIO_LNG')?.points).toEqual([]);
        // Delivery points that have not loaded yet cannot satisfy the lane.
        expect(resolveTradingLane([product('BIO_LNG', ['dp-rotterdam'])], [], 'BIO_LNG')?.points).toEqual([]);
    });

    it('ignores a product that the catalog does not list', () => {
        expect(resolveTradingLane([product('B30', ['dp-rotterdam'])], deliveryPoints, 'BIO_LNG')).toBeNull();
    });
});

describe('isPointInLane', () => {
    const lane = resolveTradingLane([product('BIO_LNG', ['dp-rotterdam'])], deliveryPoints, 'BIO_LNG')!;

    it('matches a port name case- and space-insensitively', () => {
        expect(isPointInLane(lane, 'Rotterdam')).toBe(true);
        expect(isPointInLane(lane, '  rotterdam ')).toBe(true);
    });

    it('rejects every other port and an empty name', () => {
        expect(isPointInLane(lane, 'Singapore')).toBe(false);
        expect(isPointInLane(lane, '')).toBe(false);
        expect(isPointInLane(lane, null)).toBe(false);
    });

    it('rejects everything for a lane that allows nothing', () => {
        const empty = resolveTradingLane([product('BIO_LNG', [])], deliveryPoints, 'BIO_LNG')!;
        expect(isPointInLane(empty, 'Rotterdam')).toBe(false);
    });
});
