# Step 8 Task 9: Marketplace actions and mutation invalidation

## Reconnect blocker fix — 22 October 2026

Code commit: `ecc6464e` (`fix(stream): let the public owner recover market reads`).
The first post-fix decision 96 comparison passes all 16 scenarios, including
reconnect **4 → 4**. Focused, final U, B, J and V all pass. No baseline,
volume limit, screenshot, financial guard, or dirty-event rerun rule changed.
Both test hosts report no remaining `fe-step8` units. Task 10 is not started.
**Resume point:** PM review of this reconnect fix and the completed Task 9 gates.

### Cause and ordering evidence

The original baseline and failing candidate ledgers have no per-record clock.
Their archived backend HTTP logs supply the timestamps below (UTC). Request
start estimates subtract the logged request duration from its finish time.

| Evidence | Sequence |
|---|---|
| Baseline `run-20261018-124643` | Fixture POST finishes 12:55:03.293; public stream opens 03.512; counts/ASK finish 04.160/04.258; private stream opens 04.496; no second market pair. |
| Failed candidate `run-20261022-013713` | Public stream opens 01:46:00.448; fixture POST finishes 01.620; ASK/counts start about 01.704/01.864 and finish 01.945/01.972; private stream opens 02.061; second counts/ASK finish 03.000/03.217. |

The public reconnect queues a 500 ms batch. Its read covers the fixture order.
The later private reconnect calls `invalidateReadsForEvent('trades', 'reconnect')`,
which also dirties all public market keys. It does not queue its own public
batch, so it can leave work for a pending batch or a later public event. If it
arrives after the first read started, the bridge correctly refuses to treat that
read as covering the later signal. The redundant *signal*, not the financial
mutation or the required dirty rerun, is the defect.

A temporary instrumented diagnostic (`work/t9-reconnect-trace.log`, exit 0)
observed the opposite ordering: private reconnect at 02:03:22.667, public at
23.034, one batch at 23.535, one market pair at 23.549/23.552. That diagnostic
is not gate evidence or a replacement volume sample. An earlier diagnostic
selected no windows and is explicitly not test evidence. All temporary edits
were removed before RED/GREEN and gates.

### Fix and deterministic regression

The stream manager now gives a **connected public orderbook owner** sole
responsibility for market recovery on a private transport reconnect. That
private reconnect still invalidates `trades:` and delivers its callback. With
no connected public owner, broad recovery remains. Real trade events and
resets retain broad invalidation; the Query bridge is unchanged.

`shared-sse.test.tsx` uses fake timers and real stream/Query integration: public
reconnect, fixture event, completed ASK/counts batch, then late private
reconnect and a queued batch. Parent RED: expected one read, received two
(`work/t9-reconnect-red.log`, `CALL_EXIT=1`). After the fix, that test passes;
another committed order still reads again. Additional cases cover absent and
disconnected public owners, real private events, and overflow resets.
Focused checks: 10 files, 115 tests plus typecheck, exit 0
(`work/t9-reconnect-focused.log`).

### Post-fix gates

- B: exit 0, both builds, both unchanged budget checks, 23 artifact tests
  (`work/t9-reconnect-UB.log`).
- First U: exit 1, 1,165 passed / 2 failed. B100 supplier declaration timed
  out at 15 seconds; green-fuels could not find `Lift Ask`. These failures
  also appear in the prior handoff logs; no timeout or test was changed.
- Final U: exit 0, 151 files / 1,167 tests, both type checks, i18n, OpenAPI,
  API types, and manifest checks (`work/t9-reconnect-U-final.log`;
  `UNIT_EXIT=0`, `U_CHECKS_EXIT=0`, `GATE_U_EXIT=0`, `CALL_EXIT=0`).
  This rerun used unchanged tests and timeouts, with `--maxWorkers=1`.
  The first U failure remains recorded above.
- J: exit 0, all 11 journeys, all 9 screenshots, all 16 volume scenarios
  (`work/t9-reconnect-J.log`). V is covered by J; largest screenshot ratio
  0.000897, below 0.002.
- CI #96: pass on code head `ecc6464e`, run `39711427783`.

J used prod test host `heavy run 3600`, pinned backend
`56d7577085af99411a6f9c3e34e64ad929d09954`, `--screenshots compare`,
`--streams live`, and `--request-volume compare`. U/B/focused checks used
staging test host `heavy run 3600`. No local tests, load tests, or speed tests
ran. Full J evidence: `run-20261022-031725/journeys-report.json` and
`request-volume-20261022-032618.json` under the test user's
`.verdaxis-journeys`; local copies are `work/t9-reconnect-journeys-report.json`
and `work/t9-reconnect-volume.json`.

| Scenario | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| login-success | 11 | 10 | -1 |
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

## Previous checkpoint — 22 October 2026

**Task 9 was blocked on decision 96 request volume. Do not start Task 10.**
The historical green results below predate the final code head. The current
code head is `867950567767c06b7f5fc9fa3a51d7759cfb93ea`, already pushed to
`refactor/fe-step8`. No source change was needed in this continuation.

### Handoff and final verification

The handoff named `bd33931a` and three uncommitted source files. On inspection,
those edits were already committed as `86795056`; the worktree had no tracked
changes. No `fe-step8` test-host unit remained active. Several older logs lacked
`CALL_EXIT=` and are incomplete evidence, not passing gates.

| Gate | Current evidence | Exit / result |
|---|---|---|
| Focused | `work/t9p-focused.log`, current code head | 0; 10 files, 179 tests, typecheck |
| U, earlier attempt | `work/t9p-U.log` | 1; two 15-second timeouts and a missing Lift Ask button |
| U, final | `work/t9-final-UB.log` | 0; 151 files, 1,163 tests; both type checks, i18n, OpenAPI, API types, manifest checks |
| B, final | `work/t9-final-UB.log` | 0; both builds, both budget checks, 23 artifact tests |
| J, argument preflight | `work/t9-final-J.log` | 1; volume requires `--streams live`; no journeys ran |
| J, final | `work/t9-final-J2.log` | 1 overall; all 11 journeys and 9 screenshots pass, volume fails |
| V | Covered by final J's `--screenshots compare` | all 9 pass; largest ratio 0.000860, limit 0.002 |
| CI #96 | [run 39695116100](https://github.com/Verdaxis/verdaxis-frontend/actions/runs/39695116100/job/119550491582) | pass on `86795056` |

The final U call used `npm run test -- --maxWorkers=1` to reduce contention on
the shared staging host. It changed neither the tests nor their timeouts.
All other U checks used the plan's commands. U and B ran in one sequential
`heavy run 3600` call on staging, with `GATE_U_EXIT=0`, `GATE_B_EXIT=0`, and
`CALL_EXIT=0`. J ran through `heavy run 3600` on prod with the pinned backend
`56d7577085af99411a6f9c3e34e64ad929d09954`, `--screenshots compare`,
`--streams live`, and `--request-volume compare`. No load or speed test ran.

The final journey report is
`/home/verdaxis-test/.verdaxis-journeys/run-20261022-013713/journeys-report.json`.
A local evidence copy is `work/t9-final-journeys-report.json`.
The take/confirm/deliver/pay journey passed. All screen ratios remain below
0.002: landing 0.000832, how-it-works 0.000860, admin users 0.000431, and
all six remaining screens 0.000295.

Production gzip bytes / unchanged ceilings: landing 343,945 / 349,400;
marketplace 320,722 / 325,000; intelligence map 792,517 / 807,100;
command center 245,490 / 248,100; compliance 231,069 / 233,500.

### Final decision 96 volume table

Evidence: `request-volume-20261022-014616.json` on the prod test host;
local copy `work/t9-final-volume.json`. This is the complete current-head
sample, not a replacement baseline.

| Scenario | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| login-success | 11 | 9 | -2 |
| login-wrong-password | 2 | 2 | 0 |
| marketplace-browse-filter-paginate | 37 | 34 | -3 |
| marketplace-deep-link-slice | 22 | 19 | -3 |
| place-bid | 19 | 16 | -3 |
| place-ask | 19 | 16 | -3 |
| trade-take-confirm-deliver-pay | 45 | 40 | -5 |
| notifications-list-mark-read | 12 | 11 | -1 |
| map-ports-eca-overlay | 20 | 18 | -2 |
| public-landing | 4 | 4 | 0 |
| public-content-page | 1 | 1 | 0 |
| window-listings-visible-60s | 7 | 5 | -2 |
| window-depth-visible-60s | 14 | 14 | 0 |
| window-hidden-60s-resume | 8 | 8 | 0 |
| window-live-event-burst | 9 | 9 | 0 |
| **window-live-reconnect** | **4** | **6** | **+2** |

The failing reconnect bucket contains one stream-token read, two ASK-list
reads, two product-count reads, and one pricing-overlay read. The scenario
reconnects native streams and creates an order through the fixture API; it
does not invoke the extracted take/cancel mutations. The changes after the
previous green code head only affect take/cancel delegates and take-dialog
error/cleanup handling. These facts locate the observed extra work in the
read/reconnect path, but do not establish its exact timing cause.

Per the plan's budget-failure stop rule, return this failure to the Query /
stream integration owner (Tasks 7–8) or the PM. Do not weaken the decision 96
limit, suppress a required dirty rerun, or rerun until a passing sample hides
the failure. No baseline, source, or screenshot was changed.

### Additional regression evidence since the historical checkpoint

- `bd33931a`: request construction failure reports an error instead of leaving
  take in submitting. Parent failure: `work/t9-buildfail-red.log`, exit 1.
- `86795056`: a replaced session closes the pending take dialog; take and
  cancel send immediately when the browser reports offline instead of queuing
  a reviewed financial write. `work/t9o-red.log` records all three failures
  before the fix, but lacks a caller exit marker. It is supporting evidence,
  not a completed red gate. All three pass in `work/t9p-focused.log` and final U.

**Resume point:** diagnose the reconnect's second listings/counts read against
its event/read ordering without changing the accepted financial guards. Then
repeat the required gates. The present checkpoint is not acceptance of Task 9.

## Historical checkpoint — 20 October 2026

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
