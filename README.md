# Verdaxis Frontend

React/Vite frontend for the Verdaxis maritime fuel procurement platform. It serves the public site and the authenticated buyer/supplier application at `app.verdaxis.exchange`.

## Product Surface

- **Public site:** landing, fuel coverage, education, use-case, partner, producer-map, and pilot pages.
- **Buyer workspace:** market map, marketplace/orderbook, market terminal, fleet, compliance, analytics, trades, watchlists, and training.
- **Supplier workspace:** supplier dashboard, inventory, listing console, demand feed, quotes, analytics, and trade history.
- **AI assistance:** supplier risk memos call the backend `/api/ai/chat` proxy. The old floating Copilot chat UI is removed.
- **Data wiring:** `src/services/api.ts` calls the live backend through `VITE_API_URL`; mock values are limited to display fallbacks and tests.

## Tech Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS with Verdaxis tokens
- react-router-dom v7
- Leaflet / react-leaflet, MapLibre GL
- Recharts and lightweight-charts
- Motion, GSAP, Lenis
- Vitest + React Testing Library

## Getting Started

```bash
npm install
npm run dev
```

Local development should use `.env` with:

```env
VITE_API_URL=/api
```

The Vite proxy forwards `/api/*` to the backend. Production builds use `.env.production` and staging builds use `.env.staging`.

## Useful Commands

```bash
npm run build
npm run build:prod
npm run build:staging
npm run test
npm run test:watch
npm run i18n:check
npm run smoke:live
npm run verify
```

## Project Structure

- `src/App.tsx` defines public/auth routes and the authenticated app shell.
- `src/components/` contains the buyer, supplier, market, compliance, public, layout, and notification UI.
- `src/context/` contains Auth, Theme, Notification, and Tutorial providers.
- `src/services/api.ts` is the fetch-based backend client and snake_case-to-camelCase transformation layer.
- `src/services/ai-engine/` contains the supplier-risk AI helper; AI execution is proxied by the backend.
- `src/types.ts` is the shared frontend domain type surface.
- `.codesight/` is generated context; refresh it after structural route/component/API changes.

## Notes

- Auth uses Verdaxis JWTs held in memory only (never `localStorage`); the session persists via an HttpOnly refresh cookie and is validated through `/api/auth/me`. SSE streams authenticate with single-purpose 60s stream tokens from `/api/auth/stream-token`.
- RFQ UI code is retained but hidden unless `VITE_ENABLE_RFQ=true`; orderbook/listing flows are the default market workflow.
- `openapi.json` is a generated backend contract snapshot, not a hand-authored source file. Regenerate it from the active backend `/openapi.json` after backend contract changes and keep it in sync with source-regression tests.
- Production is served from `/home/verdaxis-prod/verdaxis/prod/fe/dist`; staging is served from `/home/verdaxis-prod/verdaxis/staging/fe/dist`.
