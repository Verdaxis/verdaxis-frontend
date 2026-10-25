# Deferred onboarding survey and EUR punctuation

## Scope

The email-verification page keeps its existing screens. It saves the verified
email, use case and optional referral source in local storage instead of making
an unauthenticated survey request. Every survey storage operation is guarded.

Both successful branches of `AuthProvider.login` start a best-effort submission
after accepting the user profile. The saved email must match the profile email.
The authenticated API wrapper sends only `use_case` and `referral_source`, with
the in-memory bearer token. Sign-in does not await the request. The wrapper
suppresses the global rate-limit message for this optional submission.

A successful response or any 4xx clears the saved answer. Network failures and
5xx responses keep it for the next sign-in. In-flight requests for one email
are deduplicated, and cleanup does not remove a newer saved answer.

The compliance recommendation parser accepts digits separated by commas or
full stops only when another digit follows. It leaves sentence punctuation
outside the amount.

## Tests and verification

Tests were committed before the implementation because this task writes user
answers and touches sign-in integration. Per the lane rules, no separate RED
host run was made. Tests cover verification persistence, authenticated request
shape, email mismatch, absent/malformed answers, 204/4xx cleanup, retry after
network/5xx failure, non-blocking sign-in, storage failures and EUR punctuation.

The first M1 batch at `73e09be30894e648824afcfbe1d9e214070cd69f`
returned 1 for focused tests and the full unit suite. One fixture blocked
token-storage cleanup during bootstrap as well as survey cleanup. A second
batch at `382a386b105576a780068f53a17839c8e437294b` still blocked legacy
token cleanup and had a TypeScript error in the fixture. The final correction
limits the injected failure to the survey's storage key and gives the original
storage method an explicit callable type. The first batch's typecheck returned
0; both batches' i18n, OpenAPI/API-type checks, builds and artifact checks
returned 0.

The final-head batch uses the same gate set as lane U:

```sh
npx vitest run src/tests/verify-email.test.tsx src/tests/auth-context.test.tsx src/tests/compliance-dashboard.test.tsx
npm test
npm run typecheck
npm run i18n:check
npm run check:openapi
npm run check:api-types
npm run build:staging
npm run build:check:staging
npm run build:prod
npm run build:check:prod
```

All tests and builds run on the separate M1 through `heavy run 3600`, never on
the controller Mac. The detached wrapper log prints the exact SHA, actual host,
UTC times, each command's own exit code and `CALL_EXIT`. The script enables
`pipefail` and aggregates failures. Final evidence is in the controller's
`/private/tmp/fe-small-fixes-gate-3.log`; the completion report states the exact
SHA and result. The public Mapbox placeholder is used only for artifact checks.

No push, deployment, live journey or measurement is authorized or performed.
