import { describe, expect, it } from 'vitest';

import { parseWireDecimal } from '../utils/wireDecimal';

describe('parseWireDecimal', () => {
    it('reads the exact decimal strings the backend sends', () => {
        expect(parseWireDecimal('200.00')).toBe(200);
        expect(parseWireDecimal('1.00')).toBe(1);
        expect(parseWireDecimal('915.5')).toBe(915.5);
        expect(parseWireDecimal('0.00')).toBe(0);
        expect(parseWireDecimal('-12.25')).toBe(-12.25);
    });

    it('passes finite numbers through unchanged', () => {
        expect(parseWireDecimal(200)).toBe(200);
        expect(parseWireDecimal(200.5)).toBe(200.5);
        expect(parseWireDecimal(0)).toBe(0);
    });

    it.each([
        undefined, null, '', '   ', ' 200.00 ', 'abc', '12mt', '1e3', '0x10', '200.', '.5', '+200',
        '1,000.00', {}, [], true,
    ])('refuses the absent, empty or malformed value %j', value => {
        expect(parseWireDecimal(value)).toBeNull();
    });

    it.each([NaN, Infinity, -Infinity, 'Infinity', '-Infinity', 'NaN'])('refuses the non-finite value %j', value => {
        expect(parseWireDecimal(value)).toBeNull();
    });
});
