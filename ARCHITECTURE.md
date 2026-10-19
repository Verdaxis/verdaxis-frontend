# Architecture

## Scope and stack

This repository is the Verdaxis React single-page application. It serves localized public pages and the protected buyer/supplier platform. The stack is React 19, TypeScript, Vite 7 (Node 24), react-router-dom 7, Tailwind CSS, Mapbox GL JS, Leaflet, Recharts, i18next, and Vitest.

## Runtime topology

| Target | Static frontend | API and database | Release control |
|---|---|---|---|
| Production | Vercel | EU production host | Protected Vercel workflow with an approved canonical `staging` SHA |
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

`src/types.ts` supplies the shared route, market, order, and API model vocabulary. `PAGE_SLUGS` connects the legacy `Page` type to real URLs. `src/components/layout/sidebarConfig.ts` is the visible primary navigation list. A component render case alone does not make a workspace reachable. `src/api/` holds the decimal boundary: `decimals.ts` converts one wire decimal, `mappers.ts` maps each wire shape to its app type, and `contract.ts` names the generated wire types the mappers read. Non-decimal auth, catalog, notification and order metadata types derive from those aliases; `OwnedOrderBookOrder` requires owner metadata for `/orderbook/my`, while `OrderBookOrder` keeps an optional compatibility view pending the public/owner consumer decision.

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

**Decimal boundary.** The backend serializes `Decimal` as a JSON string. `src/api/decimals.ts` converts each one (`parseWireDecimal`, `requireWireDecimal`), and `src/api/mappers.ts` applies one mapper per wire shape — typed from the generated wire types in `src/api/contract.ts` to the app types — at every entry point: each `services/api.ts` method, the public ticker's direct fetches in `data/fuelPrices.ts`, and the trade stream in `useSSE`. A component therefore never sees a wire string. Money and unit prices render with `formatUsd` and quantities and measurements with `formatQuantity` (`src/utils/numberFormat.ts`), so no displayed text depends on how the wire spells a number (tracker decision 71). The cache stores raw wire bodies and every mapper runs outside it. `docs/refactor/api-type-drift.md` records the entry points and the shapes still open.

**Intelligence-map summaries.** `BuyerMap` keeps its canvas across workspace changes, but each active period is a separate market-data lifecycle. A valid response from the current lifecycle can apply if it is not older than the latest successfully applied response, including after a newer request fails. A failure from the latest started request in that lifecycle keeps previously applied data visible and shows the market-data warning. Deactivation invalidates all pending responses.

**ECA zone geometry.** `src/data/eca-zones-web.json` (1.1 MB of web-simplified zone polygons) is emitted as a hashed static asset, not a JS import. `src/data/secaZones.ts` exposes its URL (`?url` import) and `loadEcaZoneCollection()`, which fetches and caches it once. `loadEcaLayers` awaits both the layer code and that data, so `BuyerMap` installs the overlay on `style.load` after first paint and keeps a single failure path (`ecaOverlayError`). Removing the dataset from the bundle cut the intelligence map's first-load JS by about 394 KB gzip; the asset keeps the same geometry and the `/assets/*` immutable cache header.

**On-demand chart libraries.** Recharts is the heaviest workspace dependency and only two chart components use it: `compliance/FuelEuBarChart.tsx` (lazily imported by `ComplianceDashboard`) and `admin/product-analytics/TrendChart.tsx` (lazily imported through `LazyTrendChart`, used by the five analytics tabs). Both lazy boundaries reserve the chart's box (`h-52` / the `height` prop) so the layout does not move while the chunk arrives. Recharts therefore leaves the compliance and admin route chunks' static imports; the checker fails the build if any route statically reaches `vendor-recharts`.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure. Query stores the snapshot under the canonical slice key. `useOrderBookSnapshot` registers the slice's ordinary and forced reads with `registerQueryRefresh`; `snapshotRequests.ts` never lets an older result replace a newer one when reads overlap. One forced resume read covers every freshness signal received while the tab was hidden, and a committed event that arrives during a read costs exactly one further read.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** Only a private trade-stream `reset` with reason `subscriber_overflow` retains the last acknowledged replay cursor. `useSSE` still invalidates affected REST reads and delivers the reset callback before reconnect; other resets, `auth_revoked`, and user, organization, or Market Support scope changes clear the cursor.

**Canonical products.** B30 (`c4cecebc-3d2d-5840-8021-57a9a11bc673`) and B100 (`74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5`) retain scalar biofuel contracts, fixed ISO specifications, whole-fuel CI methods and the 200 MT catalog minimum. UCOME_B100 retains its separate UUID, typed terms, 1 MT minimum and Singapore lane. Scalar biofuel suppliers enter through ASK declarations, not an undeclared direct take of a BID.

**Staging FAME/catalog.** `UCOME_B100` enters the shared orderbook only when the catalog explicitly enables `ORDERBOOK` execution and delivery-point coverage. Its order terms live in `types/fameOrder.ts` and pass through the standard order API. Earlier supplier offers and RFQs remain separate, non-executable history in the FAME services and components. This branch does not include the production identified-activity pipeline.

**Staging Bio-LNG/catalog.** `BIO_LNG` follows the same catalog and contract rules as B100: `ORDERBOOK` execution plus an explicit lane from `available_delivery_point_ids` (Rotterdam only at first), or the market stays closed. Its terms live in `types/lngOrder.ts`, are required on BIO_LNG orders, and carry the `side` discriminator (`LngAskTerms` or `LngBidTerms`). The public ask view withholds the scheme certificate number and the physical supplier name until a trade is confirmed, and exposes only `reseller` and `fueleu_recognition`. The server derives the generic ASK metadata (scheme, specification, feedstock, origin) from `lng_terms`, so the client never sends both. A direct take that fails the terms comparison returns `LNG_TERMS_INCOMPATIBLE`; the fixed names come from the bio-LNG contract addendum. BIO_LNG is exempt from the scalar carbon intensity, has no demo data, and never feeds `ci_pricing`.

**Market provenance.** Demo, live-order, confirmed-trade, benchmark, mixed, and no-data states remain distinct. Marketplace and Forward Curve use the same canonical product, delivery-point, and availability-window identity. The UI must not turn demo, history, or reference values into executable claims.

**KYC execution gate.** `AuthContext` exposes `execution_eligibility` from `/api/auth/me`. `Layout` renders `KycDeadlineBanner` for `KYC_GRACE`, `KYC_REQUIRED`, and `KYC_REJECTED`; it links to `/kyc` and shows the grace deadline when present. A blocked execution returns HTTP 403 with code `KYC_REQUIRED`; `isKycRequiredError` in `api.ts` detects it and `KycRequiredNotice` shows the localized reason with the same link in the order modal and the take and confirm actions. Cleanup commands (cancel, decline, deliver, pay) stay enabled.

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
  types/lngOrder.ts                 staging Bio-LNG ask, public ask, bid, snapshot
  components/
    Layout.tsx                      authenticated shell
    layout/{Sidebar,Header,sidebarConfig}.tsx
    layout/KycDeadlineBanner.tsx    KYC grace/required/rejected deadline notice
    kyc/KycRequiredNotice.tsx       localized KYC_REQUIRED notice with /kyc link
    Marketplace.tsx                market/listings/orderbook and FAME history workspace
    OrderBook.tsx                   depth and level interaction
    OrderPlaceModal.tsx             shared BID/ASK entry, including catalog-enabled B100 and Bio-LNG
    ForwardCurveWorkspace.tsx       monitoring matrix, chart, selected-period evidence
    BuyerMap.tsx                    retained authenticated intelligence map
    CommandCenter.tsx               buyer/supplier home views
    fame/                           shared UCOME B100 fields and readback
    lng/                            Bio-LNG ask/bid fields and readback
    rfq/                            earlier FAME request history
    supplier/                       earlier FAME supplier-offer history
    admin/                          admin and product analytics workspaces
    admin/market-support/           eligible-organization entry
    market-support/                 acting banner and final order confirmation
    public/                         localized public shell and components
  features/marketplace/             Marketplace workspace: components/, hooks/ (useMarketplaceQueries, useMarketplaceSelection), api/ (Query keys, options, read adapters)
  features/orderbook/               OrderBook workspace: components/, api/ (Query keys, options, read adapter)
  features/orderbook/hooks/useOrderBookSnapshot.ts
                                    Query-owned market-slice snapshot: registers its reads with the shared
                                    refresh registry, polls while visible, forces one read on resume
  lib/query/                        TanStack Query client, provider, keys and invalidation bridge
  lib/query/refreshRegistry.ts      per-key refresh lifecycle and registration; no bridge dependency, so feature
                                    hooks import it without loading the bridge
  lib/query/refreshCoordinator.ts   500 ms batching of freshness signals for the bridge (visible tab only)
  lib/query/invalidation.ts         bridge from read-cache and public-market signals to Query
  lib/query/snapshotRequests.ts     orders overlapping ordinary and forced snapshot reads inside one mounted slice
  context/                          auth, market support, theme, notifications, tutorial
  services/
    api.ts                          fetch client and response transforms
    authToken.ts                    in-memory access-token generation
    readCache.ts                    scoped TTL cache and request deduplication
    fame{Order,Rfq,SupplierOffer}.ts
                                    staging FAME normalization and events
    lngOrder.ts                     Bio-LNG normalization without restoring redacted identity
    orderTerms.ts                   applies every product terms layer in one pass
    publicMarketSync.ts             shared market invalidation subscriber
    analytics.ts                    optional consent-gated Umami adapter
  hooks/                            workspace readiness, SSE, preferences, watchlists
  utils/marketplaceSelection.ts      persisted Marketplace product/port/window handoff
  utils/brandImages.ts              srcSet ladders for the WebP brand images
  utils/                            market identity, slice URLs, axis and display helpers
  assets/fonts/                     self-hosted Latin/Latin Extended woff2 files
  assets/brand/                     right-sized lossless WebP brand images
  build/fontPreload.ts              pure builder for the webfont preload tags
  build/preconnect.ts               pure builders for the API/Mapbox preconnect tags
  locales/{en,zh}/                  lazy translation namespaces
  pages/                            auth/onboarding and public route pages
  tests/                            Vitest and React Testing Library checks
scripts/
  check-build-artifacts.mjs         static chunk/artifact inspection
  deploy.sh                         target-aware static build helper
  smoke-live.mjs                    external production/staging read checks
  smoke_navigation.py               local or deployed browser navigation
  journeys/                         refactor safety net (npm run smoke:journeys)
    run_journeys.py                 disposable backend + bundle + browser gate
    journeys.py                     the eleven journeys and their evidence
    browser_harness.py              API forwarding, Mapbox/font stubs, cookies
    screenshots.py                  same-look capture (record/compare)
    png_diff.py                     tolerance comparison; test_png_diff.py tests it
    seed.py, seed_orders.py         disposable fixtures (actors, ports, orders)
    baselines/                      committed screenshot set + manifest
.github/workflows/
  frontend-ci.yml                   tests, types, i18n, both builds
```

## Source-to-test locator

| Area | Source | Tests/checks |
|---|---|---|
| Routes and sidebar | `App.tsx`, `layout/sidebarConfig.ts`, `types.ts` | `app-routing.test.tsx`, `sidebar-config.test.ts` |
| Marketplace/order entry | `Marketplace.tsx`, `OrderBook.tsx`, `OrderPlaceModal.tsx`, `api.ts` | `marketplace-green-fuels.test.tsx`, `order-place-modal.test.tsx`, `api-*.test.ts` |
| Forward Curve | `ForwardCurveWorkspace.tsx`, `utils/forwardCurveAxis.ts` | `forward-curve-workspace.test.tsx`, `forward-curve-axis.test.ts` |
| Intelligence Map | `src/components/BuyerMap.tsx` | `src/tests/buyer-map-i18n.test.tsx` |
| Market Support | `MarketSupportContext.tsx`, `types/marketSupport.ts`, `api.ts` | `market-support-*.test.tsx`, `api-market-support-context.test.ts` |
| FAME/catalog | FAME types/services/components and `Marketplace.tsx` | `b100-order-api.test.ts`, `marketplace-b100-take.test.tsx`, FAME component tests |
| Bio-LNG/catalog | LNG types/services/components, `Marketplace.tsx`, `OrderPlaceModal.tsx` | `lng-order-api.test.ts`, `marketplace-biolng-take.test.tsx`, `order-place-modal-biolng.test.tsx`, LNG component tests |
| Build | `vite.config.ts`, `check-build-artifacts.mjs`, `deploy.sh` | both target builds and artifact checks |
| Fonts | `src/index.css`, `src/assets/fonts/`, `src/build/fontPreload.ts` | `self-hosted-fonts.test.ts` |
| Brand images | `src/assets/brand/`, `src/utils/brandImages.ts`, `scripts/optimize-brand-images.sh` | `brand-assets.test.ts` |

`scripts/check-build-artifacts.mjs` also enforces per-route first-load ceilings in
gzip bytes (`ROUTE_FIRST_LOAD_BUDGETS`) for the landing page, marketplace, the
intelligence map's first visit, the command center and compliance. Each ceiling is
the measured value plus 2 %, so a regression fails `npm run build:check`. The
measurement is the entry chunk, the shell modulepreloads, the shell stylesheets,
the route's own chunks and their transitive static import chain — the measurement
the 2026-10-17 frontend audit uses in section 11. `node scripts/check-build-artifacts.mjs
--report --root dist` prints the current numbers. A commit that lowers a route's
first load lowers its ceiling with it.

`vite.config.ts` also injects preconnect tags for the build-time API origin
(from `VITE_API_URL`, with a `dns-prefetch` fallback) and for
`https://api.mapbox.com`; `src/build/preconnect.ts` holds the pure tag builders
and `src/tests/api-preconnect.test.ts` covers them. Only these tags are added
to the shell and to every prerendered page.

The shell self-hosts its webfonts. `src/index.css` declares the sixteen faces
the site uses (JetBrains Mono 400/600, Lato 300/400/700, Montserrat 500/600/700,
each in Google's `latin` and `latin-ext` slice) as `@font-face` rules with
Google's own `unicode-range` and `font-display: swap`, pointing at
`src/assets/fonts/*.woff2`; `scripts/fetch-self-hosted-fonts.sh` re-downloads
those ten files and checks their digests, so a re-run cannot silently swap the
shipped glyphs. `latin-ext` carries the letters port and company names use
(Gdańsk, İstanbul, Constanța, Świnoujście); its five files are not preloaded,
because `unicode-range` makes the browser fetch one only when a page shows such
a letter. The shell no longer requests anything from `fonts.googleapis.com`: the
two preconnects and the stylesheet link are gone. The one Google Fonts request
left in the app is `PartnerShowcasePage.tsx`'s `@import` of DM Serif Display for
its own headings; that predates this step and is not self-hosted yet. `src/build/fontPreload.ts`
builds the two preload tags for the above-the-fold files (Lato 400 and
Montserrat's variable file) from the names Vite emitted, because the hashes only
exist after the CSS is transformed, and places them directly after the shell's
`<meta charset>` (and ahead of the stylesheets), so the charset stays the first
element of `<head>`; `src/tests/self-hosted-fonts.test.ts` covers the face set,
the slice ranges, the files on disk and the preload builder.

All three families are under the SIL Open Font License 1.1. Their licence texts
sit beside the binaries as `src/assets/fonts/OFL-Lato.txt`,
`OFL-Montserrat.txt` and `OFL-JetBrainsMono.txt`, taken unmodified from
`google/fonts` (`ofl/lato`, `ofl/montserrat`, `ofl/jetbrainsmono`). Nothing
imports them, so they are part of the repository's licence record and not of the
build output.

Brand artwork is served right-sized. `scripts/optimize-brand-images.sh` writes
lossless 1x/2x WebP cuts into `src/assets/brand/`, `src/utils/brandImages.ts`
imports them and exports the `srcSet` ladders and the `sizes` hints that go with
them, and every `<img>` keeps its `public/*.png` counterpart as the `src`
fallback and as the public URL other readers use (the social card, the favicon,
the structured-data logo and the masters the generator starts from). Vite
inlines neither the fonts nor the brand images (`build.assetsInlineLimit` opts
`.woff2` and `.webp` out of the default 4 KiB threshold, and leaves every other
asset on it), so the images stay separate hashed files under `/assets/`;
`src/tests/brand-assets.test.ts` guards the
pixel sizes, the descriptor-to-file match and the fallbacks.

Vite 7 keeps the Vite 6 browser target explicitly (`es2020`, Edge 88,
Firefox 78, Chrome 87, Safari 14), rather than adopting the newer Baseline
2025 default. The three build plugins, manual chunk groups and asset inlining
policy are unchanged. `package.json` requires Node `24.x` (also the Vercel
build override); CI, the release workflow and the Docker builder use Node 24.

## Run commands

```bash
npm ci --legacy-peer-deps   # Node 24
npm test && npm run typecheck && npm run i18n:check
npm run build:staging && npm run build:check:staging
npm run build:prod && npm run build:check
```

See [README.md](README.md) for the full routine CI sequence and the separation between local checks and live smoke. [`scripts/deploy.sh`](scripts/deploy.sh) is the staging build guide; the host atomic publisher remains the release control.

## Phase 0 public and release convergence

`publicPageLoaders.ts` is shared by route lazy loading, initial-page preparation
and `prerender/renderPublicRoute.tsx`. Vite emits localized public HTML. The browser
preloads the matching page and translations before React mounts; this preserves
the production approach (createRoot replacement, not React hydrateRoot).
Production public wording and the producer dataset notice are retained. Authenticated
compliance components keep staging's null/unpriced monetary contract.

`release-vercel.yml` takes an approved full source SHA equal to canonical staging
and an approved backend SHA. `release-vercel.sh` builds one immutable production
candidate, checks exact backend readiness before canary and promotion, captures the
previous deployment, and retains dependency-aware rollback. Candidate-only is the
default. Staging requires its own environment build. See
`docs/vercel-production-release.md`; no release is authorized by local tests.

Phase 0 checks: `src/tests/phase0-*.test.*`,
`node --test scripts/phase0-request-manifest.test.mjs`,
`python3 -m pytest scripts/test_phase0_release.py -q`, and the local-only public
browser smoke `scripts/test_phase0_browser.py`. The request manifest covers both
pinned trees and current source, with explicit retired and stale-wrapper dispositions.
`scripts/phase0_gate.py` owns the disposable pinned PostGIS container, migrations,
synthetic fixtures (`phase0_gate_seed.py`), backend process and two actual browser
bundles (`phase0_gate_browser.py`). Backend egress is restricted to its database;
browser API requests are forwarded to loopback, with other external traffic blocked.
No backend worktree files are changed. Temporary archived trees stay under `work/`,
which TypeScript excludes. `phase0_gate_extra_seed.py` adds nullable historical RFQs
and account-state fixtures. `phase0_gate_m3.py` exercises actual profile/trade/KYC
screens and client boundaries; `phase0_gate_fault_server.py` wraps the unchanged
backend with loopback-only synthetic vault availability controls. A proxy response
is changed to 504 only after the real upload commits, then retained rows are checked.
The PM accepted only the old ETS display exception; see `docs/phase0/progress-task8.md`
for current results and any other failed old-bundle checks.

## Refactor journey net (2026-10-17)

`npm run smoke:journeys` is the safety net every refactor step must pass (the
2026-10-17 refactor design, D10). One command builds the production bundle,
starts a disposable PostgreSQL and the pinned backend release
`56d7577085af99411a6f9c3e34e64ad929d09954` on ephemeral loopback ports with
egress guarded to its database, seeds synthetic fixtures only, and drives the
bundle in a real Chromium from the official Playwright image. Run it on the
test host (`verdaxis-prod-test`); nothing here runs on a developer Mac.

Eleven journeys: login success and wrong password; marketplace browse,
product/port filter, pagination, order book tab, my-orders tab and a
deep-linked slice `/app/m/b30/singapore/spot`; placing a BID and an ASK;
take -> confirm -> deliver -> pay across buyer and supplier sessions;
notifications list and mark read; the intelligence map with ports and the ECA
overlay; the public landing and one public content page. Mapbox styles, tiles
and glyphs are stubbed, so no run needs a token or the public network.

The same-look gate captures nine screens at 1440x1000 (landing, how-it-works,
marketplace light/dark, order book, trade blotter, map light/dark with tiles
stubbed to a solid colour, the admin Users tab) with animations disabled, the
wall clock frozen, the theme pinned and the cookie banner pre-dismissed. The
screens run before the journeys so they capture exactly the seeded state.
`--screenshots compare` (the default) fails above a 0.002 pixel-difference
ratio; `npm run smoke:journeys:record` refreshes the committed baselines in
`scripts/journeys/baselines/`.

The harness stubs the webfonts as well as Mapbox. The committed baselines were
captured with no webfont loaded, so `browser_harness.py` answers an empty
`font/woff2` body for `fonts.googleapis.com` and `fonts.gstatic.com` and for
same-origin `/assets/*.woff2`, the paths the self-hosted fonts are served from.
Without the same-origin rule the fonts would load, text metrics would change and
every screenshot would fail; with it a font never decodes and each page keeps
the fallback the baseline recorded. Add a new webfont origin here when one
appears, and never re-record the baselines to absorb a font change.

The order journeys drive the real order modal. The catalog boundary converts the
wire decimal string into a number (`parseWireDecimal`), so `min_lot_size` is
usable and the review button enables; the take journey reads the prefilled
quantity the same way instead of typing it. Both defects the net first recorded
(the review button never enabling, and the blank take prefill) came from the
decimal-string boundary the audit documents (4.7) and are fixed there.
