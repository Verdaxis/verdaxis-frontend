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
| Top ticker should show selected fuel prices at three major ports. | Done | `MarketWatchTicker` uses canonical products, up to three approved delivery points, localStorage preferences, delivery-point-scoped price summary requests, and row-level source labels. Commits `4a780ff3`, `8fe4ff75`, and `7de2d2c8` fixed map click-through, side-panel clipping, and map-widget overlap. | Final browser dogfood passed at `1024x768` and `1440x900`. Superseded z-index-only commit `75a9e9d0` is recorded as insufficient. | None for the current responsive/clickability defect. Future ticker work should address public ticker reduced-motion polish or live-feed provenance if prioritized. |
| Marketplace benchmark labels should not imply live liquidity. | Done | Commit `69f84140`; listing benchmark copy now says `Benchmark ref $...` and empty state says `No benchmark reference`. | Browser dogfood passed at desktop and tablet widths. Screenshots in `/tmp/verdaxis-benchmark-deployed-dogfood-20260617/screenshots/`. | None. |
| Public landing ticker should respect motion accessibility without breaking the visual ticker. | Done | Commit `823e4542`; public `PriceTicker` now has explicit `ticker-scroll` keyframes, hover/focus pause, reduced-motion no-animation behavior with ticker-local horizontal scrolling, live loading/error status, and screen-reader-hidden duplicate rows. | Code/accessibility reviewer passed. Visual reviewer passed on staging across landing and partner pages at desktop, tablet, and mobile, including reduced-motion mode. This is scoped to the public price ticker, not a whole-site accessibility claim. | None unless visible ticker-local scrollbars in reduced-motion are considered undesirable later. |

## Current Verification Evidence

Committed frontend fixes:

- `69f84140 fix: label marketplace benchmark references safely`
- `75a9e9d0 fix: keep market watch config above map canvas` — superseded by `4a780ff3` after reviewer pushback.
- `4a780ff3 fix: keep market watch actions visible` — fixed pointer hit testing, but failed 1024px visual-fit review.
- `8fe4ff75 fix: constrain market watch within map pane` — constrained the ticker to the available map pane when the intelligence panel is open.
- `7de2d2c8 fix: keep market watch editor above map widgets` — lowered passive bottom map widgets below the ticker/dialog stack.
- `823e4542 fix: respect reduced motion in public ticker` — added explicit public ticker animation CSS, hover/focus pause, reduced-motion behavior, and focused tests.

Passing checks before the 1024px visual-fit failure:

- `npm run test -- src/tests/benchmark-price-block.test.tsx src/tests/marketplace-green-fuels.test.tsx src/tests/platform-regression-source.test.ts`
- `npm run test -- src/tests/market-watch-ticker.test.tsx src/tests/platform-regression-source.test.ts`
- `npm run i18n:check`
- `npm run build`

Final checks after responsive fixes:

- `npm run test -- src/tests/market-watch-ticker.test.tsx src/tests/platform-regression-source.test.ts`
- `git diff --check`
- `npm run i18n:check`
- `npm run build`
- Staging deploy: `/home/verdaxis-prod/verdaxis/staging/fe` at `7de2d2c8`, asset `/assets/index-BhWnG5HJ.js`.

Browser dogfood evidence before the 1024px visual-fit failure:

- Benchmark label screenshots: `/tmp/verdaxis-benchmark-deployed-dogfood-20260617/screenshots/`
- Market Watch pointer-hit screenshots/logs: `/tmp/verdaxis-marketwatch-click-fixed-20260617/`
- Reviewer failure evidence:
  - `/tmp/verdaxis-marketwatch-click-fixed-20260617/screenshots/map-before-click-1024x768.png`
  - `/tmp/verdaxis-marketwatch-click-fixed-20260617/screenshots/map-after-coordinate-click-1024x768.png`

Final browser dogfood evidence after fixes:

- `/tmp/verdaxis-marketwatch-pane-fit-final-20260617/screenshots/map-before-click-1024x768.png`
- `/tmp/verdaxis-marketwatch-pane-fit-final-20260617/screenshots/map-after-click-1024x768.png`
- `/tmp/verdaxis-marketwatch-pane-fit-final-20260617/screenshots/map-before-click-1440x900.png`
- `/tmp/verdaxis-marketwatch-pane-fit-final-20260617/screenshots/map-after-click-1440x900.png`
- `/tmp/verdaxis-marketwatch-pane-fit-final-20260617/logs/summary.json`

Final browser assertions:

- `document.elementFromPoint()` at the Configure button center resolved to `BUTTON[aria-label="Configure market watch"]` at both widths.
- Configure button and ticker were clear of the side panel at both widths.
- Configure dialog was clear of the side panel and inside the viewport at both widths.
- Dialog hit samples at center/lower-right/lower-center all resolved inside the dialog, proving passive map widgets did not cover it.
- Escape closed the dialog and restored focus to `Configure market watch`.
- No console errors or network failures were recorded.

Public ticker motion-accessibility checks:

- `npm run test -- src/components/public/__tests__/PriceTicker.test.tsx src/tests/fuel-prices.test.ts src/pages/public/__tests__/LandingPage.test.tsx`
- `git diff --check`
- `npm run i18n:check`
- `npm run build`
- Code/accessibility reviewer also ran `npm run test` and `npm run build`; all passed, with the existing Vite large-chunk warning.
- Staging deploy: `/home/verdaxis-prod/verdaxis/staging/fe` at `823e4542`, assets `/assets/index-Ciz5Ck0d.js` and `/assets/index-B7Cjv3-H.css`.
- Main browser dogfood evidence: `/tmp/verdaxis-public-ticker-dogfood-20260617/screenshots/` and `/tmp/verdaxis-public-ticker-dogfood-20260617/logs/summary.json`.
- Visual reviewer browser evidence: `/tmp/verdaxis-ticker-dogfood/screenshots/`.

Public ticker browser assertions:

- Staging routes checked: `https://staging.verdaxis.exchange/en` and `https://staging.verdaxis.exchange/en/partners/green-marine`.
- Viewports checked: `1440x900`, `1024x768`, and `390x844`; reviewer also checked `1440x1000`, `768x1024`, and `390x844`.
- Normal mode uses `animation-name: ticker-scroll`, `animation-duration: 40s`, and `overflow-x: hidden`.
- Hover and keyboard focus both set `animation-play-state: paused`.
- Reduced-motion mode sets `animation-name: none`, `transform: none`, `will-change: auto`, and `overflow-x: auto`.
- Primary rows and duplicate rows both render; duplicate rows carry `aria-hidden="true"`.
- No page errors were recorded. Console output was limited to the existing i18next Locize info banner.

## Open Sprint Items

- Choose next sprint slice after the public ticker polish, likely backend planning for the full multi-signal forward-curve feed.
