import { describe, it, expect } from 'vitest';

describe('DemandSignal type', () => {
    it('should represent an anonymized demand signal', () => {
        const signal: import('../types').DemandSignal = {
            fuel_type: 'Methanol',
            region: 'Singapore',
            volume_mt: 2000,
            max_price_per_mt: 560,
            urgency: 'HIGH',
            bid_count: 3,
            earliest_delivery: 'Spot',
            created_at: '2026-02-12T00:00:00Z',
        };
        expect(signal.urgency).toBe('HIGH');
        expect(signal.bid_count).toBe(3);
    });
});
