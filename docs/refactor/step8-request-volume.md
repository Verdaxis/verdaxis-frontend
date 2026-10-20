# Step 8 request volume against the decision 96 baseline

This note records the decision 96 comparison at the Task 8 merge (source
c1b8534c, pinned backend 56d75770, scenario version `step8-v1`, live streams).
The journey run used `--request-volume compare` against
`scripts/journeys/request-volume-baseline.json`. All journeys and all
screenshots passed; the request-volume comparison failed.

## Result at the Task 8 merge

Every count is a browser request attempt; aborted attempts count, as the ledger
defines. Tolerance comes from the baseline policy (zero except `login-success`,
where it is 2).

| Scenario | Baseline | Tolerance | Candidate | Delta |
|---|---:|---:|---:|---:|
| login-success | 11 | 2 | 10 | -1 |
| login-wrong-password | 2 | 0 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 0 | 42 | +5 |
| marketplace-deep-link-slice | 22 | 0 | 24 | +2 |
| place-bid | 19 | 0 | 21 | +2 |
| place-ask | 19 | 0 | 21 | +2 |
| trade-take-confirm-deliver-pay | 45 | 0 | 46 | +1 |
| notifications-list-mark-read | 12 | 0 | 11 | -1 |
| map-ports-eca-overlay | 20 | 0 | 18 | -2 |
| public-landing | 4 | 0 | 4 | 0 |
| public-content-page | 1 | 0 | 1 | 0 |
| window-listings-visible-60s | 7 | 0 | 7 | 0 |
| window-depth-visible-60s | 14 | 0 | 13 | -1 |
| window-hidden-60s-resume | 8 | 0 | 9 | +1 |
| window-live-event-burst | 9 | 0 | 12 | +3 |
| window-live-reconnect | 4 | 0 | 5 | +1 |

`window-hidden-60s-resume` also reaches a route the baseline policy does not
allow: `POST /api/compliance/pricing-overlay`.

## Cause

The growth comes from the Query reads added in Tasks 7 and 8, and it is small
per navigation:

1. Filter changes cancel the in-flight listings read through the Query
   `signal`, then start the read for the new key. The ledger counts the
   cancelled attempt and the new one. Browse filter pagination shows four extra
   asks attempts, one of them cancelled; the deep-link slice shows three extra
   asks attempts.
2. The pricing overlay query key includes the visible ask ids. An orderbook
   invalidation refreshes both the listings and the overlay; when the listings
   answer changes the ids, the overlay query key changes, so the first overlay
   request is cancelled and a second one starts. The three order events in
   `window-live-event-burst` add three such cancelled overlay attempts.

The `GET /api/auth/stream-token` count falls in most scenarios because the
shared token is reused, which partly offsets the additions.

Task 10 should look for savings here as well as in the bundle: do not refresh
the pricing overlay until its ask ids settle, and avoid the extra listings read
when a cached filter key is revisited.

## Result after the fixes

Source c9adb424, same pinned backend, scenario version and command. All
journeys and all screenshot comparisons passed, and the request-volume
comparison passed: every scenario is at or below its baseline. Ledger
`request-volume-20261020-021658` from run `run-20261020-020827`.

| Scenario | Baseline | Tolerance | Before | After | Delta |
|---|---:|---:|---:|---:|---:|
| login-success | 11 | 2 | 10 | 9 | -2 |
| login-wrong-password | 2 | 0 | 2 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 0 | 42 | 35 | -2 |
| marketplace-deep-link-slice | 22 | 0 | 24 | 19 | -3 |
| place-bid | 19 | 0 | 21 | 18 | -1 |
| place-ask | 19 | 0 | 21 | 18 | -1 |
| trade-take-confirm-deliver-pay | 45 | 0 | 46 | 40 | -5 |
| notifications-list-mark-read | 12 | 0 | 11 | 11 | -1 |
| map-ports-eca-overlay | 20 | 0 | 18 | 19 | -1 |
| public-landing | 4 | 0 | 4 | 4 | 0 |
| public-content-page | 1 | 0 | 1 | 1 | 0 |
| window-listings-visible-60s | 7 | 0 | 7 | 5 | -2 |
| window-depth-visible-60s | 14 | 0 | 13 | 14 | 0 |
| window-hidden-60s-resume | 8 | 0 | 9 | 8 | 0 |
| window-live-event-burst | 9 | 0 | 12 | 9 | 0 |
| window-live-reconnect | 4 | 0 | 5 | 4 | 0 |

The overlay growth is gone: no scenario exceeds the baseline policy and the
`POST /api/compliance/pricing-overlay` route that `window-hidden-60s-resume`
once added is no longer outside policy.

### What changed

1. Listings read once per workspace entry. `refetchOnMount: 'always'` and the
   filter-key refetch effect are removed; a mount that starts with cached data
   makes one entry read, and returning to a cached filter inside the same mount
   does not read again.
2. The pricing overlay starts only from a settled listings answer
   (`isFetchedAfterMount && !isFetching`), is excluded from the invalidation
   bridge, and has `staleTime: Infinity`. One distinct set of visible ASK ids
   costs one overlay read, as the pre-Query effect did.
3. The Query-owned catalog reads prime the shared reference cache, so the order
   window's legacy `catalog.products()` and `catalog.deliveryPoints()` calls
   reuse them instead of reading twice.
4. The invalidation bridge owns the read after an order or trade. The duplicate
   explicit refreshes at order-window close and trade success are removed, and
   the first stream event inside the two-second mutation window is served from
   the mutation read, as the legacy read cache did. A later event reads again.
