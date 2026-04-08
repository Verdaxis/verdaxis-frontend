# Orderbook Availability Window Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the staging orderbook so trading uses a required delivery point and a canonical availability window, while removing delivery-date semantics from the orderbook flow.

**Architecture:** Persist one frozen availability value per order, make `availability_window` part of the executable market key, and remove `delivery_window_start/end` from the orderbook domain. Generate relative month labels in the UI only, and keep all matching, curves, and display logic aligned to the same canonical window representation.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, TypeScript, Vite, existing Verdaxis staging backend/frontend

---

### Task 1: Lock the Canonical Availability Window Contract

**Files:**
- Modify: `be/app/models/orderbook.py`
- Modify: `be/app/schemas/orderbook.py`
- Modify: `fe/src/types.ts`
- Test: `be/tests/unit/test_orderbook_schemas.py`
- Test: `fe/src/tests/features.test.ts`

**Step 1: Write the failing backend schema tests**

Add tests in `be/tests/unit/test_orderbook_schemas.py` for:

- canonical values like `SPOT`, `2026-04`, `2026-Q3`
- rejection of relative values like `M`, `M+1`
- absence of `delivery_window_start` and `delivery_window_end` in orderbook schema usage

**Step 2: Run backend schema tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_orderbook_schemas.py -q
```

Expected: failures around old enum assumptions and delivery-window fields.

**Step 3: Update the model and schema**

Make `availability_window` a canonical string-backed field or equivalent centralized type that supports:

- `SPOT`
- `YYYY-MM`
- `YYYY-QN`
- `YYYY-CAL` for legacy staging compatibility only

Remove `delivery_window_start` and `delivery_window_end` from orderbook create/update/response schemas.

Make `delivery_point_id` required in `OrderCreate` if the API is being tightened in this story.

**Step 4: Update frontend types**

Replace the static `AvailabilityWindow` union in `fe/src/types.ts` with a canonical string type plus helper typing comments, not a stale hardcoded list.

**Step 5: Run the updated tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_orderbook_schemas.py -q
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass for the updated schema contract.

---

### Task 2: Centralize Window Generation and Display Logic

**Files:**
- Create: `fe/src/utils/availabilityWindows.ts`
- Modify: `fe/src/components/OrderPlaceModal.tsx`
- Modify: `fe/src/components/Marketplace.tsx`
- Modify: `fe/src/components/MarketTerminal.tsx`
- Modify: `fe/src/components/buyer/CreateBidModal.tsx`
- Modify: `fe/src/components/supplier/CreateListingModal.tsx`
- Modify: `fe/src/components/RFQPanel.tsx`
- Test: `fe/src/tests/features.test.ts`

**Step 1: Write the failing frontend tests**

Add tests for:

- generating `Spot`, `M`, `M+1`, `M+2` based on a canonical venue date
- resolving those labels to frozen canonical values
- rolling to quarter buckets after the current quarter

**Step 2: Run the frontend tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: failures because no shared generator exists yet.

**Step 3: Create the shared utility**

In `fe/src/utils/availabilityWindows.ts`, implement small pure functions:

- `getAvailabilityOptions(now: Date)`
- `toCanonicalAvailability(value: string, now: Date)`
- `formatAvailabilityLabel(canonical: string, now: Date)`

The utility must:

- never persist `M`, `M+1`, `M+2`
- always return canonical values for API calls
- derive display labels from canonical values

**Step 4: Replace hardcoded window arrays**

Use the shared utility in all window pickers and displays listed above.

**Step 5: Run the focused frontend tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass with no stale hardcoded window lists left in the tested surfaces.

---

### Task 3: Make Availability Part of the Executable Market Key

**Files:**
- Modify: `be/app/services/matching_engine.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/tests/integration/test_orderbook.py`
- Test: `be/tests/unit/test_matching_engine.py`

**Step 1: Write the failing matching tests**

Add tests proving:

- same product + delivery point + crossed price but different availability windows do not match
- same product + delivery point + same availability window do match

**Step 2: Run matching tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_matching_engine.py tests/integration/test_orderbook.py -q
```

Expected: failures because matching currently ignores window.

**Step 3: Update the matching filters**

Require `OrderBookOrder.availability_window == new_order.availability_window` in match selection and keep price-time priority unchanged inside the same canonical market.

Also update any crossed-book logic in `be/app/routers/orderbook.py` so highlighted crosses respect the same market key.

**Step 4: Re-run the matching tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_matching_engine.py tests/integration/test_orderbook.py -q
```

Expected: pass.

---

### Task 4: Remove Delivery Date Semantics from the Orderbook Domain

**Files:**
- Modify: `be/app/routers/demand.py`
- Modify: `be/app/routers/curves.py`
- Modify: `fe/src/utils/fuel.ts`
- Modify: `be/tests/unit/test_curves.py`
- Test: `be/tests/unit/test_demand_schemas.py`
- Test: `be/tests/unit/test_curves.py`

**Step 1: Write the failing behavior tests**

Add or update tests to confirm:

- demand urgency no longer depends on `delivery_window_start/end`
- forward-curve sorting works with canonical month and quarter codes
- frontend display falls back only to availability formatting

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_curves.py tests/unit/test_demand_schemas.py -q
```

Expected: failures from old assumptions.

**Step 3: Implement the cleanup**

- Remove orderbook reliance on `delivery_window_start/end`
- Replace `_WINDOW_ORDER` with a canonical sorter that understands `SPOT`, `YYYY-MM`, `YYYY-QN`, and legacy `YYYY-CAL`
- Update `fe/src/utils/fuel.ts` so display formatting is availability-only

**Step 4: Re-run tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_curves.py tests/unit/test_demand_schemas.py -q
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass.

---

### Task 5: Tighten the Order Placement UX

**Files:**
- Modify: `fe/src/components/OrderPlaceModal.tsx`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/locales/en/trading.json`

**Step 1: Add the UI assertions first**

Add or extend tests covering:

- `Delivery Point` required state
- `Availability Window` defaulting to `Spot`
- no `Delivery Start` / `Delivery End` fields shown
- Advanced Options collapsed header shows selected availability value if the field remains collapsible

**Step 2: Run the UI tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: failures due to old fields and labels.

**Step 3: Update the modal and API payload**

- remove delivery date inputs
- remove optional copy on `Delivery Point`
- require a selected `delivery_point_id`
- ensure payload sends canonical `availability_window`
- keep `Spot` as the default
- add one-line helper copy clarifying that detailed delivery scheduling happens after matching

**Step 4: Re-run the UI tests**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass.

---

### Task 6: Update Seeds, Docs, and Generated API Surface

**Files:**
- Modify: `be/app/seeds/market_seed.py`
- Modify: `fe/scripts/seed_listings.sh`
- Modify: `be/docs/tutorials/sprint-5-data-products.md`
- Modify: `fe/docs/plans/2026-03-15-marketplace-unification-plan.md`
- Modify: `fe/openapi.json`

**Step 1: Update seed fixtures**

Replace old quarter/year literals and any orderbook delivery-window usage with canonical availability values.

**Step 2: Regenerate the API schema**

Run the project’s schema generation flow or the existing backend export command so `fe/openapi.json` matches the updated backend contract.

**Step 3: Update docs**

Document:

- canonical stored values
- display-only relative month labels
- absence of orderbook delivery dates
- availability being part of the market key

**Step 4: Verify generated and doc outputs**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/integration/test_orderbook.py -q
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass, with docs and generated schema aligned to code.

---

### Task 7: Full Verification

**Files:**
- Verify only

**Step 1: Run backend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
pytest tests/unit/test_orderbook_schemas.py tests/unit/test_matching_engine.py tests/unit/test_curves.py tests/integration/test_orderbook.py -q
```

Expected: all pass.

**Step 2: Run frontend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm test -- --run src/tests/features.test.ts
```

Expected: pass.

**Step 3: Manual smoke check**

Run the staging frontend/backend locally and verify:

- order modal requires delivery point
- availability defaults to `Spot`
- availability picker shows current-quarter month buckets plus future quarter buckets
- two otherwise matching orders with different availability windows do not auto-match
- forward curve sorts `Spot`, then month buckets, then quarter buckets correctly

**Step 4: Commit**

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
git status --short
cd /home/verdaxis-prod/verdaxis/staging/be
git status --short
```

Create focused commits only after verification is green.
