# `tsc` mapper fix — `fix/fe-tsc-mappers`

`npm run typecheck:tsc` (plain `tsc --noEmit`, TypeScript 5.8) reported two
errors that `npm run typecheck` (`tsgo`, `@typescript/native-preview`) accepted,
so CI stayed green. Found 18 Oct during frontend step 8 Task 1, on branch
`fix/fe-tsc-mappers` from `origin/staging` (9b1dbc95).

## The two errors

```
src/api/mappers.ts(144,71): error TS2352: Conversion of type '{ ... }' to type
'OrderBookOrder' may be a mistake because neither type sufficiently overlaps
with the other. If this was intentional, convert the expression to 'unknown'
first.
  Types of property 'fame_terms' are incompatible.
    ...
      Types of property 'cfpp_c' are incompatible.
        Type 'string' is not comparable to type 'number'.

src/api/mappers.ts(172,53): error TS2352: Conversion of type '{ ... }' to type
'Trade' may be a mistake because neither type sufficiently overlaps with the
other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'fame_terms_snapshot' are incompatible.
    ...
      The types of 'bid.max_cfpp_c' are incompatible between these types.
        Type 'string' is not comparable to type 'number'.
```

The task brief quoted lines 152 and 180; the two assertions now sit at 144 and
172.

## Cause

`toOrderBookOrder` spreads a `WireOrder` and `toTrade` spreads a `WireTrade`
into the app result. Before either mapper runs, the product-terms layer
(`src/services/orderTerms.ts` → `src/services/fameOrder.ts` /
`src/services/lngOrder.ts`) has already replaced `fame_terms`, `lng_terms`,
`fame_terms_snapshot` and `lng_terms_snapshot` with the app shapes, converting
the wire's decimal strings (for example `cfpp_c` and `max_cfpp_c`) to numbers.
The generated wire type still describes the raw, pre-normalized form, so the
mapped record no longer overlaps the app type at those four fields. `tsc`
rejects the `as OrderBookOrder` / `as Trade` assertion; `tsgo`'s looser
comparability check accepted it.

## Fix

`src/api/mappers.ts` re-describes the spread source for those four fields
through the small `withMappedTerms` helper, so the object is the app shape at
`fame_terms`, `lng_terms` and their trade snapshots. The helper returns the same
object and adds or drops no property, so runtime behaviour is unchanged. The
mapper parameter types stay `WireOrder` / `WireTrade`, as
`src/api/contract.test-d.ts` pins them.

## Gates — staging test host

| Gate | Command | Exit |
|---|---|---|
| tsc | `npm run typecheck:tsc` | 0 |
| tsgo (CI) | `npm run typecheck` | 0 |
| tests | `npm run test` (135 files, 1006 tests) | 0 |
