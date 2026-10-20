# Step 8 Task 9: Marketplace actions and mutation invalidation

This record covers Task 9 of the step 8 plan: extract the take and cancel
hooks and complete mutation invalidation. Source is `refactor/fe-step8`, from
`df588e86` to `993fa42b` (this record follows as its own commit). Every gate ran on the test hosts; nothing ran on a
developer machine.

## What changed

1. `useTakeTrade` and `useCancelOrder` own the two financial actions. The
   state machine, frozen request, idempotency key, ETag, review
   digest/version, KYC and demo blocks, product lanes, and the in-flight
   guard moved without redesign. Each hook delegates one attempt per request
   through `marketplaceApi`, with `retry: false`; no write is retried
   automatically and no sent write is aborted on unmount.
2. A write now reports `mutation-start` before it sends and
   `mutation-settled` when it finishes, for success, a known error, and an
   unknown outcome. Before this change both signals arrived as `explicit`, so
   the Query bridge treated the start of a slow write as a reason to read.
   The bridge already separates the two causes: start marks keys stale only,
   settlement schedules one coordinated active read.
3. A take result or a cancel success applies only to the account and
   assisted-workspace scope that sent it. A late answer from organization A
   cannot show success in B or remove B's row.
4. A confirmed cancel removes the row from the my-orders key that showed it,
   not from whatever key is current when the answer arrives.
5. The two-second take-success display stays. Its refresh, the refresh after
   a placed order, and the close refresh are unchanged: the Query
   invalidation bridge owns the read, and only My Listings keeps an explicit
   close refresh.

`OrderPlaceModal` is untouched. Trade history, TradeTape, and the external
order window are not migrated.

## Tests that fail on the parent and pass now

`src/tests/marketplace-mutations.test.tsx` at `df588e86` with the final file:
6 failed, 18 passed. On `993fa42b`: 24 passed, 0 failed.

| Test | Parent | Now |
|---|---|---|
| does not apply a late trade success to the next organization dialog | fail | pass |
| emits mutation-start then mutation-settled for success | fail | pass |
| emits mutation-start then mutation-settled for known error | fail | pass |
| emits mutation-start then mutation-settled for unknown outcome | fail | pass |
| keeps every legacy prefix on a take settlement | fail | pass |
| does not read at mutation start and reads once at settlement | fail | pass |

The remaining cases pass on the parent because they characterize behavior the
existing code already had and the move must not change: one POST on a double
final click, no automatic retry after an unknown outcome, byte-equivalent
frozen retry, auth-generation and support A→B blocks, 412/428 stale reload,
row removal only on confirmation, missing digest, KYC, demo, and the event
race.

Two cases pass on the parent for a different reason and are kept as
characterization: a late cancellation success happened to target the old key
because the parent's setter captured it, and the support A→B guard already
existed.

## Gates

| Gate | Command | Result |
|---|---|---|
| Focused | new file, query scope, lifecycle, green-fuels, typecheck | exit 0, 95 passed |
| U | full unit, both type checks, i18n, OpenAPI, API types, manifest | exit 0, 1159 passed |
| B | staging and prod builds, budget check, artifact check | exit 0 |
| J | eleven journeys, nine screenshots, live streams, volume compare | exit 0, all pass |

Screenshots (all at or below 0.002): public-landing-light 0.000832,
public-how-it-works-light 0.000882, marketplace-buyer-dark 0.000295,
marketplace-buyer-light 0.000295, orderbook-buyer-dark 0.000306,
trades-supplier-dark 0.000295, map-buyer-dark 0.000295,
map-buyer-light 0.000295, admin-users-dark 0.000448.

The take→confirm→deliver→pay journey reached PAID
(`trade d92485c4 ... confirmed -> delivered -> paid`).

Bundle (gzip): marketplace 320,686 / 325,000; landing 343,934 / 349,400;
intelligence-map 792,502 / 807,100; command-center 245,487 / 248,100;
compliance 231,061 / 233,500.

## Request volume against decision 96

Sample `request-volume-20261020-183001`, run on the prod test host with the
pinned backend `56d75770`. Every scenario is at or below its baseline.

| Scenario | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| login-success | 11 | 10 | -1 |
| login-wrong-password | 2 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 34 | -3 |
| marketplace-deep-link-slice | 22 | 19 | -3 |
| place-bid | 19 | 18 | -1 |
| place-ask | 19 | 16 | -3 |
| trade-take-confirm-deliver-pay | 45 | 40 | -5 |
| notifications-list-mark-read | 12 | 11 | -1 |
| map-ports-eca-overlay | 20 | 18 | -2 |
| public-landing | 4 | 4 | 0 |
| public-content-page | 1 | 1 | 0 |
| window-listings-visible-60s | 7 | 5 | -2 |
| window-depth-visible-60s | 14 | 13 | -1 |
| window-hidden-60s-resume | 8 | 8 | 0 |
| window-live-event-burst | 9 | 9 | 0 |
| window-live-reconnect | 4 | 4 | 0 |

`trade-take-confirm-deliver-pay` matches the accepted run at 40. No scenario
grew between the accepted run and this one: the mutation-cause change adds no
read, and the write the journey performs still settles into one bridge read.

## Commits

- `e711cc04` fix(api): carry the mutation cause through write invalidation
- `d78c87bd` refactor: isolate Marketplace actions with safe Query invalidation
- `4f92e265` test(marketplace): pin every legacy prefix on a take settlement
- `993fa42b` fix(marketplace): keep the private key current when a session is replaced
- `d83aa4f0` docs: record the Task 9 mutation and volume results

CI on PR #96 is green on each pushed head; the final run is recorded on the
pull request.
