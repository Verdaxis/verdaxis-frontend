# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **24 routes** and touches: auth.

## Routes

- `POST` `/api/auth/login` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/refresh` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/logout` [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/stream-token` [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/register` → in: UserCreate, out: RegistrationResponse [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/register-with-org` → in: RegisterWithOrgRequest, out: UserResponse [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/verify-email` [authentication, auth]
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
- `PUT` `/api/auth/organization/:organization_id/approve` params(organization_id) [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/organization/:organization_id/reject` params(organization_id) → in: AdminDecisionBody [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/reject/:user_id` params(user_id) → in: AdminDecisionBody [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/admin/review-queue` [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/admin/review-queue/:user_id` params(user_id) [authentication, auth]
  `openapi.json`
- `GET` `/api/auth/organization-joins` [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/organization-joins/:join_request_id/approve` params(join_request_id) → in: JoinReviewBody [authentication, auth]
  `openapi.json`
- `PUT` `/api/auth/organization-joins/:join_request_id/reject` params(join_request_id) → in: JoinReviewBody [authentication, auth]
  `openapi.json`
- `POST` `/api/auth/survey` → in: SurveySubmission [authentication, auth]
  `openapi.json`
- `PUT` `/api/trades/:trade_id/confirm` params(trade_id) → out: TradeResponse [trades]
  `openapi.json`

## Middleware

- **authToken** (auth) — `src/services/authToken.ts`
- **auth-context.test** (auth) — `src/tests/auth-context.test.tsx`
- **auth-refresh.test** (auth) — `src/tests/auth-refresh.test.ts`

## Related Models

- **Body_login_api_auth_login_post** (6 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `openapi.json`

---
_Back to [overview.md](./overview.md)_