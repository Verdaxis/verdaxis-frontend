# Qualified Executable Orderbook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Verdaxis from the current listing-first/executable-mismatch state into a truthful qualified executable orderbook with central field-role policy and certification-aware execution.

**Architecture:** Keep the current `orderbook_orders` and `trades` domain, but restore the executable marketplace path around a stable slice key of `market_product + delivery_point + availability_window`. Add one shared field-role policy that separates executable, filterable, informational, and exception attributes, then use that policy in filtering, hit validation, and UI copy.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, TypeScript, Vitest, Pytest

---

### Task 1: Write the design delta into the codebase docs

**Files:**
- Create: `docs/plans/2026-04-13-qualified-executable-orderbook-design.md`
- Create: `docs/plans/2026-04-13-qualified-executable-orderbook-plan.md`
- Check: `docs/plans/2026-04-08-green-fuels-market-model-design.md`
- Check: `docs/plans/2026-04-13-watchlist-market-radar-design.md`

**Step 1: Verify the old docs are the right superseded references**

Run:

```bash
sed -n '1,220p' docs/plans/2026-04-08-green-fuels-market-model-design.md
sed -n '1,260p' docs/plans/2026-04-13-watchlist-market-radar-design.md
```

Expected: the older docs reflect the benchmark/listing direction and the slice-first watchlist direction that this delta builds on.

**Step 2: Save the new design delta and plan**

Expected design content:

```md
- executable book, not inquiry-only marketplace
- shallow slice identity
- certification_scheme promoted to executable
- origin/feedstock/CI/spec remain filterable
- off_spec treated as an opt-in exception lane
```

**Step 3: Commit the docs only**

```bash
git add docs/plans/2026-04-13-qualified-executable-orderbook-design.md docs/plans/2026-04-13-qualified-executable-orderbook-plan.md
git commit -m "docs: add qualified executable orderbook design"
```

---

### Task 1.5: Close the architecture review gaps before feature rollout

**Files:**
- Modify: `be/app/routers/trades.py`
- Modify: `be/app/services/watchlist_events.py`
- Modify: `be/app/services/matchmaking.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/seeds/market_seed.py`
- Test: `be/tests/integration/test_trades.py`
- Test: `be/tests/unit/test_watchlist_events.py`
- Test: `be/tests/unit/test_matchmaking_service.py`
- Test: `be/tests/unit/test_orderbook_marketplace_filters.py`
- Test: `be/tests/unit/test_market_seed.py`

**Purpose:** Land the four review-blocking fixes first so the rest of the rollout builds on aligned runtime behavior.

**Blocking requirements:**
- trade execution and decline must emit watchlist updates
- certification mismatch must be rejected in matchmaking and execution
- off-spec must be excluded from default executable views
- seeded executable asks must carry certification metadata

---

### Task 2: Add a shared field-role policy on the backend

**Files:**
- Create: `be/app/services/order_field_policy.py`
- Modify: `be/app/schemas/orderbook.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/routers/trades.py`
- Test: `be/tests/unit/test_orderbook_schemas.py`
- Test: `be/tests/unit/test_orderbook_router.py`

**Step 1: Write the failing tests**

Add tests that assert:

```python
def test_executable_fields_include_certification_scheme():
    assert "certification_scheme" in EXECUTABLE_FIELDS

def test_origin_is_filterable_not_executable():
    assert "origin" in FILTERABLE_FIELDS
    assert "origin" not in EXECUTABLE_FIELDS
```

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_orderbook_schemas.py tests/unit/test_orderbook_router.py -q
```

Expected: FAIL because the policy module and assertions do not exist yet.

**Step 3: Implement the minimal policy module**

Create a backend policy module with explicit sets/constants:

```python
EXECUTABLE_FIELDS = {
    "market_product",
    "delivery_point_id",
    "availability_window",
    "certification_scheme",
    "price_per_mt_usd",
    "quantity_mt",
}
```

Also define:

```python
FILTERABLE_FIELDS = {...}
INFORMATIONAL_FIELDS = {...}
EXCEPTION_FIELDS = {"off_spec", "off_spec_notes"}
```

**Step 4: Thread the policy into schema/router helpers**

Use the policy for:

- documenting order roles in schema helpers
- validating new filter params added later
- keeping role logic out of ad hoc constants in routers

**Step 5: Run the focused tests again**

Run:

```bash
venv/bin/pytest tests/unit/test_orderbook_schemas.py tests/unit/test_orderbook_router.py -q
```

Expected: PASS

**Step 6: Commit**

```bash
git add be/app/services/order_field_policy.py be/app/schemas/orderbook.py be/app/routers/orderbook.py be/app/routers/trades.py be/tests/unit/test_orderbook_schemas.py be/tests/unit/test_orderbook_router.py
git commit -m "feat: add qualified order field policy"
```

---

### Task 3: Make trade execution truthful again

**Files:**
- Modify: `be/app/routers/trades.py`
- Modify: `be/app/schemas/orderbook.py`
- Modify: `fe/src/components/Marketplace.tsx`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/types.ts`
- Modify: `fe/src/locales/en/trading.json`
- Modify: `fe/src/locales/zh/trading.json`
- Test: `be/tests/integration/test_trades.py`
- Test: `fe/src/tests/marketplace-green-fuels.test.tsx`

**Step 1: Write failing tests for the CTA and response copy**

Add assertions like:

```tsx
expect(screen.queryByText(/Inquire/i)).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: /Hit Ask|Buy/i })).toBeInTheDocument()
```

And a backend/integration assertion like:

```python
assert response.json()["status"] == "PENDING_CONFIRMATION"
assert order_after.status == OrderBookStatus.PARTIALLY_FILLED
```

This preserves real execution but removes misleading inquiry language.

**Step 2: Run the focused tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/marketplace-green-fuels.test.tsx
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/integration/test_trades.py -q
```

Expected: FAIL because the UI still says `Inquire`.

**Step 3: Implement truthful execution copy**

Change Marketplace role actions so:

```ts
buyer on ask -> "Hit Ask"
seller on bid -> "Hit Bid"
```

Ensure modal success/body text describes:

- trade initiated
- quantity committed
- order remaining quantity updated

Do not describe it as an inquiry.

**Step 4: Re-run focused tests**

Run the same commands.

Expected: PASS

**Step 5: Commit**

```bash
git add be/app/routers/trades.py be/app/schemas/orderbook.py fe/src/components/Marketplace.tsx fe/src/services/api.ts fe/src/types.ts fe/src/locales/en/trading.json fe/src/locales/zh/trading.json be/tests/integration/test_trades.py fe/src/tests/marketplace-green-fuels.test.tsx
git commit -m "fix: align marketplace actions with executable trades"
```

---

### Task 4: Enforce certification scheme in execution and crossing logic

**Files:**
- Modify: `be/app/routers/trades.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/services/matchmaking.py`
- Modify: `be/app/services/watchlist_events.py`
- Test: `be/tests/unit/test_orderbook_crossing_filters.py`
- Test: `be/tests/unit/test_matchmaking_service.py`
- Test: `be/tests/unit/test_matchmaking_router.py`

**Step 1: Write failing tests**

Add cases like:

```python
def test_hit_rejects_certification_scheme_mismatch():
    ...
    assert exc.status_code == 409

def test_match_score_penalizes_or_rejects_certification_mismatch():
    ...
    assert score == Decimal("0")
```

**Step 2: Run the focused tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_orderbook_crossing_filters.py tests/unit/test_matchmaking_service.py tests/unit/test_matchmaking_router.py -q
```

Expected: FAIL because certification is not yet treated as a hard execution qualifier.

**Step 3: Implement minimal validation**

At hit time, require:

```python
if bid.certification_scheme != ask.certification_scheme:
    raise HTTPException(status_code=409, detail="Certification scheme mismatch")
```

Also ensure candidate crossing/ranking excludes mismatched certification scheme unless a future explicit override is introduced.

**Step 4: Keep watchlist slices shallow**

Do not add certification scheme to:

- watchlist slice key
- benchmark key

Pinned items may still surface the exact scheme in snapshots/events.

**Step 5: Re-run the focused tests**

Expected: PASS

**Step 6: Commit**

```bash
git add be/app/routers/trades.py be/app/routers/orderbook.py be/app/services/matchmaking.py be/app/services/watchlist_events.py be/tests/unit/test_orderbook_crossing_filters.py be/tests/unit/test_matchmaking_service.py be/tests/unit/test_matchmaking_router.py
git commit -m "feat: enforce certification scheme in execution"
```

---

### Task 5: Add richer order filters without changing slice identity

**Files:**
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/schemas/orderbook.py`
- Modify: `fe/src/components/Marketplace.tsx`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/types.ts`
- Modify: `fe/src/locales/en/trading.json`
- Modify: `fe/src/locales/zh/trading.json`
- Test: `be/tests/unit/test_orderbook_marketplace_filters.py`
- Test: `be/tests/integration/test_marketplace.py`
- Test: `fe/src/tests/marketplace-green-fuels.test.tsx`

**Step 1: Write failing tests for new filter fields**

Add backend cases like:

```python
assert only_matching_origin_rows_are_returned
assert off_spec_rows_are_hidden_by_default
assert certification_scheme_filter_applies
```

Add frontend cases like:

```tsx
expect(screen.getByText(/Certification/i)).toBeInTheDocument()
expect(screen.getByRole('checkbox', { name: /Show off-spec/i })).toBeInTheDocument()
```

**Step 2: Run focused tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_orderbook_marketplace_filters.py tests/integration/test_marketplace.py -q
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/marketplace-green-fuels.test.tsx
```

Expected: FAIL because the new filters and off-spec gating do not exist yet.

**Step 3: Implement backend filter params**

Add query filters for:

- `certification_scheme`
- `origin`
- `feedstock`
- `specification_standard`
- `off_spec` or `include_off_spec`

Default behavior:

```python
query = query.where(OrderBookOrder.off_spec.is_(False))
```

unless the explicit opt-in is present.

**Step 4: Implement Marketplace filters**

Expose simple filter controls first:

- certification scheme
- off-spec toggle

Keep origin/feedstock/spec as advanced or secondary controls if needed to avoid UI clutter in the first pass.

**Step 5: Re-run focused tests**

Expected: PASS

**Step 6: Commit**

```bash
git add be/app/routers/orderbook.py be/app/schemas/orderbook.py fe/src/components/Marketplace.tsx fe/src/services/api.ts fe/src/types.ts fe/src/locales/en/trading.json fe/src/locales/zh/trading.json be/tests/unit/test_orderbook_marketplace_filters.py be/tests/integration/test_marketplace.py fe/src/tests/marketplace-green-fuels.test.tsx
git commit -m "feat: add qualified orderbook filters"
```

---

### Task 6: Update seeding so every slice is populated under the executable model

**Files:**
- Modify: `be/app/seeds/catalog_seed.py`
- Modify: `be/app/seeds/market_seed.py`
- Test: `be/tests/unit/test_catalog_seed.py`
- Create or Modify: `be/tests/unit/test_market_seed.py`

**Step 1: Write failing seed tests**

Add coverage like:

```python
def test_seed_uses_only_supported_market_products(): ...
def test_seed_covers_every_window_for_every_product_and_delivery_point(): ...
def test_seed_assigns_certification_scheme_to_executable_orders(): ...
```

**Step 2: Run the focused tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_catalog_seed.py tests/unit/test_market_seed.py -q
```

Expected: FAIL because the current market seed is not yet explicitly asserting the new executable-book rules.

**Step 3: Implement deterministic seed coverage**

Ensure seeded orders:

- cover all supported `market_product` values
- cover all current availability windows generated by the system
- include certification scheme on executable rows
- default normal seeded rows to `off_spec = false`
- optionally seed a small explicit off-spec sample behind an exception flag if useful for demos

**Step 4: Re-run the seed tests**

Expected: PASS

**Step 5: Commit**

```bash
git add be/app/seeds/catalog_seed.py be/app/seeds/market_seed.py be/tests/unit/test_catalog_seed.py be/tests/unit/test_market_seed.py
git commit -m "feat: seed executable orderbook slices"
```

---

### Task 7: Verify watchlists and benchmarks still behave correctly

**Files:**
- Modify if needed: `be/app/services/watchlists.py`
- Modify if needed: `be/app/services/watchlist_events.py`
- Modify if needed: `be/app/services/benchmarks.py`
- Test: `be/tests/unit/test_watchlist_events.py`
- Test: `be/tests/unit/test_watchlist_endpoints.py`
- Test: `fe/src/tests/watchlist-page.test.tsx`

**Step 1: Write or extend regression tests**

Protect these rules:

```python
assert slice_identity_excludes_certification_scheme
assert pin_snapshot_includes_exact_order_metadata
assert benchmark_lookup_key_is_still_slice_only
```

**Step 2: Run focused tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit/test_watchlist_events.py tests/unit/test_watchlist_endpoints.py -q
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/watchlist-page.test.tsx
```

Expected: either PASS already or fail only where the new regression assertions expose drift.

**Step 3: Apply minimal fixes if required**

Do not widen watchlist slices or benchmark keys.

Only update snapshots, payloads, or serialization if the tests prove missing exact-order detail.

**Step 4: Re-run the focused tests**

Expected: PASS

**Step 5: Commit**

```bash
git add be/app/services/watchlists.py be/app/services/watchlist_events.py be/app/services/benchmarks.py be/tests/unit/test_watchlist_events.py be/tests/unit/test_watchlist_endpoints.py fe/src/tests/watchlist-page.test.tsx
git commit -m "test: lock watchlists to shallow slice identity"
```

---

### Task 8: Run the final quality gate and update docs if behavior changed

**Files:**
- Check: `be/ARCHITECTURE.md`
- Check: `fe/ARCHITECTURE.md`
- Check: `fe/docs/plans/2026-04-08-green-fuels-market-model-design.md`
- Check: `fe/docs/plans/2026-04-13-watchlist-market-radar-design.md`

**Step 1: Run backend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
venv/bin/pytest tests/unit -q
```

Expected: PASS

**Step 2: Run frontend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test
npm run build
```

Expected: PASS

**Step 3: Review docs for sync**

If implementation forces behavior changes, update the owning docs in the same commit.

Examples:

```md
- replace listing-only or inquiry-only descriptions
- document certification as executable
- document off-spec as exception-only by default
```

**Step 4: Commit doc sync or verification deltas**

```bash
git add be/ARCHITECTURE.md fe/ARCHITECTURE.md fe/docs/plans/2026-04-08-green-fuels-market-model-design.md fe/docs/plans/2026-04-13-watchlist-market-radar-design.md
git commit -m "docs: sync executable orderbook behavior"
```
