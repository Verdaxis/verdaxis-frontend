# Verdaxis Compliance-First Platform Redesign

**Date:** 2026-03-18
**Status:** Approved
**Branch:** `feature/compliance-first-redesign`
**Source:** Gavin McGrath's platform design brief + HTML mockups (March 2026)

---

## 1. Context & Motivation

The current Verdaxis build is an **exchange-style trading platform** (order book, price-time auto-matching, trade tape). Gavin's design brief describes a fundamentally different product: a **compliance-first supply matching platform** for green marine bunker fuel.

Key insight from the brief: *"Price should never be the first thing a user sees. That ordering is what separates a compliance tool from a commodity exchange."*

The platform's core job is to resolve the chicken-and-egg problem between shipowners who need guaranteed green fuel for FuelEU/CII/IMO 2030 compliance, and fuel producers who need committed offtake before they can reach FID on production plants.

### Design Decisions (from brainstorming Q&A)

1. **Full architecture pivot** — not a skin-deep rename, but a new product architecture
2. **Separate branch** — `feature/compliance-first-redesign`, current `main` stays stable for pilot
3. **Replace auto-matching with CI-ranked supply matching** — no exchange-style order book as primary flow
4. **New `Contract` model from scratch** — 4 instrument types (PFSC, FDR, NOV, T-o-P), separate from existing Order/Trade
5. **Backend-ranked matching API** — `POST /api/supply/match` with CI→certainty→proximity→price weighting
6. **Configurable seed data for forward curve** — demo mode shows Gavin's numbers, live mode shows real data
7. **Gavin's grouped sidebar navigation** — sections (Overview, Fuel Market, Contracts, Account)
8. **Frontend-first build** — all pages with mock data first, then wire backend APIs
9. **Keep dark mode** — map Gavin's warm paper palette to dark equivalents
10. **No deferral** — all features built sequentially on this branch

---

## 2. Page Architecture

### Buyer View (7 pages)

| Page | Purpose |
|------|---------|
| **Dashboard** | Compliance-first overview — FuelEU gap as hero metric, top matches preview, compliance tracker, active contracts |
| **Intelligence Map** | Carried over from current build — geographic market view |
| **Fleet Compliance** | CII/FuelEU/IMO tracking per vessel with progress bars |
| **Find Supply** | CI-ranked supply matching — buyer enters demand, gets ranked match cards |
| **My Demand** | Rolling 12-36 month forward consumption plan by vessel/route |
| **Forward Curve** | 3-tier price signal (transacted/listed/modelled) with confidence bands to 2030 |
| **Buy Position** | Contract builder — instrument selector, lot calculator, term sheet, compliance impact |

Plus shared: Active Contracts, Certificates, Settings

### Supplier View (5 pages)

| Page | Purpose |
|------|---------|
| **Dashboard** | Production metrics, incoming enquiries, active contracts |
| **Market Demand** | Anonymised demand signals from buyers |
| **My Supply** | Manage supply listings (firm/conditional/indicative) |
| **Forward Curve** | Shared with buyer — see where their offers sit on the curve |
| **Active Contracts** | Contract lifecycle management |

Plus shared: Certificates, Settings

### Sidebar Navigation (Grouped)

**Buyer:**
```
OVERVIEW
  Dashboard
  Intelligence Map
  Fleet Compliance
FUEL MARKET
  Find Supply
  My Demand
  Forward Curve
CONTRACTS
  Active Contracts
  Certificates
ACCOUNT
  Settings
```

**Supplier:**
```
OVERVIEW
  Dashboard
SUPPLY MARKET
  Market Demand
  My Supply
  Forward Curve
CONTRACTS
  Active Contracts
  Certificates
ACCOUNT
  Settings
```

### Persistent Compliance Banner (Buyer Only)
Non-dismissable bar across every page:
- FuelEU gap: "FuelEU 2026: 1,200 MT uncovered"
- CII rating: "CII B · on track"
- Clickable → Fleet Compliance page

---

## 3. Data Model

### Contract (new — replaces Order/Trade)

```
Contract
  id: UUID
  instrument_type: enum [PFSC, FDR, NOV, TOP]
  status: enum [DRAFT, PENDING, ACTIVE, DELIVERED, SETTLED, CANCELLED]
  buyer_org_id: FK → Organization
  supplier_org_id: FK → Organization (nullable for DRAFT)
  product_id: FK → Product
  delivery_point_id: FK → DeliveryPoint
  fuel_type: string
  ci_score: float                    # gCO₂eq/MJ
  certification_body: enum [ISCC_EU, RSB, REDII, MRV]
  lot_count: int                     # 1 lot = 500 MT
  quantity_mt: float                 # computed: lot_count × 500
  price_per_mt_usd: float
  price_structure: enum [FIXED, INDEX_LINKED]
  index_reference: string (nullable)
  availability_window: string
  delivery_window_start: date
  delivery_window_end: date
  supply_tier: enum [FIRM, CONDITIONAL, INDICATIVE]
  deposit_pct: float (nullable)      # FDR: 10-15%
  deposit_amount_usd: float (nullable)
  shortfall_fee_pct: float (nullable) # T-o-P: 85-95%
  novation_eligible: bool
  fueleu_compliant: bool
  cii_impact_grade: string (nullable)
  term_sheet_url: string (nullable)
  expires_at: datetime (nullable)
  created_at: datetime
  updated_at: datetime
```

### SupplyListing (producer's published offers)

```
SupplyListing
  id: UUID
  supplier_org_id: FK → Organization
  product_id: FK → Product
  delivery_point_id: FK → DeliveryPoint
  supply_tier: enum [FIRM, CONDITIONAL, INDICATIVE]
  available_lots: int
  remaining_lots: int
  ci_score: float
  certification_body: enum [ISCC_EU, RSB, REDII, MRV]
  price_per_mt_usd: float
  price_structure: enum [FIXED, INDEX_LINKED]
  availability_window: string
  delivery_window_start: date
  delivery_window_end: date
  fid_status: string (nullable)
  plant_location: string (nullable)
  is_active: bool
  created_at: datetime
  updated_at: datetime
```

### DemandProfile (buyer's rolling demand + alerts)

```
DemandProfile
  id: UUID
  buyer_org_id: FK → Organization
  fuel_type: string
  min_ci_score: float
  quantity_mt: float
  port_preference: string
  delivery_window: string
  max_price_per_mt_usd: float (nullable)
  alert_enabled: bool
  status: enum [ACTIVE, FULFILLED, EXPIRED]
  created_at: datetime
```

### Four Contract Instruments

| Instrument | Name | Description | Key Fields |
|-----------|------|-------------|------------|
| **PFSC** | Physical Forward Supply Contract | Fixed price, obligatory delivery, named port, specific window. Core instrument. | price_structure=FIXED |
| **FDR** | Forward Deposit Reservation | 10-15% deposit secures delivery slot. Deposit forfeited on non-lift. | deposit_pct, deposit_amount_usd |
| **NOV** | Physical Novation | Transfer delivery obligation to another verified buyer. Novation price feeds curve. | novation_eligible=true |
| **T-o-P** | Take-or-Pay SPA | Multi-year commitment for 2027-2030. Shortfall fee 85-95% on non-lift. | shortfall_fee_pct |

---

## 4. Matching Logic

### Endpoint: `POST /api/supply/match`

**Input:**
```json
{
  "fuel_type": "green_methanol",
  "quantity_mt": 1500,
  "port": "ARA",
  "delivery_window": "Q3 2026",
  "min_ci_score": 75
}
```

**Ranking weights:**
1. CI score (40%) — higher is better
2. Supply certainty (30%) — FIRM=1.0, CONDITIONAL=0.6, INDICATIVE=0.3
3. Port proximity (15%) — exact=1.0, same region=0.6, other=0.2
4. Price (15%) — lower is better (normalized)

**Output:** Ranked `SupplyListing[]` with `match_score` (0-100) and `compliance_impact` object.

---

## 5. Forward Curve

### Three-Tier Signal Stack

| Tier | Source | Visualization | Confidence |
|------|--------|--------------|------------|
| Transacted | Closed contracts on platform | Solid green line, filled dots | High |
| Listed offer | Active SupplyListing ask prices | Dashed blue line | Medium |
| Modelled floor | Cost-of-production model (H₂ + ETS + biomass + IMO levy) | Dotted gray line | Low |

Uncertainty bands widen as time extends (green fill between high/low bounds).

### API: `GET /api/curves/forward`

Returns per-period data for all 3 tiers + bands + price drivers.
Source field: `"seed"` (Gavin's demo data) or `"live"` (real platform data).
Demo mode toggle in Settings controls this globally.

### Price Drivers Exposed
5 cards: Green H₂ spot, EU ETS carbon, Biomass index, IMO levy (fwd), Scale factor.

### Minimum Publication Threshold
3 transactions required before publishing a transacted period price.

---

## 6. Visual Design

### Color System

| Token | Light | Dark |
|-------|-------|------|
| `--v-green` | `#1D9E75` | `#1D9E75` |
| `--v-green-light` | `#EAF3DE` | `rgba(29,158,117,0.15)` |
| `--v-green-dark` | `#27500A` | `#6FCF97` |
| `--v-blue` | `#378ADD` | `#378ADD` |
| `--v-blue-light` | `#E6F1FB` | `rgba(55,138,221,0.15)` |
| `--v-amber` | `#BA7517` | `#EF9F27` |
| `--v-amber-light` | `#FAEEDA` | `rgba(186,117,23,0.15)` |
| `--v-gray` | `#888780` | `#888780` |
| `--v-bg` | `#f5f4f0` | `#0f1419` |
| `--v-bg-alt` | `#f1efe8` | `#1a2332` |
| `--v-surface` | `#ffffff` | `#1e2a3a` |
| `--v-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--v-text` | `#1a1a18` | `#e8e6e1` |
| `--v-text-secondary` | `#666666` | `#9ca3af` |

### Information Hierarchy (every screen)
1. Compliance status first (banner, always visible)
2. CI score before price (in match cards, CI bar left, price right)
3. Supply certainty explicit (Firm/Conditional/Indicative badge)
4. Price last column
5. Uncertainty honest (widening bands, disclaimers, confidence labels)

### Typography
System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI'), weight 500 (medium).
Compact sizing: 11-13px body, 15-18px metrics.

---

## 7. Build Sequence

### Phase 1: Frontend with mock data (target: April 4)

1. **Foundation** (~1 day) — branch, CSS properties, GroupedSidebar, ComplianceBanner, shared components, mock data service
2. **Forward Curve** (~1.5 days) — Chart.js 3-tier chart, fuel/port tabs, period cards, transaction feed, price drivers, click-to-buy
3. **Find Supply** (~1.5 days) — demand input panel, client-side ranking, match cards, reserve CTA
4. **Buy Position** (~1.5 days) — instrument selector, lot calculator, price toggle, position summary, compliance impact, save draft
5. **Dashboard** (~1 day) — 4 KPIs, top matches, compliance tracker, active contracts
6. **Supplier pages** (~1 day) — dashboard, my supply, market demand
7. **Integration & polish** (~0.5 day) — role switching, Intelligence Map, demo mode, Active Contracts, Certificates

### Phase 2: Backend APIs (target: April 10)

1. Contract model + Alembic migration
2. SupplyListing model + CRUD
3. DemandProfile model + alerts
4. `POST /api/supply/match` ranked matching
5. `GET /api/curves/forward` seed/live toggle
6. `GET /api/compliance/summary`
7. Wire frontend → real APIs, mock data = fallback

### Phase 3: Complete feature set (April 11+)

1. Term sheet PDF generation
2. NOV instrument flow
3. Certificate registry
4. Exchange-style order book (toggle in Forward Curve when liquidity exists)
5. Trade tape (in Forward Curve as transaction feed + standalone)
6. Watchlists (rebuilt around supply listings + demand alerts)
7. Stats / Analytics (rebuilt around contracts + curves)
8. Training / Education (carried over)
9. i18n (English + Chinese)
10. Forward curve deepening with real transactions

---

## 8. Reference: Gavin's Oil Market Parallel

The Brent market is the blueprint for how Verdaxis evolves:

| Stage | Oil Market | Verdaxis Equivalent |
|-------|-----------|-------------------|
| 1 | Physical bilateral deals | Today — bilateral green bunker deals |
| 2 | Standardised physical forwards (21-day Brent) | PFSC — standardised 500 MT lots |
| 3 | Active daisy chain | NOV — lots transferred before delivery |
| 4 | Price reporting agency (Platts MOC) | Verdaxis assessed price (min 3 trades/period) |
| 5 | Exchange-traded futures | Verdaxis index licensed to exchanges |
| 6 | OTC swaps/CFDs | Financial hedging referencing Verdaxis index |
| 7 | Options market | Supply options, collars for shipowners |
| 8 | Self-reinforcing benchmark | Green bunker contracts globally priced off Verdaxis |

Year 1: physical contracts only (no financial licence needed).
Year 3+: separate "Verdaxis Markets" subsidiary for financial instruments.

---

*Confidential — Verdaxis platform design. Not for distribution.*
