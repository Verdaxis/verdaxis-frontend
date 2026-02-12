import { describe, it, expect } from 'vitest';

describe('ProducerProject type', () => {
    it('should represent a fuel production facility', () => {
        const project: import('../types').ProducerProject = {
            id: 'proj-1',
            name: 'Jurong Green Methanol',
            fuel_type: 'Methanol',
            capacity_kt_per_year: 500,
            country: 'Singapore',
            region: 'Southeast Asia',
            lat: 1.29,
            lng: 103.85,
            cod_year: 2027,
            status: 'ANNOUNCED',
            data_source: 'GENA',
            created_at: '2026-02-12T00:00:00Z',
        };
        expect(project.fuel_type).toBe('Methanol');
        expect(project.cod_year).toBe(2027);
    });
});
