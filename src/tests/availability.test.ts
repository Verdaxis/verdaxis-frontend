import { describe, it, expect } from 'vitest';

describe('PortFuelAvailability type', () => {
    it('should classify availability levels', () => {
        const avail: import('../types').PortFuelAvailability = {
            port_id: 'sg-sin',
            port_name: 'Singapore',
            lat: 1.29,
            lng: 103.85,
            fuel_type: 'Methanol',
            total_stock_mt: 5000,
            supplier_count: 3,
            availability_level: 'AVAILABLE',
            avg_price_per_mt: 540,
        };
        expect(avail.availability_level).toBe('AVAILABLE');
    });

    it('should handle no availability', () => {
        const avail: import('../types').PortFuelAvailability = {
            port_id: 'ae-fuj',
            port_name: 'Fujairah',
            lat: 25.12,
            lng: 56.33,
            fuel_type: 'Methanol',
            total_stock_mt: 0,
            supplier_count: 0,
            availability_level: 'NONE',
            avg_price_per_mt: null,
        };
        expect(avail.availability_level).toBe('NONE');
    });
});
