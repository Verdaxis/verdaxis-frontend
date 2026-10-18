/**
 * Shared display formatters for values that crossed the decimal boundary
 * (tracker decision 71).
 *
 * The boundary in `src/api/mappers.ts` converts each wire decimal into a
 * number exactly once. These formatters turn that number into the text the
 * main screens already show, so no display depends on how the wire spells a
 * value and the backend may respell a decimal (tracker decision 67) without
 * changing any screen.
 *
 * An absent or non-finite value formats as the empty string; a caller that
 * shows a placeholder instead applies it at the call site
 * (`format(x) || placeholder`).
 */

/**
 * Money and unit prices: the listing price column's format — grouped, exactly
 * two decimals. `1109` renders as `1,109.00`.
 */
export function formatUsd(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Quantities and measurements: the My Orders table's format — the locale's
 * plain number grouping, no forced decimals. `1000` renders as `1,000`,
 * `200.5` as `200.5`, `18.4` as `18.4`.
 */
export function formatQuantity(value: number | null | undefined, locale: Intl.LocalesArgument = 'en'): string {
    if (value == null || !Number.isFinite(value)) return '';
    return value.toLocaleString(locale);
}
