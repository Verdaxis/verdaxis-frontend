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

`vite.config.ts` prerenders the 52 indexable English and Chinese public routes at build time. `src/prerender/renderPublicRoute.tsx` uses the existing React pages and translation resources; the producer map has a static project summary from the same public dataset because Leaflet requires a browser. Private routes keep the non-indexable loading shell. Staging also excludes all public routes from indexing.

Education articles carry maintained-by and actual source-check fields, with primary reference links. The energy calculator compares the same energy demand and estimates fuel cost, direct combustion CO2, and a disclosed CO2-only ETS scenario; it does not calculate FuelEU compliance or CII. The producer index uses neutral pathway labels and shares `ProducerDatasetNotice` between its static summary and interactive map. Import history does not establish record observation dates or verified supply. Known incorrect points remain in the index with missing coordinates and no map marker.

`src/publicPageLoaders.ts` shares public lazy loaders between the route tree and bootstrap. For a known public route, `src/index.tsx` loads its page and translation namespace before replacing the static content with the interactive application. It passes the resolved initial page to `AppRoutes`, which renders it at the matching public route leaf without a second lazy loading state. Later navigation retains the normal lazy routes and parameter context. The build emits localized metadata, canonical and language links, and factual JSON-LD; `RouteMetadata` updates them after client navigation. Production edge redirects send the domain root to `/en/` and `www` to the apex host.

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

**Authentication.** Access tokens stay in memory. Refresh uses the backend HttpOnly cookie, then `/auth/me` validates the session. Public market reads use an exact GET allowlist; private requests carry the bearer token. `services/authTabSync.ts` shares only a `logout` or `identity_changed` event type over a feature-detected `BroadcastChannel`; a receiving tab runs its local clear without calling `/auth/logout` or re-broadcasting, and an `identity_changed` peer event also blocks silent cookie restore. It also shares user activity, so the 30 minute idle logout in `AuthContext` fires only when no open tab has seen input for the whole timeout: each tab sends an `activity` message (an event type and an epoch-ms timestamp, throttled to one per 30 seconds), and a receiving tab moves its own wall-clock deadline without re-broadcasting. The timer re-checks that deadline when it fires, so a tab that slept does not log out while another tab was active. Without `BroadcastChannel` each tab keeps its own idle timer.

**Market Support.** The admin remains the authenticated principal. The browser persists only an opaque context id. `MarketSupportContext` rehydrates server state and expires it; `api.ts` sends the context header only to the narrow customer route allowlist. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`, while the server eligibility result remains authoritative. Entry requires an approved `REAL` organization and an `ORDER_CREATE`/`ORDER_CANCEL` scope. Both assisted BID and ASK use `OrderPlaceModal` and `MarketSupportFinalConfirmation`. Unsupported mutations and trade execution stay blocked.

**Cached reads.** `readCache.ts` keys private reads by the auth generation, accepted account/organization, and assisted context. Mutations and market stream events invalidate affected keys. Results from an obsolete scope cannot repopulate the cache.

**Intelligence-map summaries.** `BuyerMap` keeps its canvas across workspace changes, but each active period is a separate market-data lifecycle. A valid response from the current lifecycle can apply if it is not older than the latest successfully applied response, including after a newer request fails. A failure from the latest started request in that lifecycle keeps previously applied data visible and shows the market-data warning. Deactivation invalidates all pending responses.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** Only a private trade-stream `reset` with reason `subscriber_overflow` retains the last acknowledged replay cursor. `useSSE` still invalidates affected REST reads and delivers the reset callback before reconnect; other resets, `auth_revoked`, and user, organization, or Market Support scope changes clear the cursor.

**Stream health and server status.** `useSSE` handles the id-less `heartbeat` event (`{status, message, server_time}`) outside the data and control paths: it never reaches the consumer handler, the replay cursor, or read-cache invalidation, and a malformed payload is ignored. Each enabled stream registers in the module store `services/streamHealth.ts`; `hooks/useStreamHealth.ts` reads it with `useSyncExternalStore` plus a 5 s tick. Connection is aggregated as any enabled stream open: `live`, `stale` (a heartbeat was seen before but none for 75 s = 2 x 30 s cadence + 15 s margin; never judged if no heartbeat ever arrived), `reconnecting`, or `offline` (no open stream for 30 s, or the browser is offline). Server status is the worst latest heartbeat (`operational` < `degraded` < `maintenance`); only open streams count while any is open, and remembered heartbeats expire after 5 min. No recent heartbeat means unknown. `layout/StreamStatusIndicator` (header) and `layout/ServerStatusBanner` (below the header, plain-text message, dismissible per status+message for the page session) read the aggregate.

**Server abilities.** `GET /auth/me/abilities` (backend `docs/user-abilities.md`) says which of 23 fixed actions the signed-in account may use and why not. `context/AbilitiesContext` (mounted inside `AuthProvider`) fetches it once per identity and holds a lookup map; `useAbility(id)` returns `{allowed, reasonCode, reason}` or `undefined` while unknown. `undefined` means "do not decide from abilities": a 403 (including a pending password change), network or 5xx failure, a missing route (older backend; not retried), or an unknown `schema_version` all leave the map empty, so every control keeps its previous behavior and no user is blocked by a failed load. The key `abilitiesSubjectKey(user)` covers id, role, organization, approval, email, KYC and password-change fields, so a changed profile refetches and one user's hints never show for another. `AUTH_IDENTITY_CHANGED_EVENT` and `verdaxis:auth-logout` clear the map, drop any in-flight answer, and force a fetch for the next sign-in. Organization, KYC and approval changes made elsewhere have no push event, so window focus or tab visibility refetches at most once per 60 s. Controls read denials through `hooks/useAbilityDenial` (`useAbilityGate`, `useAbilityDenial`, `useAnyAbilityAllowed`): a denied control is `disabled`, carries the reason in `title`, and shows `ui/AbilityDenialNote` where there is room. Reason text is `abilities.reason.<CODE>` in the `common` namespace (en and zh); an unknown code falls back to the server `reason`, then to a generic sentence. Market actions are not evaluated while an assisted Market Support context is active, because the server then judges the supported organization rather than the administrator. Abilities are hints: endpoints stay authoritative, and per-subject rules (order owner, trade party, order state) are not in the payload. No UI exists yet for `deliver_trade`, `pay_trade`, inventory, RFQ, or `amend_order`; the admin ids `view_audit_log`, `view_user_activity`, `manage_subscriptions`, `review_kyc`, `manage_commissions` and `market_support_access` only feed the Admin entry check.

**Production activity.** `ActivityTrackingProvider`, `services/activityTracking.ts`, and `types/activity.ts` send bounded authenticated page and canonical market-slice activity. The adapter clears account-bound state at auth changes and does not replace optional Umami analytics consent.

**Market provenance.** Demo, live-order, confirmed-trade, benchmark, mixed, and no-data states remain distinct. Marketplace and Forward Curve use the same canonical product, delivery-point, and availability-window identity. The UI must not turn demo or reference values into executable claims.

**KYC execution gate.** `AuthContext` exposes `execution_eligibility` from `/api/auth/me`. `Layout` renders `KycDeadlineBanner` for `KYC_GRACE`, `KYC_REQUIRED`, and `KYC_REJECTED`; it links to `/kyc` and shows the grace deadline when present. A blocked execution returns HTTP 403 with code `KYC_REQUIRED`; `isKycRequiredError` in `api.ts` detects it and `KycRequiredNotice` shows the localized reason with the same link in the order modal and the take and confirm actions. Cleanup commands (cancel, decline, deliver, pay) stay enabled.

**Bio-LNG product terms.** `BIO_LNG` is the one product whose sales terms travel with the order. `types/lngOrder.ts` holds the shared contract, `utils/bioLngSpecification.ts` mirrors the server validation and compatibility rules, and `utils/bioLngTermsDisplay.ts` gives every surface the same label/value rows through `components/trading/BioLngTermsPanel.tsx`. A seller declares `LngAskTerms`, a buyer states `LngBidTerms`, and a buyer taking an ask sends its `lng_terms` with `POST /api/trades/`. The server derives the generic ASK scalars from `lng_terms` and withholds the certificate number and physical supplier until the trade is confirmed, so the client never sends or assumes them. BIO_LNG has no demo prices, and its delivery-point lane comes from the catalog `available_delivery_point_ids`.

## File map

```text
src/
  index.tsx                         public preload and React mount
  App.tsx                           providers, route tree, dashboard layout route
  routeMetadata.ts                  localized metadata, language links, and JSON-LD
  publicPageLoaders.ts               shared public route imports
  prerender/renderPublicRoute.tsx    build-only public content rendering
  types.ts                          shared UI and API domain types
  types/{activity,marketSupport,lngOrder}.ts production activity, assisted-workspace, and bio-LNG terms contracts
  types/abilities.ts                ability ids, reason codes, action-to-ability maps
  components/
    Layout.tsx                      authenticated shell
    layout/{Sidebar,Header,sidebarConfig}.tsx
    layout/{StreamStatusIndicator,ServerStatusBanner}.tsx  SSE connection indicator and server-status banner
    layout/KycDeadlineBanner.tsx    KYC grace/required/rejected deadline notice
    kyc/KycRequiredNotice.tsx       localized KYC_REQUIRED notice with /kyc link
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
  context/                          auth, abilities, market support, theme, notifications, tutorial
  services/
    api.ts                          fetch client and response transforms
    authToken.ts                    in-memory access-token generation
    authTabSync.ts                  cross-tab logout, identity-change, and activity events
    readCache.ts                    scoped TTL cache and request deduplication
    activityTracking.ts             bounded production activity queue
    publicMarketSync.ts             shared market invalidation subscriber
    streamHealth.ts                 SSE heartbeat parsing, stream registry, aggregation
    abilities.ts                    abilities response parsing and route-missing check
    analytics.ts                    optional consent-gated Umami adapter
  hooks/                            workspace readiness, SSE, preferences, watchlists, ability denials
  utils/marketplaceSelection.ts      persisted Marketplace product/port/window handoff
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
| Bio-LNG terms | `types/lngOrder.ts`, `utils/bioLngSpecification.ts`, `utils/bioLngTermsDisplay.ts`, `components/trading/BioLngTerms{Panel,Fields}.tsx` | `bio-lng-terms.test.ts`, `bio-lng-display.test.tsx`, `order-place-modal.test.tsx` |
| Forward Curve | `ForwardCurveWorkspace.tsx`, `utils/forwardCurveAxis.ts` | `forward-curve-workspace.test.tsx`, `forward-curve-axis.test.ts` |
| Intelligence Map | `src/components/BuyerMap.tsx` | `src/tests/buyer-map-i18n.test.tsx` |
| Market Support | `MarketSupportContext.tsx`, `types/marketSupport.ts`, `api.ts` | `market-support-*.test.tsx`, `api-market-support-context.test.ts` |
| Activity | `ActivityTrackingProvider.tsx`, `activityTracking.ts` | `activity-*.test.ts`, `user-activity-drawer.test.tsx` |
| Stream health | `useSSE.ts`, `streamHealth.ts`, `useStreamHealth.ts`, `layout/StreamStatusIndicator.tsx`, `layout/ServerStatusBanner.tsx` | `use-sse.test.tsx`, `stream-health.test.ts`, `stream-status-indicator.test.tsx`, `server-status-banner.test.tsx` |
| Server abilities | `AbilitiesContext.tsx`, `useAbilityDenial.ts`, `services/abilities.ts`, `types/abilities.ts`, `ui/AbilityDenialNote.tsx` | `abilities-parse.test.ts`, `abilities-context.test.tsx`, `abilities-ui.test.tsx`, `abilities-order-modal.test.tsx`, ability cases in `marketplace-green-fuels.test.tsx` |
| Release | workflow and release/artifact scripts | artifact/release guard tests and target builds |

## Run commands

```bash
npm ci --legacy-peer-deps   # Node 24
npm test && npm run typecheck && npm run i18n:check
npm run build:staging && npm run build:check:staging
npm run build:prod && npm run build:check:prod
```

See [README.md](README.md) for the full routine CI sequence and the separation between local checks and live smoke. See [docs/vercel-production-release.md](docs/vercel-production-release.md) for production operations.
