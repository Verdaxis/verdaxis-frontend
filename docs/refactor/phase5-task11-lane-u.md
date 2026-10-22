# Phase 5 Task 11 — lane U client checks and fleet labels

## Scope and status

Completed the fleet label and market read wrapper fixture batch on branch
`feat/rust-phase-5-u`. The tested code commit is
`7c77f7b6a741deb69cec834c35cd12e811fe98c9`.

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

Host: M1 Pro, `1234ui-MacBookPro`, Node `v24.21.0`, through
`verdaxis-m1-test` and `heavy run 3600`. Local log: `work/gate-u-3.log`.
The call ended at `2026-10-22T13:02:09Z` with `CALL_EXIT=0`.
Individual gate exits, not that outer marker, establish the results below.

| Gate | Checkout and fixture source | UTC start | Result |
|---|---|---|---|
| `npx vitest run src/tests/phase5-read-contracts.test.ts` | Base `4a2950ce`, fixture copied from `7c77f7b6` | 2026-10-22T13:01:29Z | Exit 1; five failures on missing wrapper interfaces |
| `npx vitest run src/tests/phase5-fleet-display.test.tsx` | Tests-only `597b600c`, fixture copied from `7c77f7b6` | 2026-10-22T13:01:30Z | Exit 1; seven assertion failures before the label change |
| Focused fixtures plus `data-analytics.test.tsx` | `7c77f7b6` | 2026-10-22T13:01:39Z | Exit 0; 19 tests passed |

The earlier `gate-u.log` failed during dependency installation, so its later
failures are not RED evidence. The completed third log supersedes those runs.
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

## Deferred work and resume point

- Compliance fixtures wait for Tasks 8a, 9 and 10 and renewed lane authorization.
- Live journeys wait for their routes. No journey or screenshot was run.
- Measurements: not run (decision 110).
- CI is not claimed: the current frontend workflow runs on pushes to `staging`
  or `prod`, or pull requests into its configured base branches. This brief
  authorizes only a push of `feat/rust-phase-5-u`, with no pull request.
- This record is a documentation-only addition after the tested code SHA.
  Resume with the deferred compliance batch only when the PM authorizes it.
