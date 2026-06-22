# Angela Market Monitoring Hardening Plan - 2026-06-20

Branch: `feat/staging-forward-drilldown-20260616`

Target: staging first. No production deploy until user reviews staging.

## Source Context

This plan follows the Angela feedback transcript review and the 2026-06-20
planning review. It intentionally narrows the work to low-risk frontend
hardening and clarity around the existing staging prototype.

Related documents:

- `docs/plans/2026-06-16-market-intelligence-feedback-plan.md`
- `docs/plans/2026-06-17-feedback-sprint-checklist.md`
- `.impeccable.md`
- `ARCHITECTURE.md`

## Explicit Non-Goals

Do not implement these in this sprint:

- Credit or counterparty pre-approval/gating.
- Angela-grade FuelEU / EU ETS estimator rebuild.
- Cargo tonnage, ton-mile model, laden/ballast logic, port idle-vs-working
  burn model, or legal-grade compliance calculator.
- New market-data ingestion feeds.
- New backend signal schema.
- New fake live feeds.
- Production deployment.

## Design Forge Review Outcome

Overall plan status: pass after review changes.

Design constraints to preserve:

- Verdaxis should feel operator-grade, market-aware, precise, restrained, and
  commercially serious.
- Authenticated market screens should be dense and fast to scan, not airy
  consumer SaaS pages.
- Observational surfaces must not imply execution.
- Executable surfaces must use explicit market action language.
- Demo, reference, mixed, trusted signal, and live states must be visually and
  textually distinct.
- Hover may enhance detail, but cannot be the only path to critical meaning.
- Motion must be restrained, purposeful, reduced-motion aware, and avoid
  layout animation.
- Avoid generic AI dashboard tells: decorative charts, decorative map overlays,
  glassy panels for no reason, broad gradients, vague feature branding, and
  ambiguous metric cards.

Web interface quality gates to preserve:

- Icon-only buttons need accessible names.
- Interactive chart/table elements need keyboard handling and visible focus.
- Animations must honor reduced motion and avoid `transition: all`.
- Text containers need `min-w-0`, truncation, wrapping, or clamps where needed.
- Empty states must distinguish "no data", "no matching result", and "make a
  selection first".
- Numbers, dates, and currency should use consistent formatting.

## Current Dirty Worktree Checkpoint

Before implementation:

1. Run `git status --short --branch`.
2. Review current diffs for all files already modified in this branch.
3. Preserve in-progress staging work. Do not revert unrelated dirty changes.
4. If a target file has unrelated user changes, work around them or stop only if
   the change makes the task impossible.

Known dirty areas at plan time:

- `ARCHITECTURE.md`
- `src/components/BuyerMap.tsx`
- `src/components/ForwardCurveWorkspace.tsx`
- `src/components/GuidedTutorial.tsx`
- `src/components/NewsFeed.tsx`
- `src/components/map/ComplianceEstimatorCard.tsx`
- `src/components/map/IntelligencePanel.tsx`
- `src/components/map/MarketWatchTicker.tsx`
- `src/index.css`
- `src/locales/en/dashboard.json`
- `src/locales/en/tutorial.json`
- `src/locales/zh/dashboard.json`
- `src/locales/zh/tutorial.json`
- `src/services/api.ts`
- `src/tests/compliance-estimator-card.test.tsx`
- `src/tests/forward-curve-workspace.test.tsx`
- `src/tests/market-watch-ticker.test.tsx`
- `src/tests/platform-regression-source.test.ts`
- `src/types.ts`
- `tasks/lessons.md`

## Definitions

Use these definitions consistently in market UI and docs:

- Demo: seeded synthetic market activity for platform walkthroughs. Not
  user-posted liquidity.
- Reference: benchmark, model, or contextual data. Not an executable order and
  not a confirmed trade.
- Live: real user-posted order or confirmed trade only.
- Market indication: non-executable monitoring signal. Do not label as live
  unless backed by a real executable order or confirmed trade.
- Physical stem: non-executable monitoring signal. Do not label as live unless
  backed by a real executable order or confirmed trade.
- Fair-price model: model/reference output. Never executable.
- Mixed: contains both real and demo/reference context. Must not look purely
  live.

## Implementation Plan

### Phase 0 - Document Scope And Preserve Existing Work

Files likely touched:

- `docs/plans/2026-06-20-angela-market-monitoring-hardening-plan.md`
- `docs/plans/2026-06-17-feedback-sprint-checklist.md` only if closing notes
  need updating after implementation.

Steps:

1. Confirm this plan exists and is referenced in the final sprint summary.
2. Do not rewrite the older June 16 and June 17 plan history.
3. Add implementation evidence to the sprint checklist only after code is
   complete and dogfooded.

Acceptance:

- Plan separates already-staged work from new hardening work.
- Non-goals are explicit.
- No source code changes are mixed into the planning commit unless the user asks
  to proceed immediately.

### Phase 1 - Taxonomy And Provenance Audit

Surfaces to audit:

- `src/components/Marketplace.tsx`
- `src/components/OrderBook.tsx`
- `src/components/ForwardCurveWorkspace.tsx`
- `src/components/BuyerMap.tsx`
- `src/components/map/MarketWatchTicker.tsx`
- `src/components/map/IntelligencePanel.tsx`
- `src/components/CommandCenter.tsx`
- `src/utils/marketProducts.ts`
- `src/utils/marketProduct.ts`
- `src/utils/marketActivity.ts`
- `src/data.ts`
- relevant locale files under `src/locales/en/` and `src/locales/zh/`

Concrete tasks:

1. Create a source audit list of all visible market labels using:
   - broad fuel family terms
   - unsupported ports
   - `live` language
   - `demo` language
   - `reference` language
   - `indication`, `stem`, and `fair` language
2. Confirm executable and monitoring surfaces use the four canonical products:
   - Bio Methanol
   - e-Methanol
   - Bio Ethanol
   - Synthetic Ethanol
3. Confirm executable and monitoring surfaces use approved trading ports,
   resolved to active delivery points where available:
   - Dalian
   - Busan
   - Shanghai
   - Singapore
   - Rotterdam
   - Houston
   - Los Angeles
   - Santos
4. Ensure active backend delivery points outside the approved list do not leak
   into Marketplace, Forward Curve, ticker, map panels, or trade handoff.
5. Leave public education and broader explanatory copy alone unless it affects a
   live market workflow.
6. Align source/provenance labels through `utils/marketActivity.ts` instead of
   hardcoding new meanings inside components.

Acceptance:

- No active market surface shows unsupported ports.
- No active market surface collapses canonical products into generic
  "Methanol" or "Ethanol" where the user needs product-pathway specificity.
- `Live` appears only for real user orders or confirmed trades.
- Demo/reference/mixed states remain distinguishable without hover-only
  disclosure.

### Phase 2 - Forward Curve Hardening

Files likely touched:

- `src/components/ForwardCurveWorkspace.tsx`
- `src/utils/marketActivity.ts`
- `src/utils/marketProduct.ts`
- `src/utils/availabilityWindow.ts`
- `src/types.ts` only if existing frontend types are incomplete against the
  current API.
- `src/locales/en/dashboard.json`
- `src/locales/zh/dashboard.json`
- `src/tests/forward-curve-workspace.test.tsx`
- `src/tests/platform-regression-source.test.ts`

Concrete tasks:

1. Inspect `/curves/forward/table` and `/curves/forward/slice` frontend usage.
   Use only fields already returned by those APIs.
2. Preserve the chart-above-matrix layout.
3. Improve copy and labels:
   - chart title should communicate "indicative monitoring", not execution
   - matrix should communicate product, port, and period
   - selected-period panel should describe evidence type and source scope
4. Improve empty states:
   - no table data
   - no selected cell
   - selected period has no price evidence
   - selected period has no visible bids
   - selected period has no visible asks
   - selected period has no confirmed prints
5. Make source badges consistent:
   - Demo data
   - Reference
   - Mixed
   - Market indication
   - Physical stem
   - Fair-price model
   - Live order
   - Confirmed trade
6. Ensure real indications, stems, and fair-price bands are not labelled `Live`
   just because they are non-demo.
7. Preserve and verify click-through:
   - chart point double-click
   - period chip double-click
   - latest signal double-click
   - matrix cell double-click
8. Handoff must persist exactly:
   - `verdaxis_marketplace_product`
   - `verdaxis_marketplace_delivery_point_id`
   - `verdaxis_marketplace_port`
   - `verdaxis_marketplace_window`
9. Keyboard and focus:
   - clickable chart/table elements need visible focus states
   - keyboard users can select a cell
   - keyboard activation should not accidentally execute market handoff unless
     the UI clearly says it will open Marketplace
10. Do not add new ingestion, new fake data, or a new backend contract.

Acceptance:

- The Forward Curve reads as a monitoring workspace, not a trading terminal.
- Empty states are specific and not blank.
- Demo/reference/trusted signal/live distinctions are visible and copy-safe.
- Marketplace handoff opens the exact selected product, delivery point, port,
  and window.
- No old TradingView, generic product, or stale live-feed language returns.

### Phase 3 - MarketWatch And Intelligence Map Consistency

Files likely touched:

- `src/components/BuyerMap.tsx`
- `src/components/map/MarketWatchTicker.tsx`
- `src/components/map/IntelligencePanel.tsx`
- `src/components/map/MapLegend.tsx` if overlay/legend changes are needed.
- `src/utils/buyerMapMarket.ts`
- `src/utils/marketPorts.ts`
- `src/data.ts`
- `src/locales/en/dashboard.json`
- `src/locales/zh/dashboard.json`
- `src/tests/market-watch-ticker.test.tsx`
- `src/tests/platform-regression-source.test.ts`

Concrete tasks:

1. Preserve ticker architecture:
   - one price-summary request per selected product
   - client-side delivery-point matching
   - no product-port request fanout
2. Preserve multi-fuel selection.
3. Preserve port-major ordering:
   - all selected fuels for one port
   - then all selected fuels for the next port
4. Audit MarketWatch source labels:
   - Loading
   - Recent/Live where backed by real recent user market data
   - Demo
   - Reference
   - Mixed
   - Stale
   - Unavailable
5. Add or refine concise help text explaining Demo vs Reference in the ticker
   configure dialog or a non-intrusive nearby affordance.
6. Verify the ticker configure button remains outside the scrolling ticker strip.
7. Verify the configure dialog:
   - fits at 1440x900 and 1024x768
   - does not sit under the Intelligence Panel
   - does not sit under MapLibre canvas
   - can be closed with Escape
   - restores focus to the configure trigger
8. Ensure map panels and popup content use approved ports only.
9. Do not make the map more decorative. Every overlay/widget must support a
   decision: product, port, price/source, availability, or compliance planning.

Acceptance:

- Ticker scrolls when enough rows exist.
- Configure hit testing works with real browser pointer clicks.
- News tab remains first and Estimator second.
- Map and ticker agree on supported products and ports.
- No unsupported port appears in map panels, ticker, or popup-derived market
  content.

### Phase 4 - Narrow Icon Polish

Files likely touched:

- `src/components/CommandCenter.tsx`
- `src/components/SupplierListingConsole.tsx` only where the icon is a trade
  action metaphor.
- `src/components/NeedsAttentionFeed.tsx` if the action icon/copy is exposed.
- Public pages only if the icon appears as an active market action.

Concrete tasks:

1. Replace the remaining package/box icon in supplier trade-action CTAs.
2. Candidate icon direction:
   - `Handshake` for deal/marketplace
   - `Gavel` for bid/ask
   - `HandCoins` for commercial action
   - `Fuel` or `Droplets` only for physical-fuel inventory/context
3. Keep `Package` where it clearly represents inventory, volume, stock, or a
   statistical metric.
4. Avoid source-grep tests for cosmetic icon choices unless the icon is tied to
   a core accessibility label or copy rule.
5. Keep labels direct:
   - `Post a Bid`
   - `Post Supply` or `Post an Ask`, depending on current product language
   - avoid ecommerce/cart language

Acceptance:

- No user-facing market action is represented by shopping cart/trolley/box
  language.
- Inventory/stat cards may keep package-like icons if they are semantically
  clear.
- Icon set stays lucide-react.

### Phase 5 - Optional Regulatory Boundary Overlay

Only start this phase after Phases 1-4 are stable.

Files likely touched if implemented:

- `src/components/BuyerMap.tsx`
- possibly `src/components/map/MapLegend.tsx`
- `src/locales/en/dashboard.json`
- `src/locales/zh/dashboard.json`
- `src/tests/platform-regression-source.test.ts` or a focused map/source guard

Concrete tasks:

1. Decide whether to ship or defer after Phases 1-4 dogfood.
2. If shipping, implement as MapLibre source/layer, not a floating decorative
   panel.
3. Overlay must be off by default.
4. Add a compact toggle separate from the existing global overlay toggle if
   needed, or fold into an existing layer control only if the meaning remains
   clear.
5. Add a small legend with:
   - indicative EU exposure zone
   - 50% inbound/outbound planning reminder
   - 100% intra-EU/port planning reminder
6. Copy must explicitly say:
   - indicative planning guide
   - not navigational
   - not a legal determination
   - not a compliance filing
7. Do not implement route calculation.
8. Do not claim exact boundary precision.
9. Do not block ticker, side panel, map marker, or popup interactions.
10. If visual clutter or pointer blocking appears, stop and document this as
    backlog instead of forcing the overlay.

Acceptance if shipped:

- Overlay is off by default.
- Toggle works at 1440x900 and 1024x768.
- Legend is visible but not dominant.
- Existing map/ticker/panel controls remain clickable.
- A source/regression guard checks off-by-default behavior and indicative
  non-legal copy.

Acceptance if deferred:

- Backlog note explains why it was deferred.
- No partial overlay code remains.

Phase 5 decision, 2026-06-20: deferred.

Rationale:

- Phases 1-4 already touched the Intelligence Map layout, ticker stacking,
  source labels, approved-port filtering, and supplier trade-action icon.
- A regulatory boundary layer would add another map hit-testing and visual
  clutter risk immediately after the ticker and side-panel interactions were
  stabilized.
- The current estimator already carries visible indicative-only, non-legal
  disclaimer copy. Adding a boundary overlay before route/exposure assumptions
  are reviewed would risk implying precision the platform does not yet support.

Backlog shape:

- Revisit as a separate design/backend slice after the current staging work is
  reviewed.
- If implemented later, it must be off by default, use a MapLibre source/layer,
  avoid route calculation, carry non-navigational and non-legal copy, and pass
  hit-testing dogfood at `1440x900` and `1024x768`.
- No partial overlay code is intentionally present in this sprint.

### Phase 6 - Verification And Dogfood

Required local checks:

```bash
git diff --check
npm run i18n:check
npm run build
npm run test -- src/tests/forward-curve-workspace.test.tsx src/tests/market-watch-ticker.test.tsx src/tests/compliance-estimator-card.test.tsx src/tests/platform-regression-source.test.ts
```

Do not delete existing guards to make tests pass.

Browser dogfood:

1. Start or use the staging preview/dev server.
2. Test at `1440x900`.
3. Test at `1024x768`.
4. Capture screenshots and logs under `/tmp/verdaxis-angela-hardening-YYYYMMDD/`.

Dogfood checklist:

- Intelligence Map loads approved ports only.
- MarketWatch ticker scrolls when row count is high enough.
- Configure popover is clickable and within viewport.
- Configure Escape close restores focus.
- News tab is first; Estimator tab is second.
- Forward Curve chart renders above matrix.
- Forward Curve selected-period panel updates from chart/table interactions.
- Forward Curve double-click opens Marketplace.
- Marketplace filters exactly match product, delivery point, port label, and
  availability window from Forward Curve.
- Demo/reference/mixed/live labels are visible and consistent.
- If regulatory overlay ships, it is off by default and does not block controls.
- No console errors.
- No failed required app API requests.
- Optional unavailable feeds degrade gracefully.

## Final Sprint Output

Before asking for staging review:

1. Update the feedback checklist with:
   - Angela item
   - status
   - files changed
   - test commands
   - browser evidence path
   - known limitations
2. Summarize implemented vs deferred:
   - implemented: taxonomy/provenance hardening
   - implemented: Forward Curve clarity/handoff if completed
   - implemented: MarketWatch/map consistency if completed
   - implemented: narrow icon polish if completed
   - optional: regulatory overlay shipped or deferred
   - deferred: credit/counterparty gating
   - deferred: Angela-grade estimator rebuild
3. Leave production untouched.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Overlay clutters map or blocks ticker/panel controls | Ship it only after other phases pass; keep off by default; defer if hit testing fails |
| Trusted market signal labels accidentally imply execution | Keep `Live` reserved for real orders/trades; use signal-specific labels for indications/stems/fair bands |
| Active backend delivery points outside approved list leak into UI | Constrain executable/monitoring UI to approved trading ports resolved against active delivery points |
| Forward Curve handoff regresses marketplace filters | Add/keep targeted tests for persisted product, delivery point ID, port, and window |
| Ticker performance regresses with multi-product selection | Preserve one request per product; do not fan out per product-port |
| Existing dirty work is overwritten | Start with status/diff checkpoint and avoid unrelated reversions |
| Cosmetic icon cleanup becomes redesign bloat | Restrict icon edits to market action CTAs |
