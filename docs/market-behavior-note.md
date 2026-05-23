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
- in Marketplace, it sits alongside the Orderbook so users can compare visible depth with recent prints for the same slice

## Terminal Role

Market Terminal is the trading-oriented terminal surface.

- it supports users working a selected product-port context
- it can show benchmark context, book depth, activity, and curve context
- it must remain distinct from the broader Forward Curve monitoring workspace
- trading actions should remain explicit and route through the established market workflow

## Forward Curve Role

Forward Curve V1 is the broader market monitoring workspace and is **indicative only**.

- it is keyed by `market_product + delivery_point`
- it can scan multiple approved product-port contexts at once
- it shows benchmark mid with soft bid/ask context
- it is not tradable forward depth
- it should read as a plausible forward market shape for the selected product-port focus
- it should use the same approved products and ports as Marketplace and Terminal
- no aggregate buckets like `ARA` should appear
- selecting a monitored context should update the monitoring focus; opening Marketplace should be an explicit CTA

## Screen Semantics

Each surface has a distinct job:

- `Listings`: actionable filtered rows for the selected slice
- `Orderbook`: two-sided depth for the same slice
- `Trade Tape`: recent public prints
- `My Listings`: the user's own outstanding resting bids and asks for the active slice
- `Market Terminal`: trading-oriented terminal surface
- `Forward Curve`: market monitoring workspace with explicit handoff into action surfaces

These screens should agree on taxonomy, port set, and slice identity even when they present different abstractions of the same market.

Orderbook rows are inspection shortcuts, not execution buttons. Selecting an actionable depth row should take the user to the matching row in `Listings`; trade initiation remains an explicit row action in the Listings view.
