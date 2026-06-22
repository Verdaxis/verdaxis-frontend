# verdaxis-exchange — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**verdaxis-exchange** is a typescript project built with raw-http.

## Scale

34 API routes · 28 database models · 114 UI components · 16 library files · 1 middleware layers · 4 environment variables

## Subsystems

- **[Auth](./auth.md)** — 4 routes — touches: auth
- **[Admin](./admin.md)** — 3 routes — touches: rfq
- **[Openapi.json](./openapi.json.md)** — 25 routes — touches: listings, rfq
- **[Infra](./infra.md)** — 2 routes

**Database:** unknown, 28 models — see [database.md](./database.md)

**UI:** 114 components (react) — see [ui.md](./ui.md)

**Libraries:** 16 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/types.ts` — imported by **62** files
- `src/hooks/useNamespace.ts` — imported by **62** files
- `src/services/api.ts` — imported by **34** files
- `src/services/config.ts` — imported by **19** files
- `src/context/AuthContext.tsx` — imported by **15** files
- `src/i18n.ts` — imported by **9** files

## Required Environment Variables

- `VITE_ENABLE_RFQ` — `src/components/Marketplace.tsx`

---
_Back to [index.md](./index.md) · Generated 2026-04-28_