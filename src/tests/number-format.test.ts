import { describe, expect, it } from 'vitest';

import { formatQuantity, formatUsd } from '../utils/numberFormat';

const USD_CASES = [
    [1109, '1,109.00'],
    [200, '200.00'],
    [1000, '1,000.00'],
    [18.4, '18.40'],
    [0, '0.00'],
    [-5.5, '-5.50'],
    [1002140, '1,002,140.00'],
] as const;

const QUANTITY_CASES = [
    [1109, '1,109'],
    [200, '200'],
    [1000, '1,000'],
    [18.4, '18.4'],
    [200.5, '200.5'],
    [0, '0'],
] as const;

describe('formatUsd', () => {
    it.each(USD_CASES)('renders %s as %s', (value, text) => {
        expect(formatUsd(value)).toBe(text);
    });

    it('returns the empty string for an absent or unusable value', () => {
        expect(formatUsd(null)).toBe('');
        expect(formatUsd(undefined)).toBe('');
        expect(formatUsd(NaN)).toBe('');
        expect(formatUsd(Infinity)).toBe('');
    });
});

describe('formatQuantity', () => {
    it.each(QUANTITY_CASES)('renders %s as %s', (value, text) => {
        expect(formatQuantity(value)).toBe(text);
    });

    it('returns the empty string for an absent or unusable value', () => {
        expect(formatQuantity(null)).toBe('');
        expect(formatQuantity(undefined)).toBe('');
        expect(formatQuantity(NaN)).toBe('');
        expect(formatQuantity(Infinity)).toBe('');
    });

    it('groups by the locale it is given', () => {
        expect(formatQuantity(1000, 'en')).toBe('1,000');
        expect(formatQuantity(1234.5, 'de-DE')).toBe('1.234,5');
    });
});
