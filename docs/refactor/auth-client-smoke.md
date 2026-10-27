# Authentication client smoke

Use the existing disposable journey runner, not a live API. Run this on an approved test host with a backend checkout that composes the credential routes and accepts the current schema. The runner creates and removes its own database and backend process. Do not point it at staging or production.

```bash
VERDAXIS_BACKEND_TREE=<disposable-backend-checkout> npm run smoke:journeys -- --only login-refresh-logout --screenshots off
```

The `login-refresh-logout` step uses a separate browser context and the existing synthetic buyer fixture:

1. Sign in through the form. Require HTTP 200 and the authenticated dashboard.
2. Reload the page to discard the in-memory access token. Require a successful cookie refresh and the dashboard again.
3. Sign out through the profile menu. Require a successful logout response.
4. Open `/app` again. Require the login form and no authenticated dashboard.

The harness forwards auth requests with the disposable backend's allowed test Origin. The backend checkout and routing must select the intended credential implementation; the journey itself does not prove Rust route ownership. Record the frontend SHA, backend SHA, routing identity and runner report together when running this smoke. This document and step do not constitute a smoke pass.

Client unit tests also cover the bounded refresh-conflict retry, code-based unverified login, email-first registration and the transitional registration responses. Email verification reuses the organization form at `/create-organization` when the response requires it. After organization completion, the server creates an unverified account and sends a new verification email. The completion screen keeps check-inbox guidance and the resend action; the first pending-registration email does not establish final account verification.
