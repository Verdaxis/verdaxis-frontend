import { describe, expect, it } from 'vitest';

import { parseWireDecimal } from '../api/decimals';

describe('parseWireDecimal', () => {
    it('reads the decimal strings the backend sends', () => {
        expect(parseWireDecimal('200.00')).toBe(200);
        expect(parseWireDecimal('915.5')).toBe(915.5);
        expect(parseWireDecimal('0')).toBe(0);
        expect(parseWireDecimal('-12.25')).toBe(-12.25);
        expect(parseWireDecimal(' 500 ')).toBe(500);
        expect(parseWireDecimal('1e3')).toBe(1000);
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

    it('keeps zero distinguishable from absent', () => {
        expect(parseWireDecimal('0.00')).toBe(0);
        expect(parseWireDecimal('0.00')).not.toBeNull();
    });

    it('round-trips a wire string to the exact number the display formatter receives', () => {
        // The order form renders the minimum as `number.toLocaleString(locale)`.
        // The same number therefore produces the same text as an unwrapped value,
        // so converting at the boundary changes no formatted output.
        for (const [wire, number] of [['200.00', 200], ['200.50', 200.5], ['1000.00', 1000]] as const) {
            const parsed = parseWireDecimal(wire);
            expect(parsed).toBe(number);
            expect(String(parsed)).toBe(String(number));
        }
    });
});
