import { describe, expect, it } from 'vitest';

import { parseWireDecimal } from '../api/decimals';

describe('parseWireDecimal', () => {
    it('reads the decimal strings the backend sends', () => {
        expect(parseWireDecimal('200.00')).toBe(200);
        expect(parseWireDecimal('915.5')).toBe(915.5);
        expect(parseWireDecimal('0.00')).toBe(0);
        expect(parseWireDecimal('-12.25')).toBe(-12.25);
        expect(parseWireDecimal(' 500 ')).toBe(500);
        expect(parseWireDecimal('1e3')).toBe(1000);
        expect(parseWireDecimal('1000.000000000000000000000000000000')).toBe(1000);
    });

    it('passes finite numbers through unchanged', () => {
        expect(parseWireDecimal(200.5)).toBe(200.5);
        expect(parseWireDecimal(0)).toBe(0);
    });

    it('returns null for absent, empty or malformed values', () => {
        expect(parseWireDecimal(undefined)).toBeNull();
        expect(parseWireDecimal(null)).toBeNull();
        expect(parseWireDecimal('')).toBeNull();
        expect(parseWireDecimal('   ')).toBeNull();
        expect(parseWireDecimal('abc')).toBeNull();
        expect(parseWireDecimal('12mt')).toBeNull();
        expect(parseWireDecimal({})).toBeNull();
        expect(parseWireDecimal(true)).toBeNull();
        expect(parseWireDecimal([])).toBeNull();
    });

    it('returns null instead of NaN for non-finite values', () => {
        expect(parseWireDecimal(NaN)).toBeNull();
        expect(parseWireDecimal(Infinity)).toBeNull();
        expect(parseWireDecimal(-Infinity)).toBeNull();
        expect(parseWireDecimal('Infinity')).toBeNull();
        expect(parseWireDecimal('NaN')).toBeNull();
    });
});
