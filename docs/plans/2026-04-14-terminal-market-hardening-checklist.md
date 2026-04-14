# Terminal Market Hardening Checklist

**Date:** 2026-04-14
**Status:** Draft
**Branch:** `staging`

---

## Goal

Close the remaining gaps between Marketplace, Orderbook, Trade Tape, Market Terminal, and the indicative Forward Curve so Verdaxis presents one coherent market model.

---

## Priority Order

### 1. Forward Curve V1 Contract

Lock the forward curve to one clear v1 behavior:

- indicative only, not tradable
- keyed by `market_product + delivery_point`
- windows shown in a fixed, intentional order
- click on a point sends the user into the matching Marketplace slice
- empty states are explicit when no data exists

Deliverable:
- approved design/spec for curve behavior, windows, labels, and click-through semantics

### 2. Canonical Price Semantics

Remove the remaining `fuel_type`-family fallback from terminal pricing/reference logic over time.

Target model:
- `market_product`
- `delivery_point`
- `availability_window`

Current compromise:
- terminal still derives family-level pricing as `Methanol` or `Ethanol`

Follow-up:
- upgrade benchmark/reference APIs so terminal and marketplace use the same canonical market identity end-to-end

### 3. Demo Data Realism

Tighten the seeded/demo market so it looks intentional rather than synthetic.

Focus areas:
- realistic bid/ask ladders by product and port
- more consistent spread relationships
- more believable forward windows and curve shape
- trade tape chronology that matches the displayed market
- balanced distribution across the four approved products and six approved ports

### 4. Terminal / Curve UX Polish

Clean up the last presentation gaps once the data contract is settled.

Focus areas:
- clearer `indicative` labeling on the curve
- better distinction between benchmark line and non-firm signals
- explicit empty states when a selected product/port has no curve or no book
- keep port/product selectors visually aligned with Marketplace language

### 5. Documentation Consolidation

Create one short source-of-truth market behavior note covering:

- executable orderbook rules
- benchmark role
- trade tape role
- terminal role
- forward curve role

This should prevent future drift between screens.

### 6. Frontend Performance Debt

Not blocking for demo, but now visible:

- main frontend chunk is too large
- terminal/market surfaces are heavy

Follow-up later:
- code split heavier terminal/chart surfaces
- trim static/mock data imports from initial bundle

---

## Recommended Next Sequence

1. Approve and save the Forward Curve V1 design.
2. Implement the forward-curve UX/data contract.
3. Normalize demo seed data to match that contract.
4. Move terminal pricing endpoints to canonical market identity.
5. Run a final design-forge and smoke-test pass before prod promotion.
