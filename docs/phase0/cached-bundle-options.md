# Cached production bundle — PM decision

Source examined: `3f16cabba6424ef08250b32f8f8e4b9a621c4379`.

## Existing controls

- `src/components/DeploymentUpdateNotice.tsx:20–36,43–67`: fetches the current entry HTML on mount, visibility return and every five minutes. A changed hashed entry asset shows a banner. **Only the user's Refresh click reloads** (`:81–84`). There is no server version header or SSE reload command that this bundle honors.
- `src/App.tsx:47–58`: a failed lazy chunk import triggers one reload, guarded by sessionStorage. This does not help when compliance code is already loaded. Do not delete old assets to manufacture failures.
- `src/App.tsx:126–129`: API unavailability renders the maintenance screen. Its Retry invokes `checkAuth`, not `location.reload`. A fence does **not** force old JavaScript to refresh. A tab with no new request may keep showing its old screen.
- Missing refresh sessions eventually require login, but successful login still runs the loaded JavaScript. Token expiry is not a bundle-version control.

## Options and cost

| Option | Cost | Limit / PM decision |
|---|---|---|
| Existing changed-asset banner plus explicit user refresh instructions | No code/backend work; operator communication and verification for active pilot users | Lowest effort. Voluntary refresh; five-minute polling for visible idle tabs. Does not guarantee a short risk window. |
| Hold maintenance fence while operators require every active pilot user to reload the new site | No new backend feature; coordinated downtime and manual confirmation | Safer for a small known pilot. Fence alone does not reload or prove every tab is fresh. PM must approve the operational process. |
| Pre-cutover compatibility frontend release | Separate reviewed release, then verify users loaded it before backend cutover | More release/verification work. Can add forced version enforcement to future sessions, but cannot change an already running old bundle. No release performed here. |
| Accept the old-tab window | No implementation cost; explicit business acceptance and communications | Old compliance can display €0 for unknown ETS costs until reload. Duration is unbounded without user cooperation. Not recommended as an implicit acceptance. |

Recommendation: use the existing update banner with a supervised pilot refresh under the approved maintenance process. Require confirmation before removing the fence. If the pilot population cannot be accounted for, prepare a separate compatibility release and verification step. PM owns this choice; no backend or release change was made.

## Implemented locally

The new bundle keeps null, absent, invalid and non-finite monetary values unknown rather than €0. Scalar map and public price regressions are fixed. The real old-bundle browser gate reproduces the null ETS defect; the new bundle renders it as unknown. No new reload mechanism was added because the pinned old bundle could not honor it.

## PM decision (16 October 2026, 03:22 SGT)

Use the existing changed-asset banner (`DeploymentUpdateNotice`, five-minute polling) and a short "please refresh" note from the founder to the active pilot users right after the cutover. Add both to the Task 11 cutover checklist: (1) the founder sends the note when public access reopens; (2) the operator checks that the new entry HTML is live so the banner appears. Reason: the pilot group is small and known, and on the founder's pilot guidance (no real money at risk, speed first) the PM accepts a short window in which an old tab can show EUR 0 for an unknown ETS cost until the user refreshes. The founder can override this before the cutover. No compatibility release and no supervised per-user refresh. Revisit this if the cutover happens after public launch.
