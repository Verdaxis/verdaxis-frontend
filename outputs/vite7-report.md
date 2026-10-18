# Vite 7 migration report

## Status

Implementation and all requested CI/build/journey gates passed. **Final structural build equivalence is incomplete.** The comparison helper first exited 1 because the runner removed the saved reference artifact on a later lane reset. A retry intended to rebuild starting commit `425e3cb8` exhausted the shared `flock -w 5400` wait and exited 1 before any build started.

The lock owner is another lane (`fe-step8-3f`): flock PID `2083362`, child Python PID `2084273`, command `python3 -m unittest scripts.journeys.test_request_volume scripts.journeys.test_stream_relay -v`. That lane confirmed that failed setup left non-daemon threads running. They need PM/user permission to stop the call under the no-interruption rule. This lane did not interrupt or bypass it. No Vite lane heavy call remains running. No push or deployment was performed.

## Commits

- `b7ecec4e` — build: align frontend runtimes on Node 24
- `8b5deea6` — build: migrate to Vite 7 without changing browser targets
- Evidence is in the following documentation commit (see git log).

## Versions

| Package | Before locked | After locked | Manifest after |
|---|---:|---:|---|
| vite | 6.4.3 | 7.3.7 | ^7.3.7 |
| @vitejs/plugin-react | 5.1.2 | 5.2.0 | ^5.2.0 |
| vitest | 4.1.11 | 4.1.11 | 4.1.11 |
| esbuild | 0.25.12 | 0.28.2 | Vite transitive |
| @rolldown/pluginutils | 1.0.0-beta.53 | 1.0.0-rc.3 | React plugin transitive |
| rollup | 4.60.4 | 4.60.4 | Vite transitive |

Vitest 4.1.11 supports Vite `^6.0.0 || ^7.0.0 || ^8.0.0`; no peer-driven update is needed. The project deliberately pins it. Vitest 5.0.5 is available, but is a separate major migration. React plugin 6.1.2 requires Vite 8, so 5.2.0 is the current compatible release. No other direct Vite plugins are installed. The host regenerated the lock with `npm install --legacy-peer-deps --save-dev vite@^7.3.7 @vitejs/plugin-react@^5.2.0`, exit 0; a subsequent fresh `npm ci --legacy-peer-deps` passed. No application dependency changed. npm still reports 8 audit vulnerabilities (2 moderate, 6 high); no broad audit fix was applied.

## Node inventory

Vite 7 requires Node `^20.19.0 || >=22.12.0`.

| Location | Before | After |
|---|---|---|
| `.github/workflows/frontend-ci.yml` setup-node | 24 | 24 (unchanged) |
| `.github/workflows/release-vercel.yml` setup-node | 24 | 24 (unchanged) |
| `Dockerfile` builder | node:20-alpine | node:24-alpine |
| `package.json` engines.node | absent | 24.x |
| `package-lock.json` root engines.node | absent | 24.x |
| Vercel build runtime | no repository engine override | package engines 24.x |
| `vercel.json` | no Node field | unchanged; engines controls Node |
| test user's `/home/verdaxis-test/node/bin/node` | 24.22.0 | 24.22.0 (unchanged) |
| `verdaxis-prod-test` PATH | test user's node/bin | unchanged |
| README / ARCHITECTURE run instructions | Node 24 | Node 24 |

No `.nvmrc`, `.node-version` or `.tool-versions` is tracked. The release uses `vercel build --prod` on its Node 24 runner and publishes prebuilt output. Vercel documents that package engines overrides the project Node setting. No external runtime change is required; the remote dashboard setting was not changed or inspected.

## Migration changes

- Explicitly retained the old target: `['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']`. Vite 7 otherwise raises browser targets to Baseline widely available (Chrome/Edge 107, Firefox 104, Safari 16).
- `apiPreconnectPlugin` already uses a function-form `transformIndexHtml`; removed object aliases `enforce`/`transform` do not apply. Plugin-level `enforce: 'post'` is still supported and is retained for the other two plugins.
- `fontPreloadPlugin` still uses `generateBundle` before `staticRouteMetadataPlugin`; both target builds and artifact gates passed. Full normalized before/after hint comparison is pending.
- `staticRouteMetadataPlugin` uses Vite's supported `ssrLoadModule`, closes the server in `finally`, and does not provide a custom module-runner context. No `__vite_ssr_exportName__` change is needed. Prerender builds passed.
- Retained `assetsInlineLimit` callback unchanged: `.woff2`/`.webp` are never inlined; other assets retain the 4 KiB default.
- Retained all six manual chunk groups unchanged: vendor-react, vendor-i18n, vendor-clsx, vendor-recharts, vendor-mapbox, vendor-leaflet.
- No removed Sass API option, splitVendorChunkPlugin, optimizeDeps.entries, legacy.proxySsrExternalModules, deprecated Environment API fields or removed runtime types are used. No configureServer/configurePreviewServer middleware hooks need the CORS ordering change.
- Stack docs now identify Vite 7 and the retained browser support policy. No structural application change was made; `.codesight` refresh is not needed.

## Before/after route budgets

Both builds used Node 24.22.0 and `VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only`. Before is a fresh production build of `425e3cb8`; after is the migrated production build. The current checker was unchanged. Values are gzip bytes.

| Route | Before | After | Delta | Change | Ceiling |
|---|---:|---:|---:|---:|---:|
| landing | 343,308 | 341,219 | -2,089 | -0.61% | 349,400 |
| marketplace | 305,028 | 302,815 | -2,213 | -0.73% | 310,300 |
| intelligence-map | 792,060 | 789,837 | -2,223 | -0.28% | 807,100 |
| command-center | 244,043 | 242,770 | -1,273 | -0.52% | 248,100 |
| compliance | 229,729 | 228,335 | -1,394 | -0.61% | 233,500 |

No route changed by more than 1%. All decreased, so no size increase needs explanation. The production minifier changed with esbuild. No route ceiling was raised. Ceilings are retained during this toolchain-only step rather than recalibrated before final structural comparison.

Brotli bytes before → after: landing 292,996 → 291,927; marketplace 256,652 → 255,353; intelligence-map 647,006 → 645,540; command-center 204,891 → 204,312; compliance 192,728 → 192,105.

**Not yet proved:** exact equality of emitted HTML path sets, normalized shell and prerender resource hint tags, chunk name sets, and font/brand/JSON asset names. The checked-in `vite7-compare.mjs` asserts these and records route changes. Do not treat successful builds alone as this proof.

## Screenshots

All compared against the existing committed baselines at the existing 0.2% limit. No baseline was re-recorded or changed.

| Screenshot | Difference | Result |
|---|---:|---|
| public-landing-light | 0.0832% | PASS |
| public-how-it-works-light | 0.0883% | PASS |
| marketplace-buyer-dark | 0.0295% | PASS |
| marketplace-buyer-light | 0.0295% | PASS |
| orderbook-buyer-dark | 0.0306% | PASS |
| trades-supplier-dark | 0.0295% | PASS |
| map-buyer-dark | 0.0295% | PASS |
| map-buyer-light | 0.0295% | PASS |
| admin-users-dark | 0.0295% | PASS |

All 11 journeys passed: login success, wrong password, marketplace browse/filter/pagination, deep-linked slice, place BID, place ASK, trade take/confirm/deliver/pay, notifications, map ports/ECA, public landing, public content. Pagination reported fewer than nine rows and no second page; the existing journey considers that a pass. Journey report on host: `/home/verdaxis-test/.verdaxis-journeys/run-20261017-235049/journeys-report.json`.

## Gate exit codes

Each command's own code is recorded, not inferred from the outer logging shell. All builds/tests/installs ran on the test host, under the required shared lock after the Rust measurement wait. Fixture Mapbox token was used only for unpublished test artifacts.

| Command | Exit |
|---|---:|
| baseline npm ci --legacy-peer-deps | 0 |
| baseline npm run build:prod | 0 |
| baseline node scripts/check-build-artifacts.mjs --report --root dist | 0 |
| upgrade npm install --legacy-peer-deps --save-dev vite@^7.3.7 @vitejs/plugin-react@^5.2.0 | 0 |
| npm ci --legacy-peer-deps | 0 |
| npm test | 0 |
| node --test scripts/phase0-request-manifest.test.mjs | 0 |
| npm run check:openapi | 0 |
| npm run check:api-types | 0 |
| npm run test:artifact-check | 0 |
| npm run test:openapi-source | 0 |
| npm run test:release-smoke | 0 |
| npm run typecheck | 0 |
| npm run i18n:check | 0 |
| npm run build:staging | 0 |
| npm run build:check:staging | 0 |
| npm run build:prod | 0 |
| npm run build:check | 0 |
| node outputs/vite7-compare.mjs (first attempt) | 1 (missing reference directory) |
| VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only npm run build | 0 |
| node scripts/check-build-artifacts.mjs --report --root dist | 0 |
| npm run smoke:journeys | 0 |
| reference rebuild/comparison retry outer host call | 1 (5400-second flock timeout; inner commands not run) |

Vitest: 133 files, 957 tests passed. The three commands within CI's multiline offline-helper step each have their own code above. Main verification outer host call returned 1 because the comparison failed, despite all required CI and journey gates passing. Do not mistake the local logging shell's 0 for that call's result.

## Resume after owner resolves lock

1. Use the required `verdaxis-prod-test` + Rust wait + shared lock wrapper. Do not stop the other lane's process without authorization.
2. Inside one call, archive `425e3cb8` into `work/vite6-reference`, run its fresh npm ci and fixture-token production build, then run `node outputs/vite7-compare.mjs` against migrated `dist`. Capture each exit and retrieve `outputs/vite7-build-comparison.json` before the next runner reset. If `dist` is no longer present, rebuild migrated production in the same locked call.
3. Investigate any changed chunk names/hints/pages or size change above 1%. Do not alter application source or screenshot baselines to hide a difference.
4. Update this report and commit the final structural evidence. No push is authorized.

## Sources

- https://v7.vite.dev/guide/migration
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Host package metadata for Vite 7.3.7, React plugin 5.2.0/6.1.2 and Vitest 4.1.11/5.0.5.
