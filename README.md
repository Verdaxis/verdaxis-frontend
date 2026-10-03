# Verdaxis Frontend

React 19 and Vite frontend for the Verdaxis public site and authenticated green-fuels market platform. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing routing, API transport, or workspace structure.

## Current product surface

- Public EN/ZH pages cover the product, fuels, education, partners, compliance, and the producer map.
- Authentication and onboarding routes lead to the protected `/app` workspace.
- The sidebar exposes Command Center, Intelligence Map, Marketplace, Forward Curve, Watchlist, Analytics, and Trade History. Buyer and Supplier modes change the home view and BID/ASK primary action.
- Marketplace owns catalog filters, canonical product/port/window slices, listings, orderbook depth, and the user's open orders. `OrderPlaceModal` submits both BID and ASK orders.
- Forward Curve is a separate monitoring workspace. It reads the table and selected-slice endpoints and links a selected market back to Marketplace.
- This staging branch adds catalog-gated UCOME B100 orderbook terms and preserves earlier FAME supplier offers and RFQs as non-executable history. It does not contain the production identified-activity provider.

### Market Support

Market Support is an assisted workspace for an authorized platform admin. Capability discovery recognizes `MARKET_SUPPORT_LISTINGS` and `MARKET_SUPPORT_AUTHORIZATIONS`; the server eligibility result is authoritative. Entry is limited to an approved `REAL` organization. The admin keeps the normal admin bearer token; the browser stores only an opaque context id and adds it to a narrow organization-scoped request allowlist.

The assisted order form supports BID and ASK creation plus cancellation of the admin-created order. It requires a support reference, explicit `ORDER_CREATE`/`ORDER_CANCEL` scope, and a final confirmation. Unsupported customer mutations, Admin, Settings, Watchlist, Trade History, and trade execution remain unavailable while the context is active.

## Runtime and release boundaries

| Target | Frontend | Backend | Release path |
|---|---|---|---|
| Production | Vercel: `verdaxis.exchange`, `www.verdaxis.exchange`, `app.verdaxis.exchange` | Production API and PostgreSQL run on the EU production host | Protected production workflow on the `prod` branch |
| Staging | Caddy static artifact at `staging.verdaxis.exchange` on the shared VPS | Staging API and PostgreSQL remain on the shared VPS | Reviewed atomic staging publisher after the exact `staging` commit passes CI |

Production is not served from the shared VPS frontend directory. Its source release controls live on the `prod` branch and promote one guarded Vercel artifact.

[`./scripts/deploy.sh staging`](scripts/deploy.sh) builds a staging artifact and validates its baked staging API target. The helper defaults to `prod` when no target is supplied. It builds and checks the artifact; it does not publish the live site. On the shared host, read `/home/verdaxis-prod/verdaxis/PRODUCTION_HOST.md` for the reviewed atomic operator workflow and exact current CI gates. Do not use direct `rsync` into the live `dist` directory because that can expose mixed hashed assets.

## Local setup

Use Node.js 24, which matches CI.

```bash
node --version
npm ci --legacy-peer-deps
cp .env.example .env
npm run dev
```

The example `VITE_API_URL=/api` uses the proxy in `vite.config.ts`. Confirm the proxy target and use an approved test account before authenticated development. Do not put backend secrets in `VITE_*` variables.

## Routine checks

These commands reproduce the staging branch CI gates. They do not require a deployed environment.

```bash
npm test
npm run typecheck
npm run i18n:check
npm run build:staging
npm run build:check
npm run build:prod
npm run build:check
```

`npm run verify` is a production-build convenience command. It does not replace the explicit two-build sequence above.

## Live and external checks

Keep these checks separate from routine local verification:

- `npm run smoke:live` reads deployed production and staging endpoints.
- `npm run smoke:navigation -- --target local|staging|prod` runs browser navigation. Live targets require approved smoke credentials. Install its browser harness only when needed with `npm run smoke:navigation:setup`.
- Staging publication uses the reviewed host atomic publisher after merge and exact push CI. The repository build helper alone is not a release.

Do not submit orders, trades, or customer forms during a read-only smoke unless the runbook explicitly authorizes those writes.

## Source orientation

| Change area | Start in | Main verification |
|---|---|---|
| Bootstrap, routes, sidebar | `src/index.tsx`, `src/App.tsx`, `src/components/layout/sidebarConfig.ts`, `src/types.ts` | `src/tests/app-routing.test.tsx`, `src/tests/sidebar-config.test.ts` |
| Marketplace and orders | `src/components/Marketplace.tsx`, `src/components/OrderBook.tsx`, `src/components/OrderPlaceModal.tsx`, `src/services/api.ts` | `src/tests/marketplace-green-fuels.test.tsx`, `src/tests/order-place-modal.test.tsx`, API tests |
| Forward Curve | `src/components/ForwardCurveWorkspace.tsx`, `src/utils/forwardCurveAxis.ts` | `src/tests/forward-curve-workspace.test.tsx`, `src/tests/forward-curve-axis.test.ts` |
| Market Support | `src/context/MarketSupportContext.tsx`, `src/types/marketSupport.ts`, `src/services/marketSupportContextStore.ts` | `src/tests/market-support-*.test.tsx`, `src/tests/api-market-support-context.test.ts` |
| Auth, transport, cache | `src/context/AuthContext.tsx`, `src/services/authToken.ts`, `src/services/api.ts`, `src/services/readCache.ts` | `src/tests/auth-*.test.ts`, `src/tests/api-*.test.ts`, `src/tests/read-cache.test.ts` |
| Staging FAME/catalog | `src/types/fame*.ts`, `src/services/fame*.ts`, `src/components/fame/`, `src/components/rfq/`, `src/components/supplier/` | `src/tests/b100-order-api.test.ts`, `src/tests/marketplace-b100-take.test.tsx`, FAME unit/component tests |
| Build artifact | `vite.config.ts`, `scripts/check-build-artifacts.mjs`, `scripts/deploy.sh` | both target builds and `npm run build:check` |

`openapi.json` is a generated backend contract snapshot. `.codesight/` is a historical generated navigation aid. Verify both against current source before relying on them. Product language is in [the market glossary](docs/market-glossary.md); UI rules are in [the design system](docs/design-system.md).
