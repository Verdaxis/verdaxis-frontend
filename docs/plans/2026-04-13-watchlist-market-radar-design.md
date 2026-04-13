# Watchlist Market Radar Redesign

**Date:** 2026-04-13
**Status:** Proposed
**Branch:** `staging`

---

## Goal

Reintroduce watchlists as a market-surveillance layer on top of the existing symmetric orderbook, without changing the core trading model.

The rebuilt system should help users monitor stable market slices, optionally pin exact live asks or bids for tactical follow-up, and surface meaningful market changes through a trading-tool workflow rather than a consumer-style saved-items list.

---

## Product Decision

Verdaxis should not reintroduce watchlists as a flat list of saved products or saved order IDs.

The primary watched object should be a canonical market slice:

- `market_product`
- `delivery_point`
- `availability_window`

Specific live asks or bids may be pinned inside a slice, but they are secondary to the slice itself.

This keeps the symmetric trading model intact:

- suppliers and buyers still place normal asks and bids
- watchlists do not affect matching rules
- watchlists observe the market; they do not become a second trading engine

---

## Mental Model

The watchlist should feel like `market radar`, not a bookmark list.

A user is usually trying to preserve awareness of a market condition, not merely keep a reference to one fragile live listing.

Examples:

- `Bio Methanol · Singapore · Spot`
- `e-Methanol · Rotterdam · M+1`
- `Bio Ethanol · Houston · Q3 2026`

Within those slices, the user may sometimes care about a particular live ask or bid. That is where pins come in.

The user-facing mental model becomes:

- `Track slice` to monitor a market pocket
- `Pin item` to follow one exact listing or bid inside that slice

---

## Why This Model

### Rejected option: pins only

Saving only concrete asks/bids creates a fragile system:

- rows expire, fill, and withdraw quickly
- the watchlist becomes noisy and stale
- users lose the broader market context the moment the saved item disappears

### Rejected option: alerts only

Pure alerts are too weak:

- users cannot curate what they care about
- there is no persistent surface for returning to a watched market
- history and tactical follow-up become scattered across notifications

### Chosen option: slice-first plus optional pins

This gives Verdaxis the best balance:

- stable market awareness
- tactical follow-through when needed
- no change to the symmetric orderbook model
- less noise than a saved-items scrapbook

---

## UX Flow

### Marketplace

Marketplace is the primary entry point.

The core action should be `Track slice`, not a star.

When a user tracks a slice, Verdaxis should save the currently resolved market context:

- `market_product`
- `delivery_point`
- `availability_window`

A row-level secondary action may appear for each ask or bid:

- `Pin ask`
- `Pin bid`

This should add the exact live item under its parent slice rather than creating a separate flat saved-item entry.

### Command Center

Command Center should contain a compact `Market Radar` panel.

Each entry in that panel should be a watched slice card showing:

- slice label
- active live-item count
- best visible benchmark-relative move or best live price cue
- latest event timestamp
- unread event badge

Expanding the slice should reveal:

- recent events
- pinned items
- quick links back to Marketplace

This surface should answer `what changed since I last looked?`

### Dedicated Watchlist Surface

Verdaxis should still have a dedicated watchlist page or drawer, but it must stay slice-centric.

A slice detail view should show:

- current live market summary
- recent event feed
- pinned asks and bids
- stale/terminal pin state

Alert-preference management can be deferred until after v1 if the product only needs in-app unread/event behavior at launch.

This page should be a management and history surface, not the only place where watchlists are useful.

V1 should remain single-container only. The dedicated surface should not reintroduce create/delete-watchlist affordances until multi-list support is intentionally brought back.

---

## Data Model

### Container

Keep `watchlists` only as the user-owned container.

For v1, Verdaxis should auto-provision every user into one system watchlist named `Market Radar`.

That container should be ensured on first read rather than created through a user-facing create flow.

The container must be concurrency-safe:

- store a dedicated container kind such as `RADAR_DEFAULT`
- enforce one default radar container per user with a unique constraint or partial unique index
- make the ensure-on-read path an atomic upsert rather than read-then-insert

Multiple named watchlists can be deferred.

Policy for existing users with multiple legacy lists in v1:

- backfill all legacy entries into the single `Market Radar` container
- preserve source provenance only if useful for audit, not for user-facing multi-list UI
- hide or archive extra legacy containers in v1 rather than exposing multi-list management before it is supported again

### Targets

Replace the old entry model with typed targets.

Recommended table:

- `watchlist_targets`
  - `id`
  - `watchlist_id`
  - `target_type` = `SLICE | PIN`
  - `market_product_code`
  - `delivery_point_id`
  - `availability_window_code`
  - `order_id` nullable
  - `created_at`

Rules:

- `SLICE` targets store the canonical market identity only
- `PIN` targets store both the parent slice identity and the exact `order_id`
- `market_product_code` must store the canonical Verdaxis market-product enum, never a drifting display label
- `availability_window_code` must store the canonical API code, never a drifting display label

Required integrity constraints:

- partial unique index for `SLICE` targets on `(watchlist_id, market_product_code, delivery_point_id, availability_window_code)`
- partial unique index for `PIN` targets on `(watchlist_id, order_id)`
- lookup indexes on `watchlist_id` and `order_id`
- target-local event index on `(watchlist_target_id, created_at DESC)`
- watchlist-feed index on `(watchlist_id, created_at DESC, id DESC)`
- unread-query index on `(watchlist_id, is_read, created_at DESC)` so unread scans stay bounded
- `CHECK` constraints so `SLICE` rows require market identity fields and forbid `order_id`, while `PIN` rows require both market identity fields and `order_id`

### Pin Snapshot

Pins must carry a frozen snapshot so the UI can survive item churn.

Recommended snapshot fields:

- `snapshot_price_per_mt_usd`
- `snapshot_quantity_mt`
- `snapshot_remaining_quantity_mt`
- `snapshot_status`
- `snapshot_side`
- `snapshot_market_product`
- `snapshot_delivery_point_name`
- `snapshot_availability_window`
- `snapshot_counterparty_label` if policy allows

### Events

Add a small event table so the UI can render change history and unread state without recomputing everything from the live orderbook on every page load.

Recommended table:

- `watchlist_events`
  - `id`
  - `watchlist_id`
  - `watchlist_target_id`
  - `event_type`
  - `event_payload`
  - `is_read`
  - `created_at`

Retention and feed rules:

- event reads must be newest-first and cursor-paginated
- unread counts should be precomputed or queryable without scanning the full table
- read events older than a bounded window, such as 90 days, should be archived or pruned by a scheduled daily retention job
- terminal state should still survive through the frozen pin snapshot even after older read events roll off

### Compatibility rollout

Verdaxis already has live watchlist callers using the legacy `watchlist_entries` contract.

That means the rollout cannot be a hard schema flip while the rest of the app still calls:

- legacy frontend hook and service entry points
- legacy backend `/watchlists/{id}/entries` routes
- recommendation or page code still expecting flat saved-product semantics

V1 should therefore ship with a compatibility layer for one release:

- additive tables first
- deterministic backfill from `watchlist_entries` to `SLICE` targets
- during backfill, group legacy rows by canonical slice key per user and upsert one target per unique slice so overlapping old lists do not violate the new uniqueness rules
- thin adapter routes for legacy `/entries` callers while new slice/pin APIs roll out
- use translated read models as the single rollout strategy until Marketplace, Command Center, and the dedicated watchlist surface all move to the new contract
- drop legacy tables and endpoints only after the new UI is verified in production-like environments

---

## Event Model

### Slice events

- `SLICE_NEW_ORDER`
- `SLICE_BEST_PRICE_MOVED`
- `SLICE_BENCHMARK_MOVED`
- `SLICE_WENT_QUIET`

### Pin events

- `PIN_PRICE_CHANGED`
- `PIN_QUANTITY_CHANGED`
- `PIN_PARTIALLY_FILLED`
- `PIN_FILLED`
- `PIN_WITHDRAWN`
- `PIN_EXPIRED`

Event generation should come from order lifecycle changes, visible best-price changes, and benchmark changes, not from a UI-only polling loop.

---

## Lifecycle Rules

### Slice lifecycle

A slice remains visible even if there are no current live orders in it.

This is important. A quiet slice is useful information.

The UI should show:

- `No active listings right now`
- latest known activity time
- quick path back to Marketplace

### Pin lifecycle

Pins must never disappear silently.

If the underlying order changes terminal state, Verdaxis should:

- preserve the pin
- update it to `filled`, `withdrawn`, `cancelled`, or `expired`
- show the pinned snapshot as last-seen state
- optionally show nearest live replacements in the same slice

---

## Alerts

Alerts should be meaningful and grouped by slice.

Verdaxis should avoid firing one alert per micro-change.

V1 alert classes:

- new listing in watched slice
- meaningful best-price move in watched slice
- pinned item changed materially
- pinned item reached terminal state
- watched slice became inactive

Unread counts should roll up:

- pin event increments parent slice badge
- slice badge increments `Market Radar` summary badge

Unread and event-feed behavior must be deterministic:

- event feeds are cursor-paginated and newest-first
- slice summaries include `unread_event_count` and `latest_event_at`
- read mutations must be scoped to the current watchlist container

---

## Symmetric Orderbook Compatibility

This design does not require changing the current symmetric orderbook.

That remains true:

- suppliers and buyers both place asks/bids in the same core system
- partial fills and order lifecycle behavior stay shared
- suppliers do not gain a special inventory-top-up model through watchlists
- buyers do not gain a special request-only model through watchlists

Watchlists are an intelligence and workflow layer on top of that shared market.

---


## API Shape

V1 should expose one default radar container per user rather than full multi-watchlist CRUD.

Recommended read/write surface:

- `GET /watchlists/me`
  Returns the auto-provisioned `Market Radar` summary with:
  - container metadata
  - slice summaries
  - `unread_event_count`
  - `latest_event_at`

- `GET /watchlists/{id}`
  Returns the full slice tree for the dedicated watchlist surface:
  - slices ordered by unread activity, then `latest_event_at DESC`
  - nested pins ordered by `latest_event_at DESC`
  - summary counts
  - v1 returns the full tree from the single default container and enforces a hard product cap on tracked slices so the response stays bounded

- `POST /watchlists/{id}/targets`
  Uses a discriminated request body with `target_type` as the discriminator:
  - `SliceTargetCreate`
  - `PinTargetCreate`

- `DELETE /watchlists/{id}/targets/{target_id}`

- `GET /watchlists/{id}/events?cursor=<cursor>&limit=<n>`
  Newest-first, cursor-paginated.

- `PATCH /watchlists/{id}/events/{event_id}`
  Body-less idempotent mutation that marks one event read.

Error-contract expectations for v1:

- `400` malformed request
- `401` unauthenticated
- `403` wrong watchlist owner
- `404` watchlist / target / event not found
- `409` duplicate slice or duplicate pin; v1 treats duplicate target creation as conflict rather than silent success
- `422` invalid canonical slice payload
- `500` internal error

These should follow the repo’s ProblemDetails / RFC 7807 pattern.

Validation expectations for v1:

- invalid `target_type` is rejected
- malformed `availability_window_code` is rejected
- `PIN` payloads missing `order_id` are rejected
- `SLICE` payloads that include `order_id` are rejected
- mismatched slice identity versus pinned order identity is rejected

---

## V1 Scope

### Include now

- one default watchlist: `Market Radar`
- slice tracking from Marketplace
- optional pinning of exact asks/bids inside watched slices
- Command Center radar panel
- dedicated watchlist detail surface
- unread event feed
- meaningful slice/pin event generation

### Defer

- multiple named watchlists
- collaboration/shared watchlists
- advanced notification routing
- broad fuzzy watch scopes like `all methanol in Asia`
- watchlists as a prerequisite for matchmaking
- workflow automation beyond basic quick actions

---

## Copy and Visual Direction

The feature should use professional trading language.

Preferred language:

- `Track slice`
- `Pin ask`
- `Pin bid`
- `Market Radar`
- `New activity`
- `Best price moved`
- `Market went quiet`

Avoid:

- `favorite`
- `liked`
- `saved`
- hearts or consumer-style bookmark metaphors

Design direction:

- radar scope, not scrapbook
- dense but readable
- progressive disclosure from slice summary to pin detail
- operational visual hierarchy rather than decorative card clutter

---

## Risks and Traps

- Do not rebuild the old model around saved `product_id + delivery_point_id` only. That loses availability-window specificity and ignores the canonical market identity.
- Do not make watchlists the source of truth for matchmaking. Matchmaking should stand on its own.
- Do not key the primary experience on pinned order IDs. They are too volatile.
- Do not auto-delete terminal pins. Users need the audit trail.
- Do not require users to visit a separate page to get any value from watchlists.

---

## Final Recommendation

Implement watchlists as a slice-first market-surveillance system with optional pinned items and event-driven updates.

That gives Verdaxis:

- a stable, extensible watchlist foundation
- no disruption to the current symmetric orderbook
- a better daily workflow on Marketplace and Command Center
- room to extend into richer alerts and workflow tooling later
