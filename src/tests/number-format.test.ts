import { describe, expect, it } from 'vitest';

import { formatQuantity, formatUsd } from '../utils/numberFormat';

/**
 * Decision 71: money and unit prices use the listing price column's format,
 * quantities use the My Orders table's format. The spellings in each case are
 * wire spellings of the same number — the text must not care which one arrived
 * (tracker decision 67).
 */
const USD_CASES: Array<[string, number, string]> = [
    ['1109', 1109, '1,109.00'],
    ['200.00', 200, '200.00'],
    ['1000.000000000000000000000000000000', 1000, '1,000.00'],
    ['18.40', 18.4, '18.40'],
    ['1.109E+3', 1109, '1,109.00'],
    ['0.00', 0, '0.00'],
    ['-5.50', -5.5, '-5.50'],
    ['1002140.00', 1002140, '1,002,140.00'],
];

const QUANTITY_CASES: Array<[string, number, string]> = [
    ['1109', 1109, '1,109'],
    ['200.00', 200, '200'],
    ['1000.000000000000000000000000000000', 1000, '1,000'],
    ['18.40', 18.4, '18.4'],
    ['200.50', 200.5, '200.5'],
    ['0.00', 0, '0'],
];

describe('formatUsd', () => {
    it.each(USD_CASES)('renders "%s" as %s', (_spelling, value, text) => {
        expect(formatUsd(value)).toBe(text);
    });

    it('keeps every spelling of one value identical', () => {
        const texts = new Set(['1109', '1109.0', '1109.00', '1.109E+3', ' 1109.00 ']
            .map(spelling => formatUsd(Number(spelling))));
        expect(texts.size).toBe(1);
    });

    it('returns the empty string for an absent or unusable value', () => {
        expect(formatUsd(null)).toBe('');
        expect(formatUsd(undefined)).toBe('');
        expect(formatUsd(NaN)).toBe('');
        expect(formatUsd(Infinity)).toBe('');
    });
});

describe('formatQuantity', () => {
    it.each(QUANTITY_CASES)('renders "%s" as %s', (_spelling, value, text) => {
        expect(formatQuantity(value)).toBe(text);
    });

    it('keeps every spelling of one value identical', () => {
        const texts = new Set(['1000', '1000.0', '1000.00', '1E+3', ' 1000 ']
            .map(spelling => formatQuantity(Number(spelling))));
        expect(texts.size).toBe(1);
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
