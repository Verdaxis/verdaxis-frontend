# Orderbook Availability Window Redesign

**Date:** 2026-04-08
**Status:** Approved
**Branch:** `staging`

---

## Goal

Simplify the staging orderbook demo so trading is defined by product, delivery point, price, quantity, and a single availability window. Remove delivery-scheduling semantics from the resting book while keeping the architecture extensible for a future post-match logistics workflow.

---

## Product Decision

This demo is an executable orderbook, not a delivery scheduling tool.

- `Delivery Point` is mandatory.
- `Availability Window` is mandatory.
- `delivery_window_start` and `delivery_window_end` are not part of the orderbook interaction model.
- Any exact delivery logistics happen off-platform after counterparties are matched.

This keeps the demo simple while still preserving a realistic market key.

---

## Canonical Model

The system should stop treating availability as a static display label and instead treat it as a canonical market dimension.

### Stored value

Persist one frozen canonical value per order:

- `SPOT`
- `YYYY-MM` for current-quarter month buckets
- `YYYY-QN` for quarter buckets
- `YYYY-CAL` only as a legacy compatibility bucket for old staging data

Examples:

- `SPOT`
- `2026-04`
- `2026-05`
- `2026-Q3`
- `2027-CAL`

### Display value

The UI may render friendlier labels:

- `Spot`
- `M`
- `M+1`
- `M+2`
- `Q3 2026`

Relative month labels are display-only and must be resolved to absolute stored values before save. They must never be persisted as `M`, `M+1`, or `M+2`.

---

## Window Ladder

The picker should generate options from a canonical venue date, not the browser timezone.

### Rules

- Always include `Spot`.
- Include month buckets only for the remaining months in the current quarter.
- After the current quarter, show quarter buckets.
- Do not show forward-year labels like `Forward 2027`.
- Continue to render legacy calendar buckets already stored in staging, but do not offer them in the new picker.

### Example

If the venue date is in April 2026:

- `Spot`
- `M` -> `2026-04`
- `M+1` -> `2026-05`
- `M+2` -> `2026-06`
- `Q3 2026` -> `2026-Q3`
- `Q4 2026` -> `2026-Q4`

If the venue date is in June 2026:

- `Spot`
- `M` -> `2026-06`
- `Q3 2026` -> `2026-Q3`
- `Q4 2026` -> `2026-Q4`

---

## Matching Semantics

Once availability is mandatory, it must be part of the executable market key.

The effective match key becomes:

- `product_id`
- `delivery_point_id`
- `availability_window`

Two orders with different canonical windows must not auto-match, even if price crosses.

This rule also applies to:

- crossed-market indicators
- forward-curve grouping
- best bid / best ask displays
- any price suggestion logic using comparable orders or trades

---

## UI Behavior

### Order placement modal

- Keep `Delivery Point` in the primary form and mark it required.
- Keep `Availability Window` mandatory.
- It may live in an "Advanced Options" section only if the collapsed header always shows the selected value, for example `Availability: Spot`.
- Default `Availability Window` to `Spot`.
- Remove `Delivery Start` and `Delivery End` from the modal.

### Helper copy

Add one short explanation near the field:

`Availability Window defines when this order is marketable. Detailed delivery scheduling happens after a match.`

### Extension-friendly constraint

Do not overload the orderbook with logistics fields just because they might exist later. If precise scheduling is added in the future, attach it to a post-match negotiation or contract workflow, not to resting book orders.

---

## API and Type Decisions

- Keep the API field name `availability_window` for now to minimize surface churn.
- Change its allowed values to the canonical frozen representation.
- Remove `delivery_window_start` and `delivery_window_end` from orderbook create/update/response contracts.
- Keep old fields out of the orderbook domain entirely once this change lands.

This is the smallest change that remains extensible.

---

## Migration and Backward Compatibility

This is staging and demo data is not a source of truth, but the implementation should still be clean.

### Safe approach

- Treat old date-window fields as deprecated and remove them from orderbook code paths in one release.
- Regenerate seeds using canonical availability values.
- Update tests and `openapi.json` in the same pass.

### Historical data

There are existing rows in `orderbook_orders` and trades with missing order links. Since this is staging/demo data, the preferred path is cleanup and reseed rather than complex historical reinterpretation.

---

## Review Outcome

### PASS

- Making `delivery_point_id` required is directionally correct for an orderbook.
- Architecting for extension strengthens the case for canonical absolute window values.

### WARN

- A mandatory field in Advanced Options is risky unless the collapsed state shows the current value and validation state.

### FAIL

- Matching currently ignores `availability_window`.
- Frontend and backend still rely on `delivery_window_start/end` in multiple places.
- Static enum duplication will make the new ladder brittle unless canonical values are centralized.

---

## Recommended Approach

Implement the redesign as a single semantic change, not a cosmetic form tweak:

1. Introduce canonical availability-window generation and formatting utilities.
2. Make matching and analytics key on `product_id + delivery_point_id + availability_window`.
3. Remove `delivery_window_start/end` from the orderbook domain.
4. Update the modal and all adjacent surfaces to use the new window taxonomy consistently.

This is the simplest version that is still extensible.
