# Market Behavior Note

**Date:** 2026-04-14
**Status:** Active
**Scope:** Authenticated Verdaxis market surfaces

## Core Model

Verdaxis currently operates as an **executable physical orderbook** with supporting intelligence layers.

The executable market identity is:

- `market_product`
- `delivery_point`
- `availability_window`
- `certification_scheme`

Everything else is qualification, context, or market intelligence.

## Orderbook Rules

The orderbook is executable, not inquiry-only.

- suppliers post `ASK`s
- buyers post `BID`s
- counterparties `Lift Ask` or `Hit Bid`
- fills are real and update remaining quantity
- resting books should not remain crossed for the same executable slice

Metadata policy:

- supplier asks must be fully specified for public execution
- buyer bids may be broader on non-executable metadata
- `certification_scheme` is executable
- `origin`, `feedstock`, `CI`, `spec`, and `MSDS` are filterable or informational unless explicitly promoted later
- off-spec supply is an exception lane and should not silently mix with normal executable flow

## Benchmark Role

Benchmarks anchor the market; they do not replace it.

- Marketplace rows show premium or discount versus benchmark
- terminal and curve views use benchmark-led context
- benchmark values are indicative market reference points, not firm executable quotes

## Trade Tape Role

Trade Tape is the public evidence layer for recent market activity.

- it shows anonymized completed market activity
- it is filtered by canonical market slice fields
- it should reflect recent, believable chronology
- it is not a negotiation log or private workflow record

## Terminal Role

Market Terminal is the live monitoring surface for one selected product-port context.

- it inherits the approved product taxonomy and approved port list
- it shows benchmark context, book depth, activity, and curve context together
- it is a market-intelligence surface, not a separate trading model
- clicking a forward point should hand the user into the matching Marketplace slice

## Forward Curve Role

Forward Curve V1 is **indicative only**.

- it is keyed by `market_product + delivery_point`
- it shows benchmark mid with soft bid/ask context
- it is not tradable forward depth
- it should read as a plausible forward market shape for the selected port and product
- it should use the same approved products and ports as Marketplace and Terminal
- no aggregate buckets like `ARA` should appear

## Screen Semantics

Each surface has a distinct job:

- `Listings`: actionable filtered rows for the selected slice
- `Orderbook`: two-sided depth for the same slice
- `Trade Tape`: recent public prints
- `Market Terminal`: consolidated market monitoring
- `Forward Curve`: indicative future price path with click-through into action surfaces

These screens should agree on taxonomy, port set, and slice identity even when they present different abstractions of the same market.
