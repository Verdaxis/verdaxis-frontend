# Platform Performance Implementation Plan

**Goal:** Reduce first-load and return-navigation delays on the current infrastructure, with measured before/after results and preserved trade, tenant, and session guarantees.

**Architecture:** Batch repeated database reads and expose compact market data. Keep the map alive within the authenticated layout, reuse narrowly scoped API results, and refresh in the background. Keep authentication state changes serialized while allowing proven read-only authentication paths to share locks.

**Tech stack:** Existing React 19, React Router, TypeScript, native fetch, Mapbox GL JS, FastAPI, SQLAlchemy async, PostgreSQL, Vitest and pytest. No new service or dependency is planned.

**Execution:** User authorized implementation by parallel Luna subagents with parent orchestration and review. Agents own isolated worktrees; parent reviews specification and code quality before integration. Deploy the reviewed result to staging and repeat the baseline measurements. Production promotion is a separate release decision.

Baseline evidence: `/home/jons-openclaw/artifacts/reports/verdaxis-performance-20260908/performance-audit.md`. Three-run staging medians: map 12.25 s first / 9.60 s return; Marketplace 7.02 / 5.41; login form 4.75; login submission to settled dashboard 4.03. Production-code order reads: 30 SQL statements for eight rows, 276 for 100 rows.

## Task 1 — Batch order data and supply compact map/count responses

Owner: Luna market-data agent, backend-only worktree.

Files: `app/services/live_benchmarks.py`, `app/routers/orderbook.py`, relevant orderbook response schemas, and existing unit/PostgreSQL route tests.

1. Read every caller of benchmark helpers and all ASK/BID response paths. Audit relationships used in response assembly. Eager-load the needed relationships in bounded batches; do not load unrelated collections or substitute a large joined Cartesian result.
2. Add a meaningful regression covering several distinct slices: preserve price, public eligibility, demo/real provenance, expiry, and certifications; query count must not grow once per returned slice.
3. Batch eligible benchmark inputs across the requested keys. Reuse existing eligibility predicates and Decimal calculations. Keep single-key callers compatible. Do not trust persisted benchmarks without complete invalidation guarantees.
4. Add a compact public map summary derived from all eligible rows, grouped by approved port/product; never rely on the first 100 orders. Reuse existing aggregation when it supplies the required UI values. Add grouped product counts using the same filters as the main order listing.
5. Agree the API contract with the map/cache agents before they integrate it. Prefer extending an existing response only when it avoids duplicate work without changing current clients; otherwise use a small explicit endpoint before parameter routes.
6. Run focused benchmark/market route tests and capture query counts. Commit only task files.

## Task 2 — Retain the map and remove eager map-code downloads from login

Owner: Luna map agent, frontend-only worktree.

Files: `src/App.tsx`, `src/components/BuyerMap.tsx`, necessary map child components, relevant navigation/map tests.

1. Trace route mounting, map construction, camera/filter state, subscriptions, theme/language rebuilds, and cleanup.
2. Add regressions proving no second map constructor on away/back, correct resize on return, preserved camera/filter state, and cleanup on logout/account/context change.
3. Keep one visited map inside the persistent authenticated layout. Mount lazily; hidden content must not receive focus or pointer input. Pause offscreen work and resize when shown. Respect error boundaries and role/context scope.
4. Stop unconditional loading of both map implementations on the login route. Use navigation intent or post-authentication idle work only where it helps. Avoid defeating lazy loading through an eager import.
5. Use Task 1's compact summary rather than 100 detailed order rows. Render the base map without waiting for noncritical market/news data. Coordinate API-client additions through the cache agent, which owns `src/services/api.ts`.
6. Run map, navigation, auth-scope and accessibility checks; commit only task files. Preserve current visual design, map layers and dark Forward Curve.

## Task 3 — Reuse page data safely and remove repeated count requests

Owner: Luna data-cache agent, frontend-only worktree.

Files: `src/services/api.ts`, a small adjacent cache helper if needed, `src/hooks/useWatchlist.ts`, `src/components/Marketplace.tsx`, `src/components/ForwardCurveWorkspace.tsx`, `src/components/CommandCenter.tsx`, `src/components/MyTrades.tsx`, `src/components/DataAnalytics.tsx`, related cache/API tests. Do not modify `App.tsx`, `BuyerMap.tsx`, or auth/login files owned by other agents.

1. Trace public/private resource callers, auth generation, assisted context, mutation success/failure, and SSE refresh behavior. Reuse the existing preference cache pattern where suitable.
2. Add bounded in-memory result caching and in-flight deduplication only for selected read resources. Use explicit freshness durations: longer for catalog/reference data, short for market data. Document the chosen limits.
3. Private keys include user/auth session, organization and assisted context. Invalidate immediately on relevant mutations and scope changes. An old in-flight request must not refill a new scope or overwrite newer data. Never cache mutation execution or authorize trading from cached data.
4. Reuse Watchlist state across its page, dashboard and Marketplace; preserve explicit creation and mutation semantics. Existing private SSE events and successful mutations refresh relevant views.
5. Replace Marketplace's four per-product order fetches with Task 1's grouped counts. Keep all filter/count semantics and server-side pagination/sorting intact.
6. Retain valid Forward Curve/table/selection and ordinary page data while revalidating; stale data must be labeled or accompanied by a refresh state where material. Do not hide refresh errors behind old data indefinitely.
7. Add the agreed compact map client method for Task 2. Test deduplication, TTL expiry, mutation invalidation, account/context switches, stale promises, and event-driven refresh. Commit task files.

## Task 4 — Shorten the login waterfall and read-auth lock contention

Owner: Luna auth agent, isolated backend and frontend worktrees.

Files: backend `app/routers/auth_simple.py`, relevant auth schema/tests; frontend `src/context/AuthContext.tsx`, `src/pages/LoginPage.tsx`, auth service/types and tests as required. Coordinate any `api.ts` edit with Task 3; avoid it if the login service is separate.

1. Inspect all authentication-dependency callers and their writes. Do not drop row locking globally. Evaluate PostgreSQL shared row locks for genuinely read-only request paths so concurrent reads can proceed while account-state writes still conflict. Keep exclusive locks for state-changing paths and any GET with write semantics.
2. Add concurrency coverage showing two normal reads overlap while password/status/session-changing writes remain ordered. Preserve all existing refresh/logout/password-change, account-switch, token-cutoff and race tests. Use disposable PostgreSQL for locking tests.
3. Return the existing sanitized profile shape with successful password login if it can be built from already-loaded state. Never return password hashes or refresh tokens. Keep the token response backward compatible.
4. Let the frontend consume that profile and skip the redundant immediate `/auth/me` call. Keep `/auth/me` validation for refresh/OAuth/legacy responses without a profile. Keep generation checks so a stale login cannot restore an old account.
5. Run targeted auth/security suites and frontend login/race tests. Commit BE and FE task changes separately and report assumptions for parent review.

## Task 5 — Parent integration, review, measurement, staging release

1. Review each lane against this plan, then review correctness, readability, error behavior and security. Use an independent Luna review for integrated auth/cache changes. Resolve findings before release.
2. Integrate commits on dedicated FE/BE branches. Update architecture documentation only for changed relationships. Preserve all pre-existing canonical work.
3. Run the relevant full FE tests, typecheck, i18n/release/build guards; BE unit and disposable PostgreSQL checks plus dependency/release checks required by project instructions.
4. Fix navigation instrumentation so click-to-shell and page/map readiness are distinct. Avoid reporting route commit as data-ready. Reuse a small browser test harness; do not build a new telemetry platform.
5. Deploy the exact reviewed commits to staging through the guarded release tools. Re-run three fresh-browser sessions and first/return navigation under the same conditions. Record query counts and request counts as well as wall time, since VPS load varies.
6. Dogfood both roles, map camera/layers, filters/sorting/counts, Watchlist, and a controlled staging order/trade lifecycle to verify invalidation and anonymity. State any untested path explicitly.
7. Publish measured before/after results, remaining limits and release SHAs. Keep production unchanged until the next production release decision.

Acceptance: no map reconstruction during simple away/back; no detailed 100-order request for map markers; bounded benchmark query count independent of visible slice count; fewer repeated page requests; correct cache invalidation and tenant isolation; no weaker authentication or market eligibility. A sub-300 ms retained map restore is a target to test, not a promised outcome. No infra migration, Redis deployment, blanket caching, speculative indexing, or redesign is included.
