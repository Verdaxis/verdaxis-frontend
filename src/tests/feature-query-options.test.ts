import { describe, expect, it } from 'vitest';
import { marketplaceQueries } from '../features/marketplace/api/marketplaceQueries';
import { orderbookQueries } from '../features/orderbook/api/orderbookQueries';

describe('feature query options', () => {
    it('uses existing TTLs and canonical keys without retries or background intervals', () => {
        expect(marketplaceQueries.products()).toMatchObject({ queryKey: ['public', 'catalog', 'products'], staleTime: 300_000, retry: false });
        expect(marketplaceQueries.deliveryPoints().staleTime).toBe(300_000);
        expect(marketplaceQueries.listings({ side: 'ASK', skip: 8 }).staleTime).toBe(15_000);
        expect(marketplaceQueries.counts({ side: 'BID' }).staleTime).toBe(15_000);
        expect(marketplaceQueries.myOrders([1, 'user', 'org', null]).staleTime).toBe(10_000);
        expect(marketplaceQueries.overlay([1, 'user', 'org', null], ['b', 'a', 'a']).queryKey).toEqual(['private', [1, 'user', 'org', null], 'compliance', 'pricing-overlay', ['a', 'b']]);
        // The ASK id set is the whole freshness input: one read per distinct set.
        expect(marketplaceQueries.overlay([1, 'user', 'org', null], ['a']).staleTime).toBe(Infinity);
        expect(orderbookQueries.snapshot({ product: 'B30', deliveryPointId: 'sg', window: 'SPOT' })).toMatchObject({ staleTime: 9000, retry: false });
    });
});
