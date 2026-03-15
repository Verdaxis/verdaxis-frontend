# Marketplace Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge buyer `Marketplace.tsx` and supplier `SupplierDemandFeed.tsx` into a single role-aware component with visual refresh, reducing 1,251 lines to ~700.

**Architecture:** One `<Marketplace />` component reads role from `useAuth()`, selects a `ROLE_CONFIG` object that drives fetch function, column set, CTA labels, and subtitle. Shared fuel/status utilities extracted to `src/utils/fuel.ts`. Table uses scrollable container with sticky thead instead of page-level scroll.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react icons, existing `api.ts` + `OrderBookOrder` type

---

### Task 1: Extract Shared Utilities

**Files:**
- Create: `src/utils/fuel.ts`
- Test: verify TypeScript compiles with `npx tsc --noEmit`

**Step 1: Create `src/utils/fuel.ts`**

```typescript
/**
 * Shared fuel type styling + status config — single source of truth.
 * Case-insensitive lookups fix the supplier bug where "ammonia (green)" missed exact-match.
 */
import React from 'react';
import { OrderBookOrder } from '../types';

// ─── Fuel Color Map ────────────────────────────────────────────
type ColorKey = 'violet' | 'green' | 'sky' | 'teal' | 'amber' | 'slate';

const FUEL_COLOR_MAP: Record<string, ColorKey> = {
  methanol: 'violet',
  biofuel: 'green',
  lng: 'sky',
  ammonia: 'teal',
  'ammonia (green)': 'teal',
  lsmgo: 'amber',
};

function colorFor(fuelType: string): ColorKey {
  return FUEL_COLOR_MAP[fuelType.toLowerCase()] ?? 'slate';
}

const ROW_CLASSES: Record<ColorKey, string> = {
  violet: 'border-l-2 border-l-violet-400 bg-violet-50/60 dark:bg-violet-950/20',
  green:  'border-l-2 border-l-green-400 bg-green-50/60 dark:bg-green-950/20',
  sky:    'border-l-2 border-l-sky-400 bg-sky-50/60 dark:bg-sky-950/20',
  teal:   'border-l-2 border-l-teal-400 bg-teal-50/60 dark:bg-teal-950/20',
  amber:  'border-l-2 border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20',
  slate:  'border-l-2 border-l-slate-400 bg-white dark:bg-slate-800',
};

const BADGE_CLASSES: Record<ColorKey, string> = {
  violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  green:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  sky:    'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  teal:   'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  amber:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  slate:  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

const STICKY_BG: Record<ColorKey, string> = {
  violet: 'bg-violet-50/60 dark:bg-violet-950/20',
  green:  'bg-green-50/60 dark:bg-green-950/20',
  sky:    'bg-sky-50/60 dark:bg-sky-950/20',
  teal:   'bg-teal-50/60 dark:bg-teal-950/20',
  amber:  'bg-amber-50/60 dark:bg-amber-950/20',
  slate:  'bg-white dark:bg-slate-800',
};

export function getFuelRowClasses(fuelType: string): string {
  return ROW_CLASSES[colorFor(fuelType)];
}

export function getFuelBadgeClasses(fuelType: string): string {
  return BADGE_CLASSES[colorFor(fuelType)];
}

export function getFuelStickyBg(fuelType: string): string {
  return STICKY_BG[colorFor(fuelType)];
}

// ─── Status Config ─────────────────────────────────────────────
export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  OPEN:             { label: 'Open',             bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  PARTIALLY_FILLED: { label: 'Partial',          bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-500' },
  FILLED:           { label: 'Filled',           bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500' },
  CANCELLED:        { label: 'Cancelled',        bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',      dot: 'bg-red-500' },
  EXPIRED:          { label: 'Expired',          bg: 'bg-slate-500/10',   text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500' },
};

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_MAP[status] ?? { label: status, bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' };
}

// ─── Expiry Formatter ──────────────────────────────────────────
export function formatExpiry(order: OrderBookOrder): React.ReactNode {
  const expiryDate = (order as any).expiry_date;
  if (!expiryDate) {
    return (
      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
        GTC
      </span>
    );
  }
  const formatted = new Date(expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  return (
    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
      {formatted}
    </span>
  );
}

// ─── Delivery Window ───────────────────────────────────────────
export function formatDeliveryWindow(order: OrderBookOrder): string {
  if (order.delivery_window_start && order.delivery_window_end) {
    const start = new Date(order.delivery_window_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const end = new Date(order.delivery_window_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${start} – ${end}`;
  }
  return order.availability_window || 'Spot';
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npx tsc --noEmit 2>&1 | grep -c 'utils/fuel'`
Expected: 0 (no errors from our new file)

**Step 3: Commit**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
git add src/utils/fuel.ts
git commit -m "refactor: extract shared fuel/status utilities to src/utils/fuel.ts"
```

---

### Task 2: Rewrite Unified Marketplace Component

**Files:**
- Rewrite: `src/components/Marketplace.tsx` (complete replacement)

This is the core task. The component is ~650 lines. It replaces both `Marketplace.tsx` (655 lines) and `SupplierDemandFeed.tsx` (596 lines).

**Step 1: Write the unified Marketplace component**

The implementer should read the design doc at `docs/plans/2026-03-15-marketplace-unification-design.md` for the full architecture, then write `src/components/Marketplace.tsx` with:

**Structure:**
1. **ROLE_CONFIG** object at top — maps BUYER/SUPPLIER to fetch function, subtitle, primary action, counter action, column set
2. **Props:** `{ initialPort?: Port }` (passed from buyer map navigation)
3. **Auth:** `useAuth()` → role, `useCopilotContext()` → broadcast
4. **State:** listings, totalCount, loading, refreshing, portInput, fuelType, availability, currentSkip, selectedOrder, orderModalSide, tradeState
5. **Data fetching:** `config.fetchOrders(filters, skip, limit)` with 60s auto-refresh using `refreshing` (not `loading`) for silent updates
6. **Port autocomplete:** from existing `PORTS` constant in `../data`
7. **Fuel chip pills:** horizontal scrollable chips showing fuel types with order counts from API response, replacing the dropdown `<select>`
8. **OrderBook widget:** `<OrderBook fuelType={} region={} />` shown for both roles
9. **Scrollable table:** outer container `flex-1 overflow-y-auto`, thead `sticky top-0 z-10 bg-white dark:bg-slate-900`, first column `sticky left-0 z-20`
10. **Column rendering:** driven by `config.columns` array — each column ID maps to a render function
11. **Action button:** uses `config.counterAction.label` ("Inquire" for buyers, "Hit Bid" for suppliers)
12. **Trade modal:** simple quantity + confirm dialog, replaces both the buyer's hand-rolled modal and supplier's hit-bid modal. States: idle → confirming → success → auto-close
13. **OrderPlaceModal:** mounted with `side={config.primaryAction.side}`, prefilled from current filters
14. **Error state:** full error display with retry button (adopted from supplier, buyer previously swallowed errors)
15. **Loading state:** 4 skeleton placeholder rows with pulse animation
16. **Empty state:** centered with role-specific CTA text
17. **Copilot context broadcast:** on every data/filter change, both roles

**Visual refresh (CSS changes within the JSX):**
- Filter bar: compact inline strip with `backdrop-blur-sm` glass effect
- Fuel chips: `rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all` with active state
- Table rows: `hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors duration-150`
- Action buttons: `shadow-sm hover:shadow transition-shadow`
- Result count: pill badge `bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs`
- Skeleton rows: `animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4`
- Use `v-card`, `v-input`, `v-heading`, `v-label`, `v-btn-primary` design tokens throughout (not raw Tailwind for card/input/heading)

**Key imports:**
```typescript
import { useAuth } from '../context/AuthContext';
import { useCopilotContext } from '../context/CopilotContext';
import { api } from '../services/api';
import { Port, OrderBookOrder, AvailabilityWindow } from '../types';
import { PORTS } from '../data';
import { OrderBook } from './OrderBook';
import { OrderPlaceModal } from './OrderPlaceModal';
import { Pagination } from './ui/Pagination';
import { getFuelRowClasses, getFuelBadgeClasses, getFuelStickyBg, getStatusConfig, formatExpiry, formatDeliveryWindow } from '../utils/fuel';
```

**Step 2: Verify TypeScript compiles**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npx tsc --noEmit 2>&1 | grep 'Marketplace\|fuel' | head -20`
Expected: No new errors from Marketplace.tsx or fuel.ts

**Step 3: Commit**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
git add src/components/Marketplace.tsx
git commit -m "feat: unified role-aware Marketplace component with visual refresh"
```

---

### Task 3: Update Routing + Sidebar + App.tsx

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

**Step 1: Update Sidebar — unify page IDs**

In `src/components/layout/Sidebar.tsx`, change the supplier sidebar entry from:
```typescript
{ id: 'DEMAND_FEED', label: 'Marketplace', icon: Megaphone },
```
to:
```typescript
{ id: 'MARKETPLACE', label: 'Marketplace', icon: ShoppingCart },
```

Both buyer and supplier sidebars now use `id: 'MARKETPLACE'` with the same icon.

**Step 2: Update App.tsx — remove SupplierDemandFeed**

In `src/App.tsx`:

1. Remove the import:
```typescript
// DELETE: import { SupplierDemandFeed } from './components/SupplierDemandFeed';
```

2. Remove or redirect the `DEMAND_FEED` case in the render switch. Find the supplier page rendering:
```typescript
case 'DEMAND_FEED':
    return <SupplierDemandFeed />;
```
Change to:
```typescript
case 'DEMAND_FEED':
    return <Marketplace initialPort={null} />;
```
Or better: since the Sidebar no longer emits `DEMAND_FEED`, this case is dead — but keep it as a safety fallback for one release cycle, pointing to `<Marketplace />`.

3. Ensure the buyer `MARKETPLACE` case passes `initialPort`:
```typescript
case 'MARKETPLACE':
    return <Marketplace initialPort={selectedPort} />;
```

**Step 3: Verify TypeScript compiles and no import errors**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npx tsc --noEmit 2>&1 | grep -E 'SupplierDemandFeed|DEMAND_FEED|Marketplace' | head -10`
Expected: No errors

**Step 4: Commit**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
git add src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "refactor: unify marketplace routing — both roles use MARKETPLACE page ID"
```

---

### Task 4: Delete Dead Code + Clean Up Types

**Files:**
- Delete: `src/components/SupplierDemandFeed.tsx`
- Modify: `src/types.ts` (remove `DemandSignal`)

**Step 1: Delete SupplierDemandFeed.tsx**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
rm src/components/SupplierDemandFeed.tsx
```

**Step 2: Remove DemandSignal type from types.ts**

Search for `DemandSignal` in `src/types.ts` and remove the interface definition. It should be around lines 322-330. Also remove any imports of it elsewhere:

```bash
grep -rn 'DemandSignal' src/ --include='*.tsx' --include='*.ts'
```

If only `SupplierDemandFeed.tsx` (now deleted) and `types.ts` reference it, just remove it from types.ts.

**Step 3: Remove demand signals API if no longer used**

Check if `api.demand.signals()` is used anywhere else:
```bash
grep -rn 'demand\.signals\|api\.demand' src/ --include='*.tsx' --include='*.ts'
```

If only the deleted file used it, the API method can stay (harmless) or be removed from `api.ts`.

**Step 4: Verify build**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
git add -A
git commit -m "chore: delete SupplierDemandFeed.tsx and DemandSignal type — dead code after unification"
```

---

### Task 5: Build, Deploy, Visual Verification

**Step 1: Run full TypeScript check**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npx tsc --noEmit 2>&1 | tail -20`
Expected: No new errors (pre-existing errors in other files are acceptable)

**Step 2: Build for production**

Run: `cd /home/verdaxis-prod/verdaxis-frontend && npm run build 2>&1 | tail -5`
Expected: `✓ built in Xs`

**Step 3: Visual verification with Playwright**

Test both buyer and supplier views:

1. Navigate to `https://app.verdaxis.exchange/login`
2. Log in as buyer → navigate to Marketplace → screenshot
3. Verify: "Marketplace" title, orderbook visible, fuel chips, Place Bid button, table with Grade/Expiry/Cert columns
4. Log in as supplier → navigate to Marketplace → screenshot
5. Verify: "Marketplace" title, same orderbook, Place Ask button, table with Status column, Hit Bid action buttons
6. Test mobile (375px) for both roles
7. Test table scroll — verify thead stays sticky, first column stays sticky on horizontal scroll

**Step 4: Final commit if any fixes needed**

```bash
cd /home/verdaxis-prod/verdaxis-frontend
git add -A
git commit -m "chore: marketplace unification complete — verified both roles"
```
