import { describe, it, expect } from 'vitest';

// Test the type shape
describe('PriceSummary type', () => {
    it('should accept a valid price summary object', () => {
        const summary: import('../types').PriceSummary = {
            fuel_type: 'Methanol',
            region: 'Singapore',
            last_price: 540,
            avg_price_24h: 538.5,
            high_24h: 545,
            low_24h: 532,
            volume_24h: 12500,
            trade_count_24h: 8,
            price_change_pct: 1.25,
            last_trade_at: '2026-02-12T10:30:00Z',
        };
        expect(summary.fuel_type).toBe('Methanol');
        expect(summary.trade_count_24h).toBe(8);
    });

    it('should accept null fields when no trades exist', () => {
        const summary: import('../types').PriceSummary = {
            fuel_type: 'Ammonia',
            region: 'Fujairah',
            last_price: null,
            avg_price_24h: null,
            high_24h: null,
            low_24h: null,
            volume_24h: 0,
            trade_count_24h: 0,
            price_change_pct: null,
            last_trade_at: null,
        };
        expect(summary.last_price).toBeNull();
    });
});
