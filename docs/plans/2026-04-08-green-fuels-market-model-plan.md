# Green Fuels Market Model Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current generic fuel/orderbook demo model with a benchmark-driven green-fuels market model built around four controlled market products, rich supplier metadata, and matchmaking keyed by product, delivery point, and availability window.

**Architecture:** Introduce a canonical `market_product` dimension for `BIO_METHANOL`, `E_METHANOL`, `BIO_ETHANOL`, and `SYNTHETIC_ETHANOL`, keep `delivery_point + availability_window` as market context, and move sustainability/compliance details into a separate supplier listing metadata pack. Benchmark comparison and matchmaking should use the canonical market identity while buyer UI remains deliberately simple.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, React, TypeScript, Vite, existing Verdaxis staging backend/frontend

---

### Task 1: Lock the Canonical Green-Fuels Contract

**Files:**
- Modify: `be/app/models/catalog.py`
- Modify: `be/app/schemas/catalog.py`
- Modify: `fe/src/types.ts`
- Test: `be/tests/unit/test_catalog_models.py`
- Test: `fe/src/tests/features.test.ts`

**Step 1: Write the failing backend and frontend contract tests**

Add tests covering:

- the four allowed market products
- absence of free-form grade-driven combinations in the canonical product surface
- preservation of a separate metadata shape for deeper fields

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_catalog_models.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts
```

Expected: failures because the current model still centers `fuel_type` and `fuel_grade`.

**Step 3: Define the canonical contract**

Introduce the canonical market product contract in backend schema/model code and frontend types:

- `BIO_METHANOL`
- `E_METHANOL`
- `BIO_ETHANOL`
- `SYNTHETIC_ETHANOL`

Keep backward-compatible denormalized display fields only where existing surfaces still need them during migration.

**Step 4: Re-run the contract tests**

Run the same focused tests and confirm they pass.

**Step 5: Commit**

```bash
git add be/app/models/catalog.py be/app/schemas/catalog.py fe/src/types.ts be/tests/unit/test_catalog_models.py fe/src/tests/features.test.ts
git commit -m "feat: define canonical green fuels market products"
```

---

### Task 2: Seed and Migrate the Product Catalog

**Files:**
- Modify: `be/app/seeds/catalog_seed.py`
- Modify: `be/app/routers/catalog.py`
- Create: `be/alembic/versions/<revision>_green_fuels_market_products.py`
- Test: `be/tests/integration/test_orderbook.py`
- Test: `be/tests/e2e_local_api.py`

**Step 1: Write the failing catalog and seed tests**

Add tests proving:

- the catalog only exposes the four approved market products
- old products like ammonia, biomethane, biofuel, and generic green labels are removed from the primary product catalog
- legacy responses still return useful display labels

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/integration/test_orderbook.py tests/e2e_local_api.py -q
```

Expected: failures because current seeds still publish the broader fuel set.

**Step 3: Update the seed and migration path**

- replace the current product seed list with the four approved products
- migrate existing staging products cleanly rather than leaving overlapping records
- ensure deterministic UUIDs remain stable for the new names

**Step 4: Re-run the focused catalog tests**

Run the same commands and confirm pass.

**Step 5: Commit**

```bash
git add be/app/seeds/catalog_seed.py be/app/routers/catalog.py be/alembic/versions
git commit -m "feat: migrate catalog to green fuels market products"
```

---

### Task 3: Add Supplier Listing Metadata for Compliance and Sustainability

**Files:**
- Modify: `be/app/models/orderbook.py`
- Modify: `be/app/schemas/orderbook.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/models/marketplace.py`
- Modify: `fe/src/types.ts`
- Test: `be/tests/unit/test_orderbook_schemas.py`
- Test: `be/tests/integration/test_orderbook.py`

**Step 1: Write the failing schema tests**

Add tests for new listing metadata fields:

- certification declaration
- cert scheme
- standard/spec
- MSDS availability
- CI value and method
- feedstock
- origin
- off-spec flag and notes

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_orderbook_schemas.py tests/integration/test_orderbook.py -q
```

Expected: failures because the current schema only supports shallow certifications.

**Step 3: Implement the metadata pack**

Add the new fields minimally and explicitly. Keep the market identity separate from the detailed attribute pack. Do not make the new metadata fields part of the benchmark/match key.

**Step 4: Update frontend typing**

Add the new metadata fields to shared listing interfaces in `fe/src/types.ts`.

**Step 5: Re-run tests**

Run the same backend tests plus any focused frontend typing tests.

**Step 6: Commit**

```bash
git add be/app/models/orderbook.py be/app/schemas/orderbook.py be/app/routers/orderbook.py be/app/models/marketplace.py fe/src/types.ts
git commit -m "feat: add green fuels listing metadata"
```

---

### Task 4: Replace Orderbook-Crossing Semantics with Benchmark-Driven Matchmaking

**Files:**
- Modify: `be/app/services/matching_engine.py`
- Modify: `be/app/routers/orderbook.py`
- Modify: `be/app/routers/matchmaking.py`
- Modify: `be/tests/unit/test_matching_engine.py`
- Modify: `be/tests/unit/test_matchmaking_service.py`

**Step 1: Write the failing matching tests**

Add tests proving:

- matchmaking uses `market_product + delivery_point + availability_window`
- rich metadata does not fragment the core market key
- off-spec listings are excluded from default benchmark comparisons and default matchmaking

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_matching_engine.py tests/unit/test_matchmaking_service.py -q
```

Expected: failures due to the current orderbook-oriented assumptions.

**Step 3: Implement the new matching rules**

- remove default assumptions that the market is a live executable crossing book
- treat the canonical benchmark/match key as the primary market key
- rank candidates by benchmark-relative pricing, quantity fit, and documentation completeness

**Step 4: Re-run the focused matching tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add be/app/services/matching_engine.py be/app/routers/orderbook.py be/app/routers/matchmaking.py be/tests/unit/test_matching_engine.py be/tests/unit/test_matchmaking_service.py
git commit -m "feat: align matchmaking to benchmark market identity"
```

---

### Task 5: Introduce Benchmark Storage and Premium/Discount Computation

**Files:**
- Create: `be/app/models/benchmark.py`
- Create: `be/app/schemas/benchmark.py`
- Create: `be/app/routers/benchmarks.py`
- Modify: `be/app/main.py`
- Modify: `fe/src/services/api.ts`
- Modify: `fe/src/types.ts`
- Test: `be/tests/unit/test_price_discovery_router.py`
- Test: `fe/src/tests/price-discovery.test.ts`

**Step 1: Write the failing benchmark tests**

Add tests for:

- benchmark lookup by `market_product + delivery_point + availability_window`
- premium / discount calculation for listings relative to benchmark
- safe behavior when no benchmark exists

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit/test_price_discovery_router.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/price-discovery.test.ts
```

Expected: failures because there is no canonical benchmark contract yet.

**Step 3: Implement minimal benchmark support**

- add a benchmark model or equivalent service contract
- expose read APIs needed by the staging frontend
- compute listing premium / discount in one place, not per-component

**Step 4: Re-run the benchmark tests**

Run the same commands and confirm pass.

**Step 5: Commit**

```bash
git add be/app/models/benchmark.py be/app/schemas/benchmark.py be/app/routers/benchmarks.py be/app/main.py fe/src/services/api.ts fe/src/types.ts
git commit -m "feat: add green fuels benchmark pricing"
```

---

### Task 6: Redesign Supplier Listing Creation for Progressive Disclosure

**Files:**
- Modify: `fe/src/components/supplier/CreateListingModal.tsx`
- Modify: `fe/src/components/SupplierListingConsole.tsx`
- Modify: `fe/src/services/api.ts`
- Test: `fe/src/tests/order-place-modal.test.tsx`
- Create: `fe/src/tests/create-listing-modal.test.tsx`

**Step 1: Write the failing supplier UX tests**

Add tests covering:

- only the four approved market products appear
- compliance and sustainability sections are distinct
- certification declaration is required
- off-spec fields only appear when toggled on

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/create-listing-modal.test.tsx
```

Expected: failures because the current modal still uses generic fuel type / grade inputs.

**Step 3: Implement the progressive form**

- replace native free-form fuel type / grade logic with the four controlled market products
- add layered sections for commercial, compliance, sustainability, and exceptions
- remove any misleading grade terminology from the UI

**Step 4: Re-run the supplier UX tests**

Run the same test file and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/components/supplier/CreateListingModal.tsx fe/src/components/SupplierListingConsole.tsx fe/src/services/api.ts fe/src/tests/create-listing-modal.test.tsx
git commit -m "feat: redesign supplier listing flow for green fuels"
```

---

### Task 7: Add Latest-Listing Defaults for Suppliers

**Files:**
- Modify: `be/app/routers/orderbook.py`
- Modify: `fe/src/components/supplier/CreateListingModal.tsx`
- Modify: `fe/src/services/api.ts`
- Test: `be/tests/integration/test_orderbook.py`
- Test: `fe/src/tests/create-listing-modal.test.tsx`

**Step 1: Write the failing defaulting tests**

Add tests proving:

- supplier listing creation prefills from the latest listing
- stable fields carry over
- `off_spec` never auto-carries

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/integration/test_orderbook.py -q

cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/create-listing-modal.test.tsx
```

Expected: failures because current create-listing flow has static defaults only.

**Step 3: Implement latest-listing defaults**

Expose a minimal backend endpoint or extend an existing listing endpoint so the frontend can fetch the last supplier listing template. Prefill only safe fields and require explicit off-spec input each time.

**Step 4: Re-run the tests**

Run the same commands and confirm pass.

**Step 5: Commit**

```bash
git add be/app/routers/orderbook.py fe/src/components/supplier/CreateListingModal.tsx fe/src/services/api.ts
git commit -m "feat: prefill supplier listings from last submission"
```

---

### Task 8: Simplify Buyer-Facing Product and Benchmark UI

**Files:**
- Modify: `fe/src/components/Marketplace.tsx`
- Modify: `fe/src/components/OrderPlaceModal.tsx`
- Modify: `fe/src/components/RFQPanel.tsx`
- Modify: `fe/src/components/MarketTerminal.tsx`
- Modify: `fe/src/components/buyer/CreateBidModal.tsx`
- Test: `fe/src/tests/features.test.ts`
- Test: `fe/src/tests/market-terminal-prices.test.ts`

**Step 1: Write the failing buyer UX tests**

Add tests covering:

- only the four approved products appear in buyer-facing selection
- listing cards show premium / discount versus benchmark
- deep supplier metadata stays in expandable detail sections rather than the primary comparison row

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts src/tests/market-terminal-prices.test.ts
```

Expected: failures because current buyer UI still uses the old fuel model and lacks benchmark-relative display.

**Step 3: Implement the buyer simplification**

- replace free-form fuel type / grade presentation
- surface only the four market products
- show benchmark-relative pricing consistently
- keep certification and off-spec badges visible

**Step 4: Re-run tests**

Run the same commands and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/components/Marketplace.tsx fe/src/components/OrderPlaceModal.tsx fe/src/components/RFQPanel.tsx fe/src/components/MarketTerminal.tsx fe/src/components/buyer/CreateBidModal.tsx
git commit -m "feat: simplify buyer green fuels market UI"
```

---

### Task 9: Replace Native Select Styling with a Shared Verdaxis Select

**Files:**
- Create: `fe/src/components/ui/VerdaxisSelect.tsx`
- Modify: `fe/src/components/OrderPlaceModal.tsx`
- Modify: `fe/src/components/supplier/CreateListingModal.tsx`
- Modify: `fe/src/components/buyer/CreateBidModal.tsx`
- Modify: `fe/src/components/RFQPanel.tsx`
- Modify: `fe/src/components/TradeHistoryPage.tsx`
- Test: `fe/src/tests/features.test.ts`

**Step 1: Write the failing UI tests**

Add tests for:

- shared select trigger rendering
- keyboard accessibility
- consistent placeholder and selected-state styling

**Step 2: Run tests to verify failure**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts
```

Expected: failures because current forms still use browser-native `<select>` elements.

**Step 3: Implement the shared select**

Build one platform-styled select component and replace the targeted forms first. Keep the component accessible and do not roll out to the entire app in one step unless the focused surfaces are stable.

**Step 4: Re-run the UI tests**

Run the same tests and confirm pass.

**Step 5: Commit**

```bash
git add fe/src/components/ui/VerdaxisSelect.tsx fe/src/components/OrderPlaceModal.tsx fe/src/components/supplier/CreateListingModal.tsx fe/src/components/buyer/CreateBidModal.tsx fe/src/components/RFQPanel.tsx fe/src/components/TradeHistoryPage.tsx
git commit -m "feat: add shared Verdaxis select component"
```

---

### Task 10: End-to-End Verification and Deployment Readiness

**Files:**
- Modify: `fe/ARCHITECTURE.md`
- Modify: `be/ARCHITECTURE.md`
- Verify: `fe/docs/plans/2026-04-08-green-fuels-market-model-design.md`
- Verify: `fe/docs/plans/2026-04-08-green-fuels-market-model-plan.md`

**Step 1: Run focused backend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/be
ENVIRONMENT=test PYTHONPATH=. venv/bin/python -m pytest tests/unit -q
```

Expected: pass.

**Step 2: Run focused frontend verification**

Run:

```bash
cd /home/verdaxis-prod/verdaxis/staging/fe
npm run test -- src/tests/features.test.ts src/tests/order-place-modal.test.tsx src/tests/create-listing-modal.test.tsx src/tests/market-terminal-prices.test.ts
npm run build
```

Expected: pass.

**Step 3: Sync architecture docs**

Update frontend and backend architecture docs for:

- canonical market product model
- benchmark-driven pricing
- supplier metadata pack
- matchmaking replacing old orderbook assumptions where applicable

**Step 4: Commit**

```bash
git add fe/ARCHITECTURE.md be/ARCHITECTURE.md
git commit -m "docs: update architecture for green fuels market model"
```

**Step 5: Final verification**

Confirm both staging repos are clean and ready for deployment.
