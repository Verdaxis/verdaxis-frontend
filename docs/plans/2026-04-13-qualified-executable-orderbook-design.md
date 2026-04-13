# Qualified Executable Orderbook Redesign

**Date:** 2026-04-13
**Status:** Approved
**Branch:** `staging`
**Supersedes:** parts of `2026-04-08-green-fuels-market-model-design.md`

---

## Goal

Restore Verdaxis as a transparent executable market rather than a pure listings board, while avoiding liquidity fragmentation from overly specific fuel attributes.

Users should:

- post `BID` and `ASK` orders
- hit resting bids or asks directly
- see real order status and quantity erosion
- filter by richer fuel attributes without forcing every attribute into a separate book

Verdaxis should not use private 1:1 negotiation as the main trading path.

---

## Product Decision

Verdaxis should operate as a **qualified executable orderbook**.

That means:

- suppliers post `ASK` orders
- buyers post `BID` orders
- counterparties hit live orders directly
- fills are real and affect remaining quantity
- the marketplace is transparent and competitive

Verdaxis should not use `Inquire` as the primary action on executable rows.

The product should no longer be described as a benchmark-only listings marketplace. Benchmarks remain important, but they are supporting market context rather than the primary commercial model.

---

## Core Market Identity

The stable slice identity remains:

- `market_product`
- `delivery_point`
- `availability_window`

This slice identity is used for:

- book segmentation
- watchlist slices
- default market summaries
- benchmark lookup
- high-level liquidity displays

This identity should remain intentionally shallow so the market does not fragment into tiny inactive books.

---

## Qualified Execution Model

### Executable fields

The fields that must be satisfied for a normal hit are:

- `market_product`
- `delivery_point`
- `availability_window`
- `certification_scheme`
- `price`
- `quantity`

`certification_scheme` is now treated as a hard execution qualifier, not just display metadata.

### Filterable fields

These fields are visible and filterable, but do not define the book by default:

- `specification_standard`
- `msds_available`
- `carbon_intensity_gco2_mj`
- `carbon_intensity_method`
- `feedstock`
- `origin`

### Informational or derived fields

These fields should not drive matching logic directly:

- `fuel_type`
- `fuel_grade`
- `product_name`
- `region`
- `tier_label`
- `is_verdaxis_verified`

### Special-case fields

- `off_spec`
- `off_spec_notes`

Off-spec orders must be treated as a separate exception lane:

- excluded from normal executable views by default
- excluded from standard benchmark comparisons
- only shown or made actionable when the user explicitly opts in

---

## Central Field Policy

Field role assignment must be centralized rather than hard-coded in multiple places.

Verdaxis should define one shared policy model for order attributes:

- `EXECUTABLE`
- `FILTERABLE`
- `INFORMATIONAL`
- `EXCEPTION`

This policy should drive:

- frontend filter rendering
- hit validation
- orderbook row badges
- watchlist slice identity rules
- future promotion/demotion of fields

This is the main guardrail that allows Verdaxis to promote or demote fields later without breaking the data model.

---

## Execution Semantics

### Posting

Users post normal bids and asks with:

- side
- slice identity
- quantity
- price
- certification scheme
- supplier attribute pack when applicable

### Hitting

When a counterparty hits an order:

- a real trade record is created
- remaining quantity is reduced
- order status becomes `PARTIALLY_FILLED` or `FILLED` as appropriate

### Marketplace language

Executable rows must use truthful action labels:

- buyer on an ask: `Hit Ask` or `Buy`
- seller on a bid: `Hit Bid` or `Sell`

`Inquire` must not be used for an action that mutates quantity or creates an executable trade.

---

## Benchmark Role

Benchmarks remain keyed by:

- `market_product`
- `delivery_point`
- `availability_window`

Benchmarks should continue to show:

- absolute benchmark
- listing premium or discount vs benchmark

But certification scheme does **not** become part of the benchmark key yet.

Reason:

- certification is executable
- certification is visible
- certification can be filtered
- but making certification benchmark-defining immediately would likely fragment the market too early

Verdaxis should be designed so certification-aware benchmarks can be added later if the market starts showing durable scheme-driven price separation.

---

## Watchlist Impact

Watchlist slice identity stays shallow:

- `market_product`
- `delivery_point`
- `availability_window`

It should not include `certification_scheme` in v1.

Rationale:

- users generally watch a market pocket first
- certification differences matter for execution
- certification differences should appear in the visible rows and pinned-item details
- watchlists should not split into multiple nearly identical slices too early

Pinned order snapshots must continue to capture exact order attributes, including certification scheme.

---

## UX Rules

### Marketplace

Marketplace should feel like a real book again:

- visible asks and bids
- real statuses
- real quantity erosion
- benchmark-relative context
- richer filters

Normal default view should exclude off-spec rows.

### Filters

Filters should support richer selection across attribute-pack fields without changing the underlying book identity.

At minimum:

- `market_product`
- `delivery_point`
- `availability_window`
- `certification_scheme`
- off-spec toggle

Later:

- origin
- feedstock
- spec
- CI ranges

### Supplier and buyer forms

Both sides still post normal orders.

Supplier forms remain richer because suppliers disclose more metadata.

Buyer forms may later expose a smaller attribute set while still creating executable bids.

---

## Migration / Compatibility

This change is a behavioral correction more than a schema rewrite.

Most existing structures can remain:

- orderbook orders
- trades
- benchmarks
- watchlists

The main work is:

- remove listing-only/inquiry semantics from executable surfaces
- reintroduce truthful `hit bid` / `hit ask` paths
- enforce certification scheme in execution validation
- centralize field roles
- add richer filter support

Legacy generic fields such as `fuel_type` and `fuel_grade` can remain as compatibility/derived values, but user-facing flows should continue converging on canonical `market_product`.

---

## Non-Goals

Verdaxis is not doing these in this redesign:

- bilateral private negotiation as the primary trading path
- full attribute-specific micro-books for every provenance field
- immediate certification-aware benchmark splitting
- replacing the current order and trade tables with a new trading engine

---

## Success Criteria

This redesign is successful when:

- executable rows no longer use misleading inquiry language
- hitting a row performs a real trade with honest copy and status
- certification scheme blocks invalid hits across mismatched orders
- origin, feedstock, CI, and spec can be filtered without becoming separate books
- watchlists still work off stable slice identity
- benchmarks remain consistent and visible across the executable book
