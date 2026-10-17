/**
 * The one place where a backend decimal crosses into the app.
 *
 * The backend serializes `Decimal` as a JSON string ("200.00", "915.5"), while
 * the hand-written types in `src/types.ts` declare those fields as `number`
 * (DRIFT-1 in `docs/refactor/api-type-drift.md`). Converting at the boundary
 * keeps every consumer simple: it already expects a number.
 *
 * `parseWireDecimal` returns `null` for absent, empty, malformed or non-finite
 * input. It never returns `NaN`, so a caller can tell "no value" from a real
 * zero, and it never throws, so one bad field cannot break a whole response.
 */

/** Parse one wire decimal into a finite number, or `null` when it is unusable. */
export function parseWireDecimal(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (trimmed === '') return null;

    // `Number('')` is 0 and `Number(' 12 ')` is 12, so the trim above gates empties.
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}
