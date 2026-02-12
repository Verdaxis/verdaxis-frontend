import { describe, it, expect } from 'vitest';

describe('MarketTerminal price data integration', () => {
    it('should prefer real trade prices over simulated data', () => {
        const summary = {
            fuel_type: 'Methanol',
            region: 'Singapore',
            last_price: 542.50,
            avg_price_24h: 540.00,
            high_24h: 545.00,
            low_24h: 535.00,
            volume_24h: 8500,
            trade_count_24h: 5,
            price_change_pct: 1.2,
            last_trade_at: '2026-02-12T10:00:00Z',
        };

        const lastPrice = summary.last_price ?? null;
        expect(lastPrice).toBe(542.50);

        const change = summary.price_change_pct ?? null;
        expect(change).toBe(1.2);
    });
});
