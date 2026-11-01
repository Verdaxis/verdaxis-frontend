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
     -> Theme/Auth/Abilities/MarketSupport/Toast/Notification/Tutorial providers
     -> BrowserRouter
        -> AnalyticsProvider
        -> RouteMetadata + PublicMarketSync + TradeNotifier + AppRoutes
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
- Buyer and Supplier modes share the main destinations. They change the Command Center content and the primary action to BID or ASK. The Command Center is a customizable widget grid (see Customizable home).
- Marketplace owns catalog resolution, product counts, paged listings, orderbook depth, and the user's orders. Forward Curve owns market-period monitoring and selected-slice evidence. It opens Marketplace for order inspection or entry.

## Security and state boundaries

**Authentication.** Access tokens stay in memory. Refresh uses the backend HttpOnly cookie, then `/auth/me` validates the session. Public market reads use an exact GET allowlist; private requests carry the bearer token. `services/authTabSync.ts` shares only a `logout` or `identity_changed` event type over a feature-detected `BroadcastChannel`; a receiving tab runs its local clear without calling `/auth/logout` or re-broadcasting, and an `identity_changed` peer event also blocks silent cookie restore. It also shares user activity, so the 30 minute idle logout in `AuthContext` fires only when no open tab has seen input for the whole timeout: each tab sends an `activity` message (an event type and an epoch-ms timestamp, throttled to one per 30 seconds), and a receiving tab moves its own wall-clock deadline without re-broadcasting. The timer re-checks that deadline when it fires, so a tab that slept does not log out while another tab was active. Without `BroadcastChannel` each tab keeps its own idle timer. Email verification saves the optional onboarding survey in guarded local storage through `services/onboardingSurvey.ts`. Once `AuthProvider.login` accepts a profile, it starts a non-blocking authenticated survey submission only for the same email. A successful submission or a 4xx clears the saved answer; network and server failures leave it for the next sign-in. This best-effort API call does not emit a global rate-limit error.

**Authentication transitions.** A refresh `409 REFRESH_ROTATION_IN_PROGRESS` keeps the session and shares one delayed retry across callers. The delay must be finite and at most five seconds; a repeated conflict stays unavailable. Login uses `AUTH_EMAIL_UNVERIFIED`, with message matching only for responses without a code. Registration accepts email-first `202 check_email`; verification can pass its registration token to the existing organization form. Pending registration verification authorizes organization completion, not account sign-in. Organization completion shows the check-inbox/resend screen for the new account verification email. Transitional Python responses retain their older flow. See `docs/refactor/auth-client-smoke.md` for the disposable login/refresh/logout journey.

**Market Support.** The admin remains the authenticated principal. The browser persists only an opaque context id. `MarketSupportContext` rehydrates server state and expires it; `api.ts` sends the context header only to the narrow customer route allowlist. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`, while the server eligibility result remains authoritative. Entry requires an approved `REAL` organization and an `ORDER_CREATE`/`ORDER_CANCEL` scope. Both assisted BID and ASK use `OrderPlaceModal` and `MarketSupportFinalConfirmation`. Unsupported mutations and trade execution stay blocked.

**Cached reads.** TanStack Query owns Marketplace catalog, listings, counts, owned orders, pricing overlays, and OrderBook snapshots. Feature adapters call the retained API client with `cacheOwner: 'query'`, bypassing legacy value and pending storage; `src/api/` remains the decimal boundary. Query-owned catalog responses also prime the legacy reference cache for the external order modal. `readCache.ts` remains transitional storage for unmigrated views, not a second cache in front of feature reads. Both private key families include auth generation, accepted account/organization, and assisted context. Scope changes detach pending private reads and remove private Query entries; late results cannot restore an obsolete scope.

**Refresh ownership.** API writes mark matching keys stale at mutation start and schedule one active visible refresh at settlement. The invalidation bridge shares the public market batch and retains one dirty rerun for events received during a read. A batch needs no extra read only when that read started after the batch's last committed event. The pricing overlay is keyed by settled ASK ids and stays outside generic market invalidation. The external order modal refreshes My Listings explicitly on close; placed orders and the take dialog's two-second success display rely on the bridge, not a second explicit read. Hidden/inactive keys stay stale without a fetch; visible fallback intervals remain 60 seconds for listings/counts and 10 seconds for depth.

**Shared streams.** `hooks/useSSE.ts` subscribes to `lib/sse/streamManager.ts`. The manager owns one physical public connection per channel and one private trades connection per accepted scope, invalidates reads and maps trade payloads once, then fans out to existing consumers. Legacy views already use this shared transport without moving their REST state to Query. Final unsubscribe closes the source and clears pending token/reconnect work; no prices subscriber was added.

**Decimal boundary.** The backend serializes `Decimal` as a JSON string. `src/api/decimals.ts` converts each one (`parseWireDecimal`, `requireWireDecimal`), and `src/api/mappers.ts` applies one mapper per wire shape — typed from the generated wire types in `src/api/contract.ts` to the app types — at every entry point: each `services/api.ts` method, the public ticker's direct fetches in `data/fuelPrices.ts`, and the trade stream in `useSSE`. A component therefore never sees a wire string. Money and unit prices render with `formatUsd` and quantities and measurements with `formatQuantity` (`src/utils/numberFormat.ts`), so no displayed text depends on how the wire spells a number (tracker decision 71). The cache stores raw wire bodies and every mapper runs outside it. `docs/refactor/api-type-drift.md` records the entry points and the shapes still open.

**Intelligence-map summaries.** `BuyerMap` keeps its canvas across workspace changes, but each active period is a separate market-data lifecycle. A valid response from the current lifecycle can apply if it is not older than the latest successfully applied response, including after a newer request fails. A failure from the latest started request in that lifecycle keeps previously applied data visible and shows the market-data warning. Deactivation invalidates all pending responses.

**ECA zone geometry.** `src/data/eca-zones-web.json` (1.1 MB of web-simplified zone polygons) is emitted as a hashed static asset, not a JS import. `src/data/secaZones.ts` exposes its URL (`?url` import) and `loadEcaZoneCollection()`, which fetches and caches it once. `loadEcaLayers` awaits both the layer code and that data, so `BuyerMap` installs the overlay on `style.load` after first paint and keeps a single failure path (`ecaOverlayError`). Removing the dataset from the bundle cut the intelligence map's first-load JS by about 394 KB gzip; the asset keeps the same geometry and the `/assets/*` immutable cache header.

**On-demand chart libraries.** Recharts is the heaviest workspace dependency and only two chart components use it: `compliance/FuelEuBarChart.tsx` (lazily imported by `ComplianceDashboard`) and `admin/product-analytics/TrendChart.tsx` (lazily imported through `LazyTrendChart`, used by the five analytics tabs). Both lazy boundaries reserve the chart's box (`h-52` / the `height` prop) so the layout does not move while the chunk arrives. Recharts therefore leaves the compliance and admin route chunks' static imports; the checker fails the build if any route statically reaches `vendor-recharts`.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure. Query stores the snapshot under the canonical slice key. `useOrderBookSnapshot` registers the slice's ordinary and forced reads with `registerQueryRefresh`; `snapshotRequests.ts` never lets an older result replace a newer one when reads overlap. One forced resume read covers every freshness signal received while the tab was hidden, and a committed event that arrives during a read costs exactly one further read.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** Only a private trade-stream `reset` with reason `subscriber_overflow` retains the last acknowledged replay cursor. `useSSE` still invalidates affected REST reads and delivers the reset callback before reconnect; other resets, `auth_revoked`, and user, organization, or Market Support scope changes clear the cursor. A connected public orderbook stream owns market recovery, so a private transport reconnect invalidates only private trade history in that case. If the public stream is absent or disconnected, private reconnect retains broad market invalidation and queues one public batch reconciliation for active Query reads and legacy refresh subscribers. Actual private trade events and resets always retain their market invalidation.

**Canonical products.** B30 (`c4cecebc-3d2d-5840-8021-57a9a11bc673`) and B100 (`74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5`) retain scalar biofuel contracts, fixed ISO specifications, whole-fuel CI methods and the 200 MT catalog minimum. UCOME_B100 retains its separate UUID, typed terms, 1 MT minimum and Singapore lane. Scalar biofuel suppliers enter through ASK declarations, not an undeclared direct take of a BID.
**Private order events.** The backend sends `order_created`, `order_updated`, `order_cancelled`, `orders_matched` and `order_expired` only to the private `trades:{org}` stream. `lib/sse/streamManager.ts` subscribes to them there (`services/orderStreamEvents.ts` lists them; `order_outbid` is not listed because the backend never emits it). `readCache.invalidateReadsForEvent` clears only the `orderbook:my` read for them, and the Query invalidation bridge marks only the My Orders query stale (no public read refetches). `TradeNotifier` turns them, and a `reset` or `reconnect`, into one debounced (500 ms) `announceOwnOrdersChanged()`; `useMarketplaceQueries` subscribes while the My Listings tab is open and refetches in place without a spinner; a failed read keeps the visible list. They raise no toast, panel entry or sound, and MyTrades and the Command Center ignore them, so trades and the watchlist are not refetched. Public listings and the order book still refresh from the public `market_invalidated` signal.

**Stream health and server status.** `lib/sse/streamManager.ts` handles the id-less `heartbeat` event (`{status, message, server_time}`) outside the data and control paths: it never reaches the consumer handler, the replay cursor, or read-cache invalidation, and a malformed payload is ignored. Each shared stream (one per public channel and per private scope, however many components subscribe) registers in the module store `services/streamHealth.ts`, and `useSSE` also returns the latest heartbeat; `hooks/useStreamHealth.ts` reads it with `useSyncExternalStore` plus a 5 s tick. Connection is aggregated as any enabled stream open: `live`, `stale` (a heartbeat was seen before but none for 75 s = 2 x 30 s cadence + 15 s margin; never judged if no heartbeat ever arrived), `connecting` (no stream has opened yet on this page; up to 45 s, because a server without the heartbeat sends its first bytes at its 30 s keep-alive), `reconnecting` (an open stream dropped), or `offline` (down past 45 s before the first connection or 30 s after a drop, or the browser is offline). Server status is the worst latest heartbeat (`operational` < `degraded` < `maintenance`); only open streams count while any is open, and remembered heartbeats expire after 5 min. No recent heartbeat means unknown. `layout/StreamStatusIndicator` (header) and `layout/ServerStatusBanner` (below the header, plain-text message, dismissible per status+message for the page session) read the aggregate.

**Server abilities.** `GET /auth/me/abilities` (backend `docs/user-abilities.md`) says which of 23 fixed actions the signed-in account may use and why not. `context/AbilitiesContext` (mounted inside `AuthProvider`) fetches it once per identity and holds a lookup map; `useAbility(id)` returns `{allowed, reasonCode, reason}` or `undefined` while unknown. `undefined` means "do not decide from abilities": a 403 (including a pending password change), network or 5xx failure, a missing route (older backend; not retried), or an unknown `schema_version` all leave the map empty, so every control keeps its previous behavior and no user is blocked by a failed load. The key `abilitiesSubjectKey(user)` covers id, role, organization, approval, email, KYC and password-change fields, so a changed profile refetches and one user's hints never show for another. `AUTH_IDENTITY_CHANGED_EVENT` and `verdaxis:auth-logout` clear the map, drop any in-flight answer, and force a fetch for the next sign-in. Organization, KYC and approval changes made elsewhere have no push event, so window focus or tab visibility refetches at most once per 60 s. Controls read denials through `hooks/useAbilityDenial` (`useAbilityGate`, `useAbilityDenial`, `useAnyAbilityAllowed`): a denied control is `disabled`, carries the reason in `title`, and shows `ui/AbilityDenialNote` where there is room. Reason text is `abilities.reason.<CODE>` in the `common` namespace (en and zh); an unknown code falls back to the server `reason`, then to a generic sentence. Market actions are not evaluated while an assisted Market Support context is active, because the server then judges the supported organization rather than the administrator. Abilities are hints: endpoints stay authoritative, and per-subject rules (order owner, trade party, order state) are not in the payload. No UI exists yet for `deliver_trade`, `pay_trade`, inventory, RFQ, or `amend_order`; the admin ids `view_audit_log`, `view_user_activity`, `manage_subscriptions`, `review_kyc`, `manage_commissions` and `market_support_access` only feed the Admin entry check.

**Trade alerts (sound and browser notifications).** Both are optional and set in Settings > Notifications. Sound is off by default. Browser notifications are on by default once the browser permission is granted, unless the user chose off (stored as an explicit `false`; `null` means no choice). They are stored per user in `localStorage` (`verdaxis_trade_alerts:<userId>`, `services/tradeAlertPreferences.ts`), not as a server preference: the backend accepts only fixed preference namespaces with no extra keys, and both choices describe one device (browser permission is per browser). `TradeNotifier` stays the only owner of the private `trades` stream; it renders inside `BrowserRouter` and passes each event, with its durable SSE id, to `hooks/useTradeAlerts`. Alerts cover `trade_created`, `trade_confirmed`, `trade_declined`, and `trade_auto_matched` (tones: needs action, done, declined; plain Web Audio notes, no files). The private stream also carries `price_alert_triggered` (the backend fired one of the organization's price alerts; payload `alert_id`, `product_id`, `delivery_point_id`, `direction`, `threshold_usd`, `price`, names): `TradeNotifier` shows a toast and a panel entry, `useTradeAlerts` plays the needs-action tone and, for a hidden tab, shows a generic notification that opens `/app/trades?tab=alerts`, and `services/priceAlertEvents.ts` tells an open Trade History alerts tab to reload its list. The event never invalidates market reads and, unlike `trade_created`, needs no server lookup because it goes to the whole organization. `trade_created` reaches both parties and does not name the initiator, so the winning tab asks `GET /trades/my?action_required=true` and alerts only if the trade is awaiting this user; a failed lookup means no alert. Confirmed and declined events also reach the party that caused them and carry no actor. So before MyTrades and the Command Center confirm modal send a confirm or decline, they call `services/ownTradeActions.recordOwnTradeAction(tradeId, event)` (and withdraw it with `forgetOwnTradeAction` when the request fails for certain; an unknown outcome keeps it). The record lives 60 seconds, is shared with the other tabs of the browser over a feature-detected `BroadcastChannel` (`verdaxis-own-trade-actions`; messages hold a trade id and an event name only), and `useTradeAlerts` skips the sound and the browser notification for a matching event. The toast and the panel entry still appear as the record of the event. Not covered: a teammate in another browser still hears the tone, and `trade_auto_matched` for the user's own order is not recorded because the order response carries no trade ids. The shared `AudioContext` is created on the first user gesture (or the Settings click), and every audio failure is silent. A notification is shown only when the tab is hidden and no peer tab claimed as visible; it carries generic localized text (no counterparty, price, or quantity) and a click focuses the tab and opens `/app/trades`. Permission is requested only from a user gesture: the sign-in submit (`LoginPage`, `AcceptInvitationPage`) calls `requestTradeAlertPermissionAtSignIn()` synchronously before any `await`, only while the permission is `default`, never awaits it, and swallows errors; the Settings toggle can still ask when the choice is open. A cookie-restored session never prompts by itself, and a granted or denied choice is never asked again. Safari and Firefox show the browser prompt only after a click, so `notifications/TradeAlertPrompt` (mounted in `Layout`, authenticated pages only) offers a small card, "Turn on notifications" or "Not now", at the bottom-left of the content column: beside the sidebar, under the status banner, clear of the bottom-right toasts and feedback button and the bottom-centre deployment notice. It never takes focus. `hooks/useTradeAlertPrompt` shows it only when the user is signed in, `Notification` exists and its permission is `default`, the user has not turned notifications off, it is not snoozed, no Market Support context is active, and 8 seconds have passed and the sign-in prompt (`whenSignInPromptSettled`) has finished. The turn-on click asks for permission directly; granted shows a brief confirmation (on through the default-on rule), denied hides it for good, and a dismissed prompt counts as "Not now". "Not now" snoozes 7 days; after 3 snoozes the card stops (`promptSnoozes` and `promptSnoozedUntil` live in the same per-user record). Other tabs hide it through `storage` events and a permission re-check on focus and visibility change. A denied or unsupported state leaves notifications off and is explained in Settings. No alert at all while a Market Support context is active. Each event is alerted once: `services/tradeAlertElection.ts` has every tab broadcast a claim (random tab id, visibility, opaque event key) over a feature-detected `BroadcastChannel`, waits 200 ms, and lets a visible tab beat a hidden one, then the lowest tab id; a tab whose key was already decided loses. Web Locks were rejected because a lock cannot rank visibility. Without `BroadcastChannel` each tab decides alone.

**Customizable home.** `/app/home` (`CommandCenter`, buyer and supplier) is a 12-column widget grid. The layout is the `dashboard` preference: `{"version": 1, "widgets": [{id, type, x, y, w, h}]}` (at most 24 widgets; `x` 0-11, `y` 0-199, `w` and `h` 1-12, `x + w <= 12`), validated by the Rust backend (`crud/preferences/dashboard.rs`; the type list `DASHBOARD_WIDGET_TYPES` in `utils/dashboardLayout.ts` must equal its `WIDGET_TYPES`). A user who never saved a layout gets the default, which is today's home exactly: quick actions, trade summary, needs attention, market radar, and for suppliers the demand feed, each full width and stacked. Nine widget types exist. Five are the home sections and are drawn by `CommandCenter` because they share its trade data: `quick_actions`, `trade_summary`, `needs_attention`, `market_radar` (hidden while an administrator acts for another organization), `supplier_demand` (supplier mode only). Four wrap existing views and load on first use (`dashboard/widgets.tsx`, `utils/lazyWithRetry.ts`): `forward_curve` (the full workspace; Forward Curve also stays its own page), `order_book` and `trade_tape` (the slice last opened in Marketplace, read from its `localStorage` selection through `readMarketplaceSlice`; an empty state links to Marketplace when none exists), and `my_trades` (the blotter in its embedded form). No widget adds a data endpoint. Compliance has no widget: its dashboard needs a ledger modal and scenario forms and is not in the sidebar.

`utils/dashboardLayout.ts` holds the model, the defaults, `sanitizeLayout` (drops unknown types, invalid or duplicate widgets and overlaps; a wrong version, or a layout that lost every widget, means the default; an empty list is kept as an empty home) and the editing operations. Rows are sized by content, so `h` is a minimum height of `h x 2.5rem` for the section widgets and an exact height (with inner scrolling) for the four wrapped views. Layouts stay packed and overlap-free (`normalizeLayout`): left and right shift a column, up and down jump over the nearest widget. Row spacing is the cell's bottom padding, which keeps the stacked default at the page's former 1.5rem rhythm. Below `md` the grid is one column in reading order (top to bottom, then left to right) and Customize is not offered. `components/dashboard/DashboardCanvas.tsx` is the grid and the edit mode: Customize, Add widget (picker of types not yet placed; at most one per type), Reset to default, Cancel and Save. Every move, resize and remove control is a named native button (no drag), previews are `inert`, focus returns to the pressed control after a reorder, and a polite live region announces each change. Edits apply to the widgets the current view mode can show.

`hooks/useDashboardLayout.ts` reads the preference through the shared session read of `useServerPreference` (`loadAllPreferences`, `updateCachedPreference`) and saves with `PUT /users/me/preferences/dashboard`. It does not use `useServerPreference` itself: that hook keeps a device-local copy and saves silently after a delay, while a layout needs an explicit Save with a visible result and no local copy that could outlive the server's. The backend namespace exists only in Rust. If the read fails, or the PUT fails (a Python backend after a Caddy rollback answers 404), the page shows the default or the edited layout, keeps edits in memory for the visit, and shows a dismissible, non-blocking notice. The layout is not read or saved while Market Support is active. The stored layout is one per user, not per view mode: a layout saved in supplier mode keeps `supplier_demand`, which buyer mode does not draw. Production builds hide Customize (`dashboardCustomizeEnabled`) until the Rust `dashboard` preference namespace is live in production; staging, local and test builds offer it.

**Staging FAME/catalog.** `UCOME_B100` enters the shared orderbook only when the catalog explicitly enables `ORDERBOOK` execution and delivery-point coverage. Its order terms live in `types/fameOrder.ts` and pass through the standard order API. The earlier supplier offers, RFQs and negotiations are retired: no screen or service calls their routes, and `src/tests/retired-indicative-routes.test.ts` fails if one reappears. `services/fameRfq.ts` and `types/fameRfq.ts`, `types/fameSupplierOffer.ts` keep only the shared declaration types and measurement mapping. This branch does not include the production identified-activity pipeline.

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
                                    staging UCOME B100 order and declaration contracts
  types/lngOrder.ts                 staging Bio-LNG ask, public ask, bid, snapshot
  types/abilities.ts                ability ids, reason codes, action-to-ability maps
  components/
    Layout.tsx                      authenticated shell
    layout/{Sidebar,Header,sidebarConfig}.tsx
    layout/{StreamStatusIndicator,ServerStatusBanner}.tsx  SSE connection indicator and server-status banner
    layout/KycDeadlineBanner.tsx    KYC grace/required/rejected deadline notice
    kyc/KycRequiredNotice.tsx       localized KYC_REQUIRED notice with /kyc link
    Marketplace.tsx                market/listings/orderbook workspace
    OrderBook.tsx                   depth and level interaction
    OrderPlaceModal.tsx             shared BID/ASK entry, including catalog-enabled B100 and Bio-LNG
    ForwardCurveWorkspace.tsx       monitoring matrix, chart, selected-period evidence
    BuyerMap.tsx                    retained authenticated intelligence map
    CommandCenter.tsx               buyer/supplier home views (owns the home sections' data)
    dashboard/DashboardCanvas.tsx   12-column grid and the layout edit mode
    dashboard/widgets.tsx           lazy widgets wrapping Forward Curve, order book, trade tape, my trades
    fame/                           shared UCOME B100 fields and readback
    lng/                            Bio-LNG ask/bid fields and readback
    rfq/                            shared FAME declaration readback
    admin/                          admin and product analytics workspaces
    admin/market-support/           eligible-organization entry
    market-support/                 acting banner and final order confirmation
    public/                         localized public shell and components
  features/marketplace/             Marketplace composition and unchanged presentation components; old component path is a re-export shim
    hooks/                          useMarketplaceSelection, useMarketplaceQueries, useTakeTrade, useCancelOrder
    api/                            Query keys/options and shared-client read/write adapters
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
    context/                          auth, abilities, market support, theme, notifications, tutorial
  services/
    api.ts                          fetch client and response transforms
    authToken.ts                    in-memory access-token generation
    authTabSync.ts                  cross-tab logout, identity-change, and activity events
    readCache.ts                    scoped TTL cache and request deduplication
    fame{Order,Rfq}.ts
                                    staging FAME normalization
    lngOrder.ts                     Bio-LNG normalization without restoring redacted identity
    orderTerms.ts                   applies every product terms layer in one pass
    publicMarketSync.ts             shared market invalidation subscriber
    streamHealth.ts                 SSE heartbeat parsing, stream registry, aggregation
    tradeAlertPreferences.ts        per-user, per-device alert settings in localStorage
    tradeAlertSound.ts              Web Audio tones and the shared AudioContext
    tradeAlertNotifications.ts      Notification permission and display
    tradeAlertElection.ts           cross-tab choice of the one tab that alerts
    priceAlertEvents.ts             in-page signal: a price alert fired (Trade History reloads)
    orderStreamEvents.ts            private order event names and the debounced own-orders refresh signal
    ownTradeActions.ts              own confirm/decline record (60 s, shared across tabs) that silences the tone
    abilities.ts                    abilities response parsing and route-missing check
    analytics.ts                    optional consent-gated Umami adapter
  lib/sse/streamManager.ts           shared public/private transport, replay, token, reconnect and subscriber lifecycle
  hooks/useSSE.ts                    compatible subscription hook for feature and legacy consumers
    hooks/                            workspace readiness, preferences, home layout (useDashboardLayout), media query, trade alerts, stream health, watchlists, ability denials
  utils/marketplaceSelection.ts      persisted Marketplace product/port/window handoff
  utils/dashboardLayout.ts          home layout model, defaults, validation, editing operations
  utils/lazyWithRetry.ts            lazy imports that reload once after a stale chunk
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
| Marketplace presentation/selection | `features/marketplace/components/`, `hooks/useMarketplaceSelection.ts` | `marketplace-structure.test.tsx`, `marketplace-selection.test.tsx`, `marketplace-green-fuels.test.tsx` |
| Feature read contract and lifecycle | `features/{marketplace,orderbook}/api/`, `useMarketplaceQueries.ts`, `lib/query/` | `feature-api-contracts.test.ts`, `feature-query-options.test.ts`, `marketplace-query-lifecycle.test.tsx`, `query-client.test.tsx`, `query-invalidation.test.tsx`, `query-scope.test.tsx` |
| OrderBook depth and clock | `features/orderbook/`, `lib/query/snapshotRequests.ts`, `refreshRegistry.ts` | `orderbook-{structure,interactions,query-lifecycle}.test.tsx`, `snapshot-requests.test.ts`, `snapshot-freshness.test.tsx`, `refresh-lifecycle.test.ts` |
| Take/cancel and external order entry | `useTakeTrade.ts`, `useCancelOrder.ts`, `OrderPlaceModal.tsx`, `api.ts` | `marketplace-mutations.test.tsx`, `query-scope.test.tsx`, product take suites, `order-place-modal*.test.tsx`, `api-*.test.ts` |
| Shared transport and freshness fan-out | `lib/sse/streamManager.ts`, `hooks/useSSE.ts`, `services/publicMarketSync.ts` | `shared-sse.test.tsx`, `use-sse.test.tsx`, `public-market-sync.test.tsx`, `read-cache.test.ts` |
| Integrated journeys and request counts | `scripts/journeys/` | eleven journeys, nine screenshot comparisons, three candidate count samples; `docs/refactor/step8-verification.md` records gate status |
| Forward Curve | `ForwardCurveWorkspace.tsx`, `utils/forwardCurveAxis.ts` | `forward-curve-workspace.test.tsx`, `forward-curve-axis.test.ts` |
| Intelligence Map | `src/components/BuyerMap.tsx` | `src/tests/buyer-map-i18n.test.tsx` |
| Market Support | `MarketSupportContext.tsx`, `types/marketSupport.ts`, `api.ts` | `market-support-*.test.tsx`, `api-market-support-context.test.ts` |
| FAME/catalog | FAME types/services/components and `Marketplace.tsx` | `b100-order-api.test.ts`, `marketplace-b100-take.test.tsx`, FAME component tests |
| Bio-LNG/catalog | LNG types/services/components, `Marketplace.tsx`, `OrderPlaceModal.tsx` | `lng-order-api.test.ts`, `marketplace-biolng-take.test.tsx`, `order-place-modal-biolng.test.tsx`, LNG component tests |
| Stream health | `lib/sse/streamManager.ts`, `useSSE.ts`, `streamHealth.ts`, `useStreamHealth.ts`, `layout/StreamStatusIndicator.tsx`, `layout/ServerStatusBanner.tsx` | `use-sse.test.tsx`, `stream-health.test.ts`, `stream-status-indicator.test.tsx`, `server-status-banner.test.tsx` |
| Trade alerts | `TradeNotifier.tsx`, `useTradeAlerts.ts`, `useTradeAlertSettings.ts`, `useTradeAlertPrompt.ts`, `notifications/TradeAlertPrompt.tsx`, `services/tradeAlert*.ts`, `Settings.tsx` | `use-trade-alerts.test.tsx`, `trade-alert-prompt.test.tsx`, `trade-alert-{settings,election,sound}.test.ts(x)`, `own-trade-actions.test.ts`, `order-stream-events.test.ts`, `trade-notifier.test.tsx`, `trade-history-alerts.test.tsx` |
| Server abilities | `AbilitiesContext.tsx`, `useAbilityDenial.ts`, `services/abilities.ts`, `types/abilities.ts`, `ui/AbilityDenialNote.tsx` | `abilities-parse.test.ts`, `abilities-context.test.tsx`, `abilities-ui.test.tsx`, `abilities-order-modal.test.tsx`, ability cases in `marketplace-green-fuels.test.tsx` |
| Customizable home | `CommandCenter.tsx`, `dashboard/DashboardCanvas.tsx`, `dashboard/widgets.tsx`, `useDashboardLayout.ts`, `utils/dashboardLayout.ts` | `dashboard-layout.test.ts`, `dashboard-customize.test.tsx`, `dashboard-widgets.test.tsx`, `command-center-trades.test.tsx` |
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
