# Green Fuels Market Model Redesign

**Date:** 2026-04-08
**Status:** Approved
**Branch:** `staging`

---

## Goal

Replace the current shallow fuel catalog and orderbook-centric demo model with a benchmark-driven green-fuels market model that supports rich supplier disclosure without overwhelming buyers.

The platform should present a simple commercial surface to buyers while retaining deeper sustainability, certification, and technical data for supplier listings, diligence, filtering, and future extensions.

---

## Product Decision

Verdaxis should stop treating fuel identity as a loose combination of `fuel_type` and `fuel_grade`.

Instead, the commercial market surface should be a controlled set of buyer-facing products:

- `Bio Methanol`
- `e-Methanol`
- `Bio Ethanol`
- `e-Ethanol`

These are the only primary market products exposed in the demo.

Everything else becomes structured listing metadata rather than a first-class orderbook product dimension.

---

## Market Model

### Core market identity

Each listing, benchmark, and buyer request should resolve to one canonical market identity:

- `market_product`
- `delivery_point`
- `availability_window`

This is the key used for:

- benchmark lookup
- premium / discount calculations
- supplier-to-buyer matchmaking
- headline market segmentation

### Rich attribute pack

Each supplier listing should also carry a structured attribute pack:

- `molecule`
- `pathway`
- `feedstock`
- `origin`
- `ci_value_gco2e_mj`
- `ci_method`
- `cert_scheme`
- `standard_code`
- `msds_available`
- `off_spec`
- `off_spec_notes`
- later: `ccs_enabled`, `ccs_notes`, `carbon_source`

This attribute pack is for:

- diligence
- advanced filtering
- benchmark diagnostics
- supplier differentiation
- future compliance workflows

It is not part of the default benchmark or matchmaking key.

---

## Benchmark Logic

Verdaxis should no longer lean on a live executable orderbook as the primary commercial model for this demo.

Instead, each listing should be priced relative to a benchmark.

### Canonical benchmark key

Benchmarks must be keyed by:

- `market_product`
- `delivery_point`
- `availability_window`

The benchmark must exist from day one at this level, not as one global number per product.

Examples:

- `Bio Methanol + Singapore + Spot`
- `e-Methanol + Rotterdam + M+1`
- `Bio Ethanol + ARA + Q3 2026`
- `e-Ethanol + Houston + Spot`

### Listing display

Each listing should show:

- absolute price
- benchmark price
- premium or discount versus benchmark

Example:

`$612/MT (-$18/MT vs Singapore Spot Bio Methanol benchmark)`

### Benchmark discipline

Premium / discount should be computed from the benchmark, not from other live listings.

This avoids self-referential pricing and unstable comparisons.

---

## Matchmaking Model

The demo should move away from auto-crossing executable orderbook semantics and toward matchmaking.

### Matchmaking hard filters

- `market_product`
- `delivery_point`
- `availability_window`
- certified platform-eligible listing

### Matchmaking soft ranking

- closeness to target price or best discount / premium versus benchmark
- quantity fit
- documentation completeness
- optional later ranking by CI or other buyer preferences

### Off-spec handling

Off-spec listings may exist, but they must not be treated as normal benchmark-comparable supply.

Default behavior:

- visible with a clear warning
- excluded from default benchmark comparison and standard match ranking
- only included when explicitly enabled or routed through a manual / exception workflow

---

## Certification Rule

Verdaxis should operate on a certified-only default market assumption.

That means certification is primarily a platform admission and trust rule, not a buyer-facing market selector.

### Supplier requirement

Suppliers should provide a declaration confirming that the listing is certified and should specify the applicable scheme.

Examples:

- `ISCC`
- future additional accepted schemes if needed

### Buyer experience

Buyers should not need to choose certification in the basic flow.

They should simply see that the listing is certified, with the ability to inspect the details.

---

## UX Split

### Buyer-facing surface

Buyers should see a minimal commercial surface:

- market product
- delivery point
- availability window
- quantity
- price
- premium / discount versus benchmark
- certification badge
- optional compact CI summary
- off-spec warning if relevant

Everything else should sit behind expandable detail sections or advanced filters.

### Supplier-facing input

Supplier listing creation should be progressive and layered.

#### Commercial section

- market product
- delivery point
- availability window
- quantity
- price

#### Compliance section

- certification declaration checkbox
- certification scheme
- standard / spec
- MSDS

#### Sustainability section

- CI value
- CI methodology
- feedstock
- origin
- later CCS details

#### Exception section

- off-spec toggle
- off-spec notes
- supporting document upload

Exception fields should only appear when relevant.

---

## Seller Defaults

Supplier forms should default to the supplier's latest listing configuration where that reduces repetitive work.

### Safe prefill fields

- market product
- delivery point
- availability window
- cert scheme
- declaration defaults
- standard / spec
- commonly repeated sustainability fields

### Careful prefill fields

- quantity
- price

These may be prefilled, but they should be treated as editable commercial inputs rather than authoritative defaults.

### Never auto-carry

- `off_spec`
- `off_spec_notes`

These must always require an explicit fresh supplier action.

---

## Data Model Recommendation

The recommended shape is:

### Canonical market product

A controlled enum for the four commercial products:

- `BIO_METHANOL`
- `E_METHANOL`
- `BIO_ETHANOL`
- `SYNTHETIC_ETHANOL`

### Derived internal fields

The platform may derive:

- `molecule`
- `pathway`

from `market_product` rather than allowing arbitrary combinations in the UI.

This prevents invalid or overlapping combinations.

### Listing metadata

The richer sustainability and technical fields should be stored separately from the commercial market identity.

This keeps liquidity concentrated while leaving room for richer differentiation later.

---

## Why This Is Better Than the Current Model

The current model is too shallow for supplier disclosure and too vague for accurate benchmark segmentation.

If all the deep sustainability and technical attributes become first-class product dimensions, the market fragments and buyers get lost.

If all those attributes are collapsed into a single flat label, suppliers lose the ability to describe what they are actually offering.

This redesign keeps the market simple where it needs to be simple and specific where it needs to be specific.

---

## Recommended Approach

Implement the green-fuels redesign as a benchmark-and-matchmaking market model:

1. Replace generic fuel catalog identity with the four controlled market products.
2. Introduce benchmark keys based on product, delivery point, and availability window.
3. Move rich sustainability and technical attributes into structured listing metadata.
4. Rework supplier listing creation into a layered flow with latest-listing defaults.
5. Present buyers with simple benchmark-relative pricing and optional deep details.

This is the simplest design that still supports future sophistication.
