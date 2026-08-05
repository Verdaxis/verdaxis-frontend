# URL Routing Conversion — Implementation Plan (H0.4 / B1)

**Status:** reviewed (4-lens panel, 2026-07-10); all findings incorporated. Ready to implement.
**Goal:** every authenticated view and market slice gets a stable, bookmarkable, shareable URL. Replace the Dashboard `currentPage` state machine with nested react-router-dom v7 routes under `/app`, preserving today's behavior exactly (including the fact that pages fully unmount — there is **no** keep-mounted map today; do not build one in this slice).

## Route table

**The discriminator is `viewMode`, never `user.role`** — viewMode is user-switchable (Header dropdown, ADMIN-only per `Header.tsx:106`) and is what `sidebarConfig.ts` and both `renderContent` switches key on. Role-based guards would break admins (whose role is neither BUYER nor SUPPLIER) and BUYER-role users viewing as SUPPLIER.

| Path | Renders | Notes |
|---|---|---|
| `/app` | redirect → restored last page or `/app/home` | bare entry only; restore from `sessionStorage.verdaxis_currentPage` (legacy Page value → slug map), else `home` |
| `/app/home` | CommandCenter (per viewMode) | replaces `DASHBOARD` |
| `/app/map` | BuyerMap | lazy, as today |
| `/app/marketplace` | Marketplace | `DEMAND_FEED` and legacy `ORDERBOOK` both land here |
| `/app/m/:product/:port/:window` | Marketplace with the slice preselected | see slug codec below; invalid slice → redirect `/app/marketplace` |
| `/app/curve` | ForwardCurveWorkspace | `FORWARD_CURVE` |
| `/app/watchlist` | WatchlistPage | `WATCHLISTS` |
| `/app/analytics` | DataAnalytics | shared supply-and-demand intelligence in BUYER and SUPPLIER view modes |
| `/app/trades` | Trade History | `TRADES` |
| `/app/quotes` | SupplierQuotes | SUPPLIER-viewMode only; other viewModes → `/app/home` |
| `/app/compliance` | Compliance | BUYER-viewMode only; same guard |
| `/app/training` | Training | BUYER-viewMode only; same guard |
| `/app/settings` | Settings | shared |
| `/app/admin/*` | AdminDashboard | already a real path today; keep working unchanged |
| unknown `/app/*` | redirect `/app/home` | **there is no `/app/inventory`** — no INVENTORY component exists (the Page value falls through to the dashboard today); INVENTORY maps to `home` in the slug table |

## Slug codec (`src/utils/sliceUrl.ts` — new, the single home for this grammar)

The existing helpers CANNOT do this job (verified): `getMarketplaceProductValue` doesn't match hyphenated forms, `normalizeAvailabilityWindow` is case-sensitive and never rejects, `normalizeTradingPortName` only trims/lowercases. Write an explicit codec:

- `sliceToPath({product, port, window})` → `/app/m/<slug>/<slug>/<slug>`: product `BIO_METHANOL → bio-methanol` (lowercase, `_`→`-`); port `Los Angeles → los-angeles` (lowercase, spaces→`-`); window `SPOT → spot`, `2026-07`, `2026-Q4 → 2026-q4`, `2026-CAL → 2026-cal`.
- `parseSlicePath(product, port, window)` → `{product, port, window} | null`: case-insensitive; product unslug (`-`→`_`, uppercase) must be in the canonical four; port unslug (`-`→space, title-case via matching against `APPROVED_TRADING_PORTS` case-insensitively — never invent a name); window uppercased must satisfy the full grammar `SPOT | YYYY-MM | YYYY-QN | YYYY-CAL` (reuse the regexes from `utils/availabilityWindow` but with an explicit validity check — the normalizer alone returns junk unchanged). Any failure → `null` → redirect `/app/marketplace`.
- Unit-test the codec exhaustively (round-trip all four products × all eight ports × spot/month/quarter/cal, case variants, junk).

## Architecture

- `/app` becomes a **layout route**: the guard stack (`ProtectedRoute > RequireOrganization > RequireProfile > MobileDesktopGate`) wraps a `DashboardLayout` route element that owns `viewMode` state, Layout/Sidebar/Header, GuidedTutorial, ErrorBoundary, Suspense, **and the sidebar primary-action modal plumbing (`OrderPlaceModal`, `sidebarModalSide`, `onPrimaryAction` — App.tsx:249, 361-373)**, plus an `<Outlet/>`. Child routes render the page components.
- `handleNavigate(page: Page)` survives as a **thin adapter**: `pageToPath(page)` → `navigate(path)`. Existing `onNavigate` props keep their signature for plain-page handoffs. **Slice-aware handoffs are a separate new optional prop `onOpenSlice(slice)`** (ForwardCurve `forward-open-marketplace`, CommandCenter, SupplierDemandFeed where a full slice is known) — a Page value cannot carry a slice; don't pretend otherwise.
- **Map handoff (port-only, no slice):** `onPortSelect`/`onOrderClick` navigate to `/app/marketplace` with `state: { initialPort: port }`; Marketplace consumes router state exactly where the `initialPort` prop feeds it today. No partial-slice URL grammar.
- `pathToPage(pathname)` feeds Sidebar active state, `<main data-dashboard-page>` (dogfood tooling contract — sole consumer is `scripts/smoke_navigation.py`), and session persistence. `/app/m/*` → `MARKETPLACE`; `/app/admin*` → `ADMIN`.
- **Session persistence keeps a writer:** a `DashboardLayout` location effect writes `pathToPage(pathname)` to `sessionStorage.verdaxis_currentPage` on every route change (the old setItem sites die with the state machine). AuthContext logout keeps clearing both keys.
- Sidebar: items become `NavLink`s (real anchors — cmd/middle-click works, matching the existing ADMIN `<a>`), keeping `data-tour="nav-*"` on the anchors **and an `onClick` that closes the mobile drawer** (today via handleNavigate, Sidebar.tsx:43-46).
- **Nav metrics (currently unwired — wire them):** NOT in the navigate adapter (NavLinks bypass it). A single `DashboardLayout` effect on `location` change records `recordDashboardNavigationStart(prevPage, nextPage, viewMode)` + `recordDashboardContentReady(nextPage, viewMode)` around the route commit (prev tracked in a ref). Covers sidebar clicks, adapter navigations, deep links, and back/forward uniformly.
- `viewMode`: unchanged semantics (state + `sessionStorage.verdaxis_viewMode`); `handleSwitchView` navigates to `/app/home`. Note: cmd-click opening a new tab copies sessionStorage — per-tab viewMode divergence for admins is today's behavior too; test it, don't fight it.
- **Marketplace slice sync (both directions specified):** URL→state: an effect on the parsed `initialSlice` applies product/port/window when the params change (slice→slice navigation re-syncs; a `useState` initializer alone would show slice A under URL B). State→URL: when on `/app/m/*` and the user changes product/port/window in-page, `navigate(sliceToPath(next), { replace: true })`; when on `/app/marketplace`, the URL stays put (it's the generic view).
- **Lazy-chunk resilience for deep links:** wrap `React.lazy` imports in a `lazyWithRetry` that, on dynamic-import failure, reloads the page once (sessionStorage flag guard) — bookmarked deep links after a deploy otherwise land on a dead ErrorBoundary with stale chunk URLs.
- **Login redirect:** `ProtectedRoute` already sends `state: { from: location }` (App.tsx:133) — only LoginPage needs to consume it, at **both** navigate sites (auto-redirect effect line 27 — with `replace: true` — and post-submit line 55).

## Hazards (each handled above or here)

1. **NotificationList** (`src/components/notifications/NotificationList.tsx`): `navigate('/', {state:{targetPage:'DASHBOARD', openOrderId}})` → `navigate('/app/home', {state:{openOrderId}})`; the state-consuming effect moves to where CommandCenter is mounted.
2. **OnboardingPage** full-reload to `/app` with pending-tutorial flag: unaffected by the redirect (tour auto-start is TutorialContext); add a test.
3. **GuidedTutorial** clicks `[data-tour=nav-*]` anchors — NavLink click triggers SPA nav (Joyride dispatches real clicks); keep the 1800ms waits working (same Suspense fallbacks).
4. **ADMIN**: `pathToPage('/app/admin…') → ADMIN`; the old forcing effect dies.
5. **sanitizeDashboardPage** semantics live in the `/app` index redirect (legacy values: `ORDERBOOK→marketplace`, `INVENTORY→home`, junk→home) + unknown-route redirect.
6. **test-utils**: `renderWithProviders` gains optional `route`/`path`; existing tests pass unmodified (bare MemoryRouter already provides router context for `useNavigate`).

## Files

`src/App.tsx` (route tree, DashboardLayout, adapters, redirects), `src/utils/sliceUrl.ts` (new codec), `src/types.ts` (`PAGE_SLUGS`), `src/components/layout/Sidebar.tsx` + `sidebarConfig.ts`, `src/components/Layout.tsx`, `src/components/layout/Header.tsx`, `src/components/notifications/NotificationList.tsx`, `src/pages/LoginPage.tsx`, `src/components/Marketplace.tsx` (slice sync both directions + router-state initialPort), `src/components/ForwardCurveWorkspace.tsx`/`SupplierDemandFeed.tsx`/`CommandCenter.tsx` (`onOpenSlice`), `src/components/BuyerMap.tsx` handoff wiring, `src/utils/navigationPerformance.ts` (wired via layout effect), `src/tests/*`.

## Tests

- New `src/tests/slice-url.test.ts`: codec round-trips + rejections (the exhaustive matrix above).
- New `src/tests/app-routing.test.tsx`: route→component for every path **per viewMode** (BUYER, SUPPLIER, admin-switched); unknown-route redirect; `/app` restore redirect (legacy `ORDERBOOK`/`INVENTORY`/junk values); slice deep-link valid + invalid; **slice→slice navigation re-syncs Marketplace**; viewMode guards (BUYER viewMode on `/app/quotes` → home); login `from`-redirect (both sites); NotificationList → home with openOrderId; `data-dashboard-page` emits the legacy Page value per route; nav-metrics events fire on route change; sessionStorage writer records the current page.
- Update: sidebar tests (NavLink hrefs + mobile-close onClick), navigation-performance test (wired path).
- Full suite + typecheck + i18n + build:staging + build:check.

## Acceptance

- [ ] Every route renders the right component for the right viewMode; unknown → home; slice URLs round-trip; Forward Curve "open in Marketplace" writes a slice URL into the address bar.
- [ ] Reload on any page stays on that page; cmd-click a sidebar item opens that page in a new tab.
- [ ] Logged-out visit to `/app/m/bio-methanol/singapore/spot` → login → lands back on that slice (replace-navigation, no back-button trap).
- [ ] `/app/m/A` → in-page switch to slice B → address bar shows B (replaced, not pushed).
- [ ] Platform Tour completes end-to-end on staging (browser dogfood); notifications "view order" lands on home with the order card scrolled into view; map port-select still preselects the port in Marketplace.
- [ ] `window.__VERDAXIS_NAV_METRICS__` populates from sidebar clicks (the primary path).
- [ ] Full verify chain green; staging deploy + dogfood; no console errors.
