# Step 5c — API type drift verification

Base: `c3633f702d5ed01ed2e01f6906a7e67015d7283c`, branch `refactor/fe-type-drift`.
All builds and tests ran through `verdaxis-prod-test "$PWD"` on the VPS test user,
after the Rust measurement wait and under the shared heavy lock. No local build
or test ran. No baseline was re-recorded. Nothing was pushed or deployed.

## Changes

| Group | Change | Dead branches |
|---|---|---|
| DRIFT-2 | Required order/trade `unknown_count` derives from the wire. | None. No UI reader added. |
| DRIFT-3 | Order/trade provenance, required order metadata and free-string fuel grade derive from wire types. `MarketSourceKind` includes `LIVE_INVENTORY`; creation method is a string. | No runtime branch removed. Empty terms digests, invalid versions and malformed responses still need guards. `certifications` stays required because its existing mapper supplies `[]`. |
| DRIFT-4 | Owner metadata derives from `WireOwnedOrder`, including nullable etag/vessel. `/orderbook/my` declares `OwnedOrderBookOrder[]`. The public compatibility view remains optional. | None; public price context and assisted-cancel guards remain. |
| DRIFT-5 | `User` and eligibility alias the wire. Removes nonexistent email verification, adds referral code, corrects presence/nullability. | None; relaxing the login validator could change fallback requests. |
| DRIFT-6 | Window type derives the wire string; trade accepts nullable wire windows. Removes canonical-code-to-display-union assertions. | Type assertions only; no emitted branch changed. Existing mapper null normalization and all labels remain. |
| DRIFT-7 | Required summary fields derive the wire; product non-decimals, delivery points and notifications derive/alias generated types. Notification payload is a nullable unknown-valued map. | None; catalog guards cover absent products, empty lanes, future modes and malformed responses. |

All resolved negative blocks were replaced with positive pins under “Shapes that
already agree”. Mapper output and requests are unchanged. Catalog membership
uses the same `includes` call with a widened type-only receiver assertion.

## Founder decisions

1. Whether and where to display `unknown_count`.
2. Whether richer provenance should replace current order/trade labels or analytics.
3. Whether to separate all public/owner consumers and remove public owner metadata.
4. Whether to relax login profile validation or reuse its referral code (request changes).
5. Window display vocabulary and legacy-label policy.
6. Whether to display summary product names or change future catalog/notification fallback handling.

The unused port method, auto-match panel and shipping/freight decimal families
remain explicitly recorded follow-up scope; they are outside the named entries.

## Gates and command exit codes

Full run: `work/final-gates.log`. Final test/type rerun: `work/test-rerun.log`.
The checked script is `docs/refactor/step5c-evidence/step5c-gates.sh`.

| Command | Exit |
|---|---:|
| `npm ci --legacy-peer-deps` | 0 |
| `npm test` | 0 on final rerun: 135 files, 1006 tests |
| `node --test scripts/phase0-request-manifest.test.mjs` | 0 |
| `npm run check:openapi` | 0 |
| `npm run check:api-types` | 0 |
| `npm run test:artifact-check` | 0 |
| `npm run test:openapi-source` | 0 |
| `npm run test:release-smoke` | 0 |
| `npm run typecheck` | 0 in full run and final rerun |
| `npm run i18n:check` | 0 |
| `npm run build:staging` | 0 |
| `npm run build:check:staging` | 0 |
| `npm run build:prod` | 0 |
| `npm run build:check` | 0 |
| `node scripts/check-build-artifacts.mjs --report --root dist` (production) | 0 |
| `VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only npm run build` | 0 |
| `node scripts/check-build-artifacts.mjs --report --root dist` (default build) | 0 |
| `npm run smoke:journeys` | 0; all 11 journeys passed |
| `git diff --check` | 0 |

Each remote command has its own marker. The full script returned `CALL_EXIT=1`
because its first `npm test` failed three assertions: newly added catalog fixture
fields changed legacy/fail-closed fixture inputs. Those inputs were restored
with explicit test-only type assertions; the full suite and types then returned
0 (`CALL_EXIT=0`). No application logic changed to satisfy those tests.

Earlier attempts: baseline build without a public Mapbox token exited 1; rerun
with `pk.measurement-only` exited 0. Interim types exited 1 and exposed fixtures
and nullable-etag declarations, then passed after corrections. One queued type
call expired waiting 5400 seconds for another lane's lock (`CALL_EXIT=1`), without
running TypeScript. The next queued call completed. No call was interrupted.
Dependency installation reported 8 existing audit vulnerabilities (2 moderate,
6 high); no dependency changes were made.

## Production first-load budget comparison

Same public measurement token and build mode for base and final. Values are
bytes, not rounded Vite console sizes. Default build report matches production.

| Route | Base gzip | Final gzip | Delta | Final brotli |
|---|---:|---:|---:|---:|
| landing | 345316 | 345316 | 0.000% | 294737 |
| marketplace | 306943 | 306943 | 0.000% | 258399 |
| intelligence-map | 794023 | 794023 | 0.000% | 648808 |
| command-center | 246046 | 246046 | 0.000% | 206605 |
| compliance | 231749 | 231749 | 0.000% | 194529 |

All production asset names and Vite sizes match the base build. No route changed
by more than 0.5%; no production bundle growth.

## Screenshot comparisons

Compare mode, tolerance 0.2%; all nine passed. Baselines unchanged.

| Screenshot | Diff |
|---|---:|
| public-landing-light | 0.0832% |
| public-how-it-works-light | 0.0881% |
| marketplace-buyer-dark | 0.0295% |
| marketplace-buyer-light | 0.0295% |
| orderbook-buyer-dark | 0.0303% |
| trades-supplier-dark | 0.0295% |
| map-buyer-dark | 0.0295% |
| map-buyer-light | 0.0295% |
| admin-users-dark | 0.0383% |

Remote journey report:
`/home/verdaxis-test/.verdaxis-journeys/run-20261018-025711/journeys-report.json`.

The commit security-review hook did not complete (HTTP 404); details are in
`/Users/jonathanjie/.claude/security/log.txt`. No subagents were used.
