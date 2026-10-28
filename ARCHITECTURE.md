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
- Buyer and Supplier modes share the main destinations. They change the Command Center content and the primary action to BID or ASK. The Command Center is a customizable widget grid (see Customizable home).
- Marketplace owns catalog resolution, product counts, paged listings, orderbook depth, and the user's orders. Forward Curve owns market-period monitoring and selected-slice evidence. It opens Marketplace for order inspection or entry.

## Security and state boundaries

**Authentication.** Access tokens stay in memory. Refresh uses the backend HttpOnly cookie, then `/auth/me` validates the session. Public market reads use an exact GET allowlist; private requests carry the bearer token. `services/authTabSync.ts` shares only a `logout` or `identity_changed` event type over a feature-detected `BroadcastChannel`; a receiving tab runs its local clear without calling `/auth/logout` or re-broadcasting, and an `identity_changed` peer event also blocks silent cookie restore. It also shares user activity, so the 30 minute idle logout in `AuthContext` fires only when no open tab has seen input for the whole timeout: each tab sends an `activity` message (an event type and an epoch-ms timestamp, throttled to one per 30 seconds), and a receiving tab moves its own wall-clock deadline without re-broadcasting. The timer re-checks that deadline when it fires, so a tab that slept does not log out while another tab was active. Without `BroadcastChannel` each tab keeps its own idle timer.

**Market Support.** The admin remains the authenticated principal. The browser persists only an opaque context id. `MarketSupportContext` rehydrates server state and expires it; `api.ts` sends the context header only to the narrow customer route allowlist. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`, while the server eligibility result remains authoritative. Entry requires an approved `REAL` organization and an `ORDER_CREATE`/`ORDER_CANCEL` scope. Both assisted BID and ASK use `OrderPlaceModal` and `MarketSupportFinalConfirmation`. Unsupported mutations and trade execution stay blocked.

**Cached reads.** `readCache.ts` keys private reads by the auth generation, accepted account/organization, and assisted context. Mutations and market stream events invalidate affected keys. Results from an obsolete scope cannot repopulate the cache.

**Intelligence-map summaries.** `BuyerMap` keeps its canvas across workspace changes, but each active period is a separate market-data lifecycle. A valid response from the current lifecycle can apply if it is not older than the latest successfully applied response, including after a newer request fails. A failure from the latest started request in that lifecycle keeps previously applied data visible and shows the market-data warning. Deactivation invalidates all pending responses.

**Orderbook snapshots.** `OrderBook` treats the bids, asks, and server `generated_at` value from one canonical market-slice snapshot as one dated view. It clears that evidence when the slice changes. If refresh fails, it keeps the last depth visible and labels its age and refresh failure.

**Unknown order outcomes.** An intentional retry after `ApiOutcomeUnknownError` reuses the frozen reviewed request and idempotency key, including any Market Support confirmation. It proceeds only while the principal's auth generation and Market Support context match the reviewed execution context.

**Private stream recovery.** Only a private trade-stream `reset` with reason `subscriber_overflow` retains the last acknowledged replay cursor. `useSSE` still invalidates affected REST reads and delivers the reset callback before reconnect; other resets, `auth_revoked`, and user, organization, or Market Support scope changes clear the cursor.

**Stream health and server status.** `useSSE` handles the id-less `heartbeat` event (`{status, message, server_time}`) outside the data and control paths: it never reaches the consumer handler, the replay cursor, or read-cache invalidation, and a malformed payload is ignored. Each enabled stream registers in the module store `services/streamHealth.ts`; `hooks/useStreamHealth.ts` reads it with `useSyncExternalStore` plus a 5 s tick. Connection is aggregated as any enabled stream open: `live`, `stale` (a heartbeat was seen before but none for 75 s = 2 x 30 s cadence + 15 s margin; never judged if no heartbeat ever arrived), `connecting` (no stream has opened yet on this page; up to 45 s, because a server without the heartbeat sends its first bytes at its 30 s keep-alive), `reconnecting` (an open stream dropped), or `offline` (down past 45 s before the first connection or 30 s after a drop, or the browser is offline). Server status is the worst latest heartbeat (`operational` < `degraded` < `maintenance`); only open streams count while any is open, and remembered heartbeats expire after 5 min. No recent heartbeat means unknown. `layout/StreamStatusIndicator` (header) and `layout/ServerStatusBanner` (below the header, plain-text message, dismissible per status+message for the page session) read the aggregate.

**Server abilities.** `GET /auth/me/abilities` (backend `docs/user-abilities.md`) says which of 23 fixed actions the signed-in account may use and why not. `context/AbilitiesContext` (mounted inside `AuthProvider`) fetches it once per identity and holds a lookup map; `useAbility(id)` returns `{allowed, reasonCode, reason}` or `undefined` while unknown. `undefined` means "do not decide from abilities": a 403 (including a pending password change), network or 5xx failure, a missing route (older backend; not retried), or an unknown `schema_version` all leave the map empty, so every control keeps its previous behavior and no user is blocked by a failed load. The key `abilitiesSubjectKey(user)` covers id, role, organization, approval, email, KYC and password-change fields, so a changed profile refetches and one user's hints never show for another. `AUTH_IDENTITY_CHANGED_EVENT` and `verdaxis:auth-logout` clear the map, drop any in-flight answer, and force a fetch for the next sign-in. Organization, KYC and approval changes made elsewhere have no push event, so window focus or tab visibility refetches at most once per 60 s. Controls read denials through `hooks/useAbilityDenial` (`useAbilityGate`, `useAbilityDenial`, `useAnyAbilityAllowed`): a denied control is `disabled`, carries the reason in `title`, and shows `ui/AbilityDenialNote` where there is room. Reason text is `abilities.reason.<CODE>` in the `common` namespace (en and zh); an unknown code falls back to the server `reason`, then to a generic sentence. Market actions are not evaluated while an assisted Market Support context is active, because the server then judges the supported organization rather than the administrator. Abilities are hints: endpoints stay authoritative, and per-subject rules (order owner, trade party, order state) are not in the payload. No UI exists yet for `deliver_trade`, `pay_trade`, inventory, RFQ, or `amend_order`; the admin ids `view_audit_log`, `view_user_activity`, `manage_subscriptions`, `review_kyc`, `manage_commissions` and `market_support_access` only feed the Admin entry check.

**Trade alerts (sound and browser notifications).** Both are optional and set in Settings > Notifications. Sound is off by default. Browser notifications are on by default once the browser permission is granted, unless the user chose off (stored as an explicit `false`; `null` means no choice). They are stored per user in `localStorage` (`verdaxis_trade_alerts:<userId>`, `services/tradeAlertPreferences.ts`), not as a server preference: the backend accepts only fixed preference namespaces with no extra keys, and both choices describe one device (browser permission is per browser). `TradeNotifier` stays the only owner of the private `trades` stream; it renders inside `BrowserRouter` and passes each event, with its durable SSE id, to `hooks/useTradeAlerts`. Alerts cover `trade_created`, `trade_confirmed`, `trade_declined`, and `trade_auto_matched` (tones: needs action, done, declined; plain Web Audio notes, no files). The private stream also carries `price_alert_triggered` (the backend fired one of the organization's price alerts; payload `alert_id`, `product_id`, `delivery_point_id`, `direction`, `threshold_usd`, `price`, names): `TradeNotifier` shows a toast and a panel entry, `useTradeAlerts` plays the needs-action tone and, for a hidden tab, shows a generic notification that opens `/app/trades?tab=alerts`, and `services/priceAlertEvents.ts` tells an open Trade History alerts tab to reload its list. The event never invalidates market reads and, unlike `trade_created`, needs no server lookup because it goes to the whole organization. `trade_created` reaches both parties and does not name the initiator, so the winning tab asks `GET /trades/my?action_required=true` and alerts only if the trade is awaiting this user; a failed lookup means no alert. Confirmed, declined, and auto-matched events also reach the party that caused them and cannot be told apart from the payload, so that party hears the tone too. The shared `AudioContext` is created on the first user gesture (or the Settings click), and every audio failure is silent. A notification is shown only when the tab is hidden and no peer tab claimed as visible; it carries generic localized text (no counterparty, price, or quantity) and a click focuses the tab and opens `/app/trades`. Permission is requested only from a user gesture: the sign-in submit (`LoginPage`, `AcceptInvitationPage`) calls `requestTradeAlertPermissionAtSignIn()` synchronously before any `await`, only while the permission is `default`, never awaits it, and swallows errors; the Settings toggle can still ask when the choice is open. A cookie-restored session never prompts by itself, and a granted or denied choice is never asked again. Safari and Firefox show the browser prompt only after a click, so `notifications/TradeAlertPrompt` (mounted in `Layout`, authenticated pages only) offers a small card, "Turn on notifications" or "Not now", at the bottom-left of the content column: beside the sidebar, under the status banner, clear of the bottom-right toasts and feedback button and the bottom-centre deployment notice. It never takes focus. `hooks/useTradeAlertPrompt` shows it only when the user is signed in, `Notification` exists and its permission is `default`, the user has not turned notifications off, it is not snoozed, no Market Support context is active, and 8 seconds have passed and the sign-in prompt (`whenSignInPromptSettled`) has finished. The turn-on click asks for permission directly; granted shows a brief confirmation (on through the default-on rule), denied hides it for good, and a dismissed prompt counts as "Not now". "Not now" snoozes 7 days; after 3 snoozes the card stops (`promptSnoozes` and `promptSnoozedUntil` live in the same per-user record). Other tabs hide it through `storage` events and a permission re-check on focus and visibility change. A denied or unsupported state leaves notifications off and is explained in Settings. No alert at all while a Market Support context is active. Each event is alerted once: `services/tradeAlertElection.ts` has every tab broadcast a claim (random tab id, visibility, opaque event key) over a feature-detected `BroadcastChannel`, waits 200 ms, and lets a visible tab beat a hidden one, then the lowest tab id; a tab whose key was already decided loses. Web Locks were rejected because a lock cannot rank visibility. Without `BroadcastChannel` each tab decides alone.

**Customizable home.** `/app/home` (`CommandCenter`, buyer and supplier) is a 12-column widget grid. The layout is the `dashboard` preference: `{"version": 1, "widgets": [{id, type, x, y, w, h}]}` (at most 24 widgets; `x` 0-11, `y` 0-199, `w` and `h` 1-12, `x + w <= 12`), validated by the Rust backend (`crud/preferences/dashboard.rs`; the type list `DASHBOARD_WIDGET_TYPES` in `utils/dashboardLayout.ts` must equal its `WIDGET_TYPES`). A user who never saved a layout gets the default, which is today's home exactly: quick actions, trade summary, needs attention, market radar, and for suppliers the demand feed, each full width and stacked. Nine widget types exist. Five are the home sections and are drawn by `CommandCenter` because they share its trade data: `quick_actions`, `trade_summary`, `needs_attention`, `market_radar` (hidden while an administrator acts for another organization), `supplier_demand` (supplier mode only). Four wrap existing views and load on first use (`dashboard/widgets.tsx`, `utils/lazyWithRetry.ts`): `forward_curve` (the full workspace; Forward Curve also stays its own page), `order_book` and `trade_tape` (the slice last opened in Marketplace, read from its `localStorage` selection through `readMarketplaceSlice`; an empty state links to Marketplace when none exists), and `my_trades` (the blotter in its embedded form). No widget adds a data endpoint. Compliance has no widget: its dashboard needs a ledger modal and scenario forms and is not in the sidebar.

`utils/dashboardLayout.ts` holds the model, the defaults, `sanitizeLayout` (drops unknown types, invalid or duplicate widgets and overlaps; a wrong version, or a layout that lost every widget, means the default; an empty list is kept as an empty home) and the editing operations. Rows are sized by content, so `h` is a minimum height of `h x 2.5rem` for the section widgets and an exact height (with inner scrolling) for the four wrapped views. Layouts stay packed and overlap-free (`normalizeLayout`): left and right shift a column, up and down jump over the nearest widget. Row spacing is the cell's bottom padding, which keeps the stacked default at the page's former 1.5rem rhythm. Below `md` the grid is one column in reading order (top to bottom, then left to right) and Customize is not offered. `components/dashboard/DashboardCanvas.tsx` is the grid and the edit mode: Customize, Add widget (picker of types not yet placed; at most one per type), Reset to default, Cancel and Save. Every move, resize and remove control is a named native button (no drag), previews are `inert`, focus returns to the pressed control after a reorder, and a polite live region announces each change. Edits apply to the widgets the current view mode can show.

`hooks/useDashboardLayout.ts` reads the preference through the shared session read of `useServerPreference` (`loadAllPreferences`, `updateCachedPreference`) and saves with `PUT /users/me/preferences/dashboard`. It does not use `useServerPreference` itself: that hook keeps a device-local copy and saves silently after a delay, while a layout needs an explicit Save with a visible result and no local copy that could outlive the server's. The backend namespace exists only in Rust. If the read fails, or the PUT fails (a Python backend after a Caddy rollback answers 404), the page shows the default or the edited layout, keeps edits in memory for the visit, and shows a dismissible, non-blocking notice. The layout is not read or saved while Market Support is active. The stored layout is one per user, not per view mode: a layout saved in supplier mode keeps `supplier_demand`, which buyer mode does not draw. Production builds hide Customize (`dashboardCustomizeEnabled`) until the Rust `dashboard` preference namespace is live in production; staging, local and test builds offer it.

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
    CommandCenter.tsx               buyer/supplier home views (owns the home sections' data)
    dashboard/DashboardCanvas.tsx   12-column grid and the layout edit mode
    dashboard/widgets.tsx           lazy widgets wrapping Forward Curve, order book, trade tape, my trades
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
    tradeAlertPreferences.ts        per-user, per-device alert settings in localStorage
    tradeAlertSound.ts              Web Audio tones and the shared AudioContext
    tradeAlertNotifications.ts      Notification permission and display
    tradeAlertElection.ts           cross-tab choice of the one tab that alerts
    priceAlertEvents.ts             in-page signal: a price alert fired (Trade History reloads)
    abilities.ts                    abilities response parsing and route-missing check
    analytics.ts                    optional consent-gated Umami adapter
  hooks/                            workspace readiness, SSE, preferences, home layout (useDashboardLayout), media query, trade alerts, watchlists, ability denials
  utils/marketplaceSelection.ts      persisted Marketplace product/port/window handoff
  utils/dashboardLayout.ts          home layout model, defaults, validation, editing operations
  utils/lazyWithRetry.ts            lazy imports that reload once after a stale chunk
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
| Trade alerts | `TradeNotifier.tsx`, `useTradeAlerts.ts`, `useTradeAlertSettings.ts`, `useTradeAlertPrompt.ts`, `notifications/TradeAlertPrompt.tsx`, `services/tradeAlert*.ts`, `Settings.tsx` | `use-trade-alerts.test.tsx`, `trade-alert-prompt.test.tsx`, `trade-alert-{settings,election,sound}.test.ts(x)`, `trade-notifier.test.tsx`, `trade-history-alerts.test.tsx` |
| Server abilities | `AbilitiesContext.tsx`, `useAbilityDenial.ts`, `services/abilities.ts`, `types/abilities.ts`, `ui/AbilityDenialNote.tsx` | `abilities-parse.test.ts`, `abilities-context.test.tsx`, `abilities-ui.test.tsx`, `abilities-order-modal.test.tsx`, ability cases in `marketplace-green-fuels.test.tsx` |
| Customizable home | `CommandCenter.tsx`, `dashboard/DashboardCanvas.tsx`, `dashboard/widgets.tsx`, `useDashboardLayout.ts`, `utils/dashboardLayout.ts` | `dashboard-layout.test.ts`, `dashboard-customize.test.tsx`, `dashboard-widgets.test.tsx`, `command-center-trades.test.tsx` |
| Release | workflow and release/artifact scripts | artifact/release guard tests and target builds |

## Run commands

```bash
npm ci --legacy-peer-deps   # Node 24
npm test && npm run typecheck && npm run i18n:check
npm run build:staging && npm run build:check:staging
npm run build:prod && npm run build:check:prod
```

See [README.md](README.md) for the full routine CI sequence and the separation between local checks and live smoke. See [docs/vercel-production-release.md](docs/vercel-production-release.md) for production operations.
