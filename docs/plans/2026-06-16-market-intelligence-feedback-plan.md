# Market Intelligence Feedback Plan — 2026-06-16

## Scope

This plan captures the June feedback for the Marketplace, Forward Curve, and Intelligence Map surfaces. The immediate branch only ships low-risk frontend polish to staging. Larger market-intelligence features require backend/data work and should not be faked as live market functionality without clear provenance labels.

## Immediate Staging Slice

Implementation note, 2026-06-16:

- The Intelligence Map ticker resolves approved local delivery-point labels to backend catalog delivery-point IDs before fetching price summaries. This keeps the UI on canonical products/ports while avoiding invalid slug IDs in API calls.
- The ticker header now shows `RECENT FEED`, `MIXED SOURCES`, `REFERENCE`, or `UNAVAILABLE` from row status instead of showing a global live state when only one row has recent data.
- Forward Curve to Marketplace handoff stores the canonical delivery point ID in `verdaxis_marketplace_delivery_point_id`; Marketplace consumes that ID and sends `delivery_point_id` to orderbook/listing APIs where available.
- `openapi.json` was refreshed from staging so frontend API assumptions include the current forward board and delivery-point-aware orderbook contract.
- The Intelligence Map ticker overlay sits below the side intelligence panel so its configuration popover cannot block panel controls.

Implementation note, 2026-06-16 follow-up:

- Marketplace orderbook depth now receives the resolved catalog delivery point ID, so bid/ask depth uses the same canonical slice as the listings table once the catalog is available.
- Trade tape requests remain on the documented `market_product + region + availability_window` contract. Exact delivery-point tape filtering is a backend follow-up because current OpenAPI does not expose `delivery_point_id` for `/api/trade-tape`.
- The Intelligence Map compliance estimator exposes key fuel-price, EUA, ETS coverage, and total-cost assumptions in the UI, without adding a backend compliance endpoint or certifying output.
- The Intelligence Map compliance estimator stores a catalog delivery-point UUID only when the map port has been resolved against catalog data; local map slugs are not written as canonical marketplace IDs.
- Listing-derived map widgets are labelled as recent listing indications and static map-popup prices are labelled as reference values, not confirmed trades.
- The global Intelligence Panel forward-curve preview is labelled as product-level indicative reference data with no selected delivery-point filter.

### Remove ecommerce cart language

- Replace the Marketplace sidebar `ShoppingCart` icon with a trading/procurement-native `Handshake` icon.
- Replace the empty-state cart icon in `SupplierDemandFeed` with `Handshake`.
- Do not keep source-level icon tests long-term. This was handled as a simple UI copy/icon correction; source-grep tests for a cosmetic icon choice were removed after user review to avoid test-suite bloat.

Acceptance:

- Marketplace still routes to `MARKETPLACE`.
- Supplier demand feed still renders empty/loading/populated states.
- Active marketplace navigation and supplier demand feed no longer use cart/trolley framing.

### Make forward matrix cell inspection explicit

- Rename the monitoring chart to `Indicative Forward Curve` and the table to `Selected-Window Forward Matrix`.
- Keep the existing guided-tour anchors stable while updating tour copy in English and Chinese.
- Add a selected-period detail panel that updates immediately when a matrix price cell is clicked.
- Visualize only fields already available on `ForwardCurveBoardCell`: benchmark, best bid, best ask, spread, volume, order count, and benchmark source/demo status.
- Render missing benchmark/bid/ask/spread values as empty (`--`) instead of zero.
- Add keyboard/focus-visible states and accessible labels for matrix cell selection.

Acceptance:

- Clicking a non-default matrix cell updates the selected-period rail and marketplace handoff.
- Demo/provenance language remains explicit: benchmark source is labelled as benchmark source, not full-market provenance.
- No stems, indications, fair-value bands, or confirmed-live claims are introduced without backend data.

### Make the Intelligence Map ticker configurable

- Render the Market Watch ticker on the Intelligence Map instead of leaving it as dead code.
- Let users select one canonical Verdaxis market product and 1-3 approved delivery points.
- Persist the ticker preferences in a versioned localStorage key, with validation and recovery from malformed data.
- Fetch price summaries through the typed API client per selected product/port/spot slice.
- Label every row individually as `Recent`, `Stale`, `Reference`, or `No data` until backend price summaries expose confirmed/demo/reference provenance.
- Use exact reference fallbacks only for existing known reference pairs; do not synthesize prices for unsupported product/port combinations.

Acceptance:

- Mixed recent/reference/no-data rows never inherit a global recent-feed badge.
- User-selected ports remain capped at three and ordered by the chosen pins.
- The ticker uses canonical market products and approved delivery points, not broad fuel-family string matching.
- The compact map overlay remains keyboard accessible and does not block side-panel controls.

### Make trade tape status 24-hour and provenance-safe

- Remove `market open` / `market closed` semantics from active trade tape headers.
- Present the trade tape as a 24-hour marketplace surface with a 7-day confirmed-trade history window.
- When the selected market context has no prints, say that there are no confirmed trades in the last 7 days instead of implying the market is unavailable.
- Keep demo trade tags visible when demo prints exist.
- Do not change Market Terminal layout or the trade workflow.

Acceptance:

- Marketplace trade tape no longer displays `Live` or `Unavailable` based on `market_hours`.
- Forward Curve trade tape no longer claims a live feed when it only has empty history.
- Empty tape copy is clear about the last-7-days scope.
- API calls remain on the existing `market_product + region + availability_window` contract unless the backend adds canonical `delivery_point_id` support.
- Empty tape copy must not imply exact delivery-point filtering until `/api/trade-tape` supports and returns delivery-point IDs.

### Make selected matrix cells expand into a single-period drilldown

- Add an explicit expanded drilldown for the selected Forward Curve matrix cell.
- Use only current `ForwardCurveBoardCell`, selected-slice depth, and trade-tape data.
- Show the available signals as benchmark, latest bid context, latest ask context, depth, and confirmed prints.
- Show requested but unavailable future signals (`indications`, `physical stems`, `fair-value band`) as disabled/unavailable with clear copy, not as invented data.
- Keep the existing chart-above-matrix layout and Market Terminal untouched.

Acceptance:

- Clicking a matrix cell updates the selected period without opening the drilldown, so traders can scan the board quickly.
- The selected period panel has a clear `Expand period` action that is the explicit entry point into the larger drilldown.
- Chart and depth panels suppress stale data while the backend focus for the newly selected slice is still refreshing.
- The drilldown has accessible close behavior and can be dismissed with Escape or the close button.
- The drilldown labels every signal by source/readiness and never claims unavailable indications, stems, or fair-value bands.
- Tests cover opening/closing the drilldown, selected-slice labels, unavailable signal copy, and no fake signal labels.

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

The selected-period `Expand period` action should open a focused view for that period:

- Selected port, product, and window.
- Recent bids/asks/indications.
- Trade tape for the selected market context. Until the backend supports `delivery_point_id`, this is not an exact delivery-point tape.
- Fair-value band if enough inputs exist.
- Physical stems if available.

Backend dependency:

- Needs a consistent market-event feed model for orders, indications, stems, benchmarks, and trades.
- Trade tape needs `delivery_point_id` query support plus delivery-point fields in `TradeTapeEntry` before the frontend can label prints as exact selected delivery-point history.

### Intelligence Map FuelEU / EU ETS estimator

The requested estimator should answer a planning question: "For this vessel and route, what is the conventional-fuel voyage cost, what indicative EU ETS exposure and FuelEU-style shortfall might apply under stated assumptions, and what green-fuel blend would move weighted CI toward a selected planning target?"

Staging implementation decision:

- Ship this first as a local, indicative planning estimator inside the Intelligence Panel, not as a backend compliance endpoint.
- Keep it off the map canvas. It should be a collapsed/expandable panel section so the map controls, ticker, legend, and selected-port intelligence remain usable.
- Use a dedicated pure estimator model for energy-weighted blend math; do not extend the public energy calculator UI code or claim audited compliance.
- Use a user-editable planning CI target seeded from the current public calculator assumption (`89.34 gCO2e/MJ`). Label it as a planning target, not a legal/statutory determination.
- Show visible assumptions and copy: "Indicative planning estimate", "Based on assumptions", and "Not a compliance filing or legal determination".
- Avoid certainty language such as compliant, non-compliant, certified savings, tax due, penalty avoided, or filing-ready.
- The Marketplace CTA should prefill canonical market product, selected delivery point, and `SPOT`; it should not carry route/vessel assumptions into trading until Marketplace has an inquiry context model.

Inputs:

- Route and round-voyage distance/duration.
- Vessel type/class/size and fuel compatibility.
- Conventional fuel consumption and price.
- EU ETS allowance price and emissions factor.
- FuelEU penalty assumptions and compliance year.
- Candidate green fuel product, carbon intensity, and price.

Outputs:

- Fuel cost in EUR.
- Indicative EU ETS exposure in EUR.
- FuelEU-style shortfall estimate in EUR.
- Total voyage cost in EUR under conventional fuel.
- Minimum compatible green fuel blend to move weighted CI toward the selected target.
- CTA into Marketplace filtered to the chosen product and compatible delivery points.

Backend dependency:

- Future production-grade compliance formulas and carbon-intensity assumptions should live server-side or in a shared audited model.
- Future Marketplace handoff should use canonical market product + delivery point + availability window filters directly.

Acceptance for staging prototype:

- Pure estimator tests cover energy-weighted blend ratio, green tonnes, no-feasible-blend cases, invalid input bounds, and price/ETS/FuelEU-style estimate calculations.
- UI tests prove the estimator is collapsed/expandable, form controls are labelled, recalculated results are announced, disclaimer/provenance copy is visible, and forbidden compliance-certainty phrases are absent.
- CTA tests prove localStorage receives `verdaxis_marketplace_product`, `verdaxis_marketplace_port`, and `verdaxis_marketplace_window=SPOT`; `verdaxis_marketplace_delivery_point_id` is written only when the selected map port has been resolved to a catalog delivery-point UUID.
- No backend mutation, schema, or new compliance API path is introduced for this slice.

### User-configurable live price ticker

The request is for a top ticker showing latest spot prices for a user's key fuel at roughly three major ports.

Implementation direction:

- Use existing `MarketWatchTicker` concepts, but let users select one market product and pinned delivery points.
- Persist preferences per user when backend profile settings exist; localStorage is acceptable only as a temporary staging prototype.
- Label values as recent, indicative, demo/reference, or stale based on provenance and timestamp. Do not claim `live` until backend price summaries expose provenance.

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
