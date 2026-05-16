# Verdaxis FSB Factory Roadmap

**Date:** 2026-05-17  
**Status:** Active planning baseline; first deploy/matching/auth invariant slice deployed  
**Mode:** Full Spectrum Build + autonomous grill-with-docs  
**Scope:** Frontend, backend, docs, seed data, deployment, dogfood

## Objective

Run Verdaxis through repeated audit -> plan -> implement -> review -> dogfood loops until the platform is feature-complete enough for credible external demos and stable enough that fixed bugs do not reappear across production and staging.

## Product Direction

Verdaxis should converge on one clear product model:

- The core product is a qualified executable orderbook for green marine fuels.
- Marketplace is the action surface for bids, asks, and orderbook depth.
- Intelligence Map, Market Terminal, Forward Curve, and Trade Tape are supporting market-intelligence surfaces.
- Forward Curve and benchmarks are indicative, not executable.
- RFQ is archived from the primary UI; buyer intent is a bid, supplier intent is an ask.
- Demo listings can support cold-start demos only when clearly tagged and blocked from live execution.

## Current Evidence

- Frontend tests pass: 40 files, 200 tests.
- Live prod and staging expose the four approved products.
- Live prod and staging expose the current eight delivery points: Dalian, Busan, Shanghai, Singapore, Rotterdam, Houston, Los Angeles, Santos.
- Frontend bundle splitting and Caddy compression are active.
- Backend unit baseline passes from both live backend virtualenvs: 439 tests each, with 247 warnings.
- System Python in the backend mirror cannot run the suite because `coverage` is missing; use the deployed backend virtualenv or fix local dev dependencies before backend implementation loops.

## High-Risk Contradictions To Burn Down First

1. ~~`.env.production` currently points at the staging API even though docs say production builds should use `api.verdaxis.exchange`.~~ Fixed in the first stabilization slice.
2. ~~Deployment docs and live deployment topology disagree: GitHub deploy references `~/verdaxis-frontend`, while Caddy serves `/home/verdaxis-prod/verdaxis/prod/fe/dist`.~~ Frontend docs/scripts now encode the actual Caddy-served prod/staging artifact paths.
3. The backend mirror is behind or divergent from live behavior: catalog seed files still contain legacy products and old delivery points while live APIs show the four-product/eight-port model.
4. Some frontend docs still mention old six-port or ARA-era behavior.
5. RFQ remains implemented in backend and typed in frontend, so every new feature must avoid accidentally re-promoting it as the primary workflow.
6. Seed/demo data is useful for demos but dangerous in production unless every surface treats it consistently.
7. ~~Backend matching currently needs verification against the approved execution contract: product, delivery point, availability window, certification scheme, price, quantity, side, status, and organization boundary.~~ First pass complete for availability window, certification policy, demo boundary, execution qualification, price, status, and self-trade boundary.
8. ~~Auth/session behavior needs one contract. Frontend docs mention cookie refresh and in-memory access tokens, but code paths still mix refresh styles and token storage.~~ Frontend now consistently uses in-memory access tokens and the backend refresh cookie; backend JSON refresh-token compatibility remains an explicit migration decision.

## First Slice Completed

- Production and staging frontend build targets are explicit.
- Static build script validates the baked API target before artifact deployment.
- Live smoke script checks prod/staging bundle API target, backend health, catalog products, delivery points, and forward curve params.
- Frontend CI now includes tests, i18n, and production build.
- Prod and staging backend matching now requires matching availability window and compatible certification preferences before creating auto-matched trades.
- Prod and staging backend matching now rejects off-spec/missing-certification asks through the shared execution-policy service before automatic execution.
- Prod and staging backend matching now skips real/demo boundary crossings.
- Prod and staging backend manual trade creation now rejects demo listings server-side.
- Legacy frontend API service calls now use the centralized refresh-retry path instead of bypassing refresh on 401.
- Seed-window tests no longer fail as calendar time moves forward.
- Frontend artifacts were deployed to prod and staging, backend services restarted, and `npm run smoke:live` passed for both.
- Backend prod/staging deploy scripts now infer the correct branch, service, and health URL from the live VPS path.
- Backend deploy scripts now refuse dirty worktrees by default and support `ALLOW_DIRTY=1` only for explicit hotfix deployment.
- Backend deploy docs now identify the live systemd topology instead of the stale Docker/main path.
- Frontend dependency audit now reports zero vulnerabilities after narrow lockfile updates for Vite/Rollup/Picomatch/PostCSS/protocol-buffer transitive paths.
- Patched frontend dependency build artifacts were redeployed to prod and staging and verified with live smoke.
- Prod and staging price discovery endpoints now support and validate `market_product` plus `availability_window` filters for summaries and reference prices.
- Price discovery reference-price date grouping now uses a dialect-safe date expression so the unit suite exercises SQLite without masking production Postgres behavior.
- Prod and staging live price endpoints were verified for valid filtered requests and invalid market-product 422 responses.
- Market Terminal now resolves selected ports to `delivery_point_id` before calling price summaries and reference prices, so port views do not accidentally filter `DeliveryPoint.region`.
- Live smoke now checks slice-aware orderbook bids/asks, price summaries, reference prices, and invalid price-filter validation.
- Aggregated orderbook now supports product, delivery point, region/name, market product, and availability-window filters instead of ignoring slice query params.
- Demo liquidity is now preview-only for auto-match as well as manual trade creation; demo orders do not auto-execute, even demo-vs-demo.
- Order placement success states now show the submitted market slice and action CTAs from Marketplace, Command Center, and the global sidebar post-order entry point.
- Instant-match success states now route users to Trade History, while live unmatched orders route users to the live orderbook or watchlist tracking.
- Watchlist tracking from post-order success is now an idempotent Market Radar action: existing slices stay tracked, missing slices are created through the slice-first API, and the Watchlist page highlights the tracked slice.
- Supplier Command Center now includes a buyer demand signal panel backed by `api.demand.signals`; stale `DEMAND_FEED` sessions are normalized to Marketplace rather than maintaining a second marketplace alias.
- Guided tour now follows the current activation path through Command Center bid/ask entry, Market Radar, Marketplace execution, orderbook depth, and indicative Market Terminal panels instead of only touring sidebar navigation.

## Factory Loop 0 — Source Of Truth And Deploy Reliability

Goal: make staging/prod behavior reproducible from clean source and make auth/session behavior coherent.

Deliverables:

- Fix production and staging environment files or build scripts so API targets are explicit and cannot be accidentally swapped.
- Document the real deploy topology and replace stale deploy docs.
- Decide whether `/home/jons-openclaw/verdaxis-staging-fe` is the canonical frontend source or whether deployment repos under `verdaxis-prod` must be reconciled.
- Reconcile backend source-of-truth: backend mirror, staging backend, and prod backend must point to an understood branch/revision strategy.
- Add smoke checks for live HTML asset hash, API target baked into bundle, `/health`, catalog products, delivery points, orderbook aggregate, and forward curve with required params.
- Pick and implement one auth/session contract across `AuthContext`, `api.ts`, and `/auth/refresh`.
- Ensure frontend CI runs tests, i18n, and a production build.
- Ensure backend CI runs tests, migrations where needed, and does not silently ignore security-audit failures without a tracked waiver.

Verification:

- Clean checkout can build prod with prod API and staging with staging API.
- Prod and staging live bundles show the correct API target.
- Caddy-served `dist/` hashes match the build outputs.
- Frontend tests and i18n pass.

## Factory Loop 1 — Market Contract Consistency

Goal: eliminate product/port/window drift across Marketplace, Orderbook, Terminal, Forward Curve, Intelligence Map, seed data, and tests.

Deliverables:

- One shared approved market catalog in frontend and backend docs/tests.
- Update stale docs that still mention ARA/Amsterdam/Antwerp as execution delivery points.
- Normalize all user-facing selectors to the four approved products and eight delivery points.
- Make forward-curve API usage require explicit product and delivery-point params in smoke tests.
- Ensure seed data covers all four products and all eight ports without crossed executable books.
- Ensure demo listings are tagged, non-executable, and consistently explained in Marketplace, Orderbook, Trade Tape, Terminal, and modal flows.
- Enforce normal execution on the complete qualifier set: product, delivery point, availability window, certification scheme, price, quantity, side, status, and organization boundary.
- Fix crossing detection so it is computed per executable slice, never globally.
- Decide whether auto-match-on-insert stays disabled until qualifier enforcement is complete; recommended default is explicit hit-only first.
- Add backend support for `market_product` filters or remove frontend reliance on unsupported params.

Verification:

- Automated tests assert the same product and port set across Marketplace, Terminal, Map, OrderPlaceModal, and backend catalog.
- Live prod/staging catalog and frontend selectors match exactly.
- Cross-state tests distinguish demo-only crosses from real executable crosses.
- Backend matching tests prove orders in different products, delivery points, windows, certification schemes, or organizations do not cross or match.
- API tests prove `market_product` and delivery point filters return only the requested slice.

## Factory Loop 2 — Activation And User Guidance

Goal: move users from observation to posting credible bids/asks.

Deliverables:

- Command Center becomes the intentional app landing surface for both buyer and supplier.
- Post-action feedback after bid/ask creation shows confirmation, next step, and relevant matches or watchlist actions.
- Supplier demand feed is first-class and always has useful empty/loading states.
- Empty states across Marketplace, Terminal, Watchlists, Trades, and Analytics tell users what action to take next.
- Guided tour is rewritten and dogfooded against current UI before being promoted externally.

Verification:

- Buyer can register, create org, post bid, see confirmation, and find the posted bid in relevant surfaces.
- Supplier can register, create org, post ask, see demand context, and find the posted ask in relevant surfaces.
- Tour steps never target missing elements and copy matches actual screen behavior.

## Factory Loop 3 — Trust, Compliance, And Admin Controls

Goal: make the platform credible to external maritime stakeholders.

Deliverables:

- Regulation/status tab for FuelEU Maritime, EU ETS, IMO measures, and geography-specific status where product/legal approves the scope.
- Verification badges and organization trust indicators on market rows and admin screens.
- Admin controls for demo listing visibility, user approval, and market seeding state.
- Review public partner/authority references so the site does not imply partnerships that are not formal.

Verification:

- Admin role can access all internal tools without commercial paywall locks.
- Buyer/supplier users see only appropriate trust/compliance data.
- Public copy avoids unsupported partner claims.

## Factory Loop 4 — Accessibility, Performance, And Code Quality

Goal: reduce future regression risk and make the app feel fast and reliable.

Deliverables:

- Shared modal wrapper with focus trap, Escape handling, `role="dialog"`, `aria-modal`, and labelled headers.
- Replace high-risk hardcoded colors in dense trading and modal surfaces with tokens.
- Keep heavy map/chart chunks off the initial path and prefetch only likely next surfaces.
- Add frontend lint/typecheck if feasible without creating churn.
- Remove dead runtime dependencies and archived Authentik/SSO paths from active code.
- Add uptime and synthetic flow monitoring for prod/staging.

Verification:

- Core user flows pass keyboard and screen-reader smoke checks.
- Bundle and API timing budgets are measured before/after.
- CI covers tests, i18n, build, and smoke checks.

## Loop Rules

- Every loop starts with a short implementation plan and at least one adversarial review.
- Every user-facing loop ends with dogfood on staging and live-prod smoke checks after deploy.
- Any source, route, model, or component topology change must refresh `.codesight`.
- Do not deploy from dirty source trees; deploy verified build artifacts or reconcile the checkout first.
- Do not call a loop done until production and staging behavior have both been checked.

## First Recommended Implementation Plan

Start with Factory Loop 0 and the invariant subset of Loop 1 together:

1. Fix the frontend environment/deploy contract.
2. Update deployment docs to match the actual Caddy-served prod/staging folders.
3. Reconcile the backend source branch/mirror with live backend behavior.
4. Reconcile approved product/port docs and tests.
5. Write backend tests for matching/crossing by product, delivery point, availability window, and certification scheme before touching matching logic.
6. Add live smoke script for prod/staging asset/API/catalog/orderbook/curve checks.
7. Audit backend seed/catalog source against live catalog and either update source or document the live migration source.

This comes before adding new features because it directly prevents the recurring class of "fixed then reverted" bugs.
