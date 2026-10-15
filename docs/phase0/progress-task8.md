# Phase 0 Task 8 — frontend and release convergence

## Status and resume point

Initial implementation is at `64b75d31`; review fixes are at `cc2bc5d6` and
`a20b48af`. **The final Task 8 acceptance gate remains blocked.** The real old
and new bundles now run against Task 3 backend
`4a61ab277323797010a462906728c149e5de3341` on disposable PostgreSQL/PostGIS.
The old bundle's null ETS display defect remains a PM cutover decision. This
backend does not yet include Task 4b's union migration.

Next: use the contract results below, resolve the cached-bundle decision in
`cached-bundle-options.md`, then rerun the gate against the final union schema.
No production/staging host operation, push, Vercel invocation or deployment occurred.

## Source and decisions

- Frontend base: `3cfeac54e1aaf662cf4f48a3bf3243c445d8a087`.
- Production source read with `git show`:
  `3f16cabba6424ef08250b32f8f8e4b9a621c4379`. No wholesale merge or checkout.
- Backend Task 2: `486379c`; policy digest
  `fbe6fb695a983267d0f7db973e3aac8b8b0ba803543ef7327756bde7e953bb20`.
- B30: `c4cecebc-3d2d-5840-8021-57a9a11bc673`, 200 MT, RF 380.
- B100: `74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5`, 200 MT, DFA/no HVO.
- UCOME_B100: `e561e43f-d9b2-598e-981c-f1d28d515ddc`, typed FAME, 1 MT,
  Singapore. Bio-LNG retains staging typed terms and Rotterdam-only admission.
- No activity tracker, activity drawer, consent hooks or delivery queue was ported.
  Ordinary analytics and market SSE remain. No KYC gate setting was changed.
- No lockfile changes, new application dependency, Rust work or backend edits.

## Test-first evidence

1. Added the two Task 8 Vitest files and release pytest file before implementation.
   Initial result: missing biofuel module; saved B30 selection failed; all three
   release tests failed because the release workflow/script were absent.
2. Plain `npm ci` failed on the existing React 19 / React Joyride peer conflict.
   `npm ci --legacy-peer-deps`, documented in ARCHITECTURE.md, installed 300 locked
   packages. npm reported 8 advisories (2 moderate, 6 high). No audit fix was run.
3. Node here is 25.4.0, not the documented Node 24. Its experimental localStorage
   broke collection. All reported Vitest runs use
   `NODE_OPTIONS=--no-experimental-webstorage` to use jsdom storage.
4. Ported production scalar ASK vectors: 3 failed before implementation, then all
   passed. Added explicit zero-CI coverage; blank CI remains invalid.
5. Scalar and typed market regression subset: 110 passed at the first port gate.
   Final modal suite: 49 passed. Separate commits followed passing checks.

## Final local checks

| Check | Result |
|---|---|
| `npm test` with the Node option above | 127 files, 913 tests passed; no skips |
| Task 8 two named Vitest files | 2 files, 9 tests passed |
| `npm run typecheck` | Passed |
| `npm run i18n:check` | Passed, all translations complete |
| `npm run lint` | Not available: no lint script or ESLint configuration |
| `python3 -m pytest scripts/test_phase0_release.py scripts/test_smoke_release.py -q` | 13 passed |
| `bash scripts/release-vercel.sh --self-test` | Passed; offline rollback/alias checks |
| `npm run test:artifact-check` | 10 passed |
| `node --test scripts/phase0-request-manifest.test.mjs` | 4 passed |
| `npm run build:staging` + `build:check:staging` | Passed |
| `npm run build:prod` + `build:check:prod` | Passed |
| Local Chromium public smoke, each build | 8 checks per build, 16 total; no page errors or activity calls |
| `git diff --check` | Passed |

The release self-test initially concealed a Bash 3.2 empty-array error through its
EXIT cleanup. The self-test now disables that cleanup and expands its optional
argument array portably; the final pytest/self-test results above are real.

Builds used `VITE_MAPBOX_PUBLIC_TOKEN=pk.phase0-local-synthetic`. These artifacts
are local test output, **not publishable**. No Mapbox access check ran. The release
workflow retains the real Mapbox gate. Browser routing blocks all non-loopback
traffic and supplies synthetic API responses. No login credentials or customer
screenshots were used. Browser tests cover English/Chinese landing pages, the
energy calculator and producer map at 390/1440 px. External map tiles are blocked.

Artifact digests are SHA-256 over sorted JSON of relative file paths and each
file's SHA-256, using Python `json.dumps(..., sort_keys=True)`:

- Staging: `125c7a71c12433524e912df973fabbb13faff956f6a6cbfdb700e55ca4ee0e8a`.
- Production: `c0bad69746a788448698d59e4c3df3af9198be3276cd1a6cca1f40971b03e576`.

The artifact checker proves the intended API origin and rejects mixed/local
origins. Hash lists and logs remain under uncommitted `work/phase0/`.

## Request inventory and cutover scope

`request-manifest.json` records 481 request sites across pinned production,
pinned staging and current source. `request-contract.json` classifies exact
method/path templates, including direct fetch, wrappers, AI and SSE. The extractor
uses the TypeScript AST and resolves local URL variables. It scans non-test,
non-archive source conservatively (including unused wrapper methods), rather than
claiming a precise runtime call graph. New unknown routes and dynamic adapters
fail closed. Query values and product-bearing payloads require behavioral tests;
the inventory alone does not prove backend compatibility.

`phase0-pinned-client.ts` executes the immutable production API wrapper in an
isolated VM with browser primitives and the shared transport dependencies. This
is a **pinned client-module test, not execution of the entire cached old bundle**.
It checks preferences, old RFQ history, disabled accept (409), notification shape,
null compliance values and one retired activity 404 without retry. The new client
has no activity or stale RFQ decline/counter/seller-accept methods. New revisions
use PUT with `expected_revision`. Existing typed FAME/LNG suites remain intact.
Re-login after absent refresh sessions is tested through AuthProvider.

## Explicit production public-content inventory

Ported changed public pages: BuyerUseCasePage, ComplianceInfoPage,
EducationArticlePage, EducationPage, EnergyCalculatorPage, FinancierUseCasePage,
HowItWorksPage, LandingPage, PartnerLandingPage, PartnerShowcasePage,
ProducerMapPage, ProducerUseCasePage, RoadmapPage and TraderUseCasePage. Their
changed production tests were ported and the landing count updated to eight.

Ported public components: DataOcean, HeroSection, PublicLanguageWrapper and the
new ProducerDatasetNotice. Ported data: calculatorDefaults, educationArticles,
producerProjects. Locales: en/zh public and education; only dataset fuel labels
from dashboard, scalar b30/b100 keys from trading, and reminder keys from common.
No production admin/activity locale or authenticated compliance wording replaced
staging's corrected calculations. Public calculator wording remains explicitly
illustrative and does not claim FuelEU compliance or CII calculation.

Build relationships: publicPageLoaders, prerender/renderPublicRoute, routeMetadata,
RouteMetadata, index bootstrap, Vite, index.html and vercel.json. App.tsx changes
are limited to public loader/preparation integration; typed market/history routes
remain. Production's initial render uses createRoot after preload, not hydrateRoot.

## Release procedure

The prior pinned production procedure is retained in
`docs/vercel-production-release.md` with the canonical source changes. The workflow
checks out the explicit full source SHA, fetches staging and requires exact tip
and HEAD equality before build. Both SHA inputs are validated. The script builds
one immutable candidate, records prior deployment ID, checks exact backend SHA
readiness before canary and promotion, then promotes that candidate. Candidate-only
still defaults to true. Existing project/org, Mapbox, alias and dependency-aware
rollback checks remain. Staging builds separately with its own API URL.

No candidate-reuse subsystem was added. Do not run the release workflow in this
task. The staging build helper now rejects production publication/build requests
in favor of the existing protected release path.

## Required Task 3 and final-gate rechecks

- Real login, GET/PUT `/auth/me` profile equivalence; explicit NOT_APPLICABLE for
  nontraders; gate-off behavior still denies rejected and moved-review users.
- Missing copied refresh sessions require re-login, without refresh loops.
- LNG strict booleans reject strings and numbers; scalar certification derivation
  matches production; public identities stay redacted; WTT never becomes lifecycle CI.
- Notification list and unread count exclude `_email_only`; no `_email_*` field
  leaks. Reminder dedup/lease preservation is backend-owned, not proved by these mocks.
- Match dismissal remains admitted cleanup, not execution-gated.
- Real B30/B100/UCOME catalog IDs, minimums, all entry paths and saved preference
  namespaces against the final union backend, including old copied RFQs.
- KYC storage 503/decryption 500 and uncertain proxy 504 behavior still need the
  integrated backend/browser fault test; no new KYC admin feature was added.
- **Run the complete cached production bundle and new bundle against the disposable
  canonical backend.** Current browser evidence covers only new public bundles
  with synthetic route interception. Retired activity 404 is expected, not an outage.
- Repeat release candidate checks with the approved actual backend identity and
  real public Mapbox token only after separate release authorization.

Live smoke, Vercel release, staging/prod access and real-data testing were not run,
as explicitly prohibited. Skills and agents were not used.


## Independent-review fixes and real backend gate (2026-10-16)

### Fixes

- `cc2bc5d6`: M2 restores scalar B30/B100 guards in map selection and All-products
  reference fallback, including forecast supply and external methanol prices.
  N1 restores public scalar demo prices without inventing UCOME/LNG prices.
  Four new regression cases failed before the fix; all 16 focused tests passed.
- `a20b48af`: N2 uses and asserts `eligible`, `KYC_NOT_ENFORCED` and nullable
  `grace_expires_at`. M1's existing null guard passed; new absent/invalid-cost
  tests failed before fixing currency formatting. All eight focused tests passed.
- `2c62a24b`: the eligibility union includes `KYC_NOT_ENFORCED`. TypeScript excludes
  `work/`: archived old source plus generated bundles otherwise exhausted its 4 GB
  heap. Ordinary typecheck passed after this scope correction; no heap increase.
- M1 old tabs: see [cached-bundle-options.md](cached-bundle-options.md). The old
  update banner is voluntary; maintenance Retry does not reload. PM must choose
  supervised refresh, a separate compatibility release, or explicit risk acceptance.

### Reproduce the real gate

```bash
work/phase0/browser-venv/bin/python scripts/phase0_gate.py \
  --backend /Users/jonathanjie/Documents/workspace/Verdaxis/work/phase0-task3
```

Browser environment uses the existing pinned Playwright 1.58.0 installation.
Backend uses that lane's `venv/bin/python`, SHA
`4a61ab277323797010a462906728c149e5de3341`. Its tracked tree remains unchanged.
The runner starts a unique Colima Docker container, numeric-loopback ephemeral
ports, pinned PostGIS digest `49b4d46c9fb8b158ddecd14d1894871a21ed4acb7ef376e2050f43f79c7b7272`,
and real Alembic migrations. It creates only synthetic approved organizations,
users, notifications, a vessel and catalog rows. It does not patch SQL constraints
or the trade function. The fixture-only provenance helper is restricted to the
runner's disposable database. Application/migration connections are non-superuser;
only synthetic fixture setup uses the local database administrator.

Backend processes inherit an allowlisted environment and a socket guard that allows
only their owned database. No backend `.env` is loaded. The browser loads complete
old/new bundles. API requests are forwarded to loopback with actual response bodies;
all other external requests are aborted. SSE is blocked rather than simulated.
This does not test deployed CORS, external tiles, SSE replay or every UI order form.
UI login, navigation, refresh-loss and compliance rendering use actual application
code. Additional contract probes execute fetch in that browser. They are not a claim
that the old UI supports new typed UCOME entry. Old package versions were compared
with the installed lockfile: every pinned package version matches; the installed
tree has additional staging packages. Both builds use an unpublishable synthetic
Mapbox token. No live request, deployment or release workflow was run.

Final completed run: `work/phase0-gate-07c5512a1e/result.json`.
**54 checks: 49 passed, 5 failed; exit 1.** The frontend runtime fixes are those in
`a20b48af`; the later type-only change and work exclusion do not change runtime JS.
The report records its starting HEAD. Earlier runs corrected harness path, role,
synthetic email, OAuth encoding and trailing-slash issues; they are not product
failures. All runner-owned containers were removed with `docker rm -f -v`.

| Contract | Old production bundle | New bundle |
|---|---|---|
| Real UI login; GET/PUT profile eligibility | Pass | Pass |
| GET preferences / PUT `market_watch`, B30/B100/LNG/UCOME | Pass | Pass |
| Visible reminder, hidden email-only row, private fields, unread count | Pass | Pass |
| Canonical B30/B100/UCOME UUIDs | Pass | Pass |
| Typed LNG BID, scalar scheme labels, strict boolean refusal | Pass | Pass |
| Typed UCOME BID | Pass (explicit browser contract probe) | Pass |
| LNG/UCOME dismissal and repeated dismissal | Pass | Pass |
| B30/B100 BID and scalar ASK, zero lifecycle CI | Pass | Pass |
| Scalar RFQ create/detail, disabled acceptance (409), PUT quote revision | Pass | Pass |
| Marketplace B30/B100 and compliance route rendering | Pass | Pass |
| Unknown ETS value rendered as unknown | **Fail: €0** | Pass |
| Activity | Expected retired 404 responses | Zero calls |
| Refresh-cookie loss returns to login | Pass | Pass |
| B30 direct take | **500** | **500** |
| B100 direct take | **500** | **500** |

Database log for all direct-take failures:
`trade product snapshot must reference an active canonical product`,
SQLSTATE `P0001`, `verdaxis_validate_trade_snapshot()`, line 25. The old function
comes from `alembic/versions/blng_20261014_staging.py:153` and does not admit the
union scalar identities. This is the expected missing Task 4b integration, now
proved through real requests. Do not relax the frontend or bypass the trigger.

### Remaining gate coverage / resume

B1 remains blocked, not waived. Integrate Task 4b and rerun scalar execution and
full old/new acceptance. The current runner does not yet prove copied historical
RFQ rows, all supplier FAME/LNG identity snapshots, admin/no-org/rejected/moved
profile cases, pending-KYC dismissal, KYC storage faults, or every order-entry UI.
Retain these as explicit remaining cases rather than interpreting 49 passing
checks as final acceptance. Task 3 unit evidence is not browser evidence.

### Final local verification

- Full Vitest: 127 files, **918 passed**, no skips; Node 25 webstorage disabled.
- Task 8 named Vitest files: **9 passed**.
- Typecheck and translation check: passed.
- Both environment builds and target artifact checks: passed; large-chunk warnings
  remain. Artifacts under `work/task8-fix-{staging,production}` are not publishable.
- Manifest/artifact Node suites: **14 passed**.
- Release/smoke/local-gate Python suites: **16 passed**, including offline shell
  self-test. No release mode was invoked.
- `git diff --check`: passed. No backend tracked changes, push or live access.
