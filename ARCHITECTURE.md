# Architecture

## Tech Stack

React 19 + TypeScript, Vite 6, Tailwind CSS, Leaflet, Recharts, lightweight-charts, react-router-dom v7, Vitest

## File Map

```
src/
  index.tsx                        # ReactDOM entry, mounts <App /> into #root
  App.tsx                          # Route definitions, auth guards, Dashboard state machine
  types.ts                         # All shared TypeScript interfaces (Port, Vessel, Order, Trade...)
  utils.ts                         # Leaflet icon factory, heading calc, formatting helpers
  utils/availabilityWindow.ts      # Canonical availability-window parsing, display labels, picker option ladder
  utils/marketActivity.ts          # Shared provenance/source labels for demo, benchmark, mixed, and live market activity
  utils/marketProduct.ts           # Canonical green-fuels display labels and market-product helpers
  utils/watchlist.ts               # Market Radar slice keys, labels, event copy, latest-event helpers
  data.ts                          # Static/mock seed data (ports, suppliers, courses)
  index.css                        # Tailwind base + global styles

  context/
    AuthContext.tsx                 # JWT auth state, login/logout, /auth/me validation
    ThemeContext.tsx                # Light/dark/system toggle, persists to localStorage
    NotificationContext.tsx        # 30s polling for notifications, read/unread state
    TutorialContext.tsx             # Guided tutorial state

  services/
    config.ts                      # API_URL from VITE_API_URL env var
    api.ts                         # Fetch-based API client (ports, vessels, orderbook, trades...)
    ai.ts                          # Supplier risk AI export
    ai-engine/
      generators.ts                # AI supplier-risk memo helper, proxied through backend /ai/chat
      cache.ts                     # In-memory 5-min TTL cache for AI responses

  components/
    Layout.tsx                     # App shell: sidebar + header + content frame
    MobileDesktopGate.tsx          # Desktop-only gate for authenticated /app workspace on mobile widths
    layout/{Sidebar,Header}.tsx    # Nav sidebar (role-aware); top bar with view-mode switch
    # Buyer views
    BuyerMap.tsx                   # MapLibre intelligence map using approved trading ports plus live API intelligence
    BuyerDashboard.tsx             # Order overview, active trades, quick actions
    Marketplace.tsx                # Browse/filter listings, place orders, show benchmark deltas
    OrderBook.tsx                  # Live depth widget; executable crosses ignore demo-only liquidity
    MarketTerminal.tsx             # Trading-oriented price terminal (bid/ask, charts) — ORPHANED: no nav entry since the 2026-04 pilot cleanup; render case kept, decision to re-link or archive pending
    ForwardCurveWorkspace.tsx      # Canonical market-monitoring matrix and selected-period evidence graph
    GuidedTutorial.tsx             # Controlled Joyride walkthrough with click-to-advance workflow steps
    Fleet.tsx                      # Vessel list with compliance and voyage info
    Stats.tsx                      # Buyer analytics and trade history
    Training.tsx                   # Crew training courses
    Compliance.tsx                 # EU ETS / FuelEU compliance dashboard
    Settings.tsx                   # User/org settings (shared by both roles)
    # Supplier views
    SupplierDashboard.tsx          # Incoming orders, revenue overview
    SupplierQuotes.tsx             # Manage quote offers
    SupplierInventory.tsx          # Fuel inventory by port
    SupplierListingConsole.tsx     # Create/manage marketplace listings
    SupplierStats.tsx              # Supplier-specific stats
    SupplierAnalytics.tsx          # Revenue and performance analytics
    SupplierDemandFeed.tsx         # Live demand signals from buyers
    WatchlistPage.tsx              # Slice-first Market Radar detail view and event feed
    # Modals
    buyer/CreateBidModal.tsx       # Buy-side orderbook entry modal
    supplier/{CreateListingModal,CreateQuoteModal}.tsx
    # Feature groups
    map/{IntelligencePanel,VesselMarkers,MapLegend,MarketWatchTicker}.tsx
    compliance/{ComplianceDashboard,ComplianceTracing,ComplianceLedgerModal,ComplianceDataInput}.tsx
    notifications/{NotificationBell,NotificationList}.tsx
    fleet/VesselDetailModal.tsx
    ui/{Tooltip,MarkdownRenderer,ConfirmModal,VerdaxisSelect}.tsx
    trading/MarketActivityBadge.tsx # Compact provenance badge for demo/reference/mixed market activity
    watchlist/MarketRadarPanel.tsx # Command-center radar summary for tracked slices
    # Public site
    public/PublicLayout.tsx        # Public page shell (nav + footer + Lenis smooth scroll)
    public/{PublicNav,PublicFooter,HeroSection,PriceTicker,PilotApplicationForm}.tsx
    public/{DataOcean,motionUtils}.tsx  # Animated background (GSAP); motion presets

  pages/
    LoginPage.tsx                  # Email/password login
    RegisterPage.tsx               # User registration
    OnboardingPage.tsx             # Post-registration role selection + profile setup
    CreateOrganizationPage.tsx     # Organization creation/join flow with ISO country selector
    public/                        # 15 marketing pages (landing, education, use cases, etc.)

  data/
    producerProjects.ts            # Static producer project dataset (locations, capacities)
    fuelPrices.ts                  # MarinaPulse fuel benchmark adapter for public ticker
    calculatorDefaults.ts          # Defaults for energy calculator
    educationArticles.ts           # Education article content/metadata

  tests/
    setup.ts                       # Vitest jsdom polyfills (matchMedia, ResizeObserver, etc.)
    *.test.ts                      # Unit tests (utils, pricing, matchmaking, map, etc.)

scripts/
  deploy.sh                       # Static prod/staging build script with API-target validation
  smoke-live.mjs                  # Prod/staging live smoke checks
  start-frontend.sh               # Local development server helper
  seed_listings.sh                 # Seed marketplace data
  geocode_projects.py             # Geocode producer project locations

database/schema.txt                # Backend DB schema reference
.github/workflows/frontend-ci.yml # CI: tests/typecheck/i18n/builds on staging+prod pushes and PRs (no deploy)
```

## Dependency Flow

```
index.html --> index.tsx --> App.tsx
                               |
                 +-------------+-------------+
                 |             |             |
            ThemeProvider AuthProvider
                               |
                      NotificationProvider
                               |
                        TutorialProvider
                               |
                         BrowserRouter
                        /      |      \
                  /login  PublicLayout  /app (ProtectedRoute)
                             |              |
                        public pages   RequireOrganization --> RequireProfile
                                            |
                                        Dashboard
                                       /    |    \
                                Layout viewMode currentPage (state)
                               / |  \
                        Sidebar Header content views
                                                |
                                        Backend REST API
```

## Key Patterns

**State-based in-app navigation:** The `/app` route renders a `Dashboard` component that uses
`currentPage` state (not URL routes) to switch between views. The `Page` type enum
(`MAP | MARKETPLACE | FLEET | TERMINAL | FORWARD_CURVE | ...`) drives `renderContent()`. New authenticated
views should add a `Page` value, not a new react-router route.

**Desktop-only platform workspace:** The authenticated `/app` route is wrapped in
`MobileDesktopGate`, which shows a desktop-required notice below 768px. Public marketing,
auth, and onboarding routes remain available on mobile.

**Dual-role view mode:** `viewMode` (`BUYER | SUPPLIER`) determines which sidebar items and
page components render. Supplier users default to `SUPPLIER`; buyers to `BUYER`. The header
provides a toggle to switch.

**API data transform:** Backend returns snake_case with numbers-as-strings. `api.ts`
transforms to camelCase frontend interfaces and wraps numeric fields with `Number()`.
Orderbook timing is normalized through `utils/availabilityWindow.ts` so the UI can show
relative labels while the API persists canonical codes. Green-fuels naming is normalized
through `utils/marketProduct.ts`, and benchmark-relative pricing is carried in the shared
order interfaces.

**AI assistance:** The floating Copilot chat has been removed. Supplier quote risk memos still
call the backend `/ai/chat` proxy through `services/ai-engine/generators.ts`, with short-lived
frontend caching for repeated memo requests.

**Context-only state:** No Redux/Zustand. React Contexts cover Auth, Theme, Notifications,
and Tutorial state, with custom hooks (`useAuth()`, `useTheme()`, etc.).

**Server-persisted preferences:** `useServerPreference` (src/hooks/useServerPreference.ts)
backs Market Watch ticker config, notification toggles, and tutorial completion with
`/api/users/me/preferences` (local-first render, server-wins sync, debounced writes);
localStorage is only a per-device cache.

**Green-fuels market surface:** Buyer/supplier UIs now flatten the market to the approved
green-fuels products while preserving richer certification and sustainability metadata on
supplier listings. Benchmark comparisons key on `market_product + delivery_point + availability_window`.
Demo liquidity is labelled and blocked from execution, row watchlist controls use compact visible
copy with explicit accessible labels, and crossed-market indicators only consider real resting orders
so seeded preview prices do not look executable.

**Guided tutorial flow:** `GuidedTutorial` is controlled by step index. Informational steps use
Joyride's footer controls, while workflow steps hide the footer and advance only after the user
clicks the highlighted in-app tab, button, row, or modal control. The tutorial stops at submit/confirm
boundaries and does not place real bids, asks, listings, or trades.

**Monitoring vs trading surfaces:** `ForwardCurveWorkspace` is the live monitoring page.
`MarketTerminal` was the trading-oriented terminal, but its sidebar entry was removed for the
pilot (2026-04) and never restored — the `TERMINAL` view renders only if navigated to
programmatically, which nothing currently does. Its trading role (live depth, working a
product+port) is covered by Marketplace + order modals; re-linking vs archiving it is an open
product decision. Forward Curve consumes `/curves/forward/table`
for the product-port-period matrix and `/curves/forward/slice` for the selected-period evidence graph.
It does not execute trades, and it does not render the old pre-click global curve chart. Price summaries,
forward cells, watchlist events, and trade tape entries carry `source_kind`, `scope`, `demo_status`, and
`observed_at` where available; the frontend normalizes those through `utils/marketActivity.ts` so
demo-seeded, benchmark-reference, mixed-source, and live activity are labelled consistently without
exposing party identities.

**Market Radar watchlists:** Watchlists are slice-first. `useWatchlist()` hydrates the default
`Market Radar` container, the Marketplace tracks canonical slice keys (`market_product + delivery_point +
availability_window`), `CommandCenter` shows compact radar cards, and `WatchlistPage` persists pinned live
orders plus the event feed. The frontend API client uses the target/event endpoints directly
(`GET /watchlists/me`, `POST /watchlists/{id}/targets`, event listing, event read state) rather than
legacy product-entry adapters.

**Shared select system:** `ui/VerdaxisSelect.tsx` is the platform dropdown primitive. Targeted
forms should use it instead of browser-native `<select>` elements unless there is a strong
accessibility or browser-integration reason not to.

**Orderbook timing model:** `OrderPlaceModal` keeps `Availability Window` in Advanced Options
but mandatory, with `Spot` as the default. Relative labels like `M+1` are display-only and
must resolve to canonical month/quarter codes before requests are sent.

**Hybrid auth flow:** Login and refresh return an access token that stays in memory only.
`AuthContext` restores sessions by calling `/api/auth/refresh` with `credentials: 'include'`,
while the backend rotates the refresh token in an HttpOnly cookie scoped to `/api/auth`.

## Entry Points

- **App bootstrap:** `index.html` -> `src/index.tsx` -> `src/App.tsx`
- **API client:** `src/services/api.ts` (all backend communication)
- **AI helper:** `src/services/ai-engine/generators.ts` (`analyzeRisk` supplier memo entry)
- **Route definitions:** `src/App.tsx` (auth, public, and protected routes)
- **Type system:** `src/types.ts` (all shared interfaces and type unions)

## Run Commands

```bash
npm run dev          # Vite dev server on :5173 (proxies /api to backend)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run test         # Vitest single run
npm run test:watch   # Vitest watch mode
```
