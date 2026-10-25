# Phase 5 Task 11 — lane U client checks and fleet labels

## Scope and status

Completed the fleet label and market read wrapper fixture batch on branch
`feat/rust-phase-5-u`. The tested code commit is
`15550edd36f01b4ba00f9f0e4b83a65d2483f6c9`. The earlier rounds tested
`7c77f7b6a741deb69cec834c35cd12e811fe98c9` and
`9abf973bbb2b8f1d150008bca6546467e51f7910`; their evidence stays below.

No feature API/hooks, journey scripts, compliance cases or architecture files
were changed. No structure or key relationship changed.

## What the code does

Market read wrappers (`src/services/api.ts`):

- Typed producer, availability and demand read wrappers use the shared
  fetch/error handler. Existing wrappers are unchanged.
- Read results keep decimal strings and nullable fields as received.
- Every year bound and limit that the caller sets is sent, zero included, so
  the server decides whether the value is valid.
- The availability and demand types use the existing market source, scope and
  demo status types.
- A 422 or 503 becomes a typed client error for the structured, list and text
  forms of `detail`.

Fleet display (`src/components/DataAnalytics.tsx`):

- The page checks the whole fleet document before any state update. Entries
  must be a list of objects with fuel and color text and non-negative integer
  vessel counts and consumption. Sources must be a list of text. The update
  value must be a calendar date, with an optional time that carries its UTC
  offset.
- A document that fails a check, a 503 and a network failure keep the baseline
  values, labeled as a baseline estimate, with no source or date.
- A date-only update value is shown as received, for example
  `Updated: 2026-05-14`. A value with a time and an offset is shown in UTC.
- Source and date appear only for a checked observation, which is labeled as a
  historical observation. Loading placeholders are not shown as an observation.
- A checked document with no entries shows the empty observation with its
  source and date, not the baseline totals.
- Derived demand is labeled as an estimate in English and Chinese.

## Commits

First round:

- `febfeb9a`: add the typed market read wrappers.
- `597b600c`: add `market_read_wrapper_cases` and `fleet_display_states` fixtures.
- `9891973d`: label the fleet baseline values as estimates, omit the observed
  date/source for baseline and loading states, and label reported observations
  as historical. Update only the authorized wording assertions in
  `data-analytics.test.tsx`.
- `7c77f7b6`: allow the loading-label assertion to read both provenance panels.

Second round:

- `c273a28c`: tests only. Date-only fleet fixtures expect `Updated: 2026-05-14`
  as received; one fixture with a time and an offset expects a UTC time.
  Malformed documents (null or non-text sources, non-numeric, missing,
  negative or fractional counts, a missing consumption figure, fuel or color,
  and update values that are not dates) expect the labeled baseline. The empty
  observation must not show baseline totals. The paywall test checks the
  unlock after the subscription read. Market read fixtures add zero bounds and
  the list and text forms of a 422 `detail`.
- `12edc8b6`: check the whole fleet document before any state update; show a
  date-only value as received; keep source and date only on a checked
  observation; name the unavailable state and its label key `baseline`; use
  neutral empty-observation text in both locales.
- `38272e55`: send zero producer year bounds and a zero demand limit; type the
  availability and demand market labels with the existing market types.
- `9abf973b`: read the fleet document fields into local values first.

Third round:

- `15550edd`: the readiness test in `data-analytics.test.tsx` resolves the
  fleet read with a date-only document, so it covers a checked observation.

Commits that are not green alone:

- `9891973d` alone fails one test, on the duplicate loading label; `7c77f7b6`
  changed that test to read both panels.
- `12edc8b6` alone fails only "sends zero bounds"; `38272e55` makes it pass.

## First round evidence

Host: M1 Pro, Node `v24.21.0`, through `heavy run 3600`.
Local log: `work/gate-u-3.log`.
The call ended at `2026-10-22T13:02:09Z` with `CALL_EXIT=0`.
Individual gate exits, not that outer marker, establish the results below.

| Gate | Checkout and fixture source | UTC start | Result |
|---|---|---|---|
| `npx vitest run src/tests/phase5-read-contracts.test.ts` | Base `4a2950ce`, fixture copied from `7c77f7b6` | 2026-10-22T13:01:29Z | Exit 1; five failures on missing wrapper interfaces |
| `npx vitest run src/tests/phase5-fleet-display.test.tsx` | Tests-only `597b600c`, fixture copied from `7c77f7b6` | 2026-10-22T13:01:30Z | Exit 1; seven assertion failures before the label change |
| Focused fixtures plus `data-analytics.test.tsx` | `7c77f7b6` | 2026-10-22T13:01:39Z | Exit 0; 19 tests passed |

The earlier `gate-u.log` failed during dependency installation, so its later
failures are not RED evidence. The completed third log supersedes those runs.
`gate-u-2.log` shows the GREEN run of `9891973d` noted above.
The untracked `tasks/gate-u.sh` was preserved, not committed or rerun: its outer
exit does not aggregate gate failures and it changes the remote checkout.

Handoff verification on exact code SHA
`7c77f7b6a741deb69cec834c35cd12e811fe98c9`, same host and toolchain.
One fail-fast batched `heavy run 3600` call ran from
`2026-10-22T13:05:23Z` to `2026-10-22T13:05:59Z`.
Local log: `work/gate-u-handoff.log`; final marker `CALL_EXIT=0`.

| Command | UTC exit | Exit/result |
|---|---|---|
| `npm test` | 2026-10-22T13:05:40Z | 0; 153 files, 1,205 tests passed |
| `npm run typecheck` | 2026-10-22T13:05:41Z | 0 |
| `npm run i18n:check` | 2026-10-22T13:05:42Z | 0 |
| `npm run check:openapi` | 2026-10-22T13:05:42Z | 0 |
| `npm run check:api-types` | 2026-10-22T13:05:42Z | 0 |
| `npm run build:staging` | 2026-10-22T13:05:50Z | 0 |
| `npm run build:check:staging` | 2026-10-22T13:05:51Z | 0 |
| `npm run build:prod` | 2026-10-22T13:05:59Z | 0 |
| `npm run build:check:prod` | 2026-10-22T13:05:59Z | 0 |

Builds used `VITE_MAPBOX_PUBLIC_TOKEN=pk.ci-placeholder-for-build-check` for
artifact checks only. No artifact was published. Vite emitted its chunk-size
warning; both artifact budget checks passed. No tests or builds ran on the
controller Mac.

## Second round evidence

One batched `heavy run 3600` call on the M1 Pro (Node `v24.21.0`) ran from
`2026-10-22T13:43:46Z` to `2026-10-22T13:44:42Z`. Local log:
`work/gate-u-fix1.log`; final marker `CALL_EXIT=0`.

| Gate | SHA | UTC end | Exit/result |
|---|---|---|---|
| Focused fixtures plus `data-analytics.test.tsx` (RED) | `c273a28c` | 2026-10-22T13:44:04Z | 1; 18 failed on assertions, 21 passed |
| Same tests (GREEN) | `9abf973b` | 2026-10-22T13:44:06Z | 0; 39 passed |
| `npm test` | `9abf973b` | 2026-10-22T13:44:23Z | 0; 153 files, 1,225 tests passed |
| `npm run typecheck` | `9abf973b` | 2026-10-22T13:44:24Z | 0 |
| `npm run i18n:check` | `9abf973b` | 2026-10-22T13:44:25Z | 0 |
| `npm run check:openapi` | `9abf973b` | 2026-10-22T13:44:25Z | 0 |
| `npm run check:api-types` | `9abf973b` | 2026-10-22T13:44:26Z | 0 |
| `npm run build:staging` | `9abf973b` | 2026-10-22T13:44:34Z | 0 |
| `npm run build:check:staging` | `9abf973b` | 2026-10-22T13:44:34Z | 0 |
| `npm run build:prod` | `9abf973b` | 2026-10-22T13:44:42Z | 0 |
| `npm run build:check:prod` | `9abf973b` | 2026-10-22T13:44:42Z | 0 |

The list and text 422 fixtures, the UTC time fixture, the paywall unlock
check and the null-document case pass on the tests-only commit too; they pin
existing behavior.

## Third round evidence

One batched `heavy run 3600` call on the M1 Pro (Node `v24.21.0`) ran from
`2026-10-22T13:51:45Z` to `2026-10-22T13:52:25Z`. Local log:
`work/gate-u-fix2.log`; final marker `CALL_EXIT=0`. The round changes one test
fixture and no application code, so it has no RED step.

| Gate | SHA | UTC end | Exit/result |
|---|---|---|---|
| `npm test` (single-commit check) | `12edc8b6` | 2026-10-22T13:52:04Z | 1; only "sends zero bounds" failed, 1,224 passed |
| Focused fixtures plus `data-analytics.test.tsx` | `15550edd` | 2026-10-22T13:52:06Z | 0; 39 passed |
| `npm test` | `15550edd` | 2026-10-22T13:52:24Z | 0; 153 files, 1,225 tests passed |
| `npm run typecheck` | `15550edd` | 2026-10-22T13:52:25Z | 0 |

The i18n, contract and build gates of the second round cover the same
application code and were not rerun.

## Compliance batch

Added `src/tests/phase5-compliance-client.test.tsx` with
`compliance_marketplace_cases` and `compliance_dashboard_cases`. The tests use
real compliance client methods with stubbed HTTP responses. Catalog and
orderbook neighbours are isolated; the Marketplace Query adapter, hook and
listing presentation remain real. No application code, query freshness policy,
UI layout or file relationship changed.

Coverage includes all five compliance methods: pricing overlay, fleet, fuels,
vessel score and scenario. Fixtures preserve decimal strings, nullable ETS
values and null overlay entries. Marketplace checks cover sorted unique ASK
ids, no BID overlay, lifecycle/unpriced labels, and removal of a displayed hint
after a null, 422 or 503 result. Dashboard checks cover populated/empty/error
states, illustrative labels, scenario defaults, an explicit year, an exact
generic label and fractions inside/outside the UI tolerance. Mix values within
tolerance pass through unchanged for server normalization.

Local commits:

- `3469f102`: initial compliance response cases, committed before any fix.
- `f369eb1a`: complete response cases and wait for asynchronous presentation.
- `22b085c7`: scope the scenario recommendation assertion to all rendered rows.

This is a tests-only batch. The first two calls exposed fixture/assertion issues,
not an application-code change. No separate RED host call was required.

M1 Pro verification at code SHA
`22b085c79d874fa59c139dd10bb2ec7a0e6e636e`, Node `v24.21.0`, completed on
2026-10-25 from 08:44:03Z to 08:44:44Z. Each command below returned exit 0:

| Gate | Result |
|---|---|
| Focused compliance file | 30 passed |
| `npm test` | 154 files, 1,255 tests passed |
| `npm run typecheck` | 0 |
| `npm run i18n:check` | 0 |
| `npm run check:openapi` | 0 |
| `npm run check:api-types` | 0 |
| `npm run build:staging` and `build:check:staging` | 0 / 0 |
| `npm run build:prod` and `build:check:prod` | 0 / 0 |

Lint was not run: this checkout has no lint script or linter configuration.
The final call marker was `CALL_EXIT=0`. Build checks used the same public
placeholder as earlier rounds; no artifact was published. A final-head repeat
includes this documentation commit; its exact SHA and command exits are retained
in the private completion record. No tests or builds ran on the controller Mac.
No push was made. Contract observations and owner follow-ups are private.

## Deferred work and resume point

- Compliance fixtures are complete for the composed read contracts. Live backend
  journeys remain separate work.
- Live journeys wait for their routes. No journey or screenshot was run.
- Measurements: not run (decision 110).
- CI is not claimed: the current frontend workflow runs on pushes to `staging`
  or `prod`, or pull requests into its configured base branches. This brief
  authorizes only a push of `feat/rust-phase-5-u`, with no pull request.
- The three market read types are not yet pinned to the generated schemas in
  `src/api/contract.test-d.ts`, which this lane does not own.
- The market read types keep decimal strings at the boundary (see the comment
  in `src/services/api.ts`). A mapper, or an entry in
  `docs/refactor/api-type-drift.md`, belongs with the first consumer.
- This record is a documentation-only addition after the tested code SHA.
  Resume with the deferred compliance batch only when the PM authorizes it.
