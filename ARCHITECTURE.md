# Architecture

## Scope and stack

This repository is the Verdaxis React single-page application. It serves localized public pages and the protected buyer/supplier platform. The stack is React 19, TypeScript, Vite 6, react-router-dom 7, Tailwind CSS, Mapbox GL JS, Leaflet, Recharts, lightweight-charts, i18next, and Vitest.

## Runtime topology

| Target | Static frontend | API and database | Release control |
|---|---|---|---|
| Production | Vercel | EU production host | `.github/workflows/release-vercel.yml` and `scripts/release-vercel.sh` |
| Staging | Caddy on the shared VPS | Shared VPS staging services | Host-side atomic publisher after staging CI |

The production workflow checks out `prod`, uses Node 24, builds one immutable Vercel candidate, validates its production API target, runs canary browser checks, and promotes the same deployment. `scripts/deploy.sh staging` creates a checked staging artifact; it is not the atomic publisher.

## Bootstrap and dependency flow

```text
index.html
  -> src/index.tsx
  -> src/App.tsx
     -> Theme/Auth/MarketSupport/Toast/Notification/Tutorial providers
     -> BrowserRouter
        -> AnalyticsProvider -> ActivityTrackingProvider
        -> RouteMetadata + PublicMarketSync + AppRoutes
           -> localized public routes
           -> auth and onboarding routes
           -> /app guard chain
              -> ProtectedRoute -> RequireOrganization -> RequireProfile
              -> MobileDesktopGate -> DashboardLayout
                 -> Layout -> Sidebar + Header
                 -> retained BuyerMap or nested Outlet workspace
                 -> Marketplace / ForwardCurveWorkspace / other views
                    -> services/api.ts -> readCache/authToken
                    -> production or staging API
```

`src/types.ts` supplies the shared route, market, order, and API model vocabulary. `PAGE_SLUGS` connects the legacy `Page` type to real URLs. `src/components/layout/sidebarConfig.ts` is the visible primary navigation list. A component render case alone does not make a workspace reachable.

## Route and workspace rules

- Public pages use `/:lang/*` and `PublicLayout`. Legacy unprefixed public paths redirect to a language route.
- `/app` is protected and organization/profile gated. The desktop workspace is available at widths of 768 px or more; `MobileDesktopGate` blocks narrower viewports. Platform admins can bypass organization onboarding.
- Bare `/app` restores the last accepted page. Nested routes are the source of truth; the `Page` type remains for sidebar state, session restore, analytics, and smoke selectors.
- Marketplace slices use `/app/m/:product/:port/:window`. Invalid slices return to `/app/marketplace`.
- The sidebar lists Command Center, Intelligence Map, Marketplace, Forward Curve, Watchlist, Analytics, and Trade History. Settings and Admin are separate footer/admin entries.
- Buyer and Supplier modes share the main destinations. They change the Command Center content and the primary action to BID or ASK.
- Marketplace owns catalog resolution, product counts, paged listings, orderbook depth, and the user's orders. Forward Curve owns market-period monitoring and selected-slice evidence. It opens Marketplace for order inspection or entry.

## Security and state boundaries

**Authentication.** Access tokens stay in memory. Refresh uses the backend HttpOnly cookie, then `/auth/me` validates the session. Public market reads use an exact GET allowlist; private requests carry the bearer token.

**Market Support.** The admin remains the authenticated principal. The browser persists only an opaque context id. `MarketSupportContext` rehydrates server state and expires it; `api.ts` sends the context header only to the narrow customer route allowlist. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`, while the server eligibility result remains authoritative. Entry requires an approved `REAL` organization and an `ORDER_CREATE`/`ORDER_CANCEL` scope. Both assisted BID and ASK use `OrderPlaceModal` and `MarketSupportFinalConfirmation`. Unsupported mutations and trade execution stay blocked.

**Cached reads.** `readCache.ts` keys private reads by the auth generation, accepted account/organization, and assisted context. Mutations and market stream events invalidate affected keys. Results from an obsolete scope cannot repopulate the cache.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** After a `subscriber_overflow` reset, `useSSE` refreshes affected REST reads and reconnects the private trade stream with its last acknowledged replay cursor. Other resets and `auth_revoked` clear that cursor.

**Production activity.** `ActivityTrackingProvider`, `services/activityTracking.ts`, and `types/activity.ts` send bounded authenticated page and canonical market-slice activity. The adapter clears account-bound state at auth changes and does not replace optional Umami analytics consent.

**Market provenance.** Demo, live-order, confirmed-trade, benchmark, mixed, and no-data states remain distinct. Marketplace and Forward Curve use the same canonical product, delivery-point, and availability-window identity. The UI must not turn demo or reference values into executable claims.

## File map

```text
src/
  index.tsx                         React mount
  App.tsx                           providers, route tree, dashboard layout route
  routeMetadata.ts                  localized route metadata and static-head catalog
  types.ts                          shared UI and API domain types
  types/{activity,marketSupport}.ts production activity and assisted-workspace contracts
  components/
    Layout.tsx                      authenticated shell
    layout/{Sidebar,Header,sidebarConfig}.tsx
    Marketplace.tsx                market/listings/orderbook workspace
    OrderBook.tsx                   depth and level interaction
    OrderPlaceModal.tsx             shared BID/ASK entry
    ForwardCurveWorkspace.tsx       monitoring matrix, chart, selected-period evidence
    BuyerMap.tsx                    retained authenticated intelligence map
    CommandCenter.tsx               buyer/supplier home views
    ActivityTrackingProvider.tsx    production identified activity boundary
    admin/                          admin and product analytics workspaces
    admin/market-support/           eligible-organization entry
    market-support/                 acting banner and final order confirmation
    public/                         localized public shell and components
  context/                          auth, market support, theme, notifications, tutorial
  services/
    api.ts                          fetch client and response transforms
    authToken.ts                    in-memory access-token generation
    readCache.ts                    scoped TTL cache and request deduplication
    activityTracking.ts             bounded production activity queue
    publicMarketSync.ts             shared market invalidation subscriber
    analytics.ts                    optional consent-gated Umami adapter
  hooks/                            workspace readiness, SSE, preferences, watchlists
  utils/                            market identity, slice URLs, axis and display helpers
  locales/{en,zh}/                  lazy translation namespaces
  pages/                            auth/onboarding and public route pages
  tests/                            Vitest and React Testing Library checks
scripts/
  check-build-artifacts.mjs         target-strict artifact inspection
  release-vercel.sh                 guarded immutable production release
  smoke_release.py                  rendered release policy checks
  smoke-live.mjs                    external production/staging read checks
  smoke_navigation.py               local or deployed browser navigation
.github/workflows/
  frontend-ci.yml                   tests, guards, types, i18n, both builds
  release-vercel.yml                manual protected production release
```

## Source-to-test locator

| Area | Source | Tests/checks |
|---|---|---|
| Routes and sidebar | `App.tsx`, `layout/sidebarConfig.ts`, `types.ts` | `app-routing.test.tsx`, `sidebar-config.test.ts` |
| Marketplace/order entry | `Marketplace.tsx`, `OrderBook.tsx`, `OrderPlaceModal.tsx`, `api.ts` | `marketplace-green-fuels.test.tsx`, `order-place-modal.test.tsx`, `api-*.test.ts` |
| Forward Curve | `ForwardCurveWorkspace.tsx`, `utils/forwardCurveAxis.ts` | `forward-curve-workspace.test.tsx`, `forward-curve-axis.test.ts` |
| Market Support | `MarketSupportContext.tsx`, `types/marketSupport.ts`, `api.ts` | `market-support-*.test.tsx`, `api-market-support-context.test.ts` |
| Activity | `ActivityTrackingProvider.tsx`, `activityTracking.ts` | `activity-*.test.ts`, `user-activity-drawer.test.tsx` |
| Release | workflow and release/artifact scripts | artifact/release guard tests and target builds |

## Run commands

```bash
npm ci --legacy-peer-deps   # Node 24
npm test && npm run typecheck && npm run i18n:check
npm run build:staging && npm run build:check:staging
npm run build:prod && npm run build:check:prod
```

See [README.md](README.md) for the full routine CI sequence and the separation between local checks and live smoke. See [docs/vercel-production-release.md](docs/vercel-production-release.md) for production operations.
