# AI Context: Verdaxis Frontend

> **Purpose**: This file provides structural and contextual information for AI agents working on this codebase.

## Project Context

Verdaxis is a maritime platform handling **Fuel Procurement**, **Compliance Auditing** (EU ETS, FuelEU Maritime), and **Port Intelligence**. The goal is to provide a "Bloomberg Terminal" experience for shipping logistics.

## Architecture

- **SPA**: Client-side React application bundled with Vite.
- **Structure**: Source code moved to `src` directory to align with Vite best practices.
- **Data Layer**: Centralized in `src/services/api.ts`.
  - **Pattern**: Components call `api.entity.action()` (e.g., `api.quotes.list()`).
  - **Backend**: Connects to FastAPI backend (`VITE_API_URL`).
- **AI Integration**:
  - Logic resides in `src/services/ai-engine/`.
  - `chat.ts`: Manages multi-turn conversations and system prompts.
  - `tools.ts`: Defines function call schemas (Tools) that the LLM can invoke (e.g., `search_vessels`).

## Authentication & Onboarding

### Authentik Integration

- **Protocol**: OIDC (OpenID Connect) via `react-oidc-context`.
- **Flow**:
  1. User clicks "Login" -> Redirects to Authentik.
  2. User authenticates (Email/Password).
  3. Authentik redirects back with code -> App exchanges for Token.
- **Configuration**:
  - `VITE_AUTHENTIK_URL`: URL of Authentik instance.
  - `VITE_AUTHENTIK_CLIENT_ID`: Client ID for OIDC.

### Onboarding Flow

- **Purpose**: Collect missing profile info (Role, Name) for new users.
- **Logic**:
  - `src/App.tsx` has a `RequireProfile` guard.
  - If a logged-in user has no `role` property (null), they are forced to `/onboarding`.
  - `OnboardingPage` submits `PUT /auth/me` to the backend to update the profile.

### Local Development Bypass

- **Variable**: `VITE_ENABLE_AUTH_BYPASS=true` (in `.env`).
- **Effect**: Simulates a logged-in user without hitting Authentik.
- **Mock User**: By default, mocks a user with `role: null` to test the Onboarding flow.

## Key Entities (`src/types.ts`)

## Key Entities (`src/types.ts`)

- **Organization**: Top-level entity (Buyer or Supplier).
- **Vessel**: Assets owned by Buyers. Critical fields: `imo_number`, `cii_rating`.
- **Port**: Geospatial points. Critical fields: `location` {lat, lng}, `congestion_level`.
- **QuoteRequest**: The core marketplace transaction object.
- **InventoryItem**: Supplier stock at specific ports.

## Critical Files

| File                           | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `src/App.tsx`                  | Main Router, Auth Guards (`RequireProfile`), and Providers. |
| `src/services/api.ts`          | **CRUD Layer**. Configured via `VITE_API_URL`.              |
| `src/pages/OnboardingPage.tsx` | **New User Flow**. Collects Role/Name for new accounts.     |
| `src/context/AuthContext.tsx`  | **Auth State**. Manages OIDC user and "Bypass" logic.       |

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
| **Admin**    | admin@verdaxis.com | admin123    |
| **Buyer**    | buyer@demo.com     | buyer123    |
| **Supplier** | supplier@demo.com  | supplier123 |

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
# Push to main (development) - TRIGGERS AUTOMATIC DEPLOYMENT
git add -A && git commit -m "your message" && git push origin main
```

> **Note**: The `prod` branch is currently mirrored from `main` logic. Deployment happens from `main`.

### Manual Server Access (Debugging Only)

```bash
# SSH to server
ssh verdaxis-prod@144.126.151.136

# Check logs
tail -f ~/verdaxis-frontend/frontend.log
```

---

## Deployment

### Automated Deployment (CI/CD)

The project is configured with **GitHub Actions**.

- **Trigger**: Push to `main`.
- **Process**:
  1.  Runs `npm test`.
  2.  If tests pass, connects to VPS via SSH.
  3.  Executes `git pull` and re-runs the startup script.

### Monitoring

Check the [GitHub Actions](https://github.com/jonathanjie/verdaxis-frontend/actions) tab for build status.

On the server, you can still view logs manually:

```bash
ssh verdaxis-prod@144.126.151.136
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
