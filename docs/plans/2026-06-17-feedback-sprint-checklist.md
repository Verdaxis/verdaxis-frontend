# Verdaxis Feedback Sprint Checklist — 2026-06-17

## Standing Sprint Rule

Every Verdaxis feedback sprint should keep this checklist shape up to date before close:

- Feedback item and source screenshot.
- Current status: `Done`, `In review`, `Blocked`, `Deferred`, or `Needs backend`.
- Implementation commit(s).
- Verification evidence: tests, build, browser screenshots, console/network notes, and deployment target.
- Reviewer outcome, including failures and superseded fixes.
- Next action.

## Sprint 1: Feedback Batch From 2026-06-16 Screenshots

Branch: `feat/staging-forward-drilldown-20260616`

Deployment target: staging only until user approval for production.

| Feedback | Status | Implementation / Evidence | Reviewer Outcome | Next Action |
| --- | --- | --- | --- | --- |
| Remove shopping-cart/trolley framing from marketplace actions. | Done | Marketplace sidebar and supplier demand empty state now use procurement/trading framing. Earlier cosmetic source-grep test was removed to avoid brittle test bloat. | Accepted after user review. | None unless new icon feedback arrives. |
| Forward Curve should move toward a cleaner swaps/terminal-style monitoring table. | Partial / Needs backend | Chart sits above the matrix; matrix cells select a single period; drilldown exposes available benchmark, bid, ask, depth, and trade-tape signals. | Accepted as staging prototype only. It is not yet a full swaps curve because backend still lacks multi-window, indications, stems, and fair-value-band feeds. | Define backend market-event contract before claiming the complete feature. |
| Clicking a curve number should expand into a single graph for that period. | Partial / Needs backend | Selected-period drilldown exists and updates from clicked matrix cells using available frontend/API signals. | Passed for current available signals. | Add real graph overlays when backend provides indications, stems, and fair-value-band data. |
| Graph should show latest bids, indications, Verdaxis fair-price band, and physical stems. | Deferred / Needs backend | Current UI labels unavailable signal types instead of inventing data. | Accepted as provenance-safe. | Build typed backend feed for indications, stems, fair-value band, and market-event provenance. |
| Intelligence Map should include an indicative FuelEU / EU ETS voyage calculator with marketplace handoff. | Done as staging prototype | Local estimator added with visible assumptions, disclaimer copy, and marketplace CTA. No backend compliance endpoint or certifying copy introduced. | Passed because output is clearly indicative, not legal/compliance filing advice. | Promote to production-grade only after formulas and assumptions are audited server-side. |
| Top ticker should show selected fuel prices at three major ports. | In review | `MarketWatchTicker` uses canonical products, up to three approved delivery points, localStorage preferences, delivery-point-scoped price summary requests, and row-level source labels. Commit `4a780ff3` fixed map click-through by placing the ticker above MapLibre and below the side panel. | Failed final browser review at `1024x768`: side panel clipped the ticker action cluster and configure dialog. Superseded z-index-only commit `75a9e9d0` is not enough. | Constrain ticker overlay to the available map pane while the side panel is open, then re-run tests/build and browser dogfood at 1440px and 1024px. |
| Marketplace benchmark labels should not imply live liquidity. | Done | Commit `69f84140`; listing benchmark copy now says `Benchmark ref $...` and empty state says `No benchmark reference`. | Browser dogfood passed at desktop and tablet widths. Screenshots in `/tmp/verdaxis-benchmark-deployed-dogfood-20260617/screenshots/`. | None. |

## Current Verification Evidence

Committed frontend fixes:

- `69f84140 fix: label marketplace benchmark references safely`
- `75a9e9d0 fix: keep market watch config above map canvas` — superseded by `4a780ff3` after reviewer pushback.
- `4a780ff3 fix: keep market watch actions visible` — fixed pointer hit testing, but failed 1024px visual-fit review.

Passing checks before the 1024px visual-fit failure:

- `npm run test -- src/tests/benchmark-price-block.test.tsx src/tests/marketplace-green-fuels.test.tsx src/tests/platform-regression-source.test.ts`
- `npm run test -- src/tests/market-watch-ticker.test.tsx src/tests/platform-regression-source.test.ts`
- `npm run i18n:check`
- `npm run build`

Browser dogfood evidence before the 1024px visual-fit failure:

- Benchmark label screenshots: `/tmp/verdaxis-benchmark-deployed-dogfood-20260617/screenshots/`
- Market Watch pointer-hit screenshots/logs: `/tmp/verdaxis-marketwatch-click-fixed-20260617/`
- Reviewer failure evidence:
  - `/tmp/verdaxis-marketwatch-click-fixed-20260617/screenshots/map-before-click-1024x768.png`
  - `/tmp/verdaxis-marketwatch-click-fixed-20260617/screenshots/map-after-coordinate-click-1024x768.png`

## Open Sprint Items

- Fix Market Watch 1024px visual clipping and re-dogfood.
- Update this checklist after verification with the new commit and screenshot paths.
- Choose next sprint slice after this responsive fix, likely either public ticker reduced-motion polish or backend planning for the full multi-signal forward-curve feed.
