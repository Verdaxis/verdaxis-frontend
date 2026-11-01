/**
 * Reads a decimal value from an API response.
 *
 * The backend sends decimal fields as JSON strings in plain decimal notation
 * ("200.00", "-12.25"). This accepts that exact form or a finite JSON number.
 * Anything else (empty, padded, exponent, hexadecimal, grouped, non-finite or
 * not a string or number) returns `null`, so a caller can refuse the value
 * instead of using a wrong number. It never returns `NaN` and never throws.
 */
const EXACT_DECIMAL = /^-?\d+(?:\.\d+)?$/;

export function parseWireDecimal(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== 'string' || !EXACT_DECIMAL.test(value)) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
