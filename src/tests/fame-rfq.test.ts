import { describe, expect, it } from 'vitest';
import { mapFameFuelMeasurements, optionalRfqNumber } from '../services/fameRfq';

describe('FAME declaration wire values', () => {
    it('preserves unknown measurements and normalizes declared zero separately', () => {
        expect(optionalRfqNumber(null)).toBeNull();
        expect(optionalRfqNumber(undefined)).toBeNull();
        expect(optionalRfqNumber('')).toBeNull();
        expect(optionalRfqNumber('not-a-number')).toBeNull();
        expect(optionalRfqNumber('0')).toBe(0);
    });

    it('keeps an unknown measurement unknown and a declared zero as zero', () => {
        const mapped = mapFameFuelMeasurements({
            cfpp_c: '-5', cloud_point_c: '0', ci_gco2e_mj: null, lhv_mj_kg: undefined,
            quality_evidence: { status: 'AVAILABLE', results: [{ property: 'WATER_MG_KG', value: '125.5' }] },
            sustainability_evidence: { status: 'AVAILABLE', document_type: 'SD', quantity_mt: '500.50', due: 'BEFORE_LOADING' },
        } as unknown as Parameters<typeof mapFameFuelMeasurements>[0]);
        expect(mapped).toMatchObject({ cfpp_c: -5, cloud_point_c: 0, ci_gco2e_mj: null, lhv_mj_kg: null });
        expect(mapped.quality_evidence?.results[0].value).toBe(125.5);
        expect(mapped.sustainability_evidence?.quantity_mt).toBe(500.5);
    });
});
