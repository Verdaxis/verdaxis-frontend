# Watchlist Market Radar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Verdaxis watchlists as a slice-first market-radar system with optional pinned asks/bids, event-driven unread updates, and Marketplace/CommandCenter integration, while keeping the current symmetric orderbook intact.

**Architecture:** Replace the current watchlist entry model with typed watchlist targets centered on `market_product_code + delivery_point + availability_window_code`, add pin snapshots and event history, remove matchmaking’s dependency on watchlist rows, and surface the new model through `Track slice` and `Pin` actions plus a compact `Market Radar` panel. The default `Market Radar` container should be auto-provisioned on read through an atomic ensure path backed by a unique default-container constraint, event feeds must be cursor-paginated from a watchlist-scoped feed key, and slice-level signals must come from benchmark and best-price changes as well as order lifecycle transitions.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, React, TypeScript, Vite, existing Verdaxis staging backend/frontend

---

### Task 1: Lock the Watchlist Contract Around Market Slices

**Files:**
- Modify: `be/app/models/watchlist.py`
- Modify: `be/app/schemas/watchlist.py`
- Modify: `fe/src/types.ts`
- Test: `be/tests/unit/test_watchlist_endpoints.py`
- Test: `fe/src/tests/features.test.ts`

**Step 1: Write the failing contract tests**

Add tests proving:

- watchlist targets support `SLICE` and `PIN`
- a slice target is keyed by `market_product_code + delivery_point_id + availability_window_code`
- a pin target carries both `order_id` and its parent slice identity
- duplicate slice and duplicate pin creates are rejected at the contract level
- old `product_id + optional delivery_point_id` entry semantics are no longer the canonical frontend/backend contract

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_watchlist_endpoints.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts
```

Expected: failures because the current watchlist shape is still product-entry based.

**Step 3: Define the minimal typed contract**

Implement the new watchlist target and response types in backend schema/model code and frontend shared types.

**Step 4: Re-run the focused contract tests**

Run the same tests and confirm they pass.

**Step 5: Commit**

```bash
git add be/app/models/watchlist.py be/app/schemas/watchlist.py fe/src/types.ts be/tests/unit/test_watchlist_endpoints.py fe/src/tests/features.test.ts
git commit -m "feat: define watchlist slice and pin targets"
```

---

### Task 2: Add the Database Layer for Typed Targets and Event History

**Files:**
- Modify: `be/app/models/watchlist.py`
- Create: `be/alembic/versions/<revision>_watchlist_market_radar.py`
- Test: `be/tests/unit/test_watchlist_uniqueness.py`
- Test: `be/tests/unit/test_watchlist_endpoints.py`

**Step 1: Write the failing database tests**

Add tests covering:

- uniqueness of the default `RADAR_DEFAULT` watchlist container per user
- uniqueness of slice targets per watchlist by `(watchlist_id, market_product_code, delivery_point_id, availability_window_code)`
- uniqueness of pin targets per watchlist by `(watchlist_id, order_id)`
- duplicate legacy entries across old watchlists collapsing deterministically into one canonical slice target during backfill
- `CHECK` constraints for valid `SLICE` rows and valid `PIN` rows
- foreign-key and delete semantics for targets/events
- event index viability on `(watchlist_id, created_at DESC, id DESC)` and `(watchlist_target_id, created_at DESC)`
- unread-query index viability for `is_read` event lookups
- persistence of snapshot fields for pins
- persistence of event rows with unread state

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_watchlist_uniqueness.py tests/unit/test_watchlist_endpoints.py -q
```

Expected: failures because the current tables do not support typed targets or events.

**Step 3: Implement the minimal schema expansion**

- introduce `watchlist_targets`
- introduce `watchlist_events` with denormalized `watchlist_id` for feed queries
- keep `watchlists` as the container table
- add a default-container kind/flag and unique constraint so each user has exactly one `RADAR_DEFAULT` container
- ship the new tables additively
- add partial unique indexes for slice and pin targets plus watchlist-feed, target-local event, and unread-query indexes
- backfill old `watchlist_entries` rows into deterministic `SLICE` targets inside the default radar container
- merge duplicate legacy rows by canonical slice key before insert so the backfill is uniqueness-safe
- archive or hide extra legacy watchlist containers in v1 after backfill
- define foreign keys and delete semantics explicitly: watchlist->targets cascade, target->events cascade, pinned `order_id` uses nullable/set-null or preserved snapshot semantics rather than hard cascade
- keep legacy reads available until the new endpoints and UI are verified
- keep `/watchlists/{id}/entries` as thin adapters for one release while frontend callers migrate
- drop legacy tables only in a later contract phase, not in the first migration

**Step 4: Re-run the focused database tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add be/app/models/watchlist.py be/alembic/versions be/tests/unit/test_watchlist_uniqueness.py be/tests/unit/test_watchlist_endpoints.py
git commit -m "feat: add watchlist targets and events tables"
```

---

### Task 3: Remove Matchmaking’s Dependency on Watchlists

**Files:**
- Modify: `be/app/routers/matchmaking.py`
- Modify: `be/app/services/matchmaking.py`
- Modify: `fe/src/components/CommandCenter.tsx`
- Test: `be/tests/unit/test_matchmaking_service.py`
- Test: `be/tests/unit/test_watchlist_endpoints.py`

**Step 1: Write the failing decoupling tests**

Add tests proving:

- matchmaking suggestions do not require watchlist rows to exist
- watchlist CRUD no longer acts as hidden input for recommendation generation
- Command Center does not depend on old watchlist-driven suggestions to render correctly

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_matchmaking_service.py tests/unit/test_watchlist_endpoints.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts
```

Expected: failures because the current suggestions route still reads watchlist rows.

**Step 3: Decouple the systems**

- remove watchlist-derived logic from matchmaking
- keep watchlist eventing purely observational
- keep Command Center stable with the radar panel as a separate concern

**Step 4: Re-run the focused tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add be/app/routers/matchmaking.py be/app/services/matchmaking.py fe/src/components/CommandCenter.tsx be/tests/unit/test_matchmaking_service.py
git commit -m "refactor: decouple watchlists from matchmaking"
```

---

### Task 4: Implement Watchlist CRUD for Slices and Pins

**Files:**
- Modify: `be/app/routers/watchlists.py`
- Modify: `be/app/schemas/watchlist.py`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/hooks/useWatchlist.ts`
- Test: `be/tests/unit/test_watchlist_endpoints.py`
- Test: `fe/src/tests/watchlist-api.test.ts`

**Step 1: Write the failing API tests**

Add tests for:

- ensuring the default `Market Radar` watchlist on read
- reading the radar summary payload
- reading the full watchlist tree payload
- adding a slice target
- pinning a specific order under a slice
- removing a target
- listing events with cursor + limit
- marking events read idempotently
- duplicate slice/pin requests returning conflict responses
- malformed `SLICE` and `PIN` payloads returning validator errors
- bad `availability_window_code` and missing `order_id` on pins being rejected

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_watchlist_endpoints.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/watchlist-api.test.ts
```

Expected: failures because the current endpoints only support the legacy product-entry API.

**Step 3: Implement the new CRUD surface**

Define explicit response schemas for:

- radar summary payload from `GET /watchlists/me` with `unread_event_count` and `latest_event_at`
- full slice tree payload from `GET /watchlists/{id}` with explicit slice/pin ordering rules and bounded response size
- cursor-paginated events payload with `next_cursor` and newest-first ordering

Support these endpoints minimally and explicitly:

- `GET /watchlists/me`
- `GET /watchlists/{id}`
- `POST /watchlists/{id}/targets`
- `DELETE /watchlists/{id}/targets/{target_id}`
- `GET /watchlists/{id}/events?cursor=<cursor>&limit=<n>`
- `PATCH /watchlists/{id}/events/{event_id}` as a body-less idempotent read-state mutation
- keep legacy `POST/DELETE /watchlists/{id}/entries` as adapter routes for one release while old callers are migrated
- migrate `useWatchlist.ts` and any remaining frontend callers onto the new `me/targets/events` surface in the same phase

Use discriminated typed request bodies for `SLICE` and `PIN` creation with `target_type` as the discriminator, publish concrete `SliceTargetCreate` and `PinTargetCreate` schemas/examples, document `201` for create, `200` for reads and idempotent mark-read, `204` for delete, and define ProblemDetails responses for `400/401/403/404/409/422/500`. The default radar ensure path should be idempotent and duplicate target creation must return a deterministic `409` conflict contract.

**Step 4: Re-run the focused API tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add be/app/routers/watchlists.py be/app/schemas/watchlist.py fe/src/services/api.ts fe/src/hooks/useWatchlist.ts be/tests/unit/test_watchlist_endpoints.py fe/src/tests/watchlist-api.test.ts
git commit -m "feat: add watchlist target and event APIs"
```

---

### Task 5: Generate Slice and Pin Events from Order Lifecycle Changes

**Files:**
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/services/matching_engine.py`
- Create: `be/app/services/watchlist_events.py`
- Test: `be/tests/unit/test_watchlist_events.py`
- Test: `be/tests/integration/test_orderbook.py`

**Step 1: Write the failing event tests**

Add tests proving these events are emitted correctly:

- new order appears in a watched slice
- best visible price in a watched slice changes materially
- benchmark in a watched slice moves materially
- pinned order price changes
- pinned order quantity changes
- pinned order is partially filled
- pinned order reaches a terminal state
- watched slice becomes empty

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_watchlist_events.py tests/integration/test_orderbook.py -q
```

Expected: failures because no event service exists yet.

**Step 3: Implement minimal event generation**

- generate events from order create/update/cancel/fill transitions
- generate slice-level events from benchmark and best-price changes
- keep logic centralized in one watchlist event service
- store event payloads compactly and explicitly
- define materiality thresholds and coalescing rules in one service/config location so best-price and benchmark changes behave consistently
- bound noisy event generation with thresholds so micro-changes do not spam the feed
- add retention handling so old read events can be pruned or archived without losing terminal pin visibility
- run a scheduled daily archive/delete job for read events older than 90 days and test unread counts against that exact policy

**Step 4: Re-run the focused event tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add be/app/routers/orderbook.py be/app/services/matching_engine.py be/app/services/watchlist_events.py be/tests/unit/test_watchlist_events.py be/tests/integration/test_orderbook.py
git commit -m "feat: generate watchlist events from market activity"
```

---

### Task 6: Add Marketplace Entry Points for Track Slice and Pin Item

**Files:**
- Modify: `fe/src/components/Marketplace.tsx`
- Modify: `fe/src/components/ui/VerdaxisSelect.tsx`
- Modify: `fe/src/locales/en/trading.json`
- Modify: `fe/src/locales/zh/trading.json`
- Test: `fe/src/tests/marketplace-green-fuels.test.tsx`
- Test: `fe/src/tests/watchlist-marketplace.test.tsx`

**Step 1: Write the failing frontend tests**

Add tests covering:

- `Track slice` action uses the active marketplace slice context
- row-level `Pin ask` / `Pin bid` actions appear correctly
- the old star/bookmark affordance is not present
- copy uses trading language, not consumer save/favorite language

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/marketplace-green-fuels.test.tsx src/tests/watchlist-marketplace.test.tsx
```

Expected: failures because Marketplace has no new watchlist entry points yet.

**Step 3: Implement the entry points**

- add a clear `Track slice` action in Marketplace
- add secondary row-level pin actions
- make the UI resolve canonical slice identity from the current filters and row data

**Step 4: Re-run the frontend tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/components/Marketplace.tsx fe/src/components/ui/VerdaxisSelect.tsx fe/src/locales/en/trading.json fe/src/locales/zh/trading.json fe/src/tests/marketplace-green-fuels.test.tsx fe/src/tests/watchlist-marketplace.test.tsx
git commit -m "feat: add marketplace watchlist actions"
```

---

### Task 7: Build the Command Center Market Radar Panel

**Files:**
- Modify: `fe/src/components/CommandCenter.tsx`
- Create: `fe/src/components/watchlist/MarketRadarPanel.tsx`
- Create: `fe/src/components/watchlist/WatchlistSliceSummary.tsx`
- Test: `fe/src/tests/command-center-radar.test.tsx`

**Step 1: Write the failing UI tests**

Add tests covering:

- radar panel renders watched slices
- unread event counts roll up correctly
- expanding a slice shows recent events and pinned items
- empty state uses operational copy and routes back to Marketplace

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/command-center-radar.test.tsx
```

Expected: failures because the radar panel does not exist yet.

**Step 3: Implement the radar panel**

Build a compact, trader-style panel on top of a shared slice-summary primitive that can also be reused by the dedicated watchlist page:

- slice summary cards
- latest activity signal
- unread badges
- expandable pin/event detail

**Step 4: Re-run the UI tests**

Run the same test and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/components/CommandCenter.tsx fe/src/components/watchlist/MarketRadarPanel.tsx fe/src/components/watchlist/WatchlistSliceSummary.tsx fe/src/tests/command-center-radar.test.tsx
git commit -m "feat: add command center market radar panel"
```

---

### Task 8: Rebuild the Dedicated Watchlist Surface Around Slices

**Files:**
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/types.ts`
- Modify: `fe/src/components/layout/Sidebar.tsx`
- Modify: `fe/src/components/WatchlistPage.tsx`
- Modify: `fe/src/locales/en/common.json`
- Modify: `fe/src/locales/zh/common.json`
- Create: `fe/src/components/watchlist/WatchlistSliceCard.tsx`
- Create: `fe/src/components/watchlist/WatchlistEventFeed.tsx`
- Test: `fe/src/tests/watchlist-page.test.tsx`

**Step 1: Write the failing page tests**

Add tests covering:

- `WATCHLISTS` is restored as a real page state and does not sanitize back to dashboard
- sidebar navigation exposes the watchlist surface again with `Market Radar` copy in supported locales
- slices render as the primary hierarchy
- pins render nested under their parent slice
- terminal pins remain visible with frozen snapshot data
- quiet slices remain visible instead of disappearing

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/watchlist-page.test.tsx
```

Expected: failures because the old page is flat and product-entry based.

**Step 3: Implement the rebuilt page**

- restore `WATCHLISTS` as a real `Page` union value and wire it through `handleNavigate` and `renderContent`
- restore sidebar navigation for the dedicated watchlist surface
- keep the surface single-container only and do not reintroduce create/delete-watchlist affordances in v1
- rewrite the page around slice cards using the shared summary primitive
- add recent-event and pinned-item sections
- keep the visual language dense and operational

**Step 4: Re-run the page tests**

Run the same test and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/App.tsx fe/src/types.ts fe/src/components/layout/Sidebar.tsx fe/src/components/WatchlistPage.tsx fe/src/locales/en/common.json fe/src/locales/zh/common.json fe/src/components/watchlist/WatchlistSliceCard.tsx fe/src/components/watchlist/WatchlistEventFeed.tsx fe/src/tests/watchlist-page.test.tsx
git commit -m "feat: rebuild watchlist page as market radar"
```

---

### Task 9: Add End-to-End Verification and Cleanup

**Files:**
- Modify: `fe/ARCHITECTURE.md`
- Modify: `be/ARCHITECTURE.md`
- Modify: `fe/CLAUDE.md`
- Modify: `be/CLAUDE.md`
- Test: `be/tests/unit/test_watchlist_endpoints.py`
- Test: `be/tests/unit/test_watchlist_events.py`
- Test: `fe/src/tests/watchlist-marketplace.test.tsx`
- Test: `fe/src/tests/command-center-radar.test.tsx`
- Test: `fe/src/tests/watchlist-page.test.tsx`

**Step 1: Run the full focused suites**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_watchlist_endpoints.py tests/unit/test_watchlist_uniqueness.py tests/unit/test_watchlist_events.py tests/unit/test_matchmaking_service.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/watchlist-marketplace.test.tsx src/tests/command-center-radar.test.tsx src/tests/watchlist-page.test.tsx src/tests/marketplace-green-fuels.test.tsx src/tests/features.test.ts
npm run build
```

Expected: all pass.

**Step 2: Update docs**

Bring startup docs into sync with the rebuilt watchlist model and its new file structure.

**Step 3: Refresh managed orientation docs if needed**

If `.codesight` is still in use for this repo, refresh it after structural changes.

**Step 4: Commit**

```bash
git add fe/ARCHITECTURE.md be/ARCHITECTURE.md fe/CLAUDE.md be/CLAUDE.md
# plus any generated orientation docs if refreshed
git commit -m "docs: sync watchlist market radar architecture"
```
