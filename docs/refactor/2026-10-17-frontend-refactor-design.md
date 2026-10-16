# Verdaxis Frontend Refactor — Design — 2026-10-17

Status: PM design, written under founder decisions 61 and 62 while the founder slept ("keep working
autonomously and don't get stuck waiting"). Steps 1-4 below proceed now because they change no
screen and no behavior; the founder reviews this document in the morning, and any objection
redirects the later steps. Evidence for every claim is in
[the audit](2026-10-17-frontend-audit.md) (sections in brackets).

## 1. Goal and constraints

- **Goal (decision 62):** the frontend as fast and as maintainable as possible.
- **Same look and behavior (decision 61):** same screens, same DOM structure and Tailwind classes,
  same flows. UX changes are later, separate projects. A change that alters pixels must be proven
  visually equal by screenshot comparison, or it waits for a UX project.
- **Shippable at every step:** each step merges to `staging` through CI and reaches production only
  through `release-vercel.yml` (candidate, canary smoke, production smoke, captured rollback).
- **No builds or tests on the founder's Mac:** everything runs on the VPS test host
  (`verdaxis-prod-test`) or in GitHub CI.
- **Backend direction:** the API moves from Python to Rust (Phase 1 byte-exact; Phase 2 "same
  meaning", decision 54). The frontend must depend on the API contract, not on Python quirks.

## 2. Decisions

| # | Question | Decision | Why (audit) |
|---|---|---|---|
| D1 | Architecture | Feature folders (`src/features/<area>/{components,hooks,api}`), shared `src/lib/`, `ui/` stays the primitive layer | Duplication and mixed concerns are the main problems [2, 3, 9] |
| D2 | Server state | TanStack Query, with one SSE bridge that invalidates query keys; SSE stays the freshness authority | Replaces 3 hand-rolled request-guard idioms in 14+ components and per-component polling [3.1, 3.2, 5, 14] |
| D3 | API types | Generated from the backend OpenAPI spec, behind a thin hand-written client that keeps the product transport rules (market-support allowlists, idempotency and outcome-unknown handling, public-read credential policy) | `types.ts` drifts; 30+ direct `fetch` calls bypass the client [3.5, 4] |
| D4 | Decimals | Converted once, at the client boundary, to `number` for display and arithmetic; outgoing decimals stay exact strings | Removes the 89 ad-hoc `Number()` sites [4.7] |
| D5 | Type checking | Fix the 55 errors the native checkers find, then CI uses the official TypeScript 7 native compiler (`tsgo`); weekly `tsc` cross-check until TS 7 is stable. **tsc-rs declined** (same 8 s as tsgo, 10 days old, unreviewed, supply-chain risk). Then strict mode, folder by folder | 37.9 s → 8.0 s per check [13] |
| D6 | Delivery | ECA GeoJSON out of the JS bundle (simplified, fetched as an immutable cached asset after first paint); self-hosted latin-subset fonts; hashed WebP brand images; preconnect to the API and Mapbox; `clsx` chunk removed; `common` locale lazy; joyride and charts off eager paths | Map first visit 1,174 → about 780 KB gz; landing first paint one round trip earlier [11, 12] |
| D7 | Rendering | Decompose `Marketplace` and `OrderBook`; isolate the 1-second clock; one shared SSE connection per channel; React Compiler only after decomposition, per feature | [14] |
| D8 | Stacks kept | Mapbox and Leaflet both stay (unifying them changes visuals); `lightweight-charts` and other dead code are deleted | [3, 11, 15] |
| D9 | Toolchain | Vite 6 → 7 as its own step; no SSR change (the prerender pipeline stays) | [15] |
| D10 | Safety net | Playwright journeys on a disposable backend on the VPS test host, plus screenshot baselines of key screens, before any refactor that touches components | No end-to-end journey test exists today [7] |

## 3. Verification strategy

1. **Journeys (Playwright, real browser):** login (good, wrong password); marketplace browse, filter,
   paginate, deep-link slice; place BID; place ASK; take → confirm → deliver → pay; notifications
   list and read; map loads with ports and ECA overlay; public landing and one public content page.
   They run against a disposable backend (backend repo, seeded fixtures, never staging or prod data)
   and a `vite preview` of the candidate build, all on the VPS test host.
2. **Same-look check:** full-page screenshots of the landing, marketplace, order book, trade
   blotter, map (with tiles disabled or stubbed for determinism) and one admin screen, in light and
   dark mode, compared before and after each step with a small pixel tolerance. Font and image
   steps must pass this.
3. **Bundle budget:** `scripts/check-build-artifacts.mjs` gains per-route first-load budgets (the
   audit's §11 numbers as ceilings, then the targets) so regressions fail CI.
4. **Existing gates stay:** 128 Vitest suites, typecheck, i18n parity, both builds, the release
   workflow's candidate, canary and production smoke.

## 4. Step order (ships one step at a time)

| Step | Work | Lane | Starts |
|---|---|---|---|
| 1 | Journey net + screenshot baselines (D10); fix the dead `TERMINAL` smoke selectors | GLM | now |
| 2 | Dead code and dependency hygiene; add `@types/react-dom` | DeepSeek | now |
| 3 | Delivery wins (D6), 2-3 PRs, each proven by step 1's screenshots and the bundle budget | GLM | after step 1 baselines |
| 4 | Regenerate `openapi.json` from the live backend (`56d75770`) and add a drift check | DeepSeek | after step 2 |
| 5 | Generated types and the decimal boundary (D3, D4) | GLM | after step 4 |
| 6 | Fix the 55 native-checker errors; CI typecheck on `tsgo` (D5) | DeepSeek | after step 2 |
| 7 | Vite 7 (D9) | DeepSeek | after step 3 |
| 8 | Marketplace + OrderBook into features with Query (D1, D2, D7) | GLM | after steps 1 and 5 |
| 9 | Orders and trades features; one SSE connection per channel | GLM | after step 8 |
| 10 | Curve, map, command center; typed popup templates with one escape function | GLM | after step 9 |
| 11 | Admin and the remaining surfaces; React Compiler per feature | GLM | after step 10 |
| 12 | Strict-mode ratchet per folder | any | continuous |

Production promotions are batched: a release candidate goes out when one or more steps have merged
to `staging` and passed the journeys and the same-look check. The founder can stop or redirect any
step; nothing here needs a backend change except step 4's spec export.

## 5. Risks

- **Silent behavior change in a refactor:** mitigated by step 1 before any component change, and by
  moving rendering code untouched.
- **Request volume rises with Query defaults:** configure stale times from today's TTLs; SSE stays
  the invalidation authority; measure requests per minute on the journeys before and after.
- **Generated types hide product rules:** the hand-written client wrapper keeps them, with tests.
- **Font or image change shifts pixels:** screenshot gate; same font files and weights, subset only.
- **Rust Phase 2 changes response formatting:** D3/D4 put formatting tolerance at one boundary.
