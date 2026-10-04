# Architecture

## Scope and stack

This repository is the Verdaxis React single-page application. It serves localized public pages and the protected buyer/supplier platform. The stack is React 19, TypeScript, Vite 6, react-router-dom 7, Tailwind CSS, Mapbox GL JS, Leaflet, Recharts, lightweight-charts, i18next, and Vitest.

## Runtime topology

| Target | Static frontend | API and database | Release control |
|---|---|---|---|
| Production | Vercel | EU production host | Protected Vercel workflow on `prod` |
| Staging | Caddy on the shared VPS | Shared VPS staging services | Host-side atomic publisher after staging CI |

Production is not served from the shared VPS frontend directory. On this branch, `scripts/deploy.sh staging` creates a checked staging artifact. The reviewed host publisher builds from the exact accepted `staging` commit, atomically exchanges the static directory, runs live smoke, and only then aligns the staging checkout.

## Bootstrap and dependency flow

```text
index.html
  -> src/index.tsx
  -> src/App.tsx
     -> Theme/Auth/MarketSupport/Toast/Notification/Tutorial providers
     -> BrowserRouter
        -> AnalyticsProvider
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

**Intelligence-map summaries.** `BuyerMap` keeps its canvas across workspace changes, but each active period is a separate market-data lifecycle. A valid response from the current lifecycle can apply if it is not older than the latest successfully applied response, including after a newer request fails. A failure from the latest started request in that lifecycle keeps previously applied data visible and shows the market-data warning. Deactivation invalidates all pending responses.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** Only a private trade-stream `reset` with reason `subscriber_overflow` retains the last acknowledged replay cursor. `useSSE` still invalidates affected REST reads and delivers the reset callback before reconnect; other resets, `auth_revoked`, and user, organization, or Market Support scope changes clear the cursor.

**Staging FAME/catalog.** `UCOME_B100` enters the shared orderbook only when the catalog explicitly enables `ORDERBOOK` execution and delivery-point coverage. Its order terms live in `types/fameOrder.ts` and pass through the standard order API. Earlier supplier offers and RFQs remain separate, non-executable history in the FAME services and components. This branch does not include the production identified-activity pipeline.

**Market provenance.** Demo, live-order, confirmed-trade, benchmark, mixed, and no-data states remain distinct. Marketplace and Forward Curve use the same canonical product, delivery-point, and availability-window identity. The UI must not turn demo, history, or reference values into executable claims.

## File map

```text
src/
  index.tsx                         React mount
  App.tsx                           providers, route tree, dashboard layout route
  routeMetadata.ts                  localized route metadata and static-head catalog
  types.ts                          shared UI and API domain types
  types/marketSupport.ts            assisted-workspace contracts
  types/fame{Order,Rfq,SupplierOffer}.ts
                                    staging UCOME B100 and history contracts
  components/
    Layout.tsx                      authenticated shell
    layout/{Sidebar,Header,sidebarConfig}.tsx
    Marketplace.tsx                market/listings/orderbook and FAME history workspace
    OrderBook.tsx                   depth and level interaction
    OrderPlaceModal.tsx             shared BID/ASK entry, including catalog-enabled B100
    ForwardCurveWorkspace.tsx       monitoring matrix, chart, selected-period evidence
    BuyerMap.tsx                    retained authenticated intelligence map
    CommandCenter.tsx               buyer/supplier home views
    fame/                           shared UCOME B100 fields and readback
    rfq/                            earlier FAME request history
    supplier/                       earlier FAME supplier-offer history
    admin/                          admin and product analytics workspaces
    admin/market-support/           eligible-organization entry
    market-support/                 acting banner and final order confirmation
    public/                         localized public shell and components
  context/                          auth, market support, theme, notifications, tutorial
  services/
    api.ts                          fetch client and response transforms
    authToken.ts                    in-memory access-token generation
    readCache.ts                    scoped TTL cache and request deduplication
    fame{Order,Rfq,SupplierOffer}.ts
                                    staging FAME normalization and events
    publicMarketSync.ts             shared market invalidation subscriber
    analytics.ts                    optional consent-gated Umami adapter
  hooks/                            workspace readiness, SSE, preferences, watchlists
  utils/marketplaceSelection.ts      persisted Marketplace product/port/window handoff
  utils/                            market identity, slice URLs, axis and display helpers
  locales/{en,zh}/                  lazy translation namespaces
  pages/                            auth/onboarding and public route pages
  tests/                            Vitest and React Testing Library checks
scripts/
  check-build-artifacts.mjs         static chunk/artifact inspection
  deploy.sh                         target-aware static build helper
  smoke-live.mjs                    external production/staging read checks
  smoke_navigation.py               local or deployed browser navigation
.github/workflows/
  frontend-ci.yml                   tests, types, i18n, both builds
```

## Source-to-test locator

| Area | Source | Tests/checks |
|---|---|---|
| Routes and sidebar | `App.tsx`, `layout/sidebarConfig.ts`, `types.ts` | `app-routing.test.tsx`, `sidebar-config.test.ts` |
| Marketplace/order entry | `Marketplace.tsx`, `OrderBook.tsx`, `OrderPlaceModal.tsx`, `api.ts` | `marketplace-green-fuels.test.tsx`, `order-place-modal.test.tsx`, `api-*.test.ts` |
| Forward Curve | `ForwardCurveWorkspace.tsx`, `utils/forwardCurveAxis.ts` | `forward-curve-workspace.test.tsx`, `forward-curve-axis.test.ts` |
| Market Support | `MarketSupportContext.tsx`, `types/marketSupport.ts`, `api.ts` | `market-support-*.test.tsx`, `api-market-support-context.test.ts` |
| FAME/catalog | FAME types/services/components and `Marketplace.tsx` | `b100-order-api.test.ts`, `marketplace-b100-take.test.tsx`, FAME component tests |
| Build | `vite.config.ts`, `check-build-artifacts.mjs`, `deploy.sh` | both target builds and artifact checks |

## Run commands

```bash
npm ci --legacy-peer-deps   # Node 24
npm test && npm run typecheck && npm run i18n:check
npm run build:staging && npm run build:check
npm run build:prod && npm run build:check
```

See [README.md](README.md) for the full routine CI sequence and the separation between local checks and live smoke. [`scripts/deploy.sh`](scripts/deploy.sh) is the staging build guide; the host atomic publisher remains the release control.
