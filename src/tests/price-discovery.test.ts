import { describe, it, expect } from 'vitest';

describe('Benchmark pricing contracts', () => {
    it('should accept a benchmark quote keyed by market identity', () => {
        const quote: import('../types').BenchmarkQuote = {
            market_product: 'BIO_METHANOL',
            delivery_point_id: 'dp-singapore',
            delivery_point_name: 'Singapore',
            availability_window: 'SPOT',
            benchmark_price_per_mt_usd: 630,
            source: 'seed_matrix',
            generated_at: '2026-04-08T10:00:00Z',
        };

        expect(quote.market_product).toBe('BIO_METHANOL');
        expect(quote.benchmark_price_per_mt_usd).toBe(630);
    });

    it('should allow listings to carry premium discount data', () => {
        const listing: import('../types').OrderBookOrder = {
            id: 'listing-1',
            side: 'ASK',
            fuel_type: 'Methanol',
            fuel_grade: 'Bio',
            region: 'Singapore',
            quantity_mt: 1000,
            remaining_quantity_mt: 1000,
            price_per_mt_usd: 612,
            availability_window: 'SPOT',
            certifications: ['ISCC'],
            is_verdaxis_verified: true,
            tier_label: 'INDEPENDENT',
            status: 'OPEN',
            created_at: '2026-04-08T10:00:00Z',
            market_product: 'BIO_METHANOL',
            delivery_point_id: 'dp-singapore',
            benchmark_price_per_mt_usd: 630,
            premium_discount_per_mt_usd: -18,
        };

        expect(listing.premium_discount_per_mt_usd).toBe(-18);
    });

    it('should safely represent listings without a benchmark', () => {
        const listing: import('../types').OrderBookOrder = {
            id: 'listing-2',
            side: 'ASK',
            fuel_type: 'Ethanol',
            fuel_grade: 'Synthetic',
            region: 'Busan',
            quantity_mt: 1000,
            remaining_quantity_mt: 1000,
            price_per_mt_usd: 745,
            availability_window: 'SPOT',
            certifications: ['ISCC'],
            is_verdaxis_verified: true,
            tier_label: 'INDEPENDENT',
            status: 'OPEN',
            created_at: '2026-04-08T10:00:00Z',
            market_product: 'SYNTHETIC_ETHANOL',
            benchmark_price_per_mt_usd: null,
            premium_discount_per_mt_usd: null,
        };

        expect(listing.benchmark_price_per_mt_usd).toBeNull();
        expect(listing.premium_discount_per_mt_usd).toBeNull();
    });
});
