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

- User review of the staged Forward Curve monitoring signal contract and drilldown UI.
- Future data-ingestion work for actual indications, physical stems, and fair-price bands. Current staging has the contract and UI, but the live staged payload correctly reports no connected signal rows yet.

## Sprint 2: Forward Curve Multi-Signal Feed Planning

Backend branch: `/home/verdaxis-prod/verdaxis/staging/be`, `feat/staging-market-activity-contract-20260617`

Frontend branch: `/home/jons-openclaw/verdaxis-staging-fe`, `feat/staging-forward-drilldown-20260616`

Deployment target: staging only. No production deploy for this feature until user review.

| Feedback / Planning Item | Status | Implementation / Evidence | Reviewer Outcome | Next Action |
| --- | --- | --- | --- | --- |
| Graph should eventually show bids, indications, Verdaxis fair-price band, and physical stems without inventing data. | Staged for user review | Backend commit `6c32fcb`; frontend commit `074e03d2`. Backend schemas, models, migration, service, router wiring, and tests are implemented. Frontend types and drilldown now consume optional indication, physical-stem, and fair-band fields; no-data copy remains when staging has no signal rows. | API reviewer initially failed the plan for ambiguous response schemas, no-data semantics, source-kind boundaries, and focus-curve population rules. Second pass then failed on shared enum widening, free-form fair-band null semantics, and non-selected focus-window ambiguity. Third pass passed after `ForwardCurveSignalSourceKind`, explicit side/status enums, no-data fair-band provenance, and batched focus-window summaries. Browser dogfood caught the drilldown modal being painted under the sidebar; fixed by portaling the modal to `document.body`. | User review on staging, then decide whether to seed/demo actual signal rows or wait for real ingestion feeds. |
| Public monitoring response must not leak feed IDs, model internals, organization/account data, or counterparty identity. | Staged for user review | Public contract forbids raw `source`, `source_record_id`, `source_event_id`, `stem_uid`, `model_name`, `model_version`, ingestion metadata, free-form `detail`, organization/account IDs, emails, vessel IDs, and counterparty names. Staged JSON exposes only sanitized provenance counts and no-data states. | Security/product reviewer failed the earlier plan because it exposed raw feed/model identifiers, then failed again because public `detail` was free-form. Third pass passed after public free-form labels/details were removed. Targeted backend tests pass. | Keep this invariant when wiring actual ingestion sources. |
| Append-only indication/stem/fair-band tables must not create unbounded public-route scans. | Staged for user review | Service loaders use 7-day indication, 30-day fair-band, and 90-day stem lookbacks; focus lists are capped; router calls each signal family in batches instead of per cell/window. Staged board endpoint returns 8 ports x 4 products and focus summaries successfully. | Security/product and DB reviewers both failed the earlier plan for underspecified bounded query semantics. DB second pass passed with duplicate-id test addition; security second pass required fair-band/stem lookback bounds. Third pass passed. Targeted backend tests pass. | Monitor endpoint latency after actual signal rows are added. |
| Physical stems must not overstate availability after updates/cancellations. | Staged for user review | Latest-state stem aggregation reduces per `(source, stem_uid)` and tests cover cancelled, allocated, and updated quantity cases. Staging currently reports no connected stems rather than inventing availability. | DB reviewer failed the earlier plan because append history could double-count stale `AVAILABLE` rows. Third DB pass passed. Targeted backend tests pass. | Add ingestion fixtures before enabling visible stem availability. |
| Real/demo provenance should be hard to fake. | Staged for user review | Signal rows default demo/unknown; `REAL_ONLY` requires a trusted backend-created ingestion run. Tests cover forged manual rows and wrong signal-family ingestion runs. Frontend uses `describeForwardCurveSignal`, so real indications/stems are not labelled as `Live order`. | Security/product reviewer failed the earlier plan because non-demo rows could be manually inserted and shown as real, then failed again because flags plus allowlisted source were still forgeable. Third pass passed; DB noted to test wrong ingestion-run family/source-kind. Targeted backend and frontend tests pass. | Preserve trusted-ingestion requirement when importers are added. |
| Migration must stay SQLite-test and Postgres-deploy compatible. | Staged for user review | Expand-only migration `fc_2026_06_monitor_signals` adds trusted ingestion, indication, fair-band, and physical-stem tables. SQLite insert/default tests pass, Alembic reports the new migration as head, and staging DB has the new tables. | DB reviewer failed the earlier plan for SQLite-incompatible `server_default=sa.text('now()')` and unconstrained canonical keys. Third DB pass passed. Targeted backend tests pass. | None for current schema slice. |

Sprint 2 backend verification so far:

- `sudo -u verdaxis-prod ./venv/bin/pytest tests/unit/test_curves.py tests/unit/test_forward_monitoring.py -q` -> 41 passed.
- `sudo -u verdaxis-prod ./venv/bin/python -m compileall -q app/models/forward_monitoring.py app/services/forward_monitoring.py app/schemas/curves.py app/routers/curves.py tests/unit/test_forward_monitoring.py tests/unit/test_curves.py alembic/versions/fc_2026_06_monitor_signals.py` -> passed.
- `sudo -u verdaxis-prod ./venv/bin/alembic heads` -> `fc_2026_06_monitor_signals (head)`.
- `git diff --check` in backend repo -> passed.
- `ruff` and `black` are not installed in the backend venv, so no repo-native lint/format command was available.

Sprint 2 staging deploy and frontend verification:

- Backend commit `6c32fcb` deployed on staging with migration `fc_2026_06_monitor_signals`.
- Staging backend service `verdaxis-backend-staging.service` restarted manually after deploy helper hit its known sudo limitation.
- `https://api-staging.verdaxis.exchange/health` -> `{"status":"ok"}`.
- Public board endpoint verified for `SPOT` / `BIO_METHANOL`: 8 ports, 4 products, 18 focus curve windows, no-data indication/fair-band/stem provenance when no signal rows exist.
- Frontend commit `074e03d2` pushed to `feat/staging-forward-drilldown-20260616`.
- Staging frontend rebuilt from `/home/verdaxis-prod/verdaxis/staging/fe`; public asset `/assets/index-B2VfD1bR.js`.
- `npm run test -- src/tests/forward-curve-workspace.test.tsx src/tests/platform-regression-source.test.ts` -> 33 passed after the portal fix.
- `npm run test` before the portal fix -> 50 files / 271 tests passed; existing React `act(...)` warnings remain in marketplace tests.
- `npm run i18n:check` -> all translations complete.
- `npm run build` -> passed with the existing large-chunk warning.
- `git diff --check` in frontend repo -> passed.
- Browser dogfood as seeded buyer on `https://staging.verdaxis.exchange/app`: passed at `1440x900` and `1024x768`; board API returned 200 in both viewports.
- Browser dogfood screenshots and logs: `/tmp/verdaxis-forward-signal-dogfood-20260617/`.
- Visual dogfood initially caught the drilldown modal being covered by the sidebar/topbar at `1024x768`; commit `074e03d2` fixes it by rendering the drilldown through `createPortal(dialog, document.body)`.
