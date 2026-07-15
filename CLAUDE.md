# Verdaxis Frontend - Claude Code Instructions

Read ARCHITECTURE.md before exploring the codebase.

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
- **AI Copilot:** Chat UI and tool-calling loop backed by backend `/api/ai/chat`; no client-side Gemini key
- **Auth:** short-lived access tokens kept in memory, restored through backend `/api/auth/refresh` with an HttpOnly refresh cookie, then validated through `/api/auth/me`
- **Testing:** Vitest + React Testing Library + jsdom
- **Linting:** No ESLint configuration present. Consider adding one for consistency.

## Routing

All routes are defined in `src/App.tsx`. There are three route groups:

1. **Auth routes** (`/login`, `/register`) -- unauthenticated
2. **Public routes** (`/`, `/how-it-works`, `/fuels`, `/education/:slug`, etc.) -- wrapped in `PublicLayout`
3. **Authenticated app** (`/app`) -- wrapped in `ProtectedRoute` > `RequireOrganization` > `RequireProfile`

The authenticated `/app` route is a **layout route** (`DashboardLayout`): every view is a nested URL route (`/app/home`, `/app/map`, `/app/marketplace`, `/app/curve`, `/app/watchlist`, `/app/analytics`, `/app/trades`, `/app/quotes`, `/app/compliance`, `/app/training`, `/app/settings`, `/app/admin`). Marketplace slices are deep-linkable via `/app/m/:product/:port/:window` (codec: `src/utils/sliceUrl.ts`). The legacy `Page` enum still names pages for the sidebar, sessionStorage persistence, and the `data-dashboard-page` dogfood contract; `PAGE_SLUGS` in `types.ts` maps each `Page` to its slug. Bare `/app` restores the last visited page from `sessionStorage.verdaxis_currentPage`. Sidebar items are `NavLink`s (real anchors -- cmd/middle-click works).

**Gotcha:** a view having a render case does not mean it is reachable. The old `TERMINAL` view was archived in 2026-07 after its sidebar entry had been absent since the 2026-04 pilot cleanup. Check the sidebar's link list before treating a view as live.

**Auth guard chain:** `ProtectedRoute` (must be logged in) -> `RequireOrganization` (must have org) -> `RequireProfile` (must have role set, else redirect to `/onboarding`).

## API Integration

- **Base URL:** Configured via `VITE_API_URL` env var (see Environment Configuration below).
- **Client:** `src/services/api.ts` -- a plain `fetch`-based API client organized by resource (ports, vessels, orderbook, trades, inventory, listings, notifications, training, catalog, curves).
- **Auth:** Every authenticated request includes `Authorization: Bearer <token>` from the in-memory token store; refresh uses the backend HttpOnly cookie via `credentials: 'include'`.
- **Data transformation:** The API layer transforms snake_case backend responses to camelCase frontend interfaces. See `types.ts` for all interfaces.
- **Path alias:** `@/` maps to `./src/` (configured in both `tsconfig.json` and `vite.config.ts`).

## Key Conventions

- **ViewMode pattern:** The app supports two roles: `BUYER` and `SUPPLIER`. The `viewMode` state in `DashboardLayout` determines which sidebar items and which page components render. Supplier users default to `SUPPLIER` mode.
- **Component exports:** Named exports throughout (e.g., `export const BuyerMap`). Default exports only on pages used by route definitions.
- **Styling:** Tailwind utility classes inline. Dark mode uses `dark:` prefix classes. The `dark` class is toggled on `<html>` by ThemeContext.
- **Icons:** Always from `lucide-react`. Import only the icons you need.
- **API data quirk:** Backend returns numbers as strings -- always wrap with `Number()` before arithmetic (see Known Gotchas).
- **Context usage:** Use `useAuth()`, `useTheme()`, `useCopilotContext()`, `useNotifications()` hooks, never access contexts directly.
- **File organization:** Top-level components in `src/components/` for major views. Subdirectories for related groups (layout, map, compliance, ui, public, buyer, supplier, ai, fleet, notifications).
- **No CSS modules or styled-components.** All styling is Tailwind. Global styles are minimal and live in `src/index.css`.
- After completing work, update ARCHITECTURE.md if file structure or key relationships changed.

## Testing

- **Runner:** Vitest with jsdom environment
- **Setup:** `src/tests/setup.ts` polyfills `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollTo`, and `HTMLCanvasElement.getContext`
- **Test locations:** `src/tests/*.test.ts` for unit tests, `src/components/**/__tests__/` and `src/pages/**/__tests__/` for component tests
- **Run tests:** `npm run test` (single run) or `npm run test:watch` (watch mode)
- **Test patterns include:** utility functions, pricing calculations, matchmaking logic, map rendering, public page smoke tests

## Deployment

CI (`.github/workflows/frontend-ci.yml`) runs tests, typecheck, i18n check, and both builds on pushes/PRs to `staging` and `prod`; it does not deploy. Deploys are operator-run on the VPS as described below.

**Server:** `verdaxis-prod@144.126.151.136`
**Site:** `app.verdaxis.exchange` and `verdaxis.exchange` (served by Caddy from `/home/verdaxis-prod/verdaxis/prod/fe/dist`)
**Staging:** `staging.verdaxis.exchange` (served by Caddy from `/home/verdaxis-prod/verdaxis/staging/fe/dist`)
**API:** `api.verdaxis.exchange` (Caddy reverse proxy to backend on `localhost:8000`)
**Staging API:** `api-staging.verdaxis.exchange` (Caddy reverse proxy to backend on `localhost:8001`)

### Build commands

```bash
npm run build:prod
npm run build:staging
```

### Deploy command

Build a verified artifact, then rsync `dist/` into the Caddy-served folder for the target environment.

```bash
bash ./scripts/deploy.sh prod
rsync -a --delete dist/ /home/verdaxis-prod/verdaxis/prod/fe/dist/
npm run smoke:live -- prod

bash ./scripts/deploy.sh staging
rsync -a --delete dist/ /home/verdaxis-prod/verdaxis/staging/fe/dist/
npm run smoke:live -- staging
```

**IMPORTANT:** Deploy with `rsync -a --delete dist/ .../dist/` so stale hashed assets are removed. Vite generates hashed JS filenames on each build. If stale `dist/index.html` references an old hash, the site breaks with:
> "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html"

### Verify deployment

```bash
npm run smoke:live
```
This checks prod and staging HTML, hashed bundle API targets, backend health, the four market products, the eight delivery points, and the forward-curve endpoint with required params.

For dashboard navigation dogfood, install the browser harness once with `npm run smoke:navigation:setup`, then run `npm run smoke:navigation -- --target local|staging|prod` with `VERDAXIS_SMOKE_EMAIL` and `VERDAXIS_SMOKE_PASSWORD`. `VERDAXIS_SMOKE_TOKEN` is supported for local/generated-token runs, but live prod/staging smoke should prefer UI login credentials so access tokens are not placed in app URLs.

## Local Development

```bash
npm run dev
```

`.env` should use `VITE_API_URL=/api` for local dev. The vite proxy (configured in `vite.config.ts`) forwards `/api/*` to `http://144.126.151.136:8000/api/*`, avoiding CORS issues.

## Environment Configuration

Production API URL is set in `.env.production` and staging API URL is set in `.env.staging`. Vite loads the correct file from `vite build --mode production` or `vite build --mode staging`, and `scripts/deploy.sh` also passes the target API URL explicitly.

- **`.env`** — local dev only (`VITE_API_URL=/api`), gitignored
- **`.env.production`** — production builds (`VITE_API_URL=https://api.verdaxis.exchange/api`), committed
- **`.env.staging`** — staging builds (`VITE_API_URL=https://api-staging.verdaxis.exchange/api`), committed
- **`.env.example`** — reference template, committed

Behavioral analytics is optional. Set both `VITE_ANALYTICS_HOST` and
`VITE_ANALYTICS_WEBSITE_ID` to load the Umami tracker; leaving either blank
keeps analytics fully disabled. These are public collector coordinates only.
Umami credentials must remain backend-only and must never use the `VITE_`
prefix. See `docs/behavioral-analytics.md` for the privacy and event contract.

**Never rely on the server's `.env` file for production/staging builds.** Use the explicit build mode or `scripts/deploy.sh`; otherwise the wrong API can be baked into the bundle.

## Known Gotchas

- **API returns numbers as strings.** Always wrap numeric fields (`quantity_mt`, `final_quantity_mt`, `price_per_mt_usd`, `final_price_per_mt`, `final_total_usd`) with `Number()` before arithmetic or `.toFixed()` calls.
- **Never commit `dist/` to git.** It's in `.gitignore`. If it gets force-added, run `git rm -r --cached dist/` to untrack it.
- **RFQ UI is archived by default.** The code remains behind `VITE_ENABLE_RFQ=true`; orderbook/listing flows are the default marketplace model.
- **In-app navigation is URL-routed.** Every authenticated view is a nested route under `/app` (see Routing). New authenticated pages need a child route in `App.tsx` plus a `Page` value and `PAGE_SLUGS` entry in `types.ts` so the sidebar, session restore, and `data-dashboard-page` contract keep working.
- **AI keys must stay server-side.** `vite.config.ts` intentionally does not inject API keys into the client bundle; all Gemini calls go through backend `/api/ai/chat`.
- **Authentik is historical only.** Authentik docs/env examples may exist for reference, but runtime auth is Verdaxis JWT. Do not add Authentik/OIDC dependencies back into the app.
<!-- codesight-local:start -->
## Codesight Bootstrap

Before exploring the tree, read:
1. `.codesight/wiki/index.md` — 200-token catalog of all wiki articles (start here)
2. `.codesight/wiki/overview.md` — architecture and high-impact files
3. Load topic articles on demand: `.codesight/wiki/<topic>.md` (auth, database, payments, users, ui, etc.)
4. `.codesight/CODESIGHT.md` — full route/schema/lib map (fallback if wiki missing)
2. `.codesight/libs.md` if present
3. `.codesight/graph.md` if the task touches service flow or module relationships
4. `.codesight/routes.md` if the task touches routes or handlers
5. `.codesight/schema.md` if the task touches models or database code
6. `.codesight/components.md` if the task touches UI components

Only open full source files after consulting the wiki first.
<!-- codesight-local:end -->
