# Step 8 verification (Task 10)

This record covers the integrated `refactor/fe-step8` branch (Tasks 1 to 9, the
Task 9 review follow-ups and the Task 10 documentation). It lists the commits,
the review, every gate with its host and exit code, the journey and screenshot
results, the decision 96 request counts, the stream counts and the first-load
bytes.

## Sources

| Item | Value |
|---|---|
| Base | `staging` at `1988b9c8` |
| Code under test | `3134e26b` (all source, tests and architecture documentation) |
| This record | the documentation commit after `3134e26b`; it changes no source or test |
| Journey backend | pinned `56d7577085af99411a6f9c3e34e64ad929d09954` (`/home/verdaxis-test/runs/fe-journeys/work/journeys-backend`) |
| Unit and build host | M1 Pro (`verdaxis-m1-test`, Node 24.21.0), `heavy run 3600` |
| Unit parity host | staging VPS (`verdaxis-staging-test`), `heavy run 3600` |
| Journey and screenshot host | prod VPS (`verdaxis-prod-test`), `heavy run 5400` for the three-sample call, `heavy run 3600` for the replacement sample |
| Scenario version | `step8-v1`, live streams, screenshot compare |

Decision 110 applies: this record contains no speed, latency, memory or rate
measurement. It records request counts only.

## Commits in this task

| Commit | Change |
|---|---|
| `28e99a4e` | The cancellation dialog closes when only the session changes during a recovery read. |
| `3cf6c55d` | An organization or Market Support change clears the cancellation messages. |
| `ed44fe79` | The support A→B cancellation test changes the execution store before the provider accepts the new scope. |
| `f7c58173` | The support A→B take test opens a dialog in the new scope and requires it to stay in review after the earlier take completes. |
| `5a9691c9` | The request-construction test name and comment describe the current behavior. |
| `4a2950ce` | The journey request ledger records counts only (decision 110). |
| `332320fb` | The chart-chunk fixture of the artifact checker stays distinct on a case-insensitive file system. |
| `e29ea9e2` | The Task 9 record states the tree that its focused gate used. |
| `3134e26b` | `ARCHITECTURE.md` and `CLAUDE.md` describe Query, refresh and stream ownership. |

Failing-first evidence for the behavior and test changes (M1 Pro):

| Commit | Before | After |
|---|---|---|
| `28e99a4e` | 3 of 14 focused tests fail on `876bbe16` | 14 pass |
| `3cf6c55d` | 2 of 14 fail on `28e99a4e` | 14 pass |
| `f7c58173` | with the completion guard removed, the test fails: expected `confirming`, received `success` | 57 focused tests pass with the guard |
| `4a2950ce` | 1 of 15 ledger tests fails on `5a9691c9` | 15 pass |
| `332320fb` | the artifact test from `4a2950ce` fails on the M1 (1 of 23) | 23 pass |

The full unit gate on `3134e26b` includes every one of these tests.

## Integrated review

1. **Same DOM and classes (decision 61).** `marketplace-structure.test.tsx` and
   `orderbook-structure.test.tsx` check the moved elements and classes. All nine
   screenshot comparisons pass in every complete sample. No file under
   `scripts/journeys/baselines/` differs from `1988b9c8`.
2. **Changed-fetch ledger.** Each changed fetch has a focused assertion. The
   request manifest classifies all 476 pinned and current request sites.

   | Call | Contract row | Assertion |
   |---|---|---|
   | Catalog products and delivery points | `GET /api/catalog/products`, `GET /api/catalog/delivery-points` | `feature-api-contracts.test.ts`: catalog, counts and owned-order request contracts |
   | Role listings | `GET /api/orderbook/asks`, `GET /api/orderbook/bids` | `feature-api-contracts.test.ts`: ASK and BID pagination and public transport policy |
   | Counts | `GET /api/orderbook/product-counts` | `feature-api-contracts.test.ts`: catalog, counts and owned-order request contracts |
   | Snapshot | `GET /api/orderbook/snapshot` | `feature-api-contracts.test.ts`: exact snapshot params and coherent depth |
   | Owned orders | `GET /api/orderbook/my` | `feature-api-contracts.test.ts` (Authorization header); `query-scope.test.tsx` |
   | Overlay | `POST /api/compliance/pricing-overlay` | `feature-api-contracts.test.ts`: POST body and late private scope |
   | Stream token and streams | `GET /api/auth/stream-token`, `GET /api/stream/{orderbook,trades}` | `shared-sse.test.tsx`, `use-sse.test.tsx`; no `prices` subscriber |
   | Take and cancel | `POST /api/trades/`, `POST /api/orderbook/{id}/cancel` | `marketplace-mutations.test.tsx`, `query-scope.test.tsx` |
   | Order modal | `POST /api/orderbook`, `PUT /api/orderbook/{id}` | `order-place-modal*.test.tsx`; mutation matrix (create, update) |
   | Auth refresh | `POST /api/auth/refresh`, `GET /api/auth/me` | existing auth suites; policy unchanged |

3. **Read guards and timers.** The Marketplace and OrderBook containers keep no
   request counters, Symbol maps, cancelled closures or market timers. The
   remaining timers and references are the permitted ones: the take dialog's
   two-second success display, the one-second freshness clock in
   `SnapshotFreshness`, the 10-second visible depth fallback with the tested
   snapshot ordering helper (`snapshotRequests.ts`), the workspace entry-read
   flag in `useMarketplaceQueries`, and the financial execution guards in
   `useTakeTrade` and `useCancelOrder` (frozen request, epoch, captured scope).

## Gates on `3134e26b`

| Gate | Host | Exit | Result |
|---|---|---:|---|
| U | M1 Pro | 0 | 151 files, 1,193 tests; tsgo, tsc, translations, OpenAPI source and types, request manifest tests and inventory |
| U parity, default workers | staging | 1 | 2 of 1,193 tests fail (see below) |
| U parity, one worker | staging | 0 | 151 files, 1,193 tests; all static checks as on the M1 |
| B | M1 Pro | 0 | staging and production builds, both artifact checks and budgets, 23 artifact tests |
| J and V, sample 1 | prod | 0 | 11 journeys, 5 windows, 9 screenshots, decision 96 comparison |
| J and V, sample 2 | prod | 1 | stopped in `trade-take-confirm-deliver-pay` (see below); no ledger |
| J and V, sample 3 | prod | 0 | 11 journeys, 5 windows, 9 screenshots, decision 96 comparison |
| J and V, sample 4 | prod | 0 | 11 journeys, 5 windows, 9 screenshots, decision 96 comparison |
| CI #96 | GitHub | pass | run `39787788825` on `3134e26b` |

**Unit parity.** The M1 and CI pass the unit suite with the default worker
count. On staging the same command failed twice: on `4a2950ce` (same unit tests
as `3134e26b`) 5 tests failed, and on `3134e26b` 2 tests failed
(`marketplace-b100-take.test.tsx`, `product-analytics-tabs.test.tsx`). Each
failure is a wait that expired (element lookups, one URL wait and one
15-second test limit), and the set of failing tests changes between runs. The staging load
average was 12 to 22 on 8 CPUs during these runs. With one worker, the
configuration that the Task 9 staging gates used, the staging run passes all
1,193 tests on `3134e26b`.

**Sample 2.** Sample 2 (`run-20261022-134316`) stopped in
`trade-take-confirm-deliver-pay`: the supplier Trade History table did not
appear within 30 seconds, and the page's notification read reached its client
read timeout. Its browser log has 11 route-handler exceptions
(`APIRequestContext.fetch: read ECONNRESET`, `socket hang up`) in the harness
forward from the browser route to the disposable backend. The backend log of the
same run has no failed or slow request. When the forward raises,
`browser_harness._forward` neither fulfils nor aborts the route, so the browser
request waits for the client timeout. Samples 1, 3 and 4 have no such exception.
Sample 4 replaces sample 2; sample 2 is not used in the count tables.

## Journeys

All eleven journeys and the five fixed windows pass in samples 1, 3 and 4:
`login-success`, `login-wrong-password`, `marketplace-browse-filter-paginate`,
`marketplace-deep-link-slice`, `place-bid`, `place-ask`,
`trade-take-confirm-deliver-pay` (confirmed, delivered, paid),
`notifications-list-mark-read`, `map-ports-eca-overlay`, `public-landing`,
`public-content-page`, and the windows `window-listings-visible-60s`,
`window-depth-visible-60s`, `window-hidden-60s-resume`,
`window-live-event-burst` (three committed orders change the visible listings
with fallback polling disabled) and `window-live-reconnect`.

## Screenshots

Limit 0.002. Values are the difference ratios of samples 1, 3 and 4.

| Screenshot | Sample 1 | Sample 3 | Sample 4 |
|---|---:|---:|---:|
| public-landing-light | 0.000832 | 0.000832 | 0.000832 |
| public-how-it-works-light | 0.000918 | 0.000883 | 0.000894 |
| marketplace-buyer-dark | 0.000295 | 0.000295 | 0.000295 |
| marketplace-buyer-light | 0.000295 | 0.000295 | 0.000295 |
| orderbook-buyer-dark | 0.000303 | 0.000295 | 0.000336 |
| trades-supplier-dark | 0.000295 | 0.000295 | 0.000295 |
| map-buyer-dark | 0.000295 | 0.000295 | 0.000295 |
| map-buyer-light | 0.000295 | 0.000295 | 0.000295 |
| admin-users-dark | 0.000431 | 0.000431 | 0.000431 |

## Decision 96 request counts

Baseline: `scripts/journeys/request-volume-baseline.json` (source `4967a652`,
unchanged), with its policy: a tolerance of 2 for `login-success` and 0
elsewhere, and the route union of the three pre-instrumentation samples in
`request-volume-history.json`. Every count is a browser REST attempt; aborted
attempts count. Ledgers: `request-volume-20261022-134314.json` (sample 1),
`request-volume-20261022-140233.json` (sample 3) and
`request-volume-20261022-143642.json` (sample 4) under
`/home/verdaxis-test/.verdaxis-journeys/` on the prod VPS.

### Per journey and window

| Scenario | Baseline | Tolerance | S1 | S3 | S4 | Max | Max − baseline |
|---|---:|---:|---:|---:|---:|---:|---:|
| login-success | 11 | 2 | 9 | 10 | 9 | 10 | −1 |
| login-wrong-password | 2 | 0 | 2 | 2 | 2 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 0 | 35 | 35 | 35 | 35 | −2 |
| marketplace-deep-link-slice | 22 | 0 | 19 | 19 | 19 | 19 | −3 |
| place-bid | 19 | 0 | 18 | 18 | 18 | 18 | −1 |
| place-ask | 19 | 0 | 16 | 18 | 16 | 18 | −1 |
| trade-take-confirm-deliver-pay | 45 | 0 | 40 | 40 | 40 | 40 | −5 |
| notifications-list-mark-read | 12 | 0 | 11 | 11 | 11 | 11 | −1 |
| map-ports-eca-overlay | 20 | 0 | 19 | 18 | 19 | 19 | −1 |
| public-landing | 4 | 0 | 4 | 4 | 4 | 4 | 0 |
| public-content-page | 1 | 0 | 1 | 1 | 1 | 1 | 0 |
| window-listings-visible-60s | 7 | 0 | 7 | 7 | 7 | 7 | 0 |
| window-depth-visible-60s | 14 | 0 | 14 | 14 | 14 | 14 | 0 |
| window-hidden-60s-resume | 8 | 0 | 8 | 8 | 8 | 8 | 0 |
| window-live-event-burst | 9 | 0 | 9 | 9 | 9 | 9 | 0 |
| window-live-reconnect | 4 | 0 | 4 | 4 | 4 | 4 | 0 |

Every scenario in every sample is at or below its baseline. No sample adds a
route outside the policy.

### Per method and route (sum of the 16 scenarios)

| Bucket | Baseline | S1 | S3 | S4 | Max − baseline |
|---|---:|---:|---:|---:|---:|
| GET /api/auth/me | 2 | 2 | 2 | 2 | 0 |
| GET /api/auth/stream-token | 24 | 14 | 14 | 14 | −10 |
| GET /api/catalog/delivery-points | 7 | 7 | 7 | 7 | 0 |
| GET /api/catalog/products | 7 | 7 | 7 | 7 | 0 |
| GET /api/news | 1 | 1 | 1 | 1 | 0 |
| GET /api/notifications | 16 | 16 | 16 | 16 | 0 |
| GET /api/notifications/unread-count | 16 | 16 | 16 | 16 | 0 |
| GET /api/orderbook/aggregated | 1 | 1 | 1 | 1 | 0 |
| GET /api/orderbook/asks | 24 | 23 | 23 | 23 | −1 |
| GET /api/orderbook/bids | 3 | 2 | 3 | 2 | 0 |
| GET /api/orderbook/map-summary/compact | 1 | 1 | 1 | 1 | 0 |
| GET /api/orderbook/my | 0 | 1 | 1 | 1 | +1 |
| GET /api/orderbook/product-counts | 21 | 19 | 20 | 19 | −1 |
| GET /api/orderbook/snapshot | 8 | 8 | 8 | 8 | 0 |
| GET /api/ports | 1 | 1 | 1 | 1 | 0 |
| GET /api/prices | 1 | 1 | 1 | 1 | 0 |
| GET /api/trade-tape | 4 | 4 | 4 | 4 | 0 |
| GET /api/trades/my | 14 | 14 | 14 | 14 | 0 |
| GET /api/trades/summary | 8 | 8 | 8 | 8 | 0 |
| GET /api/users/me/preferences | 10 | 10 | 10 | 10 | 0 |
| GET /api/vessels | 2 | 2 | 2 | 2 | 0 |
| GET /api/watchlists/{id}/events | 8 | 7 | 7 | 7 | −1 |
| PATCH /api/notifications/{id}/read | 1 | 1 | 1 | 1 | 0 |
| POST /api/auth/login | 9 | 9 | 9 | 9 | 0 |
| POST /api/auth/refresh | 13 | 13 | 13 | 13 | 0 |
| POST /api/compliance/pricing-overlay | 19 | 15 | 15 | 15 | −4 |
| POST /api/orderbook | 2 | 2 | 2 | 2 | 0 |
| POST /api/trades/ | 1 | 1 | 1 | 1 | 0 |
| POST /api/watchlists/me | 8 | 8 | 8 | 8 | 0 |
| PUT /api/trades/{id}/confirm | 1 | 1 | 1 | 1 | 0 |
| PUT /api/users/me/preferences/market_watch | 1 | 1 | 1 | 1 | 0 |

One bucket of one scenario is above the single-run baseline:
`marketplace-browse-filter-paginate` reads `GET /api/orderbook/my` once when
the journey opens My Listings (baseline 0, all samples 1). The route is in the
policy's route union: each of the three pre-instrumentation samples in
`request-volume-history.json` has one such read in this journey. The scenario
total is two below its baseline.

### Streams

Candidate maxima are the most connections open at once for one channel, browser
context and accepted scope, across samples 1, 3 and 4. No scenario opened a
`prices` stream. Every scenario in every sample ends with zero open streams
after its browser contexts close.

| Scenario | Baseline maximum | Candidate maximum | Stream starts (S1, S3, S4) |
|---|---|---|---|
| login-success | orderbook 1, trades 1 | orderbook 1, trades 1 | 4, 4, 4 |
| login-wrong-password | orderbook 1 | orderbook 1 | 2, 2, 2 |
| marketplace-browse-filter-paginate | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| marketplace-deep-link-slice | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| place-bid | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| place-ask | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| trade-take-confirm-deliver-pay | orderbook 2, trades 2 | orderbook 1, trades 1 | 12, 12, 12 |
| notifications-list-mark-read | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| map-ports-eca-overlay | orderbook 1, trades 2 | orderbook 1, trades 1 | 4, 4, 4 |
| public-landing | orderbook 1 | orderbook 1 | 1, 1, 1 |
| public-content-page | orderbook 1 | orderbook 1 | 1, 2, 2 |
| window-listings-visible-60s | orderbook 1, trades 2 | orderbook 1, trades 1 | 1, 1, 1 |
| window-depth-visible-60s | orderbook 1, trades 2 | orderbook 1, trades 1 | 1, 1, 1 |
| window-hidden-60s-resume | orderbook 1, trades 2 | orderbook 1, trades 1 | 1, 1, 1 |
| window-live-event-burst | orderbook 1, trades 2 | orderbook 1, trades 1 | 0, 0, 0 |
| window-live-reconnect | orderbook 1, trades 2 | orderbook 1, trades 1 | 2, 2, 2 |

## First-load bytes

Gzip bytes from the B gate on `3134e26b`. No ceiling changed in Task 10. The
`marketplace` ceiling is the decision FE-B1 value
(`docs/refactor/step8-marketplace-budget.md`).

| Route | Staging build | Production build | Ceiling | Production headroom |
|---|---:|---:|---:|---:|
| landing | 343,961 | 343,963 | 349,400 | 5,437 |
| marketplace | 320,779 | 320,780 | 325,000 | 4,220 |
| intelligence-map | 792,536 | 792,540 | 807,100 | 14,560 |
| command-center | 245,496 | 245,502 | 248,100 | 2,598 |
| compliance | 231,080 | 231,087 | 233,500 | 2,413 |

The `marketplace` first load is 2,183 bytes above the Task 8 production
measurement (318,597) and 12,727 bytes above the step 8 base (308,053).

## Open items

- The journey harness forward (`browser_harness._forward`) does not answer a
  browser route when its fetch to the disposable backend raises. One of four
  samples stopped for this reason. The harness belongs to Task 1.
- On a loaded staging host, the unit suite passes with one worker but not with
  the default worker count. The M1 and CI pass with the default count.
- The `marketplace` first load has not been reduced towards the pre-Query
  value. It is within its FE-B1 ceiling.
- The staging pull request, release and promotion are not part of this task.
