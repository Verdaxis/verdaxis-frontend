# verdaxis-exchange — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**verdaxis-exchange** is a typescript project built with raw-http.

## Scale

158 API routes · 206 database models · 129 UI components · 33 library files · 3 middleware layers · 7 environment variables

## Subsystems

- **[Auth](./auth.md)** — 24 routes — touches: authentication, auth, trades
- **[Admin](./admin.md)** — 32 routes — touches: orders, admin-market-support, auth, admin-analytics, kyc
- **[Openapi.json](./openapi.json.md)** — 98 routes — touches: notifications, preferences, orderbook, trades, price-discovery
- **[Infra](./infra.md)** — 4 routes

**Database:** unknown, 206 models — see [database.md](./database.md)

**UI:** 129 components (react) — see [ui.md](./ui.md)

**Libraries:** 33 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/types.ts` — imported by **72** files
- `src/hooks/useNamespace.ts` — imported by **51** files
- `src/services/api.ts` — imported by **33** files
- `src/services/analytics.ts` — imported by **23** files
- `src/context/AuthContext.tsx` — imported by **19** files
- `src/types/productAnalytics.ts` — imported by **19** files

## Required Environment Variables

- `MODE` — `src/services/analytics.ts`
- `VERDAXIS_SMOKE_EMAIL` — `scripts/smoke_navigation.py`
- `VERDAXIS_SMOKE_PASSWORD` — `scripts/smoke_navigation.py`
- `VERDAXIS_SMOKE_TOKEN` — `scripts/smoke_navigation.py`
- `VITE_ANALYTICS_HOST` — `src/services/analytics.ts`
- `VITE_ANALYTICS_WEBSITE_ID` — `src/services/analytics.ts`

---
_Back to [index.md](./index.md) · Generated 2026-07-22_