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

---

## Git Workflow

### Branches

- **`main`**: Development branch. All active development happens here.
- **`prod`**: Production branch. Stable releases only.

### Commands (Local)

```bash
# Push to main (development)
git add -A && git commit -m "your message" && git push origin main

# Deploy to production
git checkout prod
git merge main
git push origin prod
git checkout main
```

### Commands (Server)

```bash
# SSH to server
ssh verdaxis-prod@144.126.151.136

# Pull latest and restart
cd ~/verdaxis-frontend
git pull origin main
pkill -f vite || true
nohup npm run dev -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
```

---

## Deployment

### One-Command Deploy (from local)

```bash
# From Verdaxis root directory
./scripts/push-deploy.sh                  # Deploy both frontend and backend
./scripts/push-deploy.sh --frontend-only  # Deploy frontend only
./scripts/push-deploy.sh --with-tests     # Run tests before deploying
```

### Manual Server Deploy

```bash
# SSH to server
ssh verdaxis-prod@144.126.151.136

# Deploy frontend
cd ~/verdaxis-frontend && bash scripts/deploy.sh

# Or manually:
cd ~/verdaxis-frontend
git pull origin main
npm install
pkill -f vite || true
nohup npm run dev -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
```

### Viewing Logs

```bash
# View frontend logs on server
tail -f ~/verdaxis-frontend/frontend.log
```

---

## Testing

### Run All Tests

```bash
# Run tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Structure

| File/Directory        | Purpose                          |
| --------------------- | -------------------------------- |
| `tests/utils.test.ts` | Unit tests for utility functions |
| `tests/setup.ts`      | Vitest global setup              |
| `vitest.config.ts`    | Vitest configuration             |

### Writing Tests

Tests use **Vitest** with **@testing-library/react**:

```typescript
import { describe, it, expect } from "vitest";

describe("MyFeature", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```
