# AI Context: Verdaxis Frontend

> **Purpose**: This file provides structural and contextual information for AI agents working on this codebase.

## Project Context

Verdaxis is a maritime platform handling **Fuel Procurement**, **Compliance Auditing** (EU ETS, FuelEU Maritime), and **Port Intelligence**. The goal is to provide a "Bloomberg Terminal" experience for shipping logistics.

## Architecture

- **SPA**: Client-side React application bundled with Vite.
- **Data Layer**: centralized in `src/services/api.ts`.
  - **Current State**: Uses in-memory mock data (`src/data.ts`).
  - **Future State**: Will connect to a NestJS/FastAPI backend.
  - **Pattern**: Components call `api.entity.action()` (e.g., `api.quotes.list()`).
- **AI Integration**:
  - Logic resides in `src/services/ai-engine/`.
  - `chat.ts`: Manages multi-turn conversations and system prompts.
  - `tools.ts`: Defines function call schemas (Tools) that the LLM can invoke (e.g., `search_vessels`).

## Key Entities (`src/types.ts`)

- **Organization**: Top-level entity (Buyer or Supplier).
- **Vessel**: Assets owned by Buyers. Critical fields: `imo_number`, `cii_rating`.
- **Port**: Geospatial points. Critical fields: `location` {lat, lng}, `congestion_level`.
- **QuoteRequest**: The core marketplace transaction object.
- **InventoryItem**: Supplier stock at specific ports.

## Critical Files

| File                              | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `App.tsx`                         | Main Router and Role Switcher (Buyer/Supplier toggle).       |
| `src/services/api.ts`             | **CRUD Layer**. Modify this to switch between Mock/Real API. |
| `src/services/ai-engine/tools.ts` | **Tool Definitions**. Registry of what the AI can "do".      |
| `src/components/BuyerMap.tsx`     | Complex Leaflet implementation with custom markers.          |
| `src/index.css`                   | Global styles, CSS variables, and reset.                     |

## Coding Conventions

1.  **Styling**: Use standard CSS variables defined in `:root` (e.g., `--color-primary`, `--glass-bg`). Avoid inline styles where possible.
2.  **State Management**: Local state with `useState` for UI; `useEffect` for data fetching via `api` service.
3.  **Typos/Naming**: Maritime terminology is specific (e.g., "Bunkering", "LSMGO", "DWT"). Preserve these acronyms.

## Deployment Access

- **VPS Host**: 144.126.151.136
- **User**: verdaxis-prod
- **Command**: `ssh verdaxis-prod@144.126.151.136`
- **Frontend URL**: http://144.126.151.136:5173/
- **Backend API**: http://144.126.151.136:8000/

## Test Credentials

| Role         | Email              | Password    |
| ------------ | ------------------ | ----------- |
| **Admin**    | admin@verdaxis.com | ***REMOVED***    |
| **Buyer**    | buyer@demo.com     | ***REMOVED***    |
| **Supplier** | supplier@demo.com  | ***REMOVED*** |

### Role Switching (Admin Only)

The Admin can switch roles for testing via the API:

```
PUT /api/auth/switch-role/{BUYER|SUPPLIER|ADMIN}
Authorization: Bearer <admin_token>
```

This returns a new token with the switched role, useful for testing different views.
