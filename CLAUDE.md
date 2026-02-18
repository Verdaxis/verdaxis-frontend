# Verdaxis Frontend - Claude Code Instructions

## Project Overview

Verdaxis is a maritime alternative fuel procurement platform. The frontend is a React SPA serving two roles: a **public marketing site** (landing pages, education, tools) and an **authenticated dashboard** for buyers and suppliers to trade fuel, manage fleets, track compliance, and monitor markets.

## Tech Stack

- **Framework:** React 19 + TypeScript, bundled with Vite 6
- **Routing:** react-router-dom v7 (BrowserRouter, all routes defined in `App.tsx`)
- **Styling:** Tailwind CSS with `darkMode: 'class'`, custom `verdaxis` color tokens in `tailwind.config.js`
- **State Management:** React Context (Auth, Theme, Copilot, Notifications) -- no Redux/Zustand
- **Charts:** Recharts
- **Maps:** Leaflet + react-leaflet (port intelligence map, producer map, vessel tracking)
- **Animations:** Motion (Framer Motion v12), GSAP, Lenis (smooth scroll on public pages)
- **Icons:** lucide-react
- **AI Copilot:** Google Gemini (`@google/genai`) with tool-calling for fleet/procurement queries
- **Auth:** JWT tokens stored in `localStorage`, validated against backend `/api/auth/me`
- **Testing:** Vitest + React Testing Library + jsdom
- **Linting:** No ESLint configuration present. Consider adding one for consistency.

## Architecture / Directory Structure

```
src/
  index.tsx              # ReactDOM entry point
  App.tsx                # All route definitions, auth guards, Dashboard component
  types.ts               # Shared TypeScript interfaces (Port, Vessel, Order, Trade, etc.)
  utils.ts               # Leaflet icon helpers, heading calculation, formatting utils
  data.ts                # Static/mock seed data (ports, suppliers, courses, traces)
  index.css              # Tailwind base styles
  vite-env.d.ts          # Vite client type augmentation

  context/
    AuthContext.tsx       # JWT auth state, login/logout, /auth/me polling
    ThemeContext.tsx      # Light/dark/system theme with localStorage persistence
    CopilotContext.tsx    # Shares page-level context with the AI copilot
    NotificationContext.tsx # Notification polling (30s interval), read/unread state

  services/
    config.ts            # API_URL from VITE_API_URL env var
    api.ts               # Central API client (fetch-based, Bearer token auth)
    ai.ts                # Re-exports from ai-engine/
    ai-engine/
      config.ts          # Gemini API key + client init
      chat.ts            # chatWithCopilot() -- Gemini chat with tool use
      tools.ts           # Tool definitions for Gemini (list_ports, search_vessels, etc.)
      generators.ts      # AI content generators
      cache.ts           # Response caching for AI calls

  components/
    Layout.tsx           # App shell: sidebar + header + main content + copilot overlay
    layout/
      Sidebar.tsx        # Navigation sidebar (different items for BUYER vs SUPPLIER)
      Header.tsx         # Top bar with view-mode switch, notifications, user menu

    # --- Buyer views ---
    BuyerMap.tsx          # Leaflet intelligence map with port markers and vessel tracking
    BuyerDashboard.tsx    # Order overview, active trades, quick actions
    Marketplace.tsx       # Browse/filter supplier listings, place orders
    MarketTerminal.tsx    # Bloomberg-style price terminal (bid/ask, charts, trades)
    Fleet.tsx             # Vessel list with compliance status and voyage info
    Stats.tsx             # Buyer analytics and trade history
    Training.tsx          # Crew training courses for alternative fuels
    Compliance.tsx        # EU ETS / FuelEU compliance dashboard
    Settings.tsx          # User/org settings (shared by both roles)

    # --- Supplier views ---
    SupplierDashboard.tsx       # Incoming orders, revenue overview
    SupplierQuotes.tsx          # Manage direct order quotes/offers
    SupplierInventory.tsx       # Fuel inventory by port
    SupplierListingConsole.tsx  # Create/manage marketplace listings
    SupplierStats.tsx           # Supplier-specific stats
    SupplierAnalytics.tsx       # Revenue and performance analytics
    SupplierDemandFeed.tsx      # Live demand signals from buyers

    buyer/
      CreateBidModal.tsx  # Modal for creating buy-side orderbook entries
    supplier/
      CreateListingModal.tsx  # Modal for creating supplier listings
      CreateQuoteModal.tsx    # Modal for submitting quotes on direct orders

    ai/
      Copilot.tsx         # Floating AI chat panel (Gemini-powered)

    map/
      IntelligencePanel.tsx  # Side panel with port intelligence data
      VesselMarkers.tsx      # Vessel position markers with heading arrows
      MapLegend.tsx          # Map legend overlay
      MarketWatchTicker.tsx  # Scrolling market ticker on map view

    compliance/
      ComplianceDashboard.tsx  # Compliance overview and scoring
      ComplianceTracing.tsx    # Supply chain traceability view
      ComplianceLedgerModal.tsx # Detailed compliance event ledger
      ComplianceDataInput.tsx   # Manual compliance data entry

    notifications/
      NotificationBell.tsx  # Header bell icon with unread badge
      NotificationList.tsx  # Dropdown notification list

    fleet/
      VesselDetailModal.tsx  # Detail modal for individual vessel info

    ui/
      Tooltip.tsx           # Reusable tooltip component
      MarkdownRenderer.tsx  # Renders markdown (used by Copilot responses)
      ConfirmModal.tsx      # Generic confirmation dialog

    public/
      PublicLayout.tsx      # Public page shell (nav + footer + smooth scroll)
      PublicNav.tsx          # Public site navigation bar
      PublicFooter.tsx       # Public site footer
      HeroSection.tsx       # Landing page hero
      PriceTicker.tsx       # Animated price ticker for public pages
      PilotApplicationForm.tsx # Pilot program signup form
      DataOcean.tsx         # Animated background visual
      motionUtils.tsx       # Shared animation presets for public pages

  pages/
    LoginPage.tsx           # Email/password login
    RegisterPage.tsx        # User registration
    OnboardingPage.tsx      # Post-registration role selection + profile setup
    CreateOrganizationPage.tsx # Organization creation/join flow
    public/
      LandingPage.tsx       # Marketing homepage
      HowItWorksPage.tsx    # Platform explainer
      FuelCoveragePage.tsx  # Supported fuel types
      ComplianceInfoPage.tsx # Regulatory info (EU ETS, FuelEU)
      EducationPage.tsx     # Article listing
      EducationArticlePage.tsx # Individual article (dynamic :slug route)
      EnergyCalculatorPage.tsx # Interactive energy calculator tool
      ProducerMapPage.tsx   # Global producer project map
      GovernancePage.tsx    # Platform governance info
      RoadmapPage.tsx       # Product roadmap
      PilotPage.tsx         # Pilot program landing
      ProducerUseCasePage.tsx  # Use case: producers
      BuyerUseCasePage.tsx     # Use case: buyers
      TraderUseCasePage.tsx    # Use case: traders
      FinancierUseCasePage.tsx # Use case: financiers
      PartnerShowcasePage.tsx  # Partner logos/showcase
      PartnerLandingPage.tsx   # Partner onboarding page

  data/
    producerProjects.ts    # Static producer project dataset (locations, capacities)
    fuelPrices.ts          # Reference fuel price data
    calculatorDefaults.ts  # Defaults for energy calculator
    educationArticles.ts   # Education article content/metadata

  tests/
    setup.ts               # Vitest setup (jsdom polyfills for matchMedia, ResizeObserver, etc.)
    *.test.ts              # Unit tests (utils, producer-map, matchmaking, pricing, etc.)
```

## Routing

All routes are defined in `src/App.tsx`. There are three route groups:

1. **Auth routes** (`/login`, `/register`) -- unauthenticated
2. **Public routes** (`/`, `/how-it-works`, `/fuels`, `/education/:slug`, etc.) -- wrapped in `PublicLayout`
3. **Authenticated app** (`/app`) -- wrapped in `ProtectedRoute` > `RequireOrganization` > `RequireProfile`

The authenticated `/app` route renders a `Dashboard` component that uses **in-app navigation via state** (not URL routes). The `currentPage` state variable determines which view is rendered (MAP, MARKETPLACE, FLEET, TERMINAL, etc.). Navigation between app pages happens through the sidebar, not through URL changes.

**Auth guard chain:** `ProtectedRoute` (must be logged in) -> `RequireOrganization` (must have org) -> `RequireProfile` (must have role set, else redirect to `/onboarding`).

## API Integration

- **Base URL:** Configured via `VITE_API_URL` env var (see Environment Configuration below).
- **Client:** `src/services/api.ts` -- a plain `fetch`-based API client organized by resource (ports, vessels, directOrders, inventory, listings, orders, notifications, training).
- **Auth:** Every request includes `Authorization: Bearer <token>` from `localStorage`.
- **Data transformation:** The API layer transforms snake_case backend responses to camelCase frontend interfaces. See `types.ts` for all interfaces.
- **Path alias:** `@/` maps to `./src/` (configured in both `tsconfig.json` and `vite.config.ts`).

## Key Conventions

- **ViewMode pattern:** The app supports two roles: `BUYER` and `SUPPLIER`. The `viewMode` state in `Dashboard` determines which sidebar items and which page components render. Supplier users default to `SUPPLIER` mode.
- **Component exports:** Named exports throughout (e.g., `export const BuyerMap`). Default exports only on pages used by route definitions.
- **Styling:** Tailwind utility classes inline. Dark mode uses `dark:` prefix classes. The `dark` class is toggled on `<html>` by ThemeContext.
- **Icons:** Always from `lucide-react`. Import only the icons you need.
- **API data quirk:** Backend returns numbers as strings -- always wrap with `Number()` before arithmetic (see Known Gotchas).
- **Context usage:** Use `useAuth()`, `useTheme()`, `useCopilotContext()`, `useNotifications()` hooks, never access contexts directly.
- **File organization:** Top-level components in `src/components/` for major views. Subdirectories for related groups (layout, map, compliance, ui, public, buyer, supplier, ai, fleet, notifications).
- **No CSS modules or styled-components.** All styling is Tailwind. Global styles are minimal and live in `src/index.css`.

## Testing

- **Runner:** Vitest with jsdom environment
- **Setup:** `src/tests/setup.ts` polyfills `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollTo`, and `HTMLCanvasElement.getContext`
- **Test locations:** `src/tests/*.test.ts` for unit tests, `src/components/**/__tests__/` and `src/pages/**/__tests__/` for component tests
- **Run tests:** `npm run test` (single run) or `npm run test:watch` (watch mode)
- **Test patterns include:** utility functions, pricing calculations, matchmaking logic, map rendering, public page smoke tests

## Deployment

**Server:** `verdaxis-prod@144.126.151.136`
**Site:** `app.verdaxis.exchange` (served by Caddy from `~/verdaxis-frontend/dist`)
**API:** `api.verdaxis.exchange` (Caddy reverse proxy to backend on `localhost:8000`)

### Deploy command (from local machine)

```bash
ssh verdaxis-prod@144.126.151.136 "cd ~/verdaxis-frontend && git pull && rm -rf dist && npm run build"
```

**IMPORTANT:** Always `rm -rf dist` before `npm run build`. Vite generates hashed JS filenames on each build. If stale `dist/index.html` references an old hash, the site breaks with:
> "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html"

### Verify deployment

```bash
ssh verdaxis-prod@144.126.151.136 "grep 'src=\"/assets' ~/verdaxis-frontend/dist/index.html && ls ~/verdaxis-frontend/dist/assets/*.js"
```
Both should show the same filename hash.

## Local Development

```bash
npm run dev
```

`.env` should use `VITE_API_URL=/api` for local dev. The vite proxy (configured in `vite.config.ts`) forwards `/api/*` to `http://144.126.151.136:8000/api/*`, avoiding CORS issues.

## Environment Configuration

Production API URL is set in `.env.production` (committed to git). Vite automatically uses this file during `vite build`, so the correct URL is always baked in regardless of what `.env` exists on the server.

- **`.env`** — local dev only (`VITE_API_URL=/api`), gitignored
- **`.env.production`** — production builds (`VITE_API_URL=https://api.verdaxis.exchange/api`), committed
- **`.env.example`** — reference template, committed

**Never set `VITE_API_URL` in the server's `.env` file.** The `.env.production` file handles it automatically. Setting it in `.env` on the server risks mixed-content errors if the value is wrong.

## Known Gotchas

- **API returns numbers as strings.** Always wrap numeric fields (`quantity_mt`, `final_quantity_mt`, `price_per_mt_usd`, `final_price_per_mt`, `final_total_usd`) with `Number()` before arithmetic or `.toFixed()` calls.
- **Never commit `dist/` to git.** It's in `.gitignore`. If it gets force-added, run `git rm -r --cached dist/` to untrack it.
- **Vite proxy also handles `/authentik` routes** -- rewrites to the Authentik identity server on port 9000. This is configured in `vite.config.ts` but only applies to local dev.
- **In-app navigation is state-based, not URL-based.** The `/app` route renders all authenticated views. Changing pages updates `currentPage` state, not the URL. Do not add new react-router routes for authenticated pages -- add new `Page` type values and handle them in `Dashboard.renderContent()`.
- **Gemini API key** is injected at build time via `define` in `vite.config.ts` from the `GEMINI_API_KEY` env var. If the key is missing, the Copilot gracefully degrades with a "features disabled" message. **Security note:** This injects the key into the client-side bundle where it can be extracted. Prefer proxying through the backend.
- **Vestigial auth dependencies:** `@auth0/auth0-react`, `oidc-client-ts`, and `react-oidc-context` are still in `package.json` but are not used since Authentik was deprecated in favor of custom JWT auth. These should be removed to reduce bundle size and attack surface.
