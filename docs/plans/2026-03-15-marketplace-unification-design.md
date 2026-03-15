# Marketplace Unification Design

**Date:** 2026-03-15
**Goal:** Merge `Marketplace.tsx` (buyer, 655 lines) and `SupplierDemandFeed.tsx` (supplier, 596 lines) into a single role-aware component (~650 lines), with a visual refresh.

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| OrderBook visibility | Both roles | Full transparency, like Baltic Exchange/Venetian |
| Demand signal cards | Dropped | Orderbook already communicates depth; saves API call + screen real estate |
| Order placement | Role-gated (B for now, C later) | Buyers: Place Bid. Suppliers: Place Ask. Config-driven, future TRADER role unlocks both |
| Page title | "Marketplace" | Neutral, matches sidebar for both roles |
| Trade modal | Simple (quantity + confirm) | Drop dead `buyDate` field. Extensible later for delivery dates, notes |
| Table scrolling | Scrollable container, sticky thead | Page is `h-screen overflow-hidden`, table container is `flex-1 overflow-y-auto` |

## Architecture

### Role Config Pattern

```typescript
const ROLE_CONFIG = {
  BUYER: {
    fetchOrders: api.orderbook.listAsksPaged,
    subtitle: 'Find and secure compliant marine fuels',
    primaryAction: { label: 'Place Bid', side: 'BID' as const },
    counterAction: { label: 'Inquire', verb: 'inquire' },
    columns: ['fuel', 'grade', 'volume', 'price', 'window', 'expiry', 'cert', 'action'],
  },
  SUPPLIER: {
    fetchOrders: api.orderbook.listBidsPaged,
    subtitle: 'Browse open fuel requests and submit offers',
    primaryAction: { label: 'Place Ask', side: 'ASK' as const },
    counterAction: { label: 'Hit Bid', verb: 'hit' },
    columns: ['fuel', 'volume', 'price', 'window', 'status', 'action'],
  },
};
```

The component reads `role` from `useAuth()`, selects config, and the entire render tree is role-agnostic — driven by config values, not conditionals.

### Component Structure

```
<Marketplace initialPort?: Port>
  ├─ Header ("Marketplace" + config.subtitle + primary CTA + refresh)
  ├─ Filter Bar (port autocomplete + fuel chips with counts + delivery window)
  ├─ <OrderBook /> (both roles, reactive to filters)
  ├─ Table Container (flex-1, overflow-y-auto)
  │   ├─ <thead> (sticky top-0, columns from config)
  │   ├─ <tbody> (OrderBookOrder[], action = config.counterAction)
  │   └─ <Pagination /> (sticky bottom)
  ├─ Trade Modal (quantity + confirm, slide-up)
  └─ <OrderPlaceModal side={config.primaryAction.side} />
```

### Shared Utilities (`src/utils/fuel.ts`)

Extracted from duplicated locals, case-insensitive (fixing supplier bug):

- `getFuelRowClasses(fuelType)` — table row border + bg by fuel
- `getFuelBadgeClasses(fuelType)` — badge pill styling
- `getStatusConfig(status)` — dot + label + colors for order status
- `formatExpiry(order)` — GTC badge or formatted date

Single lookup table (`FUEL_COLORS`) replaces ~100 lines of duplicated switch/if chains.

### Data Flow

```
useAuth() → role → ROLE_CONFIG[role] → config
  │
  ├─ config.fetchOrders(filters, skip, limit) → OrderBookOrder[]
  │    ├─ client-side: grade filter, sort, verified-only
  │    └─ Copilot context broadcast (both roles)
  │
  ├─ <OrderBook fuelType region /> (own 10s polling)
  │
  ├─ Trade: api.trades.initiate({ order_id, quantity_mt })
  │    └─ success/error state → auto-close
  │
  └─ Order: <OrderPlaceModal side={config.primaryAction.side} />
```

### State (~10 pieces)

```typescript
listings: OrderBookOrder[]
totalCount: number
loading: boolean        // initial + filter changes → skeleton rows
refreshing: boolean     // silent 60s background refresh

portInput: string
fuelType: string        // from chip selection
availability: string
currentSkip: number

selectedOrder: OrderBookOrder | null
orderModalSide: 'BID' | 'ASK' | null
tradeState: 'idle' | 'confirming' | 'success' | 'error'
```

## Visual Refresh

Bundled into the rewrite (CSS-only, no architecture changes):

| Element | Before | After |
|---------|--------|-------|
| Filter bar | Stacked 4-row form | Compact inline strip |
| Fuel selection | `<select>` dropdown | Clickable chip pills with live counts: `LNG (40)` |
| OrderBook | Plain table | `backdrop-blur-sm` glass card, emerald/red depth bars |
| Table rows | No hover | `hover:bg-slate-50/80 transition-colors duration-150` |
| Loading | Spinner | 4 skeleton placeholder rows (pulse animation) |
| Action buttons | Flat colored | `shadow-sm hover:shadow` depth |
| Result count | Static text | Pill badge: `N listings · LIVE · 60s` |
| Empty state | Icon + text | Illustrated with role-specific CTA |
| Page scroll | Full page scrolls | `h-screen overflow-hidden`, table container `flex-1 overflow-y-auto` |
| Table header | Scrolls away | `sticky top-0` within container, solid bg |
| First column | Sticky on mobile | `sticky left-0 z-20` with matching bg |

## Standardization Fixes

- **Design system tokens**: Migrate supplier's raw Tailwind to `v-card`, `v-input`, `v-heading`, `v-label`
- **Fuel color bug**: Case-insensitive matching (supplier exact-match missed `"ammonia (green)"`)
- **Error handling**: Adopt supplier's error-state-with-retry (buyer silently swallowed errors)
- **Pagination**: Server-side for both (supplier loaded all 100)
- **Auto-refresh**: 60s polling for both (supplier had none)
- **Copilot context**: Broadcast for both roles

## File Changes

| Action | File |
|--------|------|
| Create | `src/utils/fuel.ts` |
| Rewrite | `src/components/Marketplace.tsx` |
| Modify | `src/components/layout/Sidebar.tsx` (unify page ID) |
| Modify | `src/App.tsx` (remove SupplierDemandFeed, merge routing) |
| Modify | `src/components/OrderBook.tsx` (minor wiring check) |
| Delete | `src/components/SupplierDemandFeed.tsx` |
| Modify | `src/types.ts` (remove DemandSignal) |

**Net result:** ~1,251 lines → ~700 lines. One component. One mental model. One place to fix bugs.

## Future Extensibility

- **TRADER role**: Add entry to `ROLE_CONFIG` with `canPlaceBid: true, canPlaceAsk: true`
- **Trade modal fields**: Add optional `deliveryDate`, `notes` to modal and `api.trades.initiate` schema
- **Column customization**: User preferences for visible columns (stored in localStorage)
