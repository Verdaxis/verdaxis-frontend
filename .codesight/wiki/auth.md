# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **4 routes** and touches: auth.

## Routes

- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [auth]
  `openapi.json`
- `GET` `/api/auth/me` → out: UserResponse [auth]
  `openapi.json`
- `PUT` `/api/auth/switch-role/:target_role` params(target_role) → out: Token [auth]
  `openapi.json`
- `POST` `/api/compliance/verify`
  `openapi.json`

## Middleware

- **authentik-guide** (auth) — `docs/authentik-guide.md`

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_