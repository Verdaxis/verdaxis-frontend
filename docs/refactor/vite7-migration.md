# Vite 7 migration report

## Status

**Complete.** Implementation, CI/build/journey gates and the final structural comparison passed. The PM resolved the earlier shared-lock blocker. Both versions were rebuilt in one locked host call with the required one-hour timeout; every command and the outer host call exited 0.

The comparison proves the same 53 HTML paths, 147 named JS/CSS chunks, normalized resource hints and 32 byte-identical static files. No application source or screenshot baseline changed. No call from this lane remains running. No push or deployment was performed.

Historical failures are retained below: the first comparison lost its saved reference during a runner reset; the next call exhausted its lock wait. During the follow-up, one expanded comparison call failed before execution because ignored evidence logs from the pending move already existed on the host. Committing the path move fixed that synchronization conflict; the next full comparison passed. No lock or time limit was bypassed.

## Commits

- `b7ecec4e` — build: align frontend runtimes on Node 24
- `8b5deea6` — build: migrate to Vite 7 without changing browser targets
- `a421960f` — initial gate evidence and historical comparison blocker
- `f3868030` — move records out of `outputs/` into `docs/refactor/`
- Final comparison evidence is in the subsequent documentation commit (see git log).

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
- `fontPreloadPlugin` still uses `generateBundle` before `staticRouteMetadataPlugin`; both target builds and artifact gates passed. Full normalized before/after hint comparison passed for the shell and all prerendered pages.
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

No route changed by more than 1%. All decreased, so no size increase needs explanation. The production minifier changed with esbuild. No route ceiling was raised. Existing ceilings are retained for this toolchain-only step; no budget was relaxed.

Brotli bytes before → after: landing 292,996 → 291,927; marketplace 256,652 → 255,353; intelligence-map 647,006 → 645,540; command-center 204,891 → 204,312; compliance 192,728 → 192,105.

## Structural comparison

The final comparison rebuilt starting commit `425e3cb8` and the migrated branch from fresh `npm ci --legacy-peer-deps` installs in the same locked host call. All builds used the same measurement-only Mapbox token and production API target.

| Output | Before | After | Result |
|---|---:|---:|---|
| HTML paths | 53 | 53 | Exact set match: shell plus 52 localized prerendered pages |
| JavaScript chunk names | 144 | 144 | Exact match after removing content hashes |
| CSS chunk names | 3 | 3 | Exact match after removing content hashes |
| Non-JS/CSS assets under assets/ | 20 | 20 | Exact filenames, including hashes |
| All other static files, including public copies | 32 | 32 | Exact paths and SHA-256 digests |
| Normalized HTML changes | 0 | 0 | Every HTML file is identical after hash normalization |

The shell and every prerendered page retain the same ordered hints: API preconnect and DNS-prefetch, Mapbox preconnect, Lato 400 and Montserrat font preloads, and vendor-i18n/vendor-react/vendor-clsx modulepreloads. Full normalized HTML equality also covers the entry script, stylesheet links, route metadata and prerendered markup.

**Differences explained:** 117 of 147 JS/CSS filenames have new content hashes; 30 filenames are unchanged. Vite's output and esbuild's minified code changed, and hash changes propagate through importing chunks. Browsers request new cache-busted URLs for those chunks, as expected for a toolchain rebuild, but the named chunk set, shell load list, resource hints and static assets are unchanged. There are no added or removed pages or load-list entries. Route payload decreases are listed above; none exceeds 1%. This is output-structure equivalence, not byte equality of compiled JavaScript or a new proof of application semantics; the existing unit and journey gates cover behavior.

Machine-readable proof, including every path, chunk name, hint and static-file digest: [`vite7-evidence/vite7-build-comparison.json`](vite7-evidence/vite7-build-comparison.json). Comparison source: [`vite7-evidence/vite7-compare.mjs`](vite7-evidence/vite7-compare.mjs).

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

## Follow-up gates and reproduction

The first follow-up structural run passed all ten gates. A later expanded run added SHA-256 comparisons for every static file and made normalized HTML equality an assertion. Its first call failed during runner synchronization (exit 1, before any gate ran); after the relocation commit, all ten expanded gates passed:

| Gate | Command | Exit |
|---|---|---:|
| Reference source | archive `425e3cb8` into work/vite6-reference | 0 |
| Reference install | npm ci --legacy-peer-deps | 0 |
| Reference production build | npm run build:prod | 0 |
| Reference artifact check | npm run build:check | 0 |
| Reference budgets | node scripts/check-build-artifacts.mjs --report --root dist | 0 |
| Migrated install | npm ci --legacy-peer-deps | 0 |
| Migrated production build | npm run build:prod | 0 |
| Migrated artifact check | npm run build:check | 0 |
| Migrated budgets | node scripts/check-build-artifacts.mjs --report --root dist | 0 |
| Expanded structural comparison | node docs/refactor/vite7-evidence/vite7-compare.mjs | 0 |
| Outer host call | shared lock + one-hour timeout | 0 |

CI and journey results above are from the initial acceptance run; they were not rerun during this documentation/comparison-only follow-up. The final builds and comparison are fresh. No runtime code changed since the passing acceptance run.

To reproduce, run from the worktree root:

```bash
verdaxis-prod-test "$PWD" 'while pgrep -f "[r]ust_contract\.(measure|simulate)" >/dev/null; do sleep 60; done; flock -w 7200 /home/verdaxis-test/.verdaxis-heavy.lock timeout --kill-after=60 3600 bash -lc "bash docs/refactor/vite7-evidence/vite7-structural-gates.sh"'
```

Retrieve the generated comparison JSON and gate TSV before the next runner reset. No timeout was raised or hit in the follow-up. The repository records now live only under `docs/refactor/`; the top-level `outputs/` directory was removed in a new commit, without amending prior commits.

## Sources

- https://v7.vite.dev/guide/migration
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Host package metadata for Vite 7.3.7, React plugin 5.2.0/6.1.2 and Vitest 4.1.11/5.0.5.
