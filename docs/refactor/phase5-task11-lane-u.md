# Phase 5 Task 11 — lane U client checks and fleet labels

## Scope and status

Completed the fleet label and market read wrapper fixture batch on branch
`feat/rust-phase-5-u`. The first round tested code commit
`7c77f7b6a741deb69cec834c35cd12e811fe98c9`. The review fix round below
supersedes it: its tested code commit is
`9abf973bbb2b8f1d150008bca6546467e51f7910`.

- `febfeb9a`: add typed producer, availability and demand read wrappers through
  the shared fetch/error handler. Existing wrappers are unchanged. New read
  results retain decimal strings and nullable fields.
- `597b600c`: add `market_read_wrapper_cases` and `fleet_display_states` fixtures.
- `9891973d`: retain fleet baseline values, label them as estimates, omit observed
  date/source for fallback and loading states, and label reported observations
  as historical. Mark derived demand as an estimate in English and Chinese.
  Update only the authorized wording assertions in `data-analytics.test.tsx`.
- `7c77f7b6`: allow the loading-label assertion to read both provenance panels.

No feature API/hooks, journey scripts, compliance cases or architecture files
were changed. No structure or key relationship changed.

## RED evidence recovered from the previous session

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
In `gate-u-2.log`, the GREEN run before `7c77f7b6` failed one test, on the
duplicate loading label. `7c77f7b6` changed that test to read both panels, so
`9891973d` alone is not green and `7c77f7b6` is the tested SHA of that round.
The untracked `tasks/gate-u.sh` was preserved, not committed or rerun: its outer
exit does not aggregate gate failures and it changes the remote checkout.

## Fresh handoff verification

Host and toolchain as above; exact code SHA
`7c77f7b6a741deb69cec834c35cd12e811fe98c9` was checked before the gates.
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

## Review fix round

The independent review asked for honest dates, a check of the whole fleet
document, and a public record without host identity. Commits:

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
  observation; rename the unavailable state and its label key to `baseline`;
  use neutral empty-observation text in both locales.
- `38272e55`: send zero producer year bounds and a zero demand limit; type the
  availability and demand market labels with the existing market types.
- `9abf973b`: read the fleet document fields into local values first.

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
check and the null-document case pass on the tests-only commit too: they
cover behavior that was already correct.

## Deferred work and resume point

- Compliance fixtures wait for Tasks 8a, 9 and 10 and renewed lane authorization.
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
