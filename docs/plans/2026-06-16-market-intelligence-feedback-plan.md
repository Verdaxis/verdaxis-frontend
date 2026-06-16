# Market Intelligence Feedback Plan — 2026-06-16

## Scope

This plan captures the June feedback for the Marketplace, Forward Curve, and Intelligence Map surfaces. The immediate branch only ships low-risk frontend polish to staging. Larger market-intelligence features require backend/data work and should not be faked as live market functionality without clear provenance labels.

## Immediate Staging Slice

### Remove ecommerce cart language

- Replace the Marketplace sidebar `ShoppingCart` icon with a trading/procurement-native `Handshake` icon.
- Replace the empty-state cart icon in `SupplierDemandFeed` with `Handshake`.
- Add source-level regression coverage so `ShoppingCart` cannot return to these active marketplace surfaces without failing tests.

Acceptance:

- Marketplace still routes to `MARKETPLACE`.
- Supplier demand feed still renders empty/loading/populated states.
- No cart/trolley import remains in active marketplace navigation or supplier demand feed.

## Larger Feature Tracks

### Forward Curve swaps matrix

The current `ForwardCurveWorkspace` already contains the right base shape: chart on top, market matrix, clickable cells, focus panel, depth panel, and trade tape. The next iteration should extend that into a cleaner swaps-style matrix:

- Rows: delivery point / product combinations.
- Columns: spot, nearby months, quarters, and calendar strips.
- Filters: port, region, market product, and contract window.
- Cell content: benchmark mid, best bid, best ask, spread, order count, source label, and demo/indicative marker.
- Cell click: focus the selected port/product/window and update the chart/focus/depth panels.

Backend dependency:

- The board API needs multi-window matrix data, not only one selected `availability_window`.
- Each cell should return provenance: live orders, confirmed trades, benchmark, demo benchmark, or no market.

### Single-period graph drilldown

Clicking a matrix number should open a focused view for that period:

- Selected port, product, and window.
- Recent bids/asks/indications.
- Trade tape for the selected slice.
- Fair-value band if enough inputs exist.
- Physical stems if available.

Backend dependency:

- Needs a consistent market-event feed model for orders, indications, stems, benchmarks, and trades.

### Intelligence Map FuelEU / EU ETS calculator

The requested calculator should answer: "For this vessel and route, what is the conventional-fuel voyage cost, what compliance penalty/tax applies, and what minimum green-fuel volume makes the voyage FuelEU-compliant?"

Inputs:

- Route and round-voyage distance/duration.
- Vessel type/class/size and fuel compatibility.
- Conventional fuel consumption and price.
- EU ETS allowance price and emissions factor.
- FuelEU penalty assumptions and compliance year.
- Candidate green fuel product, carbon intensity, and price.

Outputs:

- Fuel cost in EUR.
- EU ETS tax in EUR.
- FuelEU Maritime penalty in EUR.
- Total voyage cost in EUR under conventional fuel.
- Minimum compatible green fuel volume required for compliance.
- CTA into Marketplace filtered to the chosen product and compatible delivery points.

Backend dependency:

- Compliance formulas and carbon-intensity assumptions should live server-side or in a shared audited model.
- Marketplace handoff needs canonical market product + delivery point + availability window filters.

### User-configurable live price ticker

The request is for a top ticker showing latest spot prices for a user's key fuel at roughly three major ports.

Implementation direction:

- Use existing `MarketWatchTicker` concepts, but let users select one market product and pinned delivery points.
- Persist preferences per user when backend profile settings exist; localStorage is acceptable only as a temporary staging prototype.
- Label values as live, indicative, demo, or stale based on provenance and timestamp.

Backend dependency:

- Requires reliable spot-price feed or orderbook-derived last/best quotes per market slice.

### Multi-signal market chart

The requested chart should overlay:

- Latest bids.
- Indications.
- Verdaxis fair-price band.
- Physical stems.
- Optional benchmark overlay.

Implementation direction:

- Add this as the analytical detail view behind the forward matrix rather than cluttering the map.
- The fair-value band must be visibly labelled as model-derived/indicative unless based on confirmed market data.

Backend dependency:

- Needs a typed data contract for indications and stems. Current orderbook/trade tape alone cannot prove those signals.

## Guardrails

- Do not imply demo or indicative data is confirmed live market activity.
- Do not mix broad fuel families with canonical products; use the four approved market products.
- Do not change production deployment until staging is reviewed and approved.
- Keep the Market Terminal trade workflow separate from the Forward Curve monitoring workspace.
