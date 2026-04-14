# verdaxis-intelligence-cockpit — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**verdaxis-intelligence-cockpit** is a typescript project built with raw-http.

## Scale

120 API routes · 91 database models · 115 UI components · 18 library files · 2 middleware layers · 3 environment variables

## Subsystems

- **[Auth](./auth.md)** — 18 routes — touches: authentication, auth, trades, news
- **[Admin](./admin.md)** — 11 routes — touches: orders, admin-analytics, kyc, subscriptions
- **[Openapi.json](./openapi.json.md)** — 87 routes — touches: notifications, orderbook, trades, price-discovery, matchmaking
- **[Infra](./infra.md)** — 4 routes

**Database:** unknown, 91 models — see [database.md](./database.md)

**UI:** 115 components (react) — see [ui.md](./ui.md)

**Libraries:** 18 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/types.ts` — imported by **64** files
- `src/hooks/useNamespace.ts` — imported by **61** files
- `src/services/api.ts` — imported by **34** files
- `src/services/config.ts` — imported by **19** files
- `src/context/AuthContext.tsx` — imported by **16** files
- `src/context/CopilotContext.tsx` — imported by **8** files

---
_Back to [index.md](./index.md) · Generated 2026-04-14_