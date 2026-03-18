# Verdaxis Compliance-First Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Verdaxis from an exchange-style trading platform into Gavin's compliance-first supply matching platform, with CI-ranked matching, 4 contract instruments, and a 3-tier forward curve.

**Architecture:** Frontend-first with mock data (Phase 1), then backend APIs (Phase 2), then complete feature set (Phase 3). New `Contract`, `SupplyListing`, and `DemandProfile` models replace the existing Order/Trade flow on this branch. Gavin's grouped sidebar navigation, persistent compliance banner, and warm paper color system.

**Tech Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind + Chart.js (frontend), FastAPI + SQLAlchemy async + asyncpg + Alembic (backend)

**Design Doc:** `docs/plans/2026-03-18-compliance-first-redesign-design.md`

**Reference Mockups:** `/tmp/verdaxis-gavin/verdaxis/` (Gavin's HTML prototypes)

---

## Phase 1: Frontend with Mock Data

### Task 1: Branch & CSS Foundation

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Create: `src/styles/verdaxis-v2.css`

**Step 1: Create feature branch**
```bash
cd /home/verdaxis-prod/verdaxis-frontend
git checkout -b feature/compliance-first-redesign
```

**Step 2: Add Gavin's color system as CSS custom properties**

Create `src/styles/verdaxis-v2.css` with light/dark token pairs from the design doc (Section 6). All tokens prefixed `--v-`.

**Step 3: Extend Tailwind config**

Add `v-green`, `v-blue`, `v-amber`, `v-gray`, `v-bg`, `v-surface`, `v-border`, `v-text` color references that use the CSS custom properties. Keep existing `verdaxis.*` colors for backward compat on this branch.

**Step 4: Import new stylesheet in `src/index.css`**

Add `@import './styles/verdaxis-v2.css';` before Tailwind directives.

**Step 5: Verify build**
```bash
npx vite build
```
Expected: clean build, no errors.

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: add v2 color system with Gavin's compliance-first palette"
```

---

### Task 2: Mock Data Service

**Files:**
- Create: `src/services/mockData.ts`

**Step 1: Create mock data service**

Populate with Gavin's exact numbers from his HTML mockups:
- Forward curve data: 4 fuel types × 15 periods × 3 tiers + bands (copy from `05_full_platform_demo.html` lines 322-328)
- Period summary cards (spot, 12m, 24m, 2030 pathway per fuel type)
- Price drivers (Green H₂ $4.20/kg, EU ETS €68/t, Biomass $142/t, IMO levy $18.50/t, Scale 1.8×)
- Supply listings (NorSea CI 93 $842, Stena CI 74 $790, Maersk CI 99 $910 — from mockup line 143-145)
- Anonymised transactions (4 deal rows from mockup lines 206-209)
- Compliance data (CII B 78%, FuelEU 54%, IMO 2030 31%)
- Dashboard KPIs (4,800 MT secured, 1,200 MT gap, CI 13.4, 12 matches)

Export typed interfaces and getter functions:
```typescript
export function getMockCurveData(fuelType: FuelType, portCluster: string): CurveData
export function getMockSupplyListings(): SupplyListingMock[]
export function getMockComplianceSummary(): ComplianceSummary
export function getMockDashboardKPIs(): DashboardKPIs
export function getMockTransactions(): Transaction[]
export function getMockPriceDrivers(): PriceDriver[]
```

**Step 2: Commit**
```bash
git add src/services/mockData.ts && git commit -m "feat: add mock data service with Gavin's demo numbers"
```

---

### Task 3: New Type Definitions

**Files:**
- Create: `src/types/contracts.ts`
- Modify: `src/types.ts` — add new Page values

**Step 1: Create contract/supply types**

In `src/types/contracts.ts`:
```typescript
// Instrument types
export type InstrumentType = 'PFSC' | 'FDR' | 'NOV' | 'TOP';
export type ContractStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'SETTLED' | 'CANCELLED';
export type SupplyTier = 'FIRM' | 'CONDITIONAL' | 'INDICATIVE';
export type CertificationBody = 'ISCC_EU' | 'RSB' | 'REDII' | 'MRV';
export type PriceStructure = 'FIXED' | 'INDEX_LINKED';
export type FuelType = 'green_methanol' | 'bio_diesel' | 'green_ammonia' | 'bioethanol';
export type PortCluster = 'ARA' | 'Singapore' | 'Fujairah' | 'Hamburg';
export type ConfidenceTier = 'transacted' | 'listed_offer' | 'modelled_floor' | 'pathway';

// Core interfaces
export interface SupplyListing { ... }  // per design doc section 3
export interface Contract { ... }       // per design doc section 3
export interface DemandProfile { ... }  // per design doc section 3
export interface MatchResult { supply: SupplyListing; match_score: number; compliance_impact: ComplianceImpact }
export interface CurveData { fuel_type, port_cluster, periods[], tiers{}, bands{}, source, drivers{} }
export interface ComplianceSummary { fueleu_gap_mt, cii_grade, cii_pct, imo2030_pct, fueleu_pct }
export interface PriceDriver { name, value, unit, change_3m }
```

**Step 2: Update Page type in `src/types.ts`**

Add new page IDs:
```typescript
export type Page = 
  // Existing (keep for compat)
  | 'MAP' | 'MARKETPLACE' | ... 
  // New compliance-first pages
  | 'FIND_SUPPLY' | 'MY_DEMAND' | 'FORWARD_CURVE' | 'BUY_POSITION'
  | 'FLEET_COMPLIANCE' | 'ACTIVE_CONTRACTS' | 'CERTIFICATES';
```

**Step 3: Commit**
```bash
git add src/types/contracts.ts src/types.ts && git commit -m "feat: add contract, supply listing, and curve type definitions"
```

---

### Task 4: Shared Components

**Files:**
- Create: `src/components/v2/ComplianceBanner.tsx`
- Create: `src/components/v2/CIScoreBar.tsx`
- Create: `src/components/v2/SupplyTierBadge.tsx`
- Create: `src/components/v2/InstrumentCard.tsx`
- Create: `src/components/v2/LotCalculator.tsx`
- Create: `src/components/v2/ConfidenceTierLegend.tsx`
- Create: `src/components/v2/Card.tsx`

**Step 1: Build ComplianceBanner**

Persistent amber/green bar. Props: `ComplianceSummary`. Non-dismissable. Shows FuelEU gap + CII grade. Clickable → navigates to Fleet Compliance. Uses `--v-amber-light` bg when gap > 0, `--v-green-light` when compliant.

**Step 2: Build CIScoreBar**

Horizontal bar 0-100. Props: `score: number`. Color: green >85, amber 60-85, red <60. Height 5px, rounded. Shows score number below.

**Step 3: Build SupplyTierBadge**

Pill badge. Props: `tier: SupplyTier`. FIRM = solid green pill, CONDITIONAL = amber hatched, INDICATIVE = gray outline.

**Step 4: Build InstrumentCard**

Selectable card. Props: `type: InstrumentType`, `selected: boolean`, `onClick`. Shows name, description, tag. Matches `05_full_platform_demo.html` `.type-card` styling.

**Step 5: Build LotCalculator**

+/- stepper. Props: `lots: number`, `onChange`, `maxLots: number`. 1 lot = 500 MT. Shows total MT and estimated value.

**Step 6: Build ConfidenceTierLegend**

4 rows with colored dots: Transacted (green/High), Listed offer (blue/Medium), Cost-floor (amber/Low), Pathway (gray/Indicative). Plus "Not a traded benchmark" disclaimer box.

**Step 7: Build Card wrapper**

Simple card matching Gavin's style: white bg, `rgba(0,0,0,0.08)` border, 12px radius, 14px padding. Dark mode: `--v-surface` bg.

**Step 8: Commit**
```bash
git add src/components/v2/ && git commit -m "feat: add shared v2 components (banner, CI bar, tier badge, instrument card, lot calc)"
```

---

### Task 5: GroupedSidebar

**Files:**
- Create: `src/components/v2/GroupedSidebar.tsx`

**Step 1: Build GroupedSidebar**

Replaces flat `Sidebar.tsx`. Data-driven from two config arrays (buyer/supplier). Each item has: `id: Page`, `label: string`, `icon: LucideIcon`, `section: string`.

Buyer sections: OVERVIEW (Dashboard, Intelligence Map, Fleet Compliance), FUEL MARKET (Find Supply, My Demand, Forward Curve), CONTRACTS (Active Contracts, Certificates), ACCOUNT (Settings).

Supplier sections: OVERVIEW (Dashboard), SUPPLY MARKET (Market Demand, My Supply, Forward Curve), CONTRACTS (Active Contracts, Certificates), ACCOUNT (Settings).

Section headers: 10px uppercase, `--v-text-secondary` color, letter-spacing 0.04em.
Items: 13px, hover bg `--v-bg-alt`, active bg `--v-green`.
Keep collapse/expand and mobile drawer behavior from current Sidebar.
Keep Admin button in footer section.

**Step 2: Commit**
```bash
git add src/components/v2/GroupedSidebar.tsx && git commit -m "feat: add grouped sidebar with compliance-first navigation"
```

---

### Task 6: Forward Curve Page

**Files:**
- Create: `src/components/v2/ForwardCurvePage.tsx`
- Create: `src/components/v2/CurveChart.tsx`
- Create: `src/components/v2/PeriodSummaryCards.tsx`
- Create: `src/components/v2/TransactionFeed.tsx`
- Create: `src/components/v2/PriceDriverStrip.tsx`

**Step 1: Build CurveChart**

Chart.js line chart. Props: `data: CurveData`. 5 datasets:
1. Uncertainty band high (borderWidth 0, fill to +1, green 12% opacity)
2. Uncertainty band low (borderWidth 0, transparent)
3. Modelled floor (dotted gray `#888780`, 1.5px)
4. Listed offer (dashed blue `#378ADD`, 2px)
5. Transacted (solid green `#1D9E75`, 2.5px, filled dots)

Options: responsive, index interaction mode, custom tooltip (skip band datasets). Y-axis `$` prefix. X-axis: quarters from Q1'25 to 2030.

Click handler on data points: `onPointClick(period, price, tier)` — navigates to Buy Position.

**Step 2: Build PeriodSummaryCards**

4 cards in a row: Spot (green border-left), 12-month (blue), 24-month (amber), 2030 pathway (gray). Each shows period label, price, confidence level.

**Step 3: Build TransactionFeed**

Anonymised deal rows. Each row: `Buyer A → Producer NW-EU`, port, date, volume, price, CI badge. VWA summary at bottom. "Anonymised" badge in header.

**Step 4: Build PriceDriverStrip**

5-column grid: Green H₂ spot, EU ETS, Biomass index, IMO levy (fwd), Scale factor. Each card: label, value, 3-month change (green/amber directional).

**Step 5: Compose ForwardCurvePage**

Layout:
- Fuel type tabs (bio-methanol, green NH₃, e-LNG, HVO) + Port cluster tabs (ARA, Singapore, Fujairah)
- CurveChart
- PeriodSummaryCards
- Two-column: ConfidenceTierLegend | TransactionFeed
- PriceDriverStrip

State: `fuelType`, `portCluster`. Fetch from mock data service. Demo mode controls seed vs empty.

**Step 6: Commit**
```bash
git add src/components/v2/ForwardCurvePage.tsx src/components/v2/CurveChart.tsx \
  src/components/v2/PeriodSummaryCards.tsx src/components/v2/TransactionFeed.tsx \
  src/components/v2/PriceDriverStrip.tsx
git commit -m "feat: add 3-tier forward curve page with confidence bands and price drivers"
```

---

### Task 7: Find Supply Page

**Files:**
- Create: `src/components/v2/FindSupplyPage.tsx`
- Create: `src/components/v2/DemandInputPanel.tsx`
- Create: `src/components/v2/MatchCard.tsx`
- Create: `src/utils/matchRanking.ts`

**Step 1: Build client-side match ranking**

In `src/utils/matchRanking.ts`:
```typescript
export function rankSupplyListings(
  listings: SupplyListing[],
  demand: DemandInput
): MatchResult[]
```

Scoring weights: CI 40%, supply certainty 30%, port proximity 15%, price 15%. Normalize each dimension 0-1, multiply by weight, sum to get match_score 0-100. Filter by `min_ci_score`. Sort descending.

**Step 2: Build DemandInputPanel**

Left column. Fuel type chips (multi-select toggle), volume slider (lots × 500 MT, shows MT), port dropdown, delivery window dropdown, min CI slider (50-100). FuelEU threshold info box at bottom.

**Step 3: Build MatchCard**

Ranked result card. Shows: supplier name + port + window + volume, CIScoreBar, SupplyTierBadge, price (right-aligned, last). "Best CI" badge on top card. "Reserve this supply →" button → navigates to Buy Position with listing ID.

**Step 4: Compose FindSupplyPage**

Two-column layout: DemandInputPanel (left) | MatchCard[] (right). Header: "N matches — ranked by CI score". Cards re-rank on every input change (debounced 200ms).

**Step 5: Commit**
```bash
git add src/components/v2/FindSupplyPage.tsx src/components/v2/DemandInputPanel.tsx \
  src/components/v2/MatchCard.tsx src/utils/matchRanking.ts
git commit -m "feat: add Find Supply page with CI-ranked matching"
```

---

### Task 8: Buy Position Page

**Files:**
- Create: `src/components/v2/BuyPositionPage.tsx`
- Create: `src/components/v2/PositionSummary.tsx`
- Create: `src/components/v2/ComplianceImpactCard.tsx`

**Step 1: Build BuyPositionPage**

Layout (matches `03_buy_forward_position.html`):
- Breadcrumb: ← Forward Curve / Buy Position
- Header: fuel, port, window, listed price, CI badge, supplier badge
- Gray explainer box: "Like buying an oil forward..."
- InstrumentSelector: 3 InstrumentCards (PFSC, FDR, T-o-P), only one selectable
- Two-column: LotCalculator | PriceStructureToggle (Fixed $X/MT / Index-linked)
- PositionSummary (fuel, CI, port, window, volume, price, total, deposit)
- Amber confidence warning (based on which curve tier the price came from)
- CTA: "Review term sheet →" (primary green) + "Save draft · alert me when curve firms" (secondary outline)

Props: accepts `listingId` or `curvePoint` to pre-fill.

**Step 2: Build PositionSummary**

Gray box with sum-row items: fuel + certification, CI score + compliance badge, port + window, volume (N lots · X MT), price, contract value, deposit now (10%).

**Step 3: Build ComplianceImpactCard**

3-metric card: FuelEU gap after trade (shows reduction), CII impact (grade change), Carbon cert on delivery (MT + certification body).

**Step 4: Commit**
```bash
git add src/components/v2/BuyPositionPage.tsx src/components/v2/PositionSummary.tsx \
  src/components/v2/ComplianceImpactCard.tsx
git commit -m "feat: add Buy Position page with instrument selector and compliance impact"
```

---

### Task 9: Buyer Dashboard

**Files:**
- Create: `src/components/v2/BuyerDashboardV2.tsx`

**Step 1: Build BuyerDashboardV2**

Layout (matches `01_dashboard_buyer.html`):
- Compliance alert bar (amber if gap > 0, with "Find supply now →" link)
- 4 KPI metrics: Forward supply secured, Compliance gap, Avg CI secured, Open matches
- Two-column:
  - Left: Top matches (3 MatchCards preview, "See all 12 →" link to Find Supply)
  - Right: Compliance tracker (CII/FuelEU/IMO progress bars) + Active contracts list (PFSC/FDR/Open badges)

All data from mock service initially.

**Step 2: Commit**
```bash
git add src/components/v2/BuyerDashboardV2.tsx
git commit -m "feat: add compliance-first buyer dashboard"
```

---

### Task 10: Supplier Pages

**Files:**
- Create: `src/components/v2/SupplierDashboardV2.tsx`
- Create: `src/components/v2/MySupplyPage.tsx`
- Create: `src/components/v2/MarketDemandPage.tsx`

**Step 1: Build SupplierDashboardV2**

Matches `04_supplier_dashboard.html`:
- Green alert bar: "3 new enquiries match your supply"
- 4 KPIs: Active listings, Total volume listed, Offtake secured, Enquiries pending
- Two-column: Incoming enquiries (numbered cards) | How it works (3-step explainer)
- Active contracts list with Accept/Review/FID buttons

**Step 2: Build MySupplyPage**

Listing management. Table of SupplyListings with columns: fuel type, volume (lots), CI score, price, supply tier badge, window, status toggle. "Add new listing" button opens a form similar to DemandInputPanel but for supply.

**Step 3: Build MarketDemandPage**

Anonymised demand signals. Shows aggregated buyer demand by fuel type, port, window — without revealing individual buyers. Cards showing: "1,500 MT Green Methanol · ARA · Q3 2026 · 3 buyers seeking".

**Step 4: Commit**
```bash
git add src/components/v2/SupplierDashboardV2.tsx src/components/v2/MySupplyPage.tsx \
  src/components/v2/MarketDemandPage.tsx
git commit -m "feat: add supplier dashboard, my supply, and market demand pages"
```

---

### Task 11: App.tsx Routing & Layout Integration

**Files:**
- Modify: `src/App.tsx` — update Dashboard renderContent() with new page routing
- Modify: `src/components/Layout.tsx` — swap Sidebar for GroupedSidebar

**Step 1: Update Layout to use GroupedSidebar**

Import GroupedSidebar, pass same props. Keep header/mobile-menu behavior.

**Step 2: Update Dashboard renderContent()**

Add new cases for: FIND_SUPPLY, MY_DEMAND, FORWARD_CURVE, BUY_POSITION, FLEET_COMPLIANCE, ACTIVE_CONTRACTS, CERTIFICATES, MY_SUPPLY, MARKET_DEMAND.

Map them to v2 components. Keep existing pages (MAP, MARKETPLACE, etc.) as fallbacks accessible via demo mode.

Wire ComplianceBanner as persistent element above renderContent() for buyer view.

**Step 3: Update default pages**

Buyer default: DASHBOARD (was MAP — MAP stays accessible via sidebar).
Supplier default: DASHBOARD.

**Step 4: Build and verify**
```bash
npx vite build
```

**Step 5: Commit**
```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat: integrate v2 pages into app routing with grouped sidebar"
```

---

### Task 12: Fleet Compliance, Active Contracts, Certificates Pages

**Files:**
- Create: `src/components/v2/FleetCompliancePage.tsx`
- Create: `src/components/v2/ActiveContractsPage.tsx`
- Create: `src/components/v2/CertificatesPage.tsx`
- Create: `src/components/v2/MyDemandPage.tsx`

**Step 1: Build FleetCompliancePage**

Per-vessel compliance view. Table: vessel name, CII grade (A-E color coded), FuelEU % progress bar, IMO 2030 readiness. Summary row at top. Expandable rows show fuel mix breakdown.

**Step 2: Build ActiveContractsPage**

Adapted from current MyTrades — shows contracts with instrument_type badges (PFSC/FDR/NOV/T-o-P), status, counterparty, volume, price, delivery window. Status actions: Confirm / Deliver / Settle.

**Step 3: Build CertificatesPage**

Carbon certification registry. Table: certificate ID, fuel type, CI score, certification body (ISCC/RSB), volume, delivery date, status (issued/pending/verified). Download link for each cert.

**Step 4: Build MyDemandPage**

Rolling demand profile management. List of DemandProfile entries with: fuel type, volume, port, window, min CI, alert status toggle. "Add demand" form. "Save draft · alert me when curve firms" entries from Buy Position appear here.

**Step 5: Commit**
```bash
git add src/components/v2/FleetCompliancePage.tsx src/components/v2/ActiveContractsPage.tsx \
  src/components/v2/CertificatesPage.tsx src/components/v2/MyDemandPage.tsx
git commit -m "feat: add fleet compliance, active contracts, certificates, and my demand pages"
```

---

### Task 13: Integration Polish & Demo Mode

**Files:**
- Modify: `src/hooks/useDemoMode.ts` — ensure it controls mock data globally
- Modify: `src/components/Settings.tsx` — demo mode toggle now also controls seed/live curve

**Step 1: Wire demo mode to mock data service**

The mock data functions check `isDemoMode()`:
- Demo ON: return Gavin's seed data
- Demo OFF: return empty/null (frontend shows "No data yet" empty states)

**Step 2: Wire Intelligence Map**

Carry over BuyerMap component — accessible from "Intelligence Map" in buyer sidebar. No changes needed, just routed via the new Page ID.

**Step 3: Full integration test**

Manually verify all page transitions:
- Buyer: Dashboard → Intelligence Map → Fleet Compliance → Find Supply → Forward Curve → Buy Position → Active Contracts → Certificates → Settings
- Supplier: Dashboard → Market Demand → My Supply → Forward Curve → Active Contracts → Certificates → Settings
- Role switch works
- Demo mode toggle shows/hides seed data
- ComplianceBanner visible on all buyer pages

**Step 4: Build and verify**
```bash
npx vite build
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: complete Phase 1 — all v2 pages with mock data integrated"
```

---

## Phase 2: Backend APIs (Tasks 14-20)

### Task 14: Contract & SupplyListing Models + Migration

**Files:**
- Create: `app/models/contracts.py`
- Create: `alembic/versions/xxx_add_contract_models.py`

New ORM models per design doc Section 3. Alembic migration creates `contracts`, `supply_listings`, `demand_profiles` tables. Keep existing `orderbook_orders` and `trades` tables untouched.

### Task 15: SupplyListing CRUD Router

**Files:**
- Create: `app/routers/supply_listings.py`

Endpoints: `POST /api/supply-listings`, `GET /api/supply-listings`, `GET /api/supply-listings/{id}`, `PUT /api/supply-listings/{id}`, `DELETE /api/supply-listings/{id}`. Auth required. Org-scoped.

### Task 16: Supply Match Endpoint

**Files:**
- Create: `app/services/supply_matching.py`
- Create: `app/routers/supply_match.py`

`POST /api/supply/match` — ranked matching with CI 40%, certainty 30%, proximity 15%, price 15%. Returns `MatchResult[]` with `match_score` and `compliance_impact`.

### Task 17: Contract CRUD + Lifecycle Router

**Files:**
- Create: `app/routers/contracts.py`

Full CRUD + status transitions: DRAFT → PENDING → ACTIVE → DELIVERED → SETTLED. Each transition validates preconditions (e.g., PFSC requires deposit before ACTIVE).

### Task 18: Forward Curve API

**Files:**
- Modify: `app/routers/curves.py`

Update `GET /api/curves/forward` to return 3-tier data. `source` param: `seed` returns Gavin's hardcoded data, `live` aggregates from SupplyListing (tier 2) and settled Contract prices (tier 1). Tier 3 always modelled.

### Task 19: Compliance Summary API

**Files:**
- Create: `app/routers/compliance_summary.py`

`GET /api/compliance/summary` — returns org-level compliance: FuelEU gap MT, CII grade, FuelEU %, IMO 2030 %. Aggregates from fleet data + active contracts.

### Task 20: Wire Frontend to Real APIs

Replace mock data calls with real API calls in all v2 components. Mock data becomes fallback for empty states.

---

## Phase 3: Complete Feature Set (Tasks 21-30)

### Task 21: Term Sheet PDF Generation
### Task 22: NOV (Novation) Instrument Flow
### Task 23: Certificate Registry Backend
### Task 24: Exchange-Style Order Book (toggle in Forward Curve)
### Task 25: Trade Tape (in Forward Curve + standalone)
### Task 26: Watchlists (rebuilt around supply listings + demand alerts)
### Task 27: Stats / Analytics (rebuilt around contracts + curves)
### Task 28: Training / Education (carried over)
### Task 29: i18n (English + Chinese, per approved design)
### Task 30: Forward Curve Deepening with Real Transactions

*Phase 3 tasks will be planned in detail when Phase 2 is complete.*

---

## Testing Strategy

- **Phase 1:** Manual integration testing (all page transitions, role switching, demo mode)
- **Phase 2:** pytest for each new endpoint (target: 50+ tests for new models/routers)
- **Phase 3:** E2E tests for critical flows (Find Supply → Buy Position → Contract creation)

## Commit Cadence

One commit per task step. Feature branch only — no merges to main until Gavin reviews during April 6-10 visit.
