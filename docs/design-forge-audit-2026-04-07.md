# Design Forge Audit + BMAD UX Assessment — Verdaxis Exchange

**Date:** 2026-04-07
**Trigger:** External advisor pre-launch review (28-page PDF)
**Pipeline:** Design Forge (5 stages) + BMAD UX Specialist (independent second opinion)

---

## Overall Score: D+

**Creative:** Generic/Inconsistent | **UX:** D | **Engineering:** B- | **Compliance:** Partial | **Motion:** Minimal

The platform has strong technical foundations (correct data models, matching engine, trade state machine, notification infrastructure) but the UX **hides the transactional core behind an exploration layer**. The external advisor's central thesis is validated across all analyses:

> "You've built a beautiful layer 2 product (intelligence), but your success depends on layer 1 (transactions)."

---

## Critical Findings (must fix before launch)

### 1. Wrong Default Landing — Map Instead of Action Dashboard

**Current:** Buyers default to `MAP` (BuyerMap), an intelligence/exploration view.
**Impact:** Users land on a map with port dots, explore, then leave without creating liquidity.
**Evidence:** `App.tsx:144` — `defaultPage = mode === 'BUYER' ? 'MAP' : 'DASHBOARD'`

**All 4 analyses agree:** Replace with an Action Dashboard showing:
- Above the fold: "What do you want to do?" with 3 CTAs: **Post Demand / Post Supply / Explore Market**
- Section 2: "Your Activity" (open opportunities, matches found, deals in progress)
- Section 3: "Recommended Matches" (3-5 curated with "Express Interest" CTA)
- Section 4: Market Snapshot (mini map, key stats — light, not dominant)
- Current map becomes a secondary "Market Intelligence" tab

```
┌──────────────────────────────────────────────────────┐
│  What do you want to do?                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ POST A   │  │  BROWSE  │  │  VIEW MY │           │
│  │   BID    │  │  SUPPLY  │  │   DEALS  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│  ── YOUR ACTIVITY ──────────────────────────────     │
│  🎯 2 matches found  |  📋 3 open bids  |  ✓ 1 deal│
│                                                      │
│  ── RECOMMENDED MATCHES ────────────────────────     │
│  [Match Card + "Express Interest" CTA]               │
│  [Match Card + "Express Interest" CTA]               │
│                                                      │
│  ── MARKET SNAPSHOT (light) ────────────────────     │
│  [Mini map] [Key stats] [Recent trades]              │
└──────────────────────────────────────────────────────┘
```

### 2. No Post-Action Feedback Loop

**Current:** After submitting a bid/ask via OrderPlaceModal, the modal closes silently. No confirmation, no match feedback, no "what happens next."
**Impact:** Users don't know if action succeeded. No reason to stay engaged.
**Evidence:** `OrderPlaceModal.tsx:150-170` — form closes on success, no follow-up state.

**Fix:** After successful submission, show:
- "Your bid posted! 2,000 MT Methanol — $545/MT"
- "3 potential matches found" (from MatchSuggestion API)
- CTAs: "View Matches" / "Post Another" / "Go to Dashboard"

### 3. Match Suggestions Buried and Invisible

**Current:** `MatchSuggestions` component only renders inside Marketplace's OrderBook column. Returns `null` if no matches (invisible). 30-second polling interval.
**Impact:** Matches are the core value proposition but users never see them unless they navigate away from their default page.
**Evidence:** `Marketplace.tsx:314-321` (only rendering location), `MatchSuggestions.tsx:42` (returns null when empty)

**Fix:**
- Move MatchSuggestions to the Action Dashboard (first-class citizen)
- Always show with status: "3 matches found" or "Checking for matches..."
- Upgrade from 30s polling to SSE (TradeNotifier pattern exists)
- Add push notifications: "New match found!" toast + bell badge

### 4. Supplier Has Zero Inbound Demand Visibility

**Current:** Suppliers see only trades that already matched them. No way to see unfilled buyer requests or proactively market supply.
**Impact:** Suppliers wait passively; can't seek buyers. Kills supply-side activation.
**Evidence:** `SupplierDashboard.tsx` — only shows Trade objects, not OrderBookOrders from demand side.

**Fix:** New "Demand Feed" component showing filtered buyer bids/RFQs matching supplier's product profile. Display: "X buyers seeking Methanol in your regions."

### 5. Modal Accessibility Failures

**Current:** 7 modal types, none have focus trapping, `role="dialog"`, `aria-modal`, or Escape key handlers.
**Impact:** WCAG 2.1 AA non-compliant. Keyboard/screen-reader users can't navigate modals.
**Evidence:** `CreateBidModal.tsx:53`, `OrderPlaceModal.tsx:286` — no ARIA attributes.

**Fix:** Implement focus-trap library, add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape handlers to all modals.

---

## High Findings (should fix)

### 6. Too Many Form Fields for First Action

**Current:** OrderPlaceModal has 10+ fields (product, delivery point, qty, price, window, expiry type, date, anonymity, etc.)
**Impact:** ~90 seconds to fill. First-time activation friction too high.
**Fix:** Streamline to 5 fields: Fuel Type, Quantity (with presets), Price, Delivery Window, Submit. Advanced options behind collapsible section.

### 7. Sidebar Uses Passive Language

**Current:** "Intelligence Map", "Marketplace", "Market Terminal", "Data & Analytics"
**Impact:** Navigation signals observation, not action. No primary CTA button in sidebar.
**Fix:** Rename to action-oriented labels. Add prominent "Post a Bid" / "Post Supply" button above nav items.

### 8. Empty States Are Dismissive

**Current:** BuyerDashboard empty state says "No open requests" with CTA to "Explore Map" — reinforcing wrong mental model.
**Impact:** Users exit instead of posting demand.
**Fix:** Empty states should say "Post your first bid to attract suppliers" with direct CTA to create flow.

### 9. No Page Transitions in Authenticated App

**Current:** Zero animation between route changes. Dashboard cards don't animate on load.
**Impact:** App feels static despite fast data loading.
**Evidence:** Public pages use Framer Motion + GSAP extensively; authenticated app uses neither.
**Fix:** Wrap `renderContent()` in `<AnimatePresence>` with fade-in-up (300ms). Add staggered card reveals on dashboard.

### 10. Color Contrast Violations

**Current:** `text-slate-400` on `dark:bg-slate-800/700` backgrounds = ~2.5:1 ratio (fails WCAG AA 4.5:1).
**Evidence:** `OrderPlaceModal.tsx:182`, form labels throughout.
**Fix:** Upgrade slate-400 labels to slate-300 on dark backgrounds.

---

## Medium Findings (nice to fix)

### 11. Hardcoded Colors (~65% of color usage)

Over 30 instances of `text-[#334155]`, `border-[#334155]`, `bg-[#5DADE2]` instead of Tailwind theme tokens. Makes dark mode difficult and reduces consistency. Migrate to named tokens.

### 12. Tab Component Fragmentation

SupplierDashboard uses underline-style tabs; TradeHistoryPage uses pill-style tabs. No shared component. Extract a `TabGroup` component.

### 13. Modal Pattern Duplication

7 modal types with identical overlay + flex-center structure. ~200+ lines of redundant code. Create reusable Modal wrapper.

### 14. RFQ System Not Integrated

RFQPanel is a separate component with separate flow. Not clear when buyer/supplier should use RFQ vs OrderBook. Needs UX alignment.

### 15. Motion Library Split

Public pages use both Framer Motion and GSAP. Authenticated app uses neither. Standardize on Framer Motion for all components; GSAP only for scroll-driven effects.

---

## Agreement with External Advisor

| Advisor Claim | Verdict | Notes |
|---------------|---------|-------|
| "Replace landing with action dashboard" | **STRONGLY AGREE** | All 4 analyses confirm. MAP → Action Dashboard. |
| "Immediate match feedback after posting" | **STRONGLY AGREE** | MatchSuggestions exists but is invisible at the right moment. |
| "Admin-assisted matching layer" | **AGREE** | AdminDashboard exists but needs force-match, state override. |
| "Controlled introduction model" | **PARTIALLY AGREE** | Good for trust, but adds latency. Consider hybrid: direct for verified, gated for new. |
| "Exclude complex pricing engines" | **DISAGREE** | CI-adjusted pricing is a real differentiator for FuelEU compliance. Keep it. |
| "Exclude advanced AI matching" | **PARTIALLY AGREE** | Rule-based matching already implemented. Don't remove, but don't over-invest. |
| "One or two verticals only" | **ALREADY DONE** | Maritime fuels is one vertical; methanol/biofuel/ammonia are product types within it. |

## What the Advisor Missed

1. **Notification system is immature** — 30s polling, not SSE. TradeNotifier handles post-execution only, not match discovery.
2. **Supplier demand visibility gap** — No inbound demand feed. Suppliers are blind to buyer intent.
3. **RFQ coexistence confusion** — Two parallel interaction patterns (RFQ vs OrderBook) without clear UX guidance on when to use which.
4. **Onboarding/KYC friction** — Multiple guard layers before first action (auth → profile → org → KYC → app).
5. **Form streamlining** — Implicit in advisor's "3 minutes" target but critical enough to be explicit.

---

## Recommended Implementation Priority

### Phase 1: Activation (1-2 weeks)
1. **New BuyerActionDashboard** — Replace MAP as default landing with action-oriented dashboard
2. **Post-action feedback** — Match feedback screen after bid/ask submission
3. **Sidebar CTA** — Add "Post a Bid" / "Post Supply" button to navigation
4. **Empty state rewrites** — Action-oriented messaging across all empty states

### Phase 2: Visibility (1-2 weeks)
5. **MatchSuggestions promotion** — Move to dashboard, add SSE, always-visible state
6. **Supplier Demand Feed** — New component showing inbound buyer intent
7. **Form streamlining** — 5-field quick form with "Advanced" toggle

### Phase 3: Polish (1 week)
8. **Modal accessibility** — Focus trap, ARIA, Escape handlers for all 7 modals
9. **Page transitions** — AnimatePresence wrapping authenticated routes
10. **Color token migration** — Replace hardcoded hex with Tailwind theme tokens
11. **Tab/modal component consolidation** — Shared components

### Phase 4: Trust Signals (ongoing)
12. **Activity indicators** — "23 active bids / 47 active asks / 8 trades today"
13. **Smart seeded content** — Pre-loaded listings for early liquidity
14. **Verification badges** — Trust layer on counterparty profiles

---

*Generated by Design Forge (5-stage pipeline) + BMAD UX Specialist*
*External input: Pre-launch checklist PDF (28 pages, dated 2026-04-07)*
