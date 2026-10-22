# Step 8 Task 9: Marketplace mutation interfaces and verification

## Scope

Task 9 extracts Marketplace take and cancellation actions and connects mutation
settlement to the Query invalidation bridge. Task 10 is not included.

## Interfaces

- `useTakeTrade` owns the take dialog state, review, one-attempt submission,
  explicit retry, and two-second success display.
- `useCancelOrder` owns cancellation review, one-attempt submission, explicit
  retry, owned-order recovery reads, and confirmed row removal.
- `marketplaceApi.takeTrade` and `marketplaceApi.cancelOrder` delegate to the
  shared API client. Mutations use `retry: false` and `networkMode: 'always'`.
- Reviewed requests retain their payload, idempotency key, ETag, terms digest,
  and applicable order version. Completion uses the captured execution scope.
  Sent writes are not aborted on unmount.
- API writes emit `mutation-start` and `mutation-settled`. Start marks affected
  Query keys stale; settlement schedules their coordinated refresh. A market
  event can require one dirty rerun.
- The public market batch owner coordinates market reconciliation. A connected
  public stream owns transport recovery; private recovery uses that same batch
  owner when the public stream is absent or disconnected.
- The order modal remains external. Placed orders refresh through the bridge.
  The modal close callback explicitly refreshes only My Listings.

## Test interfaces

| Suite | Behavior-based test names / cases |
|---|---|
| `marketplace-mutations.test.tsx` | one POST for repeated final confirmation; explicit frozen retry; reviewed quantity retained after input change; same-user organization switch; support A→B completion; auth-generation retry guard; offline dispatch; ETag; 412/428; demo and KYC guards |
| `marketplace-mutations.test.tsx` | `reconciles listings, counts, snapshot and my-orders for $action / $outcome`: take/create/update/cancel × success/known error/unknown outcome |
| `query-scope.test.tsx` | `keeps the current cancellation dialog after %s changes during %s recovery`: organization/support × 412/428/missing-version |
| `shared-sse.test.tsx` | `reconciles active market queries once when the public owner is %s`: absent/disconnected; connected-public recovery; committed event and reset handling |
| Product and modal suites | B100, Bio-LNG, green-fuel lanes, order modal, KYC execution, trade history |

## Verification record

All tests and builds run on the designated test hosts through `heavy run 3600`.
Focused, U and B use staging. J uses prod and the pinned journey backend
`56d7577085af99411a6f9c3e34e64ad929d09954`. No local tests, load tests or speed
measurements are part of this round. Decision 96 limits and baselines are unchanged.

| Checkpoint | Focused | U | B | J | V |
|---|---:|---:|---:|---:|---|
| Prior code `ecc6464e` | 0 | 0 (1,167 tests) | 0 | 0 (11 journeys) | J: 9 comparisons, all within 0.002 |
| Review round `8754a997` | 0 (214 tests; pre-commit working tree based on `2c832279`) | 0 (1,190 tests) | 0 | 0 (11 journeys) | J: 9 comparisons, all within 0.002 |

The review-round checks completed on 22 October 2026. U includes both TypeScript
checks, translations, OpenAPI source/types and request classification. B includes
both target builds and artifact checks. J includes live streams, screenshot
comparison and the decision 96 request-volume comparison.

The host call logs confirm U, B and J exit code 0. Their results were recovered
after the SSH interruption; no test rerun was needed. CI #96 passed on `8754a997`
(run `39722997448`). The final record commit uses the same code and test tree;
its CI result is checked after publication. Task 9 implementation and host gates
are complete. Task 10 requires a separate brief.

## Decision 96 volume record

Review round `8754a997`, all 16 scenarios at or below the unchanged baseline.
Candidate backend: `56d7577085af99411a6f9c3e34e64ad929d09954`. The comparison
includes route allowlists and stream lifecycle checks, not only REST totals.

| Scenario | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| login-success | 11 | 9 | -2 |
| login-wrong-password | 2 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 35 | -2 |
| marketplace-deep-link-slice | 22 | 19 | -3 |
| place-bid | 19 | 18 | -1 |
| place-ask | 19 | 18 | -1 |
| trade-take-confirm-deliver-pay | 45 | 40 | -5 |
| notifications-list-mark-read | 12 | 11 | -1 |
| map-ports-eca-overlay | 20 | 19 | -1 |
| public-landing | 4 | 4 | 0 |
| public-content-page | 1 | 1 | 0 |
| window-listings-visible-60s | 7 | 7 | 0 |
| window-depth-visible-60s | 14 | 14 | 0 |
| window-hidden-60s-resume | 8 | 8 | 0 |
| window-live-event-burst | 9 | 9 | 0 |
| window-live-reconnect | 4 | 4 | 0 |
