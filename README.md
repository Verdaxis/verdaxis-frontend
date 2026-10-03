# Verdaxis Frontend

React 19 and Vite frontend for the Verdaxis public site and authenticated green-fuels market platform. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing routing, API transport, or workspace structure.

## Current product surface

- Public EN/ZH pages cover the product, fuels, education, partners, compliance, and the producer map.
- Authentication and onboarding routes lead to the protected `/app` workspace.
- The sidebar exposes Command Center, Intelligence Map, Marketplace, Forward Curve, Watchlist, Analytics, and Trade History. Buyer and Supplier modes change the home view and BID/ASK primary action.
- Marketplace owns catalog filters, canonical product/port/window slices, listings, orderbook depth, and the user's open orders. `OrderPlaceModal` submits both BID and ASK orders.
- Forward Curve is a separate monitoring workspace. It reads the table and selected-slice endpoints and links a selected market back to Marketplace.
- Production also reports bounded authenticated page and market-slice activity through `ActivityTrackingProvider`. This branch does not contain the staging FAME history/catalog extension.

### Market Support

Market Support is an assisted workspace for an authorized platform admin. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`; the server eligibility result is authoritative. Entry is limited to an approved `REAL` organization. The admin keeps the normal admin bearer token; the browser stores only an opaque context id and adds it to a narrow organization-scoped request allowlist.

The assisted order form supports BID and ASK creation plus cancellation of the admin-created order. It requires a support reference, explicit `ORDER_CREATE`/`ORDER_CANCEL` scope, and a final confirmation. Unsupported customer mutations, Admin, Settings, Watchlist, Trade History, and trade execution remain unavailable while the context is active.

## Runtime and release boundaries

| Target | Frontend | Backend | Release path |
|---|---|---|---|
| Production | Vercel: `verdaxis.exchange`, `www.verdaxis.exchange`, `app.verdaxis.exchange` | Production API and PostgreSQL run on the EU production host | Manual, serialized [`Release Vercel Production`](.github/workflows/release-vercel.yml) workflow |
| Staging | Caddy static artifact at `staging.verdaxis.exchange` on the shared VPS | Staging API and PostgreSQL remain on the shared VPS | Reviewed atomic staging publisher after the exact `staging` commit passes CI |

Production builds take their API target from committed `.env.production`. A Vercel Production override for `VITE_API_URL` is forbidden. The release workflow builds one candidate, validates it, assigns the canary, runs rendered smoke checks, and promotes the same artifact. See the [production release guide](docs/vercel-production-release.md).

[`scripts/deploy.sh`](scripts/deploy.sh) builds and checks a staging artifact only. It does not publish production. Staging publication must use the reviewed host atomic publisher; direct `rsync` into the live `dist` directory can expose mixed hashed assets.

## Local setup

Use Node.js 24, which matches CI and the Vercel workflow.

```bash
node --version
npm ci --legacy-peer-deps
cp .env.example .env
npm run dev
```

The example `VITE_API_URL=/api` uses the proxy in `vite.config.ts`. Confirm the proxy target and use an approved test account before authenticated development. Do not put backend secrets in `VITE_*` variables.

## Routine checks

These commands reproduce the production branch CI gates. They do not require a deployed environment.

```bash
npm test
npm run test:artifact-check
npm run test:release-smoke
npm run typecheck
npm run i18n:check
npm run build:staging
npm run build:check:staging
npm run build:prod
npm run build:check:prod
```

`npm run verify` is a production-focused convenience command. The explicit sequence above also checks the staging artifact.

## Live and external checks

Keep these checks separate from routine local verification:

- `npm run smoke:live` reads deployed production and staging endpoints.
- `npm run smoke:navigation -- --target local|staging|prod` runs browser navigation. Live targets require approved smoke credentials. Install its browser harness only when needed with `npm run smoke:navigation:setup`.
- `npm run smoke:release` is part of the production candidate policy. Run the complete release through the protected workflow and the production guide.

Do not submit orders, trades, or customer forms during a read-only smoke unless the runbook explicitly authorizes those writes.

## Source orientation

| Change area | Start in | Main verification |
|---|---|---|
| Bootstrap, routes, sidebar | `src/index.tsx`, `src/App.tsx`, `src/components/layout/sidebarConfig.ts`, `src/types.ts` | `src/tests/app-routing.test.tsx`, `src/tests/sidebar-config.test.ts` |
| Marketplace and orders | `src/components/Marketplace.tsx`, `src/components/OrderBook.tsx`, `src/components/OrderPlaceModal.tsx`, `src/services/api.ts` | `src/tests/marketplace-green-fuels.test.tsx`, `src/tests/order-place-modal.test.tsx`, API tests |
| Forward Curve | `src/components/ForwardCurveWorkspace.tsx`, `src/utils/forwardCurveAxis.ts` | `src/tests/forward-curve-workspace.test.tsx`, `src/tests/forward-curve-axis.test.ts` |
| Market Support | `src/context/MarketSupportContext.tsx`, `src/types/marketSupport.ts`, `src/services/marketSupportContextStore.ts` | `src/tests/market-support-*.test.tsx`, `src/tests/api-market-support-context.test.ts` |
| Auth, transport, cache | `src/context/AuthContext.tsx`, `src/services/authToken.ts`, `src/services/api.ts`, `src/services/readCache.ts` | `src/tests/auth-*.test.ts`, `src/tests/api-*.test.ts`, `src/tests/read-cache.test.ts` |
| Production activity | `src/components/ActivityTrackingProvider.tsx`, `src/services/activityTracking.ts`, `src/types/activity.ts` | `src/tests/activity-*.test.ts`, `src/tests/user-activity-drawer.test.tsx` |
| Release artifacts | `vite.config.ts`, `scripts/check-build-artifacts.mjs`, `scripts/release-vercel.sh` | artifact/release guard tests and both target builds above |

`openapi.json` is a generated backend contract snapshot. `.codesight/` is a historical generated navigation aid. Verify both against current source before relying on them. Product language is in [the market glossary](docs/market-glossary.md); UI rules are in [the design system](docs/design-system.md).

The [dated dependency follow-up](docs/plans/2026-10-03-reliability-followups.md) records the audit scope and limits as of 2026-10-03; use fresh audit output for current status.
