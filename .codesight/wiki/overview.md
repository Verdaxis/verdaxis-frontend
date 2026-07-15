# verdaxis-exchange — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**verdaxis-exchange** is a typescript project built with raw-http.

## Scale

120 API routes · 91 database models · 116 UI components · 26 library files · 3 middleware layers · 4 environment variables

## Subsystems

- **[Auth](./auth.md)** — 18 routes — touches: authentication, auth, trades, news
- **[Admin](./admin.md)** — 11 routes — touches: orders, admin-analytics, kyc, subscriptions
- **[Openapi.json](./openapi.json.md)** — 87 routes — touches: notifications, orderbook, trades, price-discovery, matchmaking
- **[Infra](./infra.md)** — 4 routes

**Database:** unknown, 91 models — see [database.md](./database.md)

**UI:** 116 components (react) — see [ui.md](./ui.md)

**Libraries:** 26 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/types.ts` — imported by **71** files
- `src/hooks/useNamespace.ts` — imported by **61** files
- `src/services/api.ts` — imported by **38** files
- `src/context/AuthContext.tsx` — imported by **19** files
- `src/services/config.ts` — imported by **19** files
- `src/tests/test-utils.tsx` — imported by **10** files

## Required Environment Variables

- `VERDAXIS_SMOKE_EMAIL` — `scripts/smoke_navigation.py`
- `VERDAXIS_SMOKE_PASSWORD` — `scripts/smoke_navigation.py`
- `VERDAXIS_SMOKE_TOKEN` — `scripts/smoke_navigation.py`

---
_Back to [index.md](./index.md) · Generated 2026-05-16_