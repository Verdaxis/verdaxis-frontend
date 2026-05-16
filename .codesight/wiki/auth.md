# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **18 routes** and touches: auth.

## Routes

- `POST` `/api/auth/login` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/refresh` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/logout` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/register` → in: UserCreate, out: RegistrationResponse [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/register-with-org` → in: RegisterWithOrgRequest, out: UserResponse [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/verify-email` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/resend-verification` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/resend-verification-email` → in: ResendVerificationRequest [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/me` → out: UserResponse [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/me` → in: UserUpdate, out: UserResponse [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/me/password` → in: PasswordChangeRequest [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/forgot-password` → in: ForgotPasswordRequest [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/reset-password` → in: ResetPasswordRequest [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/switch-role/:target_role` params(target_role) → out: Token [authentication, auth]
  `openapi.json`
- `POST` `/api/compliance/verify`
  `openapi.json`
- `PUT` `/api/trades/:trade_id/confirm` params(trade_id) → out: TradeResponse [trades]
  `openapi.json`
- `POST` `/api/news/refresh` [news]
  `openapi.json`

## Middleware

- **authentik-guide** (auth) — `docs/authentik-guide.md`
- **authToken** (auth) — `src/services/authToken.ts`
- **auth-context.test** (auth) — `src/tests/auth-context.test.tsx`

## Related Models

- **Body_login_api_auth_login_post** (6 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_