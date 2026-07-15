# RFNBO in the Market Identity — Design

**Date:** 2026-07-10
**Status:** Design for decision (roadmap H1.3 prep; blocks public API v1 freezing the slice grammar)
**Repos:** backend (models, execution policy, schemas, routers, tests) + frontend (order entry, marketplace surfaces, i18n)

## Why now

FuelEU Maritime grants RFNBOs (renewable fuels of non-biological origin, RED II delegated-acts compliant) a **2× GHG-savings multiplier through 2033**. That makes an RFNBO-qualified tonne economically non-fungible with a chemically similar non-RFNBO tonne for any EU-exposed buyer. Today the platform cannot express that distinction at execution time; a buyer who needs the multiplier has no way to post a bid that can only fill against qualifying supply. The public API (roadmap B3) will freeze the market grammar — this decision must land first.

## Current state (audited 2026-07-10)

- **Products already separate the fuel families.** `MarketProduct` = `BIO_METHANOL | E_METHANOL | BIO_ETHANOL | SYNTHETIC_ETHANOL`. E-fuels and bio-fuels never share a lane: product-level separation exists and is load-bearing across matching, benchmarks, curves, and watchlists.
- **Hard match key** (`matching_engine.match_order`): `product_id + delivery_point_id + availability_window` (+ side, status, price, org boundary). ARCHITECTURE.md states the standing rule: *supplier sustainability/compliance fields stay out of the hard market key.*
- **Qualifier machinery exists** (`app/services/execution_policy.py`): `order_is_execution_qualified` (off-spec and ask certification duties) and `orders_execution_compatible` (ask's `certification_scheme` must be in the bid's accepted `certifications`; a bid with no requirement accepts any qualified ask).

## The decision

**RFNBO qualification is a first-class executable qualifier on the existing execution-policy layer — not a new dimension of the hard market key, and not a certification-scheme string.**

- Not a hard-key dimension: the product split already separates the fuels; adding a key dimension would fragment already-thin liquidity and force every read model, benchmark, and curve to grow an axis.
- Not a scheme string (e.g. `certifications: ["RFNBO"]`): RFNBO is a *regulatory classification with product-eligibility coupling* — it interacts with which product is being listed and demands certification evidence of its own. Overloading the free-ish scheme string invites drift and makes the eligibility rule unenforceable.

Two facts, two fields:

| Fact | Field | Side |
|---|---|---|
| "This lot qualifies as RFNBO (evidence attached)" | `rfnbo_declared: bool` | ASK |
| "This bid may only fill against RFNBO lots" | `rfnbo_required: bool` | BID |

**Eligibility rule:** `rfnbo_declared=true` is only valid on RFNBO-eligible market products. One authoritative map, one module:

```python
# app/services/execution_policy.py (or a sibling rfnbo module)
RFNBO_ELIGIBLE_MARKET_PRODUCTS = {"E_METHANOL", "SYNTHETIC_ETHANOL"}
```

Bio-methanol and bio-ethanol are categorically not RFNBOs (biological origin); an e-methanol lot is *eligible* by pathway but only *qualified* when declared with certification evidence.

**Evidence duty:** an ask with `rfnbo_declared=true` must also satisfy the existing certification duty (`certification_declared=true` + non-empty `certification_scheme`) — an RFNBO claim without a certification scheme is not execution-qualified. (The scheme itself is not validated against an RFNBO-scope whitelist in this slice; that tightening belongs to the H3 certificate-dossier work.)

**Compatibility rule** (extends `orders_execution_compatible`, mirroring the certification asymmetry):

| bid.rfnbo_required | ask.rfnbo_declared | Compatible? |
|---|---|---|
| false | false | yes (today's behavior, unchanged) |
| false | true | yes — an RFNBO lot may fill a non-RFNBO bid |
| true | true | yes |
| true | false | **no** |

## What deliberately does not change

- The slice grammar (`market_product + delivery_point + availability_window`) — URLs, watchlists, curves, benchmarks, the forward-monitoring signal tables, and the future public API keep their shape.
- Depth/aggregate read models: one book per slice; RFNBO rows are flagged, not segregated. (If real flow later justifies RFNBO-only sub-marks in the H4 index, that is an assessment-layer decision, not a book split.)
- The demo/real execution wall, org boundaries, price-time priority.
- Legacy open orders: both fields default `false`, which reproduces today's matching exactly.

## Changes by file (backend)

1. `app/models/orderbook.py` — `rfnbo_declared`, `rfnbo_required` booleans, `nullable=False, default=False, server_default="false"`.
2. `alembic/versions/rfnbo_20260710_order_flags.py` — add both columns; no backfill needed.
3. `app/services/execution_policy.py` — `RFNBO_ELIGIBLE_MARKET_PRODUCTS`; extend `order_is_execution_qualified` (ask declaring RFNBO ⇒ certification duty) and `orders_execution_compatible` (table above). Matching-engine loop needs no change — it already routes every candidate pair through `orders_execution_compatible`.
4. `app/schemas/orderbook.py` — both flags on create/response schemas; ASK-create validator rejects `rfnbo_declared` on ineligible products with a clear message; BID-create accepts `rfnbo_required` on any product (a bid on `BIO_METHANOL` with `rfnbo_required=true` is *valid but unfillable by construction* — reject it too, same eligibility map, to fail loudly at entry rather than silently never matching).
5. `app/routers/orderbook.py` — persist flags; extend the ASK-template endpoint (`/orderbook/my/latest-ask-template`) to carry the last RFNBO declaration; optional `rfnbo=true` filter on public orderbook/listing reads.
6. Audit: `order.created` metadata gains both flags (registry constants unchanged; metadata only).
7. OpenAPI snapshot regeneration.

## Changes by file (frontend)

1. `types.ts` — flags on order/listing interfaces.
2. `supplier/CreateListingModal.tsx` + listing console: "RFNBO (RED-compliant e-fuel)" toggle, rendered only for eligible products, hard-tied to the existing certification fields.
3. `buyer/CreateBidModal.tsx`: "Require RFNBO (2× FuelEU multiplier through 2033)" checkbox, enabled only for eligible products.
4. Marketplace/orderbook rows: compact RFNBO badge (extend `trading/MarketActivityBadge.tsx` patterns); "RFNBO only" filter chip.
5. i18n: EN + ZH keys for the toggle, badge, filter, and the ineligible-product validation message.

## Edge cases that will bite

1. **Unfillable-by-construction bids:** `rfnbo_required` on `BIO_METHANOL` would rest forever. Reject at entry (schema), not silently at match time.
2. **Eligibility drift:** the eligible set lives in exactly one backend module; the frontend must read eligibility from the product catalog response (add `rfnbo_eligible` to the product payload) rather than hardcoding a mirror list.
3. **Ask template reset:** the template endpoint currently resets off-spec state; an RFNBO declaration must survive template reuse only when the template's product is still eligible.
4. **Demo lots may declare RFNBO** (harmless — demo never executes), but seeded demo asks should include a mix so the badge renders in demos without implying real supply.
5. **Auto-match on insert:** the new compatibility check runs inside `match_order`'s locked loop — no extra query; the flags ride on the already-selected rows.
6. **RFNBO ≠ certification scheme:** a bid may simultaneously require RFNBO *and* restrict schemes; both filters apply (AND), matching the existing scheme semantics.

## Test plan

Backend: the 4-row compatibility matrix; eligibility rejection on both sides; RFNBO-ask-without-cert not qualified; auto-match respects `rfnbo_required` (bid rests when only non-RFNBO asks cross on price); template round-trip; API filter. Frontend: toggle visibility per product; bid checkbox gating; badge rendering; filter behavior. Meta: OpenAPI snapshot diff reviewed.

## Acceptance criteria

- [ ] A real-org BID with `rfnbo_required=true` on E_METHANOL crosses in price with a non-RFNBO ASK and does **not** trade; posts against an `rfnbo_declared` ASK and trades.
- [ ] `rfnbo_declared=true` rejected (422, message naming eligible products) on BIO_METHANOL/BIO_ETHANOL asks; same for `rfnbo_required` bids.
- [ ] An `rfnbo_declared` ASK without certification scheme is not execution-qualified (rests, never auto-matches).
- [ ] Legacy orders (flags absent/false) match byte-for-byte as before the migration (regression suite green).
- [ ] Product catalog exposes `rfnbo_eligible`; fe renders the toggle/checkbox only from that field.
- [ ] Slice grammar unchanged: no new URL/query dimension anywhere except the optional `rfnbo` read filter.
- [ ] OpenAPI snapshot updated; audit `order.created` metadata carries both flags.
