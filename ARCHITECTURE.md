# Architecture

## Tech Stack

React 19 + TypeScript, Vite 6, Tailwind CSS, Leaflet, Recharts, Gemini AI (@google/genai), react-router-dom v7, Vitest

## File Map

```
src/
  index.tsx                        # ReactDOM entry, mounts <App /> into #root
  App.tsx                          # Route definitions, auth guards, Dashboard state machine
  types.ts                         # All shared TypeScript interfaces (Port, Vessel, Order, Trade...)
  utils.ts                         # Leaflet icon factory, heading calc, formatting helpers
  utils/availabilityWindow.ts      # Canonical availability-window parsing, display labels, picker option ladder
  utils/marketProduct.ts           # Canonical green-fuels display labels and market-product helpers
  utils/watchlist.ts               # Market Radar slice keys, labels, event copy, latest-event helpers
  data.ts                          # Static/mock seed data (ports, suppliers, courses)
  index.css                        # Tailwind base + global styles

  context/
    AuthContext.tsx                 # JWT auth state, login/logout, /auth/me validation
    ThemeContext.tsx                # Light/dark/system toggle, persists to localStorage
    CopilotContext.tsx             # Shares page-level context with AI copilot
    NotificationContext.tsx        # 30s polling for notifications, read/unread state

  services/
    config.ts                      # API_URL from VITE_API_URL env var
    api.ts                         # Fetch-based API client (ports, vessels, orderbook, trades...)
    backendAvailability.ts         # Shared backend outage event/status helpers
    ai.ts                          # Re-exports from ai-engine/
    ai-engine/
      config.ts                    # Gemini API key + GoogleGenAI client init
      chat.ts                      # chatWithCopilot() -- multi-turn tool-calling chat loop
      tools.ts                     # Gemini FunctionDeclarations + executor map
      generators.ts                # AI content: market narratives, arbitrage, risk, web search
      cache.ts                     # In-memory 5-min TTL cache for AI responses

  components/
    Layout.tsx                     # App shell: sidebar + header + copilot overlay
    MobileDesktopGate.tsx          # Desktop-only gate for authenticated /app workspace on mobile widths
    layout/{Sidebar,Header}.tsx    # Nav sidebar (role-aware); top bar with view-mode switch
    # Buyer views
    BuyerMap.tsx                   # MapLibre intelligence map using approved trading ports plus live API intelligence
    BuyerDashboard.tsx             # Order overview, active trades, quick actions
    Marketplace.tsx                # Browse/filter listings, place orders, show benchmark deltas
    OrderBook.tsx                  # Live depth widget; executable crosses ignore demo-only liquidity
    MarketTerminal.tsx             # Trading-oriented price terminal (bid/ask, charts)
    ForwardCurveWorkspace.tsx      # Dense market monitoring board (ports x products, hybrid curve)
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
    ai/Copilot.tsx                 # Floating AI chat panel (Gemini-powered)
    map/{IntelligencePanel,VesselMarkers,MapLegend,MarketWatchTicker}.tsx
    compliance/{ComplianceDashboard,ComplianceTracing,ComplianceLedgerModal,ComplianceDataInput}.tsx
    notifications/{NotificationBell,NotificationList}.tsx
    fleet/VesselDetailModal.tsx
    ui/{Tooltip,MarkdownRenderer,ConfirmModal,VerdaxisSelect}.tsx
    watchlist/MarketRadarPanel.tsx # Command-center radar summary for tracked slices
    # Public site
    public/PublicLayout.tsx        # Public page shell (nav + footer + Lenis smooth scroll)
    public/{PublicNav,PublicFooter,HeroSection,PriceTicker,PilotApplicationForm}.tsx
    public/{DataOcean,motionUtils}.tsx  # Animated background (GSAP); motion presets

  pages/
    LoginPage.tsx                  # Email/password login
    RegisterPage.tsx               # User registration
    MaintenancePage.tsx            # Backend-unavailable fallback for auth/platform flows
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
  deploy.sh                       # Production deploy script
  start-frontend.sh               # Start dev/preview server
  seed_listings.sh                 # Seed marketplace data
  geocode_projects.py             # Geocode producer project locations

database/schema.txt                # Backend DB schema reference
docs/verdaxis-branding.yaml        # Brand guidelines
.github/workflows/frontend-ci.yml # CI: test on PR, deploy on main push
```

## Dependency Flow

```
index.html --> index.tsx --> App.tsx
                               |
                 +-------------+-------------+
                 |             |             |
            ThemeProvider AuthProvider CopilotProvider
                               |
                      NotificationProvider
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
                        Sidebar Header Copilot --> ai-engine/chat.ts
                                                   /           \
                                             tools.ts     generators.ts
                                                |              |
                                             api.ts      Gemini API
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

**AI copilot architecture:** Gemini chat with multi-turn tool calling. `tools.ts` defines
FunctionDeclarations that map to `toolExecutors` which call `api.ts`. The chat loop in
`chat.ts` handles up to 5 tool-call rounds. All AI responses are cached for 5 minutes.

**Context-only state:** No Redux/Zustand. Four React Contexts (Auth, Theme, Copilot,
Notifications) with custom hooks (`useAuth()`, `useTheme()`, etc.).

**Green-fuels market surface:** Buyer/supplier UIs now flatten the market to the approved
green-fuels products while preserving richer certification and sustainability metadata on
supplier listings. Benchmark comparisons key on `market_product + delivery_point + availability_window`.
Demo liquidity is labelled and blocked from execution, and crossed-market indicators only consider
real resting orders so seeded preview prices do not look executable.

**Guided tutorial flow:** `GuidedTutorial` is controlled by step index. Informational steps use
Joyride's footer controls, while workflow steps hide the footer and advance only after the user
clicks the highlighted in-app tab, button, row, or modal control. The tutorial stops at submit/confirm
boundaries and does not place real bids, asks, listings, or trades.

**Monitoring vs trading surfaces:** `MarketTerminal` remains the trading-oriented terminal, while
`ForwardCurveWorkspace` is the broader monitoring page. Forward Curve scans approved ports and
products, shows hybrid benchmark/orderbook context, and hands a selected slice to Marketplace
through an explicit CTA. Trade tape entries can carry `is_demo_trade` so generated preview
activity is labelled without exposing party identities.

**Market Radar watchlists:** Watchlists are slice-first. `useWatchlist()` hydrates the default
`Market Radar` container, the Marketplace tracks canonical slice keys (`market_product + delivery_point +
availability_window`), `CommandCenter` shows compact radar cards, and `WatchlistPage` persists pinned live
orders plus the event feed.

**Shared select system:** `ui/VerdaxisSelect.tsx` is the platform dropdown primitive. Targeted
forms should use it instead of browser-native `<select>` elements unless there is a strong
accessibility or browser-integration reason not to.

**Orderbook timing model:** `OrderPlaceModal` keeps `Availability Window` in Advanced Options
but mandatory, with `Spot` as the default. Relative labels like `M+1` are display-only and
must resolve to canonical month/quarter codes before requests are sent.

**Hybrid auth flow:** Login and refresh return an access token that stays in memory only.
`AuthContext` restores sessions by calling `/api/auth/refresh` with `credentials: 'include'`,
while the backend rotates the refresh token in an HttpOnly cookie scoped to `/api/auth`.

**Backend outage fallback:** `AuthContext` owns the global backend availability flag. Auth/bootstrap
requests preserve existing tokens and show `MaintenancePage` when the backend returns gateway errors
or becomes unreachable. The shared API client emits the same outage signal on network failures,
timeouts, and 502/503/504 responses so authenticated workflows fail into a single maintenance screen
instead of scattered component errors. Public marketing pages remain available because they are static
and Vercel-hosted.

## Entry Points

- **App bootstrap:** `index.html` -> `src/index.tsx` -> `src/App.tsx`
- **API client:** `src/services/api.ts` (all backend communication)
- **AI engine:** `src/services/ai-engine/chat.ts` (copilot entry)
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
