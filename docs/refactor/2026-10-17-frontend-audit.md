# Verdaxis Frontend Audit — 2026-10-17

Read-only audit of `verdaxis-frontend` at `5f3cd698` (branch `refactor/frontend-audit`, worktree `work/phase0-frontend`), supporting decision 61: refactor for code quality with the **same look and behavior**; UX changes are later, separate projects. No application code was changed for this audit.

**Extended for decision 62** ("as performant and maintainable as possible; TS-rust and file/distribution changes allowed"): sections 11-15 were added on 2026-10-17, adding a fresh measured production build (`CALL_EXIT=0`), delivery analysis, native type-checker benchmarks, runtime-render analysis, and a revised architecture/sequence. Sections 1-10 are unchanged except where §15 explicitly revises §9-10.

Scope notes and honesty up front:

- One production build was attempted through `verdaxis-prod-test "$PWD" 'npm ci --legacy-peer-deps && npm run build'`. It **failed** with `CALL_EXIT=1`: `Error: A public VITE_MAPBOX_PUBLIC_TOKEN is required` (`vite.config.ts` build guard; the test host has no Mapbox token). Bundle numbers below come from the committed `dist/` built from `64b75d31` (2026-10-16 02:23, one commit before the `5f3cd698` merge) plus a fresh `git diff --stat 64b75d31..5f3cd698 -- src` check showing only 15 files / +142 −31 changed since (KYC copy, BuyerMap fuel prices, RFQ history), so chunk sizes are representative to within a few KB.
- Dead-export analysis is grep/dependency-order based (`grep -rln` per symbol across `src/` excluding the defining file and tests). I state per-finding how I checked; a symbol I call "unused" has no import outside its own file and tests, but dynamic string-based imports are not possible in this codebase (all imports are static ES modules), so the main residual risk is test-only usage.
- "Prerendered" below means Vite-emitted static HTML, not a server.

---

## 1. Inventory

### Size

| Metric | Value |
|---|---|
| TS/TSX source files (non-test) | 214 (`find src -name '*.ts' -o -name '*.tsx' | grep -v test`) |
| Test files | 128 (102 in `src/tests/`, 26 in `__tests__/` dirs) |
| Non-test source lines | 49,522 |
| Total incl. tests | ~71,380 |
| Commits | 679 total; 227 since 2026-09-01 |

### Routes (`src/App.tsx:530-653`)

- **Auth/onboarding**: `/login`, `/register`, `/invite/:code`, `/verify-email`, `/forgot-password`, `/reset-password`, `/accept-invite`, `/thank-you`, `/onboarding`, `/create-organization`, `/kyc` — wrapped in `BackendRequiredRoute` or `ProtectedRoute` (`src/App.tsx:538-614`).
- **Public** under `/:lang` (`en|zh`) in `PublicLayout` (`src/App.tsx:552-576`): landing, `how-it-works`, `fuels/:sector`, `compliance`, `for-{producers,buyers,traders,financiers}`, `governance`, `pilot`, `partners`, `partners/:slug`, `education`, `education/:slug`, `roadmap`, `tools/energy-calculator`, `map/producers`, `privacy`, `terms`. Legacy unprefixed paths redirect (`src/App.tsx:579-594`); `/partners-preview` stays unprefixed.
- **Authenticated** `/app` under `ProtectedRoute → RequireOrganization → RequireProfile → MobileDesktopGate → DashboardLayout` (`src/App.tsx:616-643`): `home`, `map`, `marketplace`, `rfqs` (redirect), `m/:product/:port/:window`, `curve`, `watchlist`, `analytics`, `trades`, `quotes`, `compliance`, `training`, `settings`, `admin/*`.
- The legacy `Page` enum (`src/types.ts:531`) still names pages for the sidebar, sessionStorage restore, and the `data-dashboard-page` smoke contract; `PAGE_SLUGS` maps them to slugs. `pathToPage`/`pageToPath` in `App.tsx:240-262` do the URL↔Page translation.

### Components / contexts / hooks / services / utils

- 35 top-level components in `src/components/` plus 16 subdirectories (`admin/`, `compliance/`, `fame/`, `fleet/`, `kyc/`, `layout/`, `lng/`, `map/`, `market-support/`, `notifications/`, `public/`, `rfq/`, `supplier/`, `trading/`, `ui/`, `watchlist/`).
- 5 contexts: `AuthContext` (384 lines), `MarketSupportContext` (248), `NotificationContext` (~110), `ThemeContext` (61), `TutorialContext` (79). No Copilot context — removed per code comments (`src/App.tsx:7`, `src/components/Layout.tsx:13,94`).
- 8 hooks: `useSSE`, `useWatchlist`, `useServerPreference`, `useNamespace`, `usePublicMarketRefresh`, `useDashboardContentReady`, `useLocalePath`, `useProductAnalyticsFilters`.
- Services: `api.ts` (1,549 lines, 23 resource groups), `authToken.ts`, `readCache.ts`, `backendAvailability.ts`, `config.ts`, `analytics.ts`, `cookiePreferences.ts`, `fame{Order,Rfq,SupplierOffer}.ts`, `lngOrder.ts`, `orderTerms.ts`, `marketSupportContextStore.ts`, `publicMarketSync.ts`, plus vestigial `ai.ts` (1-line re-export, unused — §3).
- 21 util modules (`src/utils/`), notably `availabilityWindow.ts`, `marketProduct.ts`, `sliceUrl.ts`, `fuel.ts`, `forwardCurveAxis.ts`.
- Static data: `src/data.ts` (518 lines, hardcoded `PORTS` with fake price history used as fallback/autocomplete source) and `src/data/` (producer projects 327 lines, ECA zones 1.1 MB JSON, education articles, fuel prices, calculator defaults).

### Prerendering

`vite.config.ts` ships a custom `staticRouteMetadataPlugin` that SSR-loads `src/prerender/renderPublicRoute.tsx` and emits localized static HTML for every `INDEXABLE_PUBLIC_PATHS` entry (`src/routeMetadata.ts:329`): 26 pages × 2 languages = **52 prerendered `index.html` files** plus the SPA root (verified: `find dist -name index.html | wc -l` → 53). Staging mode additionally writes `robots.txt: Disallow: /` and deletes the sitemap (`vite.config.ts` `writeBundle`). The prerendered shell uses `createRoot` replacement, not hydration (`ARCHITECTURE.md` "Phase 0 public and release convergence").

### Config and environments

- `VITE_API_URL` is the only transport knob; `src/services/config.ts` throws for release builds without it. `vite.config.ts:16-31` (`validateReleaseApiUrl`) pins production to `https://api.verdaxis.exchange/api` and staging to the staging API, refusing any other value, so a wrong env cannot be baked in.
- Other env: `VITE_MAPBOX_PUBLIC_TOKEN` (required for builds, `vite.config.ts:126-128`), optional Umami pair (`src/services/analytics.ts:271-272`), `DEV_API_PROXY_TARGET` for the dev proxy.
- There is **no canary build config**. Canary is a *release* concept: `scripts/release-vercel.sh:393-397` aliases a Vercel candidate to `canary.verdaxis.exchange`, runs smoke against it, then promotes. `import.meta.env.MODE` distinguishes staging for robots metadata only (`src/components/RouteMetadata.tsx:75`).

---

## 2. Hot spots (25 largest non-test files)

| # | File | Lines | What it is / why it is large |
|---|---|---|---|
| 1 | `src/components/Marketplace.tsx` | 2,314 | The core trading screen. 103 hook calls (39 `useState`), 6 `useEffect` clusters for listings/counts/visibility, inline URL↔state slice sync, compliance overlays, FAME/LNG terms branches, take-trade modal state machine (`tradeState`: idle/submitting/success/outcome_unknown/error), cancel flow with etag+idempotency, analytics, watchlist toggles, pagination, column renderer (`renderCell`). Data fetching, business rules (KYC, demo blocking, terms validation, catalog gating) and rendering all in one component. |
| 2 | `src/components/OrderPlaceModal.tsx` | 1,605 | Shared BID/ASK entry. Owns form state for every product family (scalar, FAME, Bio-LNG), review/submit/auto-matched/outcome-unknown states, Market Support confirmation, KYC gating, supplier-offer edit mode, idempotency retry with frozen request (`request.payload as any` at :668). |
| 3 | `src/services/api.ts` | 1,549 | Hand-written fetch client: transport (timeouts, refresh, market-support header policy, outcome classification), read cache integration, 23 resource groups, and response mappers (`mapPortResponse`, `mapProductUsageResponse`, `mapOrderbookTermsResponse`…). 88 repeated `searchParams.append` blocks; two request styles coexist (`fetchApi` vs raw `fetchWithTimeout+handleResponse`). |
| 4 | `src/components/ForwardCurveWorkspace.tsx` | 1,293 | Monitoring matrix + custom SVG chart (`utils/forwardCurveAxis`), selected-slice evidence panel, its own refresh/visibility lifecycle, localStorage selection persistence, tooltip portal. 38 hook calls. |
| 5 | `src/components/BuyerMap.tsx` | 1,262 | Mapbox intelligence map, kept mounted across navigation. 72 hook calls, 15 `useEffect`s, market-data lifecycle epochs (`marketLifecycleEpochRef`), three `map.on(...)` popup builders that assemble HTML by string concatenation with inline styles (:672-:724), ECA layers, vessel layer, language-reactive popup rebuild. |
| 6 | `src/components/admin/AdminDashboard.tsx` | 1,146 | Users/review queue/invitations/market-support entry + product analytics. 33 `useState`. |
| 7 | `src/pages/public/EnergyCalculatorPage.tsx` | 1,074 | Self-contained marketing calculator; defines 6 local sub-components inside one file. |
| 8 | `src/types.ts` | 1,066 | All hand-written API + UI types (§4). |
| 9 | `src/pages/public/PartnerLandingPage.tsx` | 974 | Long static marketing page. |
| 10 | `src/pages/public/ProducerMapPage.tsx` | 865 | Leaflet producer map; a second map stack (§3). |
| 11 | `src/pages/public/LandingPage.tsx` | 839 | Landing; GSAP + Lenis animation wiring duplicated with `HeroSection`. |
| 12 | `src/components/compliance/ComplianceDashboard.tsx` | 699 | FuelEU/ETS scenario modeler: fleet list, scenario POST, chart, localized number formatting. |
| 13 | `src/App.tsx` | 684 | Providers, guard chain, all lazy routes, page↔URL mapping, navigation metrics, dashboard outlet context. |
| 14 | `src/pages/public/RoadmapPage.tsx` | 677 | Static. |
| 15 | `src/pages/public/PartnerShowcasePage.tsx` | 669 | Static. |
| 16 | `src/pages/public/FuelCoveragePage.tsx` | 658 | Static. |
| 17 | `src/components/GuidedTutorial.tsx` | 634 | react-joyride tour config + placement logic. |
| 18 | `src/pages/public/PilotPage.tsx` | 625 | Static form page. |
| 19 | `src/components/OrderBook.tsx` | 621 | Depth ladder. Hand-rolled request dedup (`requestsInFlight` Map keyed by JSON scope, Symbol tokens), 10 s polling, 1 s clock tick, crossed-market computation (`getLivePriceCrossState`), portal tooltip. |
| 20 | `src/components/map/MarketWatchTicker.tsx` | 610 | Auto-scrolling watch widget with server-backed preferences, demo/real status rows, its own ports/prices fetch. |
| 21 | `src/components/MyTrades.tsx` | 602 | Action-required trades + confirm/decline retry with frozen idempotent request; reused as `SupplierQuotes` via re-export (`SupplierQuotes.tsx:2`). |
| 22 | `src/pages/public/GovernancePage.tsx` | 600 | Static. |
| 23 | `src/components/TradeHistoryPage.tsx` | 578 | Performance analytics over trade history + embedded `MyTrades` blotter. |
| 24 | `src/pages/CreateOrganizationPage.tsx` | 548 | Organization creation form with direct `fetch` (:310, :348). |
| 25 | `src/data.ts` | 518 | Hardcoded `PORTS` (fake price history), `COURSES`, supplier/trace fixtures. |

**Pattern:** every authenticated workspace component re-implements the same three layers — request lifecycle (dedup + stale-drop), business rules (KYC/demo/provenance gating), and presentation — inline. The request-lifecycle layer alone accounts for roughly 15-25 % of each hot-spot file (e.g. `Marketplace.tsx:442-570`, `OrderBook.tsx:115-230`, `BuyerMap.tsx:220-280`, `MyTrades.tsx:150-260`).

---

## 3. Duplication and dead code

### Repeated logic (each with counts of independent copies)

1. **Stale-response guards / request identity.** Three competing idioms: `let cancelled = false` closures (16 files), generation counters in refs (`loadGeneration`, `requestGeneration`, epoch refs — 23 sites), and Symbol-token Maps (`Marketplace.tsx:186-189,454-490`, `OrderBook.tsx:115-160`, `TradeTape.tsx:88`, `MyTrades.tsx:192`). Every one is hand-written and subtly different; this is the single largest duplication and the most bug-prone.
2. **Polling + visibility refresh.** `setInterval` + `document.hidden` + `visibilitychange` listener blocks are copy-pasted in `Marketplace.tsx:557-570`, `OrderBook.tsx:218-235`, `ForwardCurveWorkspace.tsx:915-923`, `BuyerMap.tsx:270-277`, `TradeTape.tsx:139-146`, `SupplierDemandFeed.tsx:48`, `MatchSuggestions.tsx:34`, `NewsFeed.tsx:76`, `NotificationContext.tsx:80`, plus 1-second `setClock`/`setNow` tickers in `OrderBook.tsx:252`, `SupplierOffersWorkspace.tsx:50`, `FameRfqWorkspace.tsx:145` (14 `visibilitychange` registrations total).
3. **Currency/quantity formatting.** `formatPrice`/`formatUsd`/`formatMoney`-alikes defined independently in `OrderBook.tsx:81`, `PriceTicker.tsx:14`, `BenchmarkPriceBlock.tsx:13`, `ForwardCurveWorkspace.tsx:684`, `MarketWatchTicker.tsx:65`; 31 raw `toFixed(...)` currency template literals across components (e.g. `BuyerMap.tsx:672,716-717,724,736-737,1082`; `SupplierDemandFeed.tsx:105`; `TradeHistoryPage.tsx:143,233-236`). Locale handling differs per copy (`en` default, `undefined`, `'en-US'`).
4. **Number-parsing of string decimals.** The documented gotcha is handled ad hoc: 89 `Number(...)` wraps in components and 16 `: any` params in `api.ts` mappers rather than one `decimal → number` boundary in the API layer.
5. **Auth header / direct `fetch` in pages.** 30+ direct `fetch(`${API_URL}/...`) ` calls outside the API client — every auth page (`LoginPage.tsx:59`, `RegisterPage.tsx:73,109`, `ResetPasswordPage.tsx:51`, `ForgotPasswordPage.tsx:23`, `VerifyEmailPage.tsx:37,59`, `AcceptInvitationPage.tsx:97,140`, `ForcePasswordChangePage.tsx:37`, `CreateOrganizationPage.tsx:310,348`, `OnboardingPage.tsx:39`, `KycPage.tsx:38`, `InvitePage.tsx:26`), plus `Settings.tsx:155`, `ReferralsTab.tsx:63,68,85`, `AuthContext.tsx:119,197,244,270,297`, `useSSE.ts:39,54`. Each re-implements timeout, error parsing, and `credentials: 'include'` slightly differently; none get the read cache, 429 toast, or backend-unavailable classification that `fetchApi` provides.
6. **`URLSearchParams` request builders.** 88 near-identical `if (params?.x) searchParams.append(...)` blocks in `api.ts`; a `buildQuery` helper would remove ~300 lines.
7. **`escapeHtml`.** Two independent implementations (`src/routeMetadata.ts:388`, `src/components/BuyerMap.tsx:71`) used for HTML-string popups.
8. **Chart/map setup.** Mapbox in `BuyerMap.tsx:498` vs Leaflet in `ProducerMapPage.tsx:649` (two map stacks, two tile systems, two popup systems); Recharts in `ComplianceDashboard`/`TrendChart` vs lightweight-charts in `utils/curveChart.ts` (two chart stacks for one product).
9. **Error/loading state triples.** `const [loading, setLoading]` in 14 components; 129 `setLoading/setError/loadError` references — again per-component rather than per-query.

### Dead / unused (how checked: `grep -rln '<symbol>' src --include=*.ts* ` excluding the defining file and `*test*`; then confirming no dynamic `import()` references the module)

| Item | Evidence |
|---|---|
| `src/components/MatchSuggestions.tsx` (143 lines) + `api.matchmaking` group (`api.ts:1194-1205`) | No import of `MatchSuggestions` anywhere outside itself/tests; `api.matchmaking.suggestions`/`dismiss` referenced only from that file. Backend still ships `/matchmaking`. |
| `src/services/ai.ts` (re-export of `ai-engine/generators.analyzeRisk`) | `analyzeRisk` has no callers; only `ai.ts` imports the engine. Copilot UI already removed. |
| `api.orderbook.listWithCI` (`api.ts:905`) and the `OrderBookOrderWithCI` type (`types.ts:472`) | No component or test reference. |
| `api.demand.signals`, `api.producers.list`, `api.availability.list` | grep shows no callers in components; only `api.ts` defines them. (Backend routes exist.) **Unsure**: `MatchSuggestions`-adjacent feeds may have used these historically; verify before deleting. |
| `TERMINAL` page in `smoke_navigation.py` | `scripts/smoke_navigation.py:52,55-58,182-184` still navigates to `TERMINAL`, but `grep "'TERMINAL'" src` returns nothing — the view was archived (per CLAUDE.md note) and the smoke script's readiness selectors can never match, so those transitions presumably time out or are silently skipped today. |
| `@types/react-grid-layout` dependency | `react-grid-layout` is imported nowhere; only its types are declared in `package.json:32`. |
| `@studio-freight/lenis` dependency | Deprecated alias; actual import is `lenis` (`PublicLayout.tsx:3`). npm warns on every install (seen in the build log). |
| `vendor-clsx` manual chunk (`vite.config.ts:151`) | `clsx` is a transitive dep, imported once (`NotificationList.tsx:8`) — a dedicated 4 KB chunk + modulepreload on every public page for one import. |
| `DASHBOARD_PAGES`/`sanitizeDashboardPage` legacy values (`App.tsx:198-222`) | Still sanitizes `ORDERBOOK`, `INVENTORY`, `DEMAND_FEED`, `RFQS` Page values that no longer have routes — harmless but is the residue of the old enum-driven router. |
| Mock vessel voyage data (`api.ts:683-710`) | Hardcoded fake itineraries keyed by IMO in the API layer, with a `console.warn` "not strictly implemented in backend yet" (:713). |

---

## 4. API layer and types

### Transport (`src/services/api.ts`)

- `fetchApi` (:274-373) is the core: merges auth header, applies market-support policy (allowlists at :89-124), 15 s read / 30 s mutation timeout via `AbortController` (:232-259), single 401 refresh-and-retry (:331-357), auth-generation race checks (:319, :369), 429 global toast event (:192-199), backend-unavailable classification (:359). Retries: **only** the 401 token refresh — no network/5xx retry for reads.
- Mutations go through `mutateApi` (:401-408): invalidate cache → request → invalidate again. Network/5xx mutation failures become `ApiOutcomeUnknownError` (:266-271), which UIs pair with frozen idempotency keys for intentional retry (`Marketplace.tsx:1138-1160`, `MyTrades.tsx:192`, `OrderPlaceModal.tsx` review flow). This is a thoughtful, correct pattern — but it exists only in the client core; the 30+ direct `fetch` calls listed in §3.5 get none of it.
- Reads go through `readApi` → `readCache.ts` (TTLs 9 s orderbook snapshot / 15 s market / 5 min reference / 10 s private; max 64 entries; private scope keyed by auth generation + user + org + support context). SSE events invalidate prefixes (`invalidateReadsForEvent`, `readCache.ts:62-100`).
- Loading states are not a client concern — every component owns `loading/refreshing/error` state (14 components), which is where most divergence lives.
- Snake→camel conversion is **not systematic**: catalog/orderbook/trade responses are mapped ad hoc (`mapPortResponse`, `mapOrderbookTermsResponse`, inline `(v: any) =>` lambdas like `vessels.list` :694, `inventory.list` :763); most types remain snake_case on the wire and in the frontend types.

### `src/types.ts` vs backend Pydantic (sampled against `work/phase0-build/app/schemas/*.py`)

Overall the important types track the backend closely (field names and enum values match). Concrete mismatches found:

1. **`AvailabilityWindow` union is stale.** Frontend: `'Spot' | 'Q1 2025' | … | 'Forward 2030'` display labels (`types.ts:175`). Backend canonical codes are `SPOT | YYYY-MM | YYYY-QN | YYYY-CAL` (`app/services/availability_windows.py:59-73`), with legacy aliases accepted on input only. The frontend type is the *display* vocabulary; wire values arrive as canonical codes and are normalized at display boundaries (`types.ts:364` comment admits "Canonical API code; legacy labels are normalized at display boundaries"). Type-level, `Marketplace` sets state with `initialSlice.window as AvailabilityWindow` (`App.tsx:416`) — a cast that can inject canonical codes into a display-label union. Real drift risk each quarter.
2. **`User.email_verified` does not exist on `UserResponse`** (`app/schemas/user.py:41-57` — no such field; email_verified appears only in stream-token claims, `auth_simple.py:94`). Frontend declares it optional (`AuthContext.tsx:26`) — always `undefined` from `/auth/me`. Harmless but misleading.
3. **`User.referral_code` missing** on the frontend type (backend `UserResponse` includes it, `user.py:50`); the referral tab re-fetches it separately (`ReferralsTab.tsx`).
4. **`OrderBookOrder` drift.** Backend `OrderResponse` (`orderbook.py:219-250`) always sends `terms_digest`, `version`, `source_kind`, `scope`, `demo_status`, `unknown_count`, `market_product`; frontend marks `terms_digest?`, `version?`, `market_product?` optional and **omits `unknown_count` entirely** (`types.ts:279-331`). `OrderMyResponse` extras (`organization_id`, `trade_count`, `creation_method`, `etag`, `updated_at`) are folded into the same frontend interface as optionals rather than an owner-view subtype — so "my view" fields are indistinguishable from public ones. `vessel_id` is present on backend `OrderCreate` (:153) but absent from frontend `OrderCreateInput` (`types.ts:240-266`); conversely frontend sends `delivery_window_start/end`, `is_anonymous` freely while backend pins `is_anonymous: Literal[True]` (:161) and has no delivery-window fields on create.
5. **`TradeResponse` extras not modeled:** backend returns `source_kind`, `scope`, `demo_status`, `unknown_count` on trades (`orderbook.py:334-376`); frontend `Trade` (`types.ts:344-382`) has none of them. `commission_rate_pct` is `Decimal` (string on the wire) but typed `string | number` — handled at call sites with `Number()`, per the global gotcha.
6. **`PriceSummary` field order/optionality differs slightly** but is semantically aligned (`types.ts:431-455` vs `orderbook.py:486-511`); frontend lacks `product_name`. Acceptable.
7. **Decimal-as-string everywhere.** Backend `Decimal` fields serialize as JSON strings; frontend types say `number` (`quantity_mt`, `price_per_mt_usd`, `min_price`, …). The codebase compensates with defensive `Number(...)` (89 sites) and comments ("API decimal fields can arrive as strings despite the frontend order type", `OrderBook.tsx:36`). This is the single largest type-truth gap and the root cause of an entire class of defensive code.

An `openapi.json` snapshot (145 paths, 249 schemas) sits at the repo root, last touched **2026-07-23** — three months stale relative to B100/LNG/catalog work, so it cannot currently serve as a generation source without regeneration.

### Type-safety counts (non-test source)

| Metric | Count | How measured |
|---|---|---|
| `any` usages (`: any`, `as any`, `<any>`, `any[]`) | 79 across 14 files (16 in `api.ts`, 10 `as any`) | grep |
| `as X` casts (capitalized) | 188 | grep |
| Non-null assertions (`!`.) | 43 | grep (approximate; pattern `!\.`) |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** | grep |
| `catch (err: any)` | 8 | grep |

**`tsconfig.json` has no `strict`** (no `strict`, `noImplicitAny`, `strictNullChecks` — `tsconfig.json` compilerOptions). Turning on strict mode is the highest-leverage single type-safety change and also the most expensive to retrofit; the 188 casts and 43 assertions are the visible debt of non-strict defaults.

---

## 5. State and data flow

- **Context sprawl is moderate, not severe.** Five contexts; only `Auth` and `MarketSupport` carry real logic; `Theme`/`Tutorial`/`Toast` are small. The heavier smell is *module-level* state used as a parallel store: `authToken.ts` (token + generation), `readCache.ts` (cache + principal), `marketSupportContextStore.ts`, `publicMarketSync.ts` (subscriber registry) — all singleton objects with window events as the change-notification mechanism (`verdaxis:auth-logout`, `verdaxis:rate-limited`, `verdaxis:market-support-context-invalidated`, `AUTH_IDENTITY_CHANGED_EVENT`, `BACKEND_UNAVAILABLE_EVENT`). This is effectively an event-bus architecture layered under React; it works, but every consumer must remember both the hook *and* the event.
- **Prop drilling is limited** to the dashboard outlet context (`viewMode`, `onNavigate`, `onOpenSlice`) and two-prop callbacks into workspaces; acceptable.
- **Caching/refetching:** good primitives (`readCache` TTL + dedup + scoped principals; SSE-driven invalidation; `publicMarketSync` debounced fan-out with dirty re-run, `publicMarketSync.ts:16-46`). But every workspace then wraps reads in its own interval + visibility + dedup + stale-drop code (§3.2), and some poll regardless of SSE (OrderBook 10 s, Marketplace 60 s, TradeTape/SupplierDemandFeed/NotificationContext 30 s). Result: the same `orderbook:` keys can be hit by poll, SSE invalidation, and visibility resume within one second.
- **SSE/live updates:** `useSSE` (:1-239) is well-built — stream tokens for the private `trades` channel with 401-aware token refresh, exponential backoff with jitter, `lastEventId` replay cursor with careful scope rules (subscriber-overflow reset preserves the cursor; auth/scope changes clear it, :122-156). Four consumers mount up to **three simultaneous `trades` connections** when a trade lands (`TradeNotifier`, `CommandCenter`, `MyTrades` all call `useSSE('trades', …)`) — each is a separate `EventSource` because the hook owns its source. The public `prices` channel exists in the backend (`stream.py:270`) but has **zero frontend subscribers**; price updates reach the UI only through the `orderbook` channel's cache invalidation.
- **Race conditions on unmount:** taken seriously — generation counters, epoch refs, and Symbol tokens (§3.1) plus `authGeneration` checks in the client. I found no obvious unhandled-write-after-unmount bug in the hot spots, but the patterns are hand-rolled per component, so correctness rests on each copy being right (e.g. `OrderBook`'s `requestId < latestAppliedRequest.current` ordering rule, `OrderBook.tsx:151-153`, is exactly the kind of invariant that gets lost in a refactor without tests pinning it).

---

## 6. Quality and safety

- **Token storage:** access token in memory only (`authToken.ts` module variable); refresh via HttpOnly cookie with `credentials: 'include'`; legacy localStorage tokens actively purged (:26-30). Idle logout 30 min (`AuthContext.tsx:76`), proactive refresh 5 min before expiry (:77). This is a good design. One caveat: `smoke_navigation.py:156` puts the access token in the URL (`/app?token=…`) for token-mode smoke runs — README already prefers credentials for live runs; keep it that way.
- **XSS:** zero `dangerouslySetInnerHTML` and zero `.innerHTML` assignments in app code (grep). The residual surface is Mapbox `Popup.setHTML` with string-concatenated markup in `BuyerMap.tsx` (:672-724, :785-787, :938-951) and Leaflet in `ProducerMapPage`; all interpolations pass through the local `escapeHtml` (:71), so this is currently safe but fragile — one forgotten escape in a future popup edit is an injection. React-side rendering is safe by construction.
- **i18n:** en/zh key parity is **perfect** (scripted comparison: 12 namespaces, 0 missing in either direction, 4,244 keys total) and CI enforces it (`i18n:check`). Gaps are structural, not coverage: 75 components call `useTranslation` directly while 45 use the readiness-aware `useNamespace` wrapper (which guards flash-of-untranslated-content); BuyerMap popup strings translate via a manual `translateRef` (:674) rather than hooks.
- **Accessibility:** better than typical for this age — 336 aria/role attributes, 118 `aria-label`s, keyboard handlers on orderbook rows (`OrderBook.tsx:410-425` roles/`tabIndex`/Enter/Space), a full combobox implementation in `VerdaxisSelect` (:165-190). Weak spots: only 17 `htmlFor`/`<label>` pairs for 75 inputs; 8 `<img>` without `alt` (logo images, e.g. `Sidebar.tsx:69`, `PublicNav.tsx:144`); focus management in modals is manual and uneven; `data-tour` serves as the interaction contract for smoke, not aria.
- **Error boundaries:** one class component (`ErrorBoundary.tsx`) wrapping the app root and each dashboard scope with per-scope `key` reset (`App.tsx:391,404`); chunk-reload recovery on stale deploys (`App.tsx:42-63`). Good. No boundary around the public layout subtree specifically, and no error-capture service beyond the consent-gated Umami reliability events.
- **Console noise:** 54 `console.warn/error` in non-test source (acceptable as failure breadcrumbs) and **0 stray `console.log`** — clean.

---

## 7. Tests

**Coverage:** 128 Vitest files, ~720 `it()` cases, jsdom + RTL. Strong on: routing/guards (`app-routing`, 41 cases), marketplace contracts incl. B100/Bio-LNG lanes and demo blocking (`marketplace-green-fuels`, 48), order modal (37 incl. assisted-mode, double-submit, KYC), auth race/refresh (`api-auth-race`, `auth-refresh`, `auth-context`), SSE semantics (`use-sse`), read cache, market support, i18n parity smoke (`authenticated-i18n-contracts`), forward curve axis math, navigation performance contract, and Phase 0 pinned-bundle cutover checks (`phase0-cutover`, `phase0-api-contract`). Tests favor roles/labels (495 `getByRole`/`getByLabelText` vs 392 `getByText`, 72 `querySelector` — mostly Map/jsdom workarounds).

**Not covered / weakly covered:**

1. **No real browser test of a full user journey.** The Playwright/Python navigation smoke (`scripts/smoke_navigation.py`, 450 lines) only measures sidebar navigation timing between MAP / MARKETPLACE / (dead) TERMINAL with readiness selectors — and its TERMINAL selectors reference a page that no longer exists (§3). It does not exercise login (credential mode only authenticates to *reach* `/app`), filtering, order placement, or trade transitions. The phase0 gate scripts (`scripts/phase0_gate*.py`) do drive real browser bundles against a real backend for profile/trade/KYC screens — the strongest safety net that exists — but they are Phase 0 cutover tools pinned to specific fixtures, not a refactor regression suite.
2. **Login journey:** `login-page.test.tsx` has 2 cases (profile passthrough, zh fallback) — no wrong-password/locked/outage UI assertions beyond unit level.
3. **Order book browse & filter:** component-level tests exist (`orderbook-cross-state`, `orderbook-interactions`) but no test walks the filter → paginate → deep-link-slice → URL-sync loop that `Marketplace.tsx:605-660` implements.
4. **Place BID/ASK:** modal tests are thorough for validation and assisted mode, but the *success path to orderbook state change* (snapshot invalidation, My Listings refresh) is only mocked, never asserted end-to-end.
5. **Trade hit → confirm → deliver → pay:** `my-trades.test.tsx` covers confirm/decline retry semantics well; **deliver/pay payloads and their UI are untested** (no `deliver`/`pay` test file; grep finds none).
6. **Notifications:** `notification-context` tests the store; no test of `NotificationBell`/list rendering or unread-count flow.
7. **Map:** `buyer-map-*` tests cover i18n, lifecycle, ECA bootstrap/failure — the deepest component test group — but nothing renders actual Mapbox (impossible in jsdom); popup content and port-click → marketplace handoff are untested.
8. **Bundle/build:** `check-build-artifacts.mjs` self-tests + `test:release-smoke`/`test_smoke_release.py` cover release helpers, but no test pins *bundle size* or chunk regressions.

---

## 8. Build and bundle

Measured from the committed `dist/` (built from `64b75d31`; see caveat at top): **142 JS chunks + 3 CSS, 6.2 MB assets total (9.3 MB with HTML/images)**. Top chunks by gzip:

| Chunk | gz | Notes |
|---|---|---|
| `vendor-mapbox` | **507 KB** | manualChunks; loaded by BuyerMap |
| `addEcaLayers` | **394 KB** | 1.1 MB ECA-zone GeoJSON (`src/data/eca-zones-web.json`) imported statically into the map chunk — effectively a second map-sized payload |
| `index` (main) | 189 KB | all providers + eagerly-composed pieces |
| `vendor-recharts` | 105 KB | |
| `HeroSection` | 47 KB | GSAP on the landing |
| `use-in-view` | 38 KB | motion (framer) shared chunk |
| `vendor-leaflet` | 44 KB | second map stack, public producer map only |
| `Marketplace` | 31 KB | correctly lazy |
| `vendor-i18n` | 21 KB | |

Code splitting is already good: every route and workspace is `lazyWithRetry`-loaded with a deploy-safe chunk reload (`App.tsx:47-63`), vendors are manual-chunked, and i18n namespaces load per-namespace. The two real weights are **mapbox + ECA GeoJSON ≈ 900 KB gz combined** and the double map/chart stacks. The ECA GeoJSON could move behind a fetch or be simplified (it renders zone outlines); mapbox-gl 3 itself is irreducible while the intelligence map exists. `clsx`'s dedicated chunk and `@studio-freight/lenis`/`@types/react-grid-layout` deps are small but free wins (§3). 8 npm audit vulnerabilities (2 moderate, 6 high — transitive; flagged in the build log, not analyzed here).

---

## 9. Target architecture options

Constraint that dominates the choice: **same look, same behavior, incremental, shippable through the existing canary+smoke release path.** Any option must let pages move one at a time without a rewrite freeze.

### Option A — Feature folders + generated API types + TanStack Query (recommended)

- **Structure:** `src/features/<marketplace|orderbook|curve|map|trades|compliance|admin|public>/{components,hooks,api}` over today's type/role split; `src/lib/` for the shared client; keep `ui/` as the primitive layer.
- **API layer:** types generated from a regenerated backend OpenAPI spec (`openapi-orval`/`openapi-typescript` + a thin hand-written client that keeps the existing *good* transport semantics: market-support allowlists, idempotency/`ApiOutcomeUnknownError`, public-read credential policy — these are product rules, not boilerplate, and must survive generation). Decimals normalized to `number` at one mapper boundary, killing the 89 `Number()` sites.
- **Server state:** TanStack Query replaces readCache + the per-component polling/dedup/stale-drop code. `useQuery` with `refetchInterval`, `refetchOnWindowFocus`, and query-key invalidation on SSE events (a small `useSSE → queryClient.invalidateQueries` bridge preserves today's event-driven freshness). Mutations with retry-safe idempotency map naturally to `useMutation`.
- **Look preserved:** rendering code moves mostly untouched; Tailwind classes and DOM structure are not touched by the data-layer swap.
- **Trade-offs:** +1 dependency (~13 KB gz) and a real learning curve; Query's defaults must be tuned to not *increase* request volume (the current SSE-driven invalidation must stay authoritative); the generated types need a CI freshness check so drift fails the build instead of leaking.

### Option B — Feature folders + generated types, plain hooks (no new library)

- Keep a hand-rolled `useResource(queryKey, fetcher, { ttl, invalidateOn })` hook backed by the existing `readCache`, extracted so the 14 hand-written lifecycles collapse into one tested implementation.
- **Trade-offs:** zero new deps and total control (attractive given the market-support/scope rules), but you re-implement devtools, retry, focus refetch, and cache debugging that Query gives free; history says the third copy of a hand-rolled hook is where bugs start. Reasonable only if the team is firmly anti-dependency.

### Option C — Full re-architecture (Redux Toolkit/RTK Query or SSR framework)

- **Not recommended.** The app's problems are duplication and type truth, not state-management scale (5 small contexts) or SEO (already solved by prerender). RTK Query would be a lateral move from Query with more ceremony; SSR would discard the working prerender pipeline and the createRoot-replacement design deliberately chosen in Phase 0.

**Recommendation: Option A**, sequenced so the typed client lands first and Query adoption follows page-by-page behind the Playwright net (§10).

---

## 10. Step sequence (each step independently shippable via staging CI → `release-vercel.yml` candidate → canary smoke → promote)

| Step | Work | Size | Shippable check |
|---|---|---|---|
| 0 | **Regenerate `openapi.json`** from the current backend and add a CI drift check (backend SHA embedded; job fails on mismatch). No frontend change. | S (½ day) | CI green; snapshot dated today. |
| 1 | **Playwright safety net for the 6 key journeys** — login, orderbook browse+filter+deep-link, place BID, place ASK, take→confirm→deliver→pay, notifications + map smoke on top of the *existing* app. Reuse `phase0_gate` seeding patterns; fix `smoke_navigation.py`'s dead TERMINAL entries while in there. Runs against a local build + staging with existing credentials contract. | M (3-5 days) — the prerequisite for everything else; ships as a new `npm run smoke:journeys` + CI job on candidate builds. |
| 2 | **Generated API types** (`openapi-typescript` types + hand-written client wrapper preserving market-support/idempotency/public-read policies). Adopt per-endpoint behind `typeof` aliases so old types and new coexist; normalize decimals at the mapper boundary. Delete confirmed-dead exports (§3) in the same pass. | M-L (1-2 weeks) | Existing 128 Vitest suites + typecheck + Step-1 smoke on canary. |
| 3 | **TypeScript 7 (tsgo) migration** as a toolchain swap once types are generated — native-speed `tsc` makes the strict-mode ratchet cheap. Verify `vitest`/`vite` compatibility; keep 5.8 output byte-comparable (build check does this). | S-M (2-4 days) | `typecheck` + builds identical artifacts (hash-stable where source unchanged). |
| 4 | **Extract shared client-side primitives**: `useVisibilityInterval`, one request-guard util, `formatUsd/formatQty` in `src/lib/format`, single `escapeHtml`, `buildQuery`. Adopt opportunistically in the pages being refactored (Step 5+), not big-bang. | M (1 week, parallelizable) | Unit tests per primitive + page smoke. |
| 5 | **Refactor `Marketplace` + `OrderBook`** into `features/marketplace/` with Query hooks; split Marketplace.tsx (2,314 lines) into ListingsTable / FiltersBar / TakeTradeDialog / slice-URL controller. Highest-value page; also the best-tested, so lowest risk. | L (1-2 weeks) | Step-1 journeys + existing marketplace suites, canary smoke, then promote. |
| 6 | **`OrderPlaceModal` + `MyTrades`/trade transitions** into `features/orders/`, `features/trades/`; consolidate the three `trades` SSE subscriptions into one provider-owned connection fanned out via context. | L (1-2 weeks) | Journeys incl. confirm/deliver/pay; SSE tests. |
| 7 | **`ForwardCurveWorkspace`, `BuyerMap`, `CommandCenter`** into features; move popup HTML to a small typed template module with one escape function; fetch the ECA GeoJSON lazily (−394 KB gz from the map path). | L (2 weeks) | Map/curve smokes; bundle-size delta check in `check-build-artifacts`. |
| 8 | **Admin + remaining surfaces** (Settings, Compliance, Training, DataAnalytics, notifications UI), then public pages last (they are static, low-risk, already prerendered). | M (1 week) | Public page smokes + prerender build check. |
| 9 | **Strict-mode ratchet**: enable `strict` (or at minimum `noImplicitAny` + `strictNullChecks`) per folder via tsconfig overrides as each feature lands clean; final flip when the last folder passes. Delete legacy `Page`-enum machinery if URL routing has fully absorbed it (verify smoke selectors first). | Continuous | typecheck each PR. |

Estimated total: 6-9 calendar weeks of focused work for steps 1-7 (the user-facing core), with steps 8-9 as follow-on. Every step ends on a releasable commit; none requires a behavior change.

---

## Top findings, ranked (maintainability and user impact)

1. **`Marketplace.tsx` (2,314 lines / 39 useState) mixes transport, business rules, and rendering** — `src/components/Marketplace.tsx:442-570,1000-1180`; every future feature pays this tax. (Maintainability: critical)
2. **Hand-rolled request-lifecycle code duplicated in 3 idioms across 14+ components** (cancelled flags ×16, generation refs ×23, Symbol-token Maps) — e.g. `OrderBook.tsx:115-160` vs `Marketplace.tsx:450-491` vs `MyTrades.tsx:192`; each copy is a fresh race-condition risk. (Critical)
3. **Backend decimals arrive as strings while types say `number`**, defended by 89 ad-hoc `Number()` wraps — root cause documented at `OrderBook.tsx:36`; one mapper boundary would delete the whole class. (High)
4. **30+ direct `fetch` calls bypass the API client** in auth pages, Settings, Referrals, AuthContext, useSSE — no timeout/429/unavailable handling parity (`LoginPage.tsx:59` … `CreateOrganizationPage.tsx:348`). (High)
5. **Three parallel `trades` EventSources** from `TradeNotifier.tsx:78`, `CommandCenter.tsx:147`, `MyTrades.tsx:155`; the backend `prices` stream has no subscriber at all (`stream.py:270`). (Medium-high)
6. **`types.ts` drift vs Pydantic**: missing `unknown_count`/provenance on Trade, optional-ized always-present order fields, nonexistent `email_verified` on User, stale `AvailabilityWindow` label union vs canonical codes (`types.ts:175,279-382` vs `orderbook.py:219-376`). (Medium-high)
7. **No end-to-end journey test; the only Playwright smoke navigates a deleted TERMINAL page** — `scripts/smoke_navigation.py:52,182-184`; refactor without Step 1 is unprotected for exactly the journeys that matter. (High, gates the refactor)
8. **Dead code and dep weight**: `MatchSuggestions.tsx` + `api.matchmaking`, `ai.ts`, `listWithCI`, `@studio-freight/lenis`, `@types/react-grid-layout`, mock voyage data in `api.ts:683-710`. (Medium)
9. **tsconfig not strict** — 79 `any`, 188 casts, 43 non-null assertions accumulate freely (`tsconfig.json`). (Medium, compounding)
10. **Mapbox + ECA GeoJSON ≈ 900 KB gz on the map path** with a second map stack (Leaflet) and second chart stack (Recharts + lightweight-charts) — `dist/assets` measurement, `vite.config.ts:147-155`, `src/data/eca-zones-web.json`. (Medium; user-perceived on first map load)

**Uncertainty register:** (a) bundle numbers are from `64b75d31`'s committed `dist/`, not a fresh build of `5f3cd698` — the attempted build failed for lack of a Mapbox token on the test host; deltas since are small and listed. (b) "Unused" findings rest on static-import greps; I verified no dynamic imports exist, but test-only consumers were excluded by design. (c) I did not audit the 8 npm-audit vulnerabilities' reachability. (d) Backend comparison sampled the order/trade/user/price/referral schemas, not all 39 routers.

---

# Part II — Performance and distribution extension (decision 62)

## 11. Measured bundle and load path

A fresh production build succeeded on the test host (`verdaxis-prod-test "$PWD" 'npm ci --legacy-peer-deps && VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only npm run build && du -b dist/assets/* | sort -n | tail -40'`, `CALL_EXIT=0`, built in 1m 2s from commit `a7c612f8`+report). The build re-confirmed §8's numbers and corrected two §8 claims:

- **`vendor-lightweight-charts` is a 1-byte empty chunk.** The only import is `import type` (`src/utils/curveChart.ts:1`), so Rollup emits `Generated an empty chunk: "vendor-lightweight-charts"` and the file contains one newline. `lightweight-charts` is effectively a removable dependency, and "two chart stacks" in §2/§8 is wrong — only Recharts renders. `curveChart.ts` is itself dead outside its test (§3).
- **`addEcaLayers` is already a dynamic import** (`src/map/loadEcaLayers.ts:3`, triggered on Mapbox `style.load`, `BuyerMap.tsx:811-814`) — but it still sits in the map route's dependency graph, so the browser fetches it during first map load in parallel with tiles.

### First-load totals per route (measured: entry + modulepreloads + CSS + route chunk + its static import chain; gzip and brotli)

| Route | gzip | brotli | Dominant chunks |
|---|---|---|---|
| **Landing `/en/`** (prerendered HTML 78 KB raw / 10 KB gz) | **365 KB** | 311 KB | `index` 190 + `HeroSection` 48 + `use-in-view` (motion) 39 + `public` ns 14+13 + CSS 19 |
| **Marketplace** | **297 KB** | 250 KB | `index` 190 + `Marketplace` 32 + `trading` ns 16 + shared utils ~10 + CSS 19 |
| **Intelligence Map (first visit)** | **1,174 KB** | 926 KB | `vendor-mapbox` 508 + `addEcaLayers` 394 (GeoJSON) + `BuyerMap` 23 + map CSS 6 + entry 190 |
| Command Center | 268 KB | 224 KB | entry + `CommandCenter` 7 + `dashboard` ns 9 |
| Compliance | 349 KB | 293 KB | entry + `vendor-recharts` 106 statically imported by the route chunk |

Eager set on every page (modulepreloads in `dist/en/index.html`): `index` (671 KB raw), `vendor-react` (44), `vendor-i18n` (67), `vendor-clsx` (**374 bytes — a whole chunk + preload for one `clsx` import**), plus `index-BPE1BxNv.css` (121 KB raw / 19 KB gz). The zh `common` namespace (both languages' common JSON are statically imported, `src/i18n.ts:5-6`, ~5 KB gz each) is baked into the entry chunk; all other namespaces are per-language lazy chunks (public 14 KB gz, trading 17, admin 8, dashboard 9…).

### What loads eagerly that could load on demand

| Item | Weight (gz) | Evidence | Fix |
|---|---|---|---|
| **ECA GeoJSON** in `addEcaLayers` | 394 KB (295 KB br); 1.1 MB raw, 10 features, **49,133 coordinate points**, 13.7 KB properties | `src/data/eca-zones-web.json` → `secaZones.ts:1` → `map/addEcaLayers.ts` | Simplify geometry (~90 % point reduction is visually lossless for zone fills) → ~**38 KB gz**, fetch as a separately cached file or backend endpoint with ETag instead of a JS chunk |
| **Recharts** on Compliance/Admin routes | 106 KB | `TrendChart-DwDpphfP.js` and `Compliance-*.js` statically `from"./vendor-recharts-…"` | Keep the manual chunk but make the two chart components `lazy()` inside their tabs so the route shell paints first |
| **`vendor-clsx` chunk + preload** | ~0.4 KB chunk + request overhead | `vite.config.ts:151`; single import at `NotificationList.tsx:8` | Delete the manualChunks entry (merge into entry) or inline the 3-line helper |
| **Both languages' `common` namespace** in entry | ~5 KB gz (zh) | `i18n.ts:5-6` static imports | Make `common` lazy per language like every other namespace (needs the boot path in `index.tsx` to await it — it already awaits `preparePublicRoute`) |
| GSAP | inside `HeroSection` 48 KB gz | `HeroSection-Dg_V18Ij.js` contains `gsap`+`ScrollTrigger` | Already route-lazy; fine |
| motion (framer) | 39 KB gz shared chunk | `use-in-view-CzZ38Uvz.js` | `LazyMotion`+`domAnimation` would cut ~15-20 KB but touches many public components; low priority |
| `react-joyride` (+`react-floater`, `react-redux`!) | inside entry chunk | `grep react-floater dist/assets/index-*.js` hits; `@reduxjs/toolkit` arrives as recharts' peer | Move `GuidedTutorial` out of the entry: it is only mounted inside `DashboardLayout` (`App.tsx:382`) but its import chain is static from `App.tsx:12` |
| Mapbox tiles + style | runtime cost, not bundle | `BuyerMap.tsx:496` `mapbox://styles/…dark-v11/light-v11` | Nothing to do in-bundle; preconnect helps (§12) |
| Leaflet stack | 44 KB gz, only `/map/producers` | `vendor-leaflet-Vm7zCmPa.js` ← `ProducerMapPage.tsx:4` | Route-lazy already; dropping it entirely means rebuilding the public producer map on Mapbox — keep for now, revisit in step 15.7 |

Nothing else loads eagerly that should not: all authenticated views, auth pages, and public pages are `lazyWithRetry` route chunks (`App.tsx:40-113`), and locale namespaces load on demand per language.

## 12. Asset storage and delivery

### Today

- **Storage/output:** Vite `dist/` (142 JS + 3 CSS chunks, hashed filenames) deployed to Vercel (`vercel.json`: `framework: vite`, `outputDirectory: dist`). 52 prerendered localized HTML files (26 routes × en/zh, ~1.18 MB per language dir) are part of the same static output (`vite.config.ts` `staticRouteMetadataPlugin`). Staging is a Caddy static artifact on the shared VPS (same `dist/` shape).
- **Caching:** `vercel.json` sets `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` only. **Everything else — HTML, `robots.txt`, `sitemap.xml`, and all `public/` images — has no explicit cache header** (Vercel defaults apply). The hashed-asset policy is correct; the images (logo PNGs up to 344 KB) are served with default caching and no far-future header.
- **Compression:** nothing configured in the repo — Vercel's edge brotli/gzip applies automatically to text assets. The numbers in §11 show brotli saves a further ~20 % over gzip on the big chunks (map route 1,174 KB gz → 926 KB br), which the CDN already handles. The staging Caddy path should be checked for parity (out of scope here — no SSH).
- **Preconnect/preload:** only Google Fonts is preconnected (`index.html:27-28`). **No preconnect to `api.verdaxis.exchange`** (the first thing every authenticated route does is hit `/auth/me`/`/auth/refresh`) and **none to `api.mapbox.com`/`fonts.gstatic.com`-adjacent mapbox tile origins** on the map route. `modulepreload` tags for the entry's static deps are emitted by Vite. A blocking `<link rel="stylesheet" href="/src/loading-screen.css">` plus Google Fonts CSS sit in `<head>` (`index.html:26-31`) — render-blocking on a third party for first paint.
- **Fonts:** three families × multiple weights from Google Fonts CSS (33 `@font-face` declarations incl. cyrillic/greek/vietnamese subsets; ~8 latin woff2 files ≈ 186 KB actually downloaded for a typical session). Latin-only self-hosted subsets would cut this to ~60-80 KB and remove the third-party round trip. Note `BuyerMap` popup HTML also names `IBM Plex Mono` (`BuyerMap.tsx:672,716`) — a fourth family that is *not* loaded, so popups fall back to system monospace; either load it or standardize on JetBrains Mono (visual nit, same-look constraint allows the fallback it already renders).
- **Images:** PNG only, in `public/` unhashed — 344 KB `logo-no-words.png`, 244 KB `logo-words-bottom.png`, 136 KB `logo-words-right.png` (the nav logo used on every public page, served at 152×42 display size from a 384-px-wide file). No WebP/AVIF variants despite `scripts/optimize-brand-images.sh` existing.
- **Service worker:** none (verified: no `navigator.serviceWorker`/workbox references). `DeploymentUpdateNotice` polls `/?release-check=…` to detect deploys and prompt reload instead (`DeploymentUpdateNotice.tsx:27`).
- **GeoJSON/locales/data:** ECA zones are a JS-module import (§11); locales are lazy JS chunks; producer projects (68 KB chunk) ride the producer-map route. No ETag/304 usage anywhere in `src/services/api.ts` reads (the only ETag use is the order-cancel `If-Match`, `api.ts:1019`).

### Target delivery design

1. **Immutable hashed assets — keep, extend:** `/assets/*` policy stays; add `public/` build-time hashing (move brand images through Vite imports instead of `public/`) so images get the same immutable URLs. HTML keeps default short-cache/no-cache (correct for deploy promptness).
2. **Move the ECA GeoJSON out of the JS bundle:** simplify coordinates (~49k → ~5k points, ≈38 KB gz vs 394 KB) and ship it either as a static `/assets/eca-zones.json` fetched by `loadEcaLayers` (keeps CDN caching + immutable URL) or as a backend endpoint with ETag (lets the backend own marine-zone updates). Either way the map route drops ~394 KB of JS parse for ~38 KB of JSON *after first paint* (the overlay installs on `style.load` anyway, `BuyerMap.tsx:811`).
3. **Compress:** rely on Vercel brotli (already automatic); verify staging Caddy sends brotli/gzip for `.js/.css/.json/.geojson` — one config line, checked during a staging publish.
4. **Preconnect:** `<link rel="preconnect" href="https://api.verdaxis.exchange">` in `index.html` (and `dns-prefetch` fallback) — saves one DNS+TLS on the critical auth path for every session. Add `preconnect` to `https://api.mapbox.com` (and `fonts.gstatic.com` is already covered) scoped to the map route via the route-metadata plugin if trivial, else globally (harmless).
5. **Fonts:** self-host latin-subset woff2 for Lato (3 weights), Montserrat (3), JetBrains Mono (2), `font-display: swap`, preloaded for the two above-the-fold families. Removes two render-blocking third-party requests (Google CSS + font files) and ~100 KB of unused subset declarations. Same glyphs, same look.
6. **Images:** re-encode brand PNGs to WebP/AVIF with PNG fallback at correct display sizes (136 KB nav logo → ~10-20 KB); hash them. The `optimize-brand-images.sh` script exists as a starting point.
7. **No service worker for now:** the app is a trading tool where freshness beats offline; the existing `DeploymentUpdateNotice` handles stale-deploy recovery. Revisit only if public-site repeat traffic justifies it.

**Estimated effect on first load:** landing 365→~330 KB gz and first paint one round trip earlier (fonts local, no Google CSS block); map first visit 1,174→~780 KB gz of JS (ECA out of bundle) with the overlay data arriving ~38 KB post-paint; every authenticated page saves a DNS+TLS to the API via preconnect; repeat visits save ~110 KB of images through hashing+WebP on logo-heavy public pages.

## 13. Type-check speed: TypeScript 7 (tsgo) vs tsc-rs vs tsc 5.8

All measurements on the `verdaxis-prod-test` host (Linux VPS, warm FS cache, `npm ci` first). Install-only-inside-run; no lockfile or package.json change was committed.

| Checker | Command | Result | Wall time | Notes |
|---|---|---|---|---|
| **tsc 5.8 (current)** | `npx tsc --noEmit` | 0 errors | **37.9 s** (cold), 45.9 s in the second run's colder pass; `user 53 s` | Baseline. CI pays this on every job. |
| **tsgo (TS 7 native)** | `npx tsgo --noEmit` (`@typescript/native-preview@7.0.0-dev.20260707.2`) | **55 errors** | **8.0 s** | 4.7× faster than baseline. Install needed `--legacy-peer-deps` (first attempt hit the repo's react-joyride/react-19 peer conflict). |
| **tsc-rs** | `npx -y tsc-rs@0.7.0 -p tsconfig.json --noEmit` | **56 errors** | **7.8 s** | Same speed class as tsgo. |

**Diagnostics delta vs tsc 5.8 (identical profile between tsgo and tsc-rs — 55 vs 56 errors, one extra `TS7031` in tsc-rs on a test file):** the native checkers surface errors that tsc 5.8 silently accepts in this non-strict config. Grouped:

- 18 × `TS2322` in `src/App.tsx:67-…`: the `lazyWithRetry(() => import(...).then(m => ({ default: m.X })))` pattern widens to `ComponentType<never>` in a union when a module has mixed exports (e.g. `CommandCenter.tsx` exports `CommandCenter`, `BuyerDashboard`, `SupplierDashboard`). Fix is typing each loader's return — mechanical.
- 13 × `TS18047 'props' is possibly 'null'` in `BuyerMap.tsx:671-…`: Mapbox `feature.properties` is nullable; today's code relies on it not being null at runtime. A guard fixes it.
- 6 × `TS7016` — **`@types/react-dom` is missing from devDependencies.** It type-checks today only because `@types/react` is hoisted by Testing Library peers and `react-dom`'s own types resolve loosely under current settings; the native checkers notice (`react-dom/client`, `/server` for the prerender module). This is a genuine latent gap in `package.json:50-62`, worth fixing regardless of checker choice.
- Remainder: nullable/undefined strictness (`VesselDetailModal`, `MyTrades`, `marketPorts`), a Recharts tooltip formatter signature (`ComplianceDashboard.tsx:433`), and mock-typing mismatches in six test files.

**Runtime disclaimer, plainly: none of these checkers changes the app's runtime speed.** They compile to nothing shipped; the choice is purely developer/CI latency.

**Recommendation.** Adopt **tsgo (official `@typescript/native-preview`, the TypeScript 7 line)** as the CI typecheck once the 55 surfaced errors are fixed — it is Microsoft's supported path to TS 7, tracks real tsc semantics, and here delivers 38 s → 8 s on every CI job and local check. **Do not adopt `tsc-rs` for this repository**: it is the same speed, but it is ~10 days old, self-described experimental, unreviewed by its author, and adds a third-party binary+installer to the supply chain for zero speed advantage over the official option. Revisit tsc-rs only if it differentiates (IDE/watch integrations). Sequence: add `@types/react-dom` + fix the 55 errors against tsc 5.8 *first* (they are real code-quality wins under §4's non-strict finding), then flip `typecheck` to `tsgo` and keep `tsc --noEmit` as a weekly cross-check until TS 7 ships stable.

## 14. Runtime rendering

Where re-render cost is actually real, and what to do:

- **OrderBook — a 1-second clock re-render.** `setInterval(() => setClock(Date.now()), 1000)` (`OrderBook.tsx:252`) re-renders the whole ladder every second to update one "snapshot age" label (`:267-272`). With ~30 rows × rich cells this is the single hottest steady-state render in the app. Fix without visual change: isolate the age label into a small component with its own interval (or a shared `useTicker`), so the ladder renders only when `bids`/`asks` actually change. Same pattern duplicated as `setNow` tickers in `SupplierOffersWorkspace.tsx:50` and `FameRfqWorkspace.tsx:145`.
- **Marketplace — 39 useState in one component.** Any filter keystroke or SSE refresh re-renders the entire workspace including the table, chips, orderbook and modals. `renderCell` and column configs are recreated per render (no `useMemo` on headers — `COLUMN_HEADERS` at `:166` rebuilds every pass; cheap, but symptomatic). 25 `useMemo`/`useCallback` exist, zero `React.memo` anywhere in `src/components` (grep). List sizes are bounded (PAGE_SIZE 8 listings, MAX_ROWS 15 ladder rows), so **virtualization is unnecessary** — do not add it; the win is component decomposition + Query's structural sharing so unchanged data yields referentially-equal props.
- **BuyerMap — imperative by design, mostly fine.** Mapbox GL work happens outside React (map instance in refs); React re-renders drive data sources via `setData`. The expensive paths (popup HTML string building on hover, `:657-684`) are already event-scoped, not render-scoped. 10 `useMemo` cover derived layer data. Residual cost: the retained-across-navigation design (`App.tsx:383-402`) keeps one map alive always — that is a deliberate UX trade, keep it.
- **Charts — small and static.** Forward Curve builds SVG path strings inside `useMemo` (`ForwardCurveWorkspace.tsx:484-503`); Recharts renders only in Compliance (one BarChart) and admin TrendCharts, all behind route chunks, none updating on streams. No action needed beyond §11's lazy-chart suggestion.
- **Live streams.** The `trades` SSE handler in `CommandCenter`/`MyTrades`/`TradeNotifier` each trigger full workspace refetch-and-rerender per event (`refreshTradeData` → `loadDashboardData(true)` sets `trades` + `summary` state, `CommandCenter.tsx:107-146`). Under a burst of trade events the read-cache debounces network but not renders. Consolidating to one SSE connection (§5) plus Query invalidation gives natural dedup: one invalidation per debounce window, one refetch, structural sharing keeps untouched rows referentially stable.
- **React Compiler readiness:** React 19.2 is in place and there is no Babel override preventing `babel-plugin-react-compiler`. But the codebase's patterns are hostile to it: widespread refs-mirroring-state (`currentMarketScope.current = marketScopeKey` in render body, `Marketplace.tsx:446-447`), mutation-during-render idioms it must bail on, and zero existing `memo` discipline to measure against. Recommendation: adopt the compiler **after** the Marketplace/OrderBook decomposition (step sequence below), not before — on decomposed components it can replace hand-memoization cheaply; on today's monoliths it will mostly bail out and add build time for nothing.
- **TanStack Query's effect on rendering:** query results are structurally shared and referentially stable across refetches when data is unchanged, so SSE-driven invalidations that return identical payloads stop causing re-renders entirely (today every successful refetch sets new array identities). Combined with decomposed components, this removes most of the steady-state render load without touching a single className.

## 15. Revised architecture and sequence (decision 62)

**What changes from §9's recommendation (Option A):** the target architecture itself stands — feature folders, generated API types, TanStack Query, same Tailwind/DOM rendering. Decision 62 changes the *order and additions*: performance work moves first because the measurements show the cheapest wins are delivery-side, not code-side; and the toolchain gets explicit upgrades (Vite major, TS 7) since "maintainable" now includes CI speed. Concretely:

1. **Delivery fixes precede page refactors** (they are one-line to one-day each, user-visible immediately, and carry zero behavioral risk): ECA GeoJSON out of the JS bundle (−394 KB gz on the map route), `vendor-clsx` chunk removed, `common` locale made lazy, API preconnect, self-hosted subset fonts, hashed WebP images, `GuidedTutorial`/joyride moved off the entry chunk, chart components lazied inside Compliance/Admin. Same pixels, faster loads.
2. **Vite:** upgrade 6 → 7 (rolldown-vite is optional; plain 7 keeps the current plugin API and the custom prerender plugin intact — the plugin uses stable `generateBundle`/`writeBundle` hooks). Do this as its own step after the delivery fixes so bundle-size diffs stay attributable. Vite 8 exists but is a larger jump with no additional benefit for this app; revisit at the next cycle.
3. **Drop neither map stack yet.** Leaflet (44 KB gz, route-isolated, public producer map) and Mapbox (core product) serve different audiences; unifying them onto Mapbox is a visual-risk change (§ decision 61) for a small win — defer to a UX-allowed project. **Do drop `lightweight-charts`** (dead, §11) and the other dead code from §3 — pure deletion, zero risk.
4. **React Compiler** joins the plan as a late, per-feature opt-in (§14) rather than an early bet.
5. **TypeScript 7 (tsgo)** replaces tsc as the CI typecheck after the 55 errors are fixed (§13); tsc-rs is declined.

### Revised step order (sizes; every step ships through the existing staging CI → release-vercel candidate → canary smoke → promote path)

| # | Step | Size | Verification |
|---|---|---|---|
| 1 | **Delivery quick wins** (from §12 target list: ECA out of bundle + simplified/fetched GeoJSON, clsx chunk, lazy `common` ns, preconnect API/Mapbox, self-hosted subset fonts, hashed WebP images, joyride off entry, lazy chart mounts) — can be split into 2-3 PRs | M (3-5 days total) | Existing 128 Vitest suites + both builds + `build:check` + canary smoke; before/after bundle table in the PR (repeat §11's measurement) |
| 2 | **Playwright journey net** (unchanged from §10.1; fix dead TERMINAL selectors) | M (3-5 days) | New `smoke:journeys` green on candidate |
| 3 | **Dead-code removal + dependency hygiene**: delete `MatchSuggestions`+matchmaking api, `ai.ts`/ai-engine, `curveChart.ts`+`lightweight-charts` dep, `listWithCI`, `@studio-freight/lenis`, `@types/react-grid-layout`, mock voyage data; add `@types/react-dom` | S (1-2 days) | typecheck, tests, `build:check` (expected-vendor-chunks list in `scripts/check-build-artifacts.mjs:19` must drop `vendor-lightweight-charts`) |
| 4 | **Regenerate OpenAPI + CI drift check** (unchanged §10.0) | S (½ day) | CI green |
| 5 | **Generated API types + decimal boundary** (unchanged §10.2) | M-L (1-2 weeks) | typecheck + suites + journeys |
| 6 | **Fix the 55 native-checker errors** against tsc 5.8, then **flip `typecheck` to tsgo** (TS 7); keep weekly tsc cross-check | M (3-5 days) | tsgo 0 errors in CI; artifact hashes unchanged |
| 7 | **Vite 6 → 7** | S-M (2-3 days) | byte-comparable builds where source unchanged; prerender plugin output verified on 52 pages |
| 8 | **Marketplace + OrderBook refactor** into `features/marketplace` with Query hooks, OrderBook clock isolated, one request-guard util (unchanged §10.5, now with §14 render fixes) | L (1-2 weeks) | journeys + suites + canary |
| 9 | **Orders/trades features + single SSE connection** (unchanged §10.6) | L (1-2 weeks) | journeys incl. confirm/deliver/pay; SSE tests |
| 10 | **Curve, Map, CommandCenter features**; popup HTML → typed template module with one escape fn | L (2 weeks) | map/curve smokes; bundle check |
| 11 | **Admin + remaining surfaces; React Compiler opt-in per feature** | M (1 week) | suites + compiler bail-out report reviewed |
| 12 | **Strict-mode ratchet per folder** (unchanged §10.9) | continuous | typecheck per PR |

Steps 1-3 alone deliver most of the measurable performance gain (map route −394 KB gz JS, landing faster first paint, every auth page one connection setup cheaper) with near-zero behavioral risk, which is why they now lead the sequence. Total remains ~6-9 weeks of focused work through step 10.
