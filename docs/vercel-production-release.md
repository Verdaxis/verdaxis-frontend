# Vercel Production Release

Production releases use one immutable artifact and one supported launcher:
the **Release Vercel Production** GitHub Actions workflow. The workflow checks
out `prod` and invokes `scripts/release-vercel.sh`. Direct Vercel production
deployments are not a supported release path. `vercel.json` disables automatic
Git deployments so a branch push cannot bypass these gates.

## Configuration Authority

- `.env.production` is the only production source for public Vite settings.
- Vercel Production must not define `VITE_API_URL`.
- Secrets remain in the protected GitHub `production` environment.
- `VERCEL_TOKEN` is loaded through a temporary mode-`0600` CLI auth directory
  and must never appear in arguments, logs, artifacts, or source.

## Release Contract

1. Require a clean `prod` checkout exactly equal to `origin/prod`.
2. Refuse local `.env.local` and `.env.production.local` overrides.
3. Verify the configured Vercel organization and project IDs.
4. Run tests, typecheck, translation checks, and one `vercel build --prod`.
5. Validate the exact `.vercel/output/static` artifact as `production`.
6. Capture the current production deployment and candidate asset identity.
7. Deploy with `--prebuilt --prod --skip-domain`.
8. Point `canary.verdaxis.exchange` at that exact candidate.
9. Run the rendered release smoke against the canary.
10. Reconfirm the captured prior deployment is still current, request promotion
    of the same candidate without rebuilding, and follow Vercel's project-level
    alias job to a terminal state.
11. Verify all production domains serve the candidate asset and run the
    rendered smoke against `app.verdaxis.exchange`.

Candidate failure stops the release before users are affected. No build occurs
between canary validation and promotion.

## Automated Diagnosis

The rendered smoke emits one classification:

- `success`: expected bundle, browser, login form, and production API route.
- `frontend_critical`: wrong bundle target, broken required asset, startup
  exception, or maintenance screen without simultaneous dependency or
  transient evidence.
- `dependency_failure`: production API or browser CORS connectivity failure.
- `transient`: timeout, DNS, TLS, or indeterminate browser infrastructure
  failure.

The release report includes only bounded URLs, status codes, asset names, and
error classes. It never includes credentials, cookies, tokens, or response
bodies containing user data.

## Rollback Policy

Candidate failures never require rollback because production has not moved.

After promotion, automatically roll back to the exact captured prior
deployment only when:

1. the same `frontend_critical` failure occurs three times;
2. the production API health endpoint independently returns healthy; and
3. Vercel confirms the candidate is the current production deployment.

Do not automatically roll back for backend failure, one network timeout,
monitor failure, analytics failure, changing market data, authentication
credentials, or mixed frontend/dependency evidence. Those conditions alert an
operator while preserving deployment evidence.

After rollback, verify all production domains serve the prior asset identity
and run the rendered smoke again. A failed rollback verification is a critical
operator incident.

## Canary

`canary.verdaxis.exchange` is a stable Vercel alias and an exact production API
CORS origin. Never allow wildcard `*.vercel.app` origins. If Vercel Deployment
Protection is enabled, the smoke may use `VERCEL_PROTECTION_BYPASS`; the secret
is sent only to the canary frontend origin.

The canary is not a separate build or environment. It always points to the
staged production artifact that will be promoted.

## Incident Path

Use the same serialized workflow for urgent releases. If GitHub Actions itself
is unavailable during an active production incident, use Vercel's manual
rollback to the last verified deployment and record the deployment IDs; do not
run a separate build or bypass the canary pipeline.

Rotate any Vercel token exposed outside protected secret storage before the
next normal production release.
