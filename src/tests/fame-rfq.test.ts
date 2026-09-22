import { describe, expect, it } from 'vitest';
import { fameRfqErrorKey, isFameQuoteExpired, isFameRfqOpen, mapFameQuoteResponse, mapFameRfqResponse, optionalRfqNumber, quotePricePerGj } from '../services/fameRfq';

describe('FAME RFQ wire values', () => {
    it('preserves unknown measurements and normalizes declared zero separately', () => {
        expect(optionalRfqNumber(null)).toBeNull();
        expect(optionalRfqNumber(undefined)).toBeNull();
        expect(optionalRfqNumber('')).toBeNull();
        expect(optionalRfqNumber('not-a-number')).toBeNull();
        expect(optionalRfqNumber('0')).toBe(0);
        const request = mapFameRfqResponse({
            id: 'request', quantity_mt: '200.5', target_price_per_mt: null,
            contract_terms: { max_cfpp_c: '0', max_ci_gco2e_mj: null, quantity_tolerance_pct: '5', min_fill_mt: '100' },
            quotes: [{ id: 'quote', price_per_mt_usd: '1100', offer_terms: { ci_gco2e_mj: null, lhv_mj_kg: '37.2', available_quantity_mt: '200.5' } }],
            execution_enabled: false, can_cancel: true,
        });
        expect(request.quantityMt).toBe(200.5);
        expect(request.targetPricePerMt).toBeNull();
        expect(request.contractTerms?.max_cfpp_c).toBe(0);
        expect(request.contractTerms?.max_ci_gco2e_mj).toBeNull();
        expect(request.quotes[0].offerTerms?.ci_gco2e_mj).toBeNull();
        expect(request.executionEnabled).toBe(false);
        expect(request.canCancel).toBe(true);
    });

    it('compares energy price only with a positive declared LHV', () => {
        const quote = mapFameQuoteResponse({ price_per_mt_usd: '1100', offer_terms: { lhv_mj_kg: '37.2' } });
        expect(quotePricePerGj(quote)).toBeCloseTo(29.56989, 4);
        expect(quotePricePerGj({ ...quote, offerTerms: null })).toBeNull();
        expect(quotePricePerGj({ ...quote, offerTerms: { ...quote.offerTerms!, lhv_mj_kg: 0 } })).toBeNull();
    });

    it('closes actions at the request deadline and treats missing quote expiry as unusable', () => {
        const now = Date.parse('2026-09-22T10:00:00Z');
        const request = mapFameRfqResponse({ status: 'QUOTED', expires_at: '2026-09-22T10:00:00Z' });
        expect(isFameRfqOpen(request, now)).toBe(false);
        expect(isFameRfqOpen({ ...request, expiresAt: '2026-09-22T11:00:00Z' }, now)).toBe(true);
        expect(isFameRfqOpen({ ...request, status: 'CANCELLED', expiresAt: '2026-09-22T11:00:00Z' }, now)).toBe(false);
        expect(isFameQuoteExpired(mapFameQuoteResponse({ expires_at: null }), now)).toBe(true);
        expect(isFameQuoteExpired(mapFameQuoteResponse({ expires_at: 'invalid' }), now)).toBe(true);
        expect(isFameQuoteExpired(mapFameQuoteResponse({ expires_at: '2026-09-22T09:59:59Z' }), now)).toBe(true);
    });

    it('gives localized recovery paths for stale edits, admission and invalid declarations', () => {
        const failure = (status: number, message: string) => Object.assign(new Error(message), { status });
        expect(fameRfqErrorKey(failure(409, 'Quote was revised; reload it before making changes'))).toBe('revisionConflict');
        expect(fameRfqErrorKey(failure(409, 'You have already quoted this RFQ'))).toBe('stateConflict');
        expect(fameRfqErrorKey(failure(403, 'Organization not approved'))).toBe('permissionError');
        expect(fameRfqErrorKey(failure(422, 'Declared CFPP must meet the RFQ maximum'))).toBe('validation.cfppLimit');
        expect(fameRfqErrorKey(failure(422, 'RFQ deadline must be on or before the delivery end date in Singapore'))).toBe('validation.requestExpiry');
    });
});
