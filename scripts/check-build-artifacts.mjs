#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { constants as zlibConstants, brotliCompressSync, gzipSync } from 'node:zlib';

const TARGETS = {
  production: {
    requiredApiUrl: 'https://api.verdaxis.exchange/api',
    forbiddenApiUrl: 'https://api-staging.verdaxis.exchange/api',
  },
  staging: {
    requiredApiUrl: 'https://api-staging.verdaxis.exchange/api',
    forbiddenApiUrl: 'https://api.verdaxis.exchange/api',
  },
};

const EXPECTED_VENDOR_CHUNKS = [
  'vendor-mapbox',
  'vendor-leaflet',
  'vendor-recharts',
];

const LEGACY_VENDOR_CHUNKS = [
  'vendor-maps',
  'vendor-charts',
];

const LOCAL_API_PATTERNS = [
  /https?:\/\/localhost(?::\d+)?\/api/i,
  /https?:\/\/127(?:\.\d{1,3}){3}(?::\d+)?\/api/i,
  /https?:\/\/0\.0\.0\.0(?::\d+)?\/api/i,
  /https?:\/\/\[::1\](?::\d+)?\/api/i,
];

// Per-route first-load ceilings, in gzip bytes.
//
// The measured value is the first load the browser pays for a route: the entry
// chunk, every modulepreload in the shell HTML, the shell stylesheets, the
// route's own chunks (one prefix per chunk family, because Vite content-hashes
// filenames), and the transitive static import chain of those chunks. It is the
// measurement the 2026-10-17 frontend audit uses in section 11. Each ceiling is
// the value measured on 2026-10-17 plus 2 %, so any regression fails the build;
// a commit that lowers a route's first load lowers the ceiling with it. The
// step 3a follow-up re-measured all five after reverting the lazy `common`
// namespace, which restores the eager bundle in the entry chunk; the ceilings
// below are those measurements plus 2 %.
//
// Step 3b (self-hosted webfonts and right-sized WebP brand images) re-measured
// all five on 2026-10-17 against the same `pk.measurement-only` build the
// ceilings came from. No route's first load improved, so no ceiling moves down:
// the eight `@font-face` rules add about 600 gzip bytes to the shell
// stylesheet, which every route pays (landing 342,482 -> 343,091, marketplace
// 304,210 -> 304,828, command-center 243,210 -> 243,822, compliance
// 228,887 -> 229,502). intelligence-map reports 791,229 -> 786,067, but that
// 5,162-byte drop is an attribution artifact and not a payload change: the base
// build counted `BuyerMap-BXRKC_x8.css` (5,790 gzip bytes) in the route's first
// load and this build does not, although the emitted bundle still references
// that stylesheet for the map route. `chunkStem` strips the last dash segment
// only, so a content hash that itself carries a dash shifts which chunk a
// stylesheet is attributed to — the base build has `demoMarketQuotes-tzhq-NZF.js`
// where this build has `demoMarketQuotes-BZzGtonh.js`. Measured file by file,
// this route's real delta is the same +628 gzip bytes as its neighbours.
// Making that attribution hash-independent belongs to a follow-up.
export const ROUTE_FIRST_LOAD_BUDGETS = [
  // public landing page, /en/ (prerendered shell)
  { name: 'landing', prefixes: ['LandingPage-', 'public-'], ceilingGzipBytes: 349400 },
  // authenticated marketplace workspace
  { name: 'marketplace', prefixes: ['Marketplace-', 'trading-', 'rfq-'], ceilingGzipBytes: 310300 },
  // intelligence map, first visit (Mapbox GL plus the ECA overlay)
  { name: 'intelligence-map', prefixes: ['BuyerMap-', 'addEcaLayers-', 'dashboard-'], ceilingGzipBytes: 807100 },
  // authenticated command center
  { name: 'command-center', prefixes: ['CommandCenter-', 'dashboard-'], ceilingGzipBytes: 248100 },
  // compliance workspace
  { name: 'compliance', prefixes: ['Compliance-', 'compliance-'], ceilingGzipBytes: 233500 },
];

const GZIP_OPTIONS = { level: zlibConstants.Z_BEST_COMPRESSION };
// Vite emits both a named/re-export form (`from"./x.js"`) and a bare
// side-effect form (`import"./x.js"`) for a statically linked chunk.
const STATIC_IMPORT_PATTERN = /(?:from|import)"\.\/([^"]+)"/g;
const ENTRY_PATTERN = /<script type="module"[^>]*src="\/assets\/([^"]+)"/;
const MODULE_PRELOAD_PATTERN = /<link rel="modulepreload"[^>]*href="\/assets\/([^"]+)"/g;
const STYLESHEET_PATTERN = /<link rel="stylesheet"[^>]*href="\/assets\/([^"]+)"/g;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function gzipBytes(buffer) {
  return gzipSync(buffer, GZIP_OPTIONS).length;
}

function staticImports(source) {
  return Array.from(source.matchAll(STATIC_IMPORT_PATTERN), (match) => match[1]);
}

/** Vite writes `name-<hash>.js`, so a bare stem matches its one hashed file. */
function resolveChunkName(files, reference) {
  const stem = reference.replace(/\.[^.]*$/, '');
  return files.find((file) => file === reference || file.startsWith(`${stem}-`)) ?? null;
}

function chunkStem(fileName) {
  return fileName.replace(/\.[^.]*$/, '').replace(/-[^-]*$/, '');
}

function parseShellHtml(source) {
  const entry = source.match(ENTRY_PATTERN)?.[1] ?? null;
  assert(entry, 'Built shell HTML has no module entry script');
  return {
    entry,
    preloads: Array.from(source.matchAll(MODULE_PRELOAD_PATTERN), (match) => match[1]),
    stylesheets: Array.from(source.matchAll(STYLESHEET_PATTERN), (match) => match[1]),
  };
}

/**
 * First-load gzip bytes for one route.
 *
 * Follows static imports only: a dynamic import that fires after first paint
 * belongs to the interaction that fires it, with one exception the caller
 * declares explicitly (the map's ECA overlay chunk, which installs on
 * `style.load` during the first visit). Stylesheets are attributed by chunk
 * stem, because Vite extracts each chunk's CSS beside it.
 */
export function staticImportClosure({ assetsDirectory, files, seed }) {
  const closure = new Set();
  const pending = [...seed];
  while (pending.length > 0) {
    const current = pending.pop();
    if (closure.has(current)) continue;
    closure.add(current);
    const filePath = path.join(assetsDirectory, current);
    // A shell reference (the entry script) can sit outside the assets tree in
    // a synthetic fixture; it contributes nothing to the closure then.
    if (!existsSync(filePath)) continue;
    const source = readFileSync(filePath, 'utf8');
    for (const reference of staticImports(source)) {
      const resolved = resolveChunkName(files, reference);
      if (resolved && !closure.has(resolved)) pending.push(resolved);
    }
  }
  return closure;
}

// Heavy dependencies that must not reach the entry chunk: the react-joyride
// tour mounts only inside the dashboard. The delivery refactor moved it off the
// eager path and this pins that.
const EAGER_EXCLUSIONS = [
  { marker: 'react-floater', description: 'react-joyride tour (GuidedTutorial)' },
];

// Chunks a route must not pull in statically. Recharts is the workspace's
// heaviest dependency and only two lazily loaded chart components use it, so no
// route's first load may statically reach its vendor chunk. The check is on the
// resolved closure's file names, because a chunk that *dynamically* imports the
// chart still names the vendor chunk in its preload list — that reference is
// the on-demand load, not a first-load cost. `admin` has no first-load ceiling
// yet but is checked here.
const ROUTE_STATIC_EXCLUSIONS = [
  { prefix: 'vendor-recharts-', description: 'Recharts (charts load on demand)' },
];

const ROUTE_STATIC_EXCLUSION_TARGETS = [
  ...ROUTE_FIRST_LOAD_BUDGETS.map(({ name, prefixes }) => ({ name, prefixes })),
  { name: 'admin', prefixes: ['AdminDashboard-', 'admin-'] },
];

function assertSourceExcludes({ assetsDirectory, closure, exclusions, context }) {
  for (const file of closure) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(assetsDirectory, file);
    if (!existsSync(filePath)) continue;
    const source = readFileSync(filePath, 'utf8');
    for (const exclusion of exclusions) {
      assert(
        !source.includes(exclusion.marker),
        `${context} '${file}' still carries ${exclusion.description} (found '${exclusion.marker}')`,
      );
    }
  }
}

export function assertEagerChunkExclusions({ assetsDirectory, files, shellHtml }) {
  const shell = parseShellHtml(shellHtml);
  const closure = staticImportClosure({
    assetsDirectory,
    files,
    seed: [shell.entry, ...shell.preloads],
  });
  assertSourceExcludes({ assetsDirectory, closure, exclusions: EAGER_EXCLUSIONS, context: 'Entry chunk' });
}

export function assertRouteStaticChunkExclusions({ assetsDirectory, files }) {
  for (const target of ROUTE_STATIC_EXCLUSION_TARGETS) {
    const seed = files.filter(
      (file) => file.endsWith('.js') && target.prefixes.some((prefix) => file.startsWith(prefix)),
    );
    assert(seed.length > 0, `No route chunk found for prefix(es) ${target.prefixes.join(', ')}`);
    const closure = staticImportClosure({ assetsDirectory, files, seed });
    for (const file of closure) {
      for (const exclusion of ROUTE_STATIC_EXCLUSIONS) {
        assert(
          !file.startsWith(exclusion.prefix),
          `Route '${target.name}' statically imports ${exclusion.description} (chunk '${file}')`,
        );
      }
    }
  }
}

export function measureRouteFirstLoadGzip({ assetsDirectory, files, shellHtml, prefixes }) {
  const seed = files.filter(
    (file) => file.endsWith('.js') && prefixes.some((prefix) => file.startsWith(prefix)),
  );
  assert(
    seed.length > 0,
    `No route chunk found for prefix(es) ${prefixes.join(', ')} — the route, or its chunk naming, changed`,
  );

  const closure = staticImportClosure({ assetsDirectory, files, seed });

  const shell = parseShellHtml(shellHtml);
  const stems = new Set(Array.from(closure, chunkStem));
  const routeStylesheets = files.filter(
    (file) => file.endsWith('.css') && stems.has(chunkStem(file)),
  );

  const firstLoad = new Set([
    shell.entry,
    ...shell.preloads,
    ...shell.stylesheets,
    ...closure,
    ...routeStylesheets,
  ]);

  let total = 0;
  for (const file of firstLoad) {
    const filePath = path.join(assetsDirectory, file);
    if (!existsSync(filePath)) continue;
    total += gzipBytes(readFileSync(filePath));
  }
  return total;
}

/** The same first-load measurement, plus the brotli total a CDN would serve. */
export function measureRouteFirstLoadSizes({ assetsDirectory, files, shellHtml, prefixes }) {
  const gzipBytes = measureRouteFirstLoadGzip({ assetsDirectory, files, shellHtml, prefixes });

  const seed = files.filter(
    (file) => file.endsWith('.js') && prefixes.some((prefix) => file.startsWith(prefix)),
  );
  const closure = staticImportClosure({ assetsDirectory, files, seed });
  const shell = parseShellHtml(shellHtml);
  const stems = new Set(Array.from(closure, chunkStem));
  const firstLoad = new Set([
    shell.entry,
    ...shell.preloads,
    ...shell.stylesheets,
    ...closure,
    ...files.filter((file) => file.endsWith('.css') && stems.has(chunkStem(file))),
  ]);

  let brotliBytes = 0;
  for (const file of firstLoad) {
    const filePath = path.join(assetsDirectory, file);
    if (!existsSync(filePath)) continue;
    brotliBytes += brotliCompressSync(readFileSync(filePath)).length;
  }
  return { gzipBytes, brotliBytes };
}

export function assertRouteFirstLoadBudgets({
  assetsDirectory,
  files,
  shellHtml,
  budgets = ROUTE_FIRST_LOAD_BUDGETS,
}) {
  return budgets.map((budget) => {
    const measured = measureRouteFirstLoadGzip({
      assetsDirectory,
      files,
      shellHtml,
      prefixes: budget.prefixes,
    });
    assert(
      measured <= budget.ceilingGzipBytes,
      `Route '${budget.name}' first load is ${measured} gzip bytes, over its ${budget.ceilingGzipBytes}-byte ceiling`,
    );
    return { name: budget.name, measuredGzipBytes: measured, ceilingGzipBytes: budget.ceilingGzipBytes };
  });
}


function javascriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...javascriptFiles(entryPath));
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(entryPath);
  }
  return files;
}

function findChunk(files, prefix) {
  return files.filter((file) => path.basename(file).startsWith(`${prefix}-`));
}

function assertChunkSplit(files) {
  for (const prefix of EXPECTED_VENDOR_CHUNKS) {
    const matches = findChunk(files, prefix);
    assert(
      matches.length === 1,
      `Expected exactly one ${prefix} JS chunk, found ${matches.length}`
    );
  }

  for (const prefix of LEGACY_VENDOR_CHUNKS) {
    assert(findChunk(files, prefix).length === 0, `Legacy grouped vendor chunk still exists: ${prefix}`);
  }
}

function assertInitialHtmlDoesNotEagerLoadHeavyChunks(indexHtml) {
  const html = readFileSync(indexHtml, 'utf8');
  for (const prefix of EXPECTED_VENDOR_CHUNKS) {
    const eagerReference = new RegExp(`(?:src|href)=["'][^"']*${prefix}-`);
    assert(!eagerReference.test(html), `Initial HTML eagerly references heavy vendor chunk ${prefix}`);
  }
}

function assertApiTarget(files, target) {
  const contract = TARGETS[target];
  assert(contract, `Unknown artifact target '${target}'. Use production or staging.`);

  const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  assert(
    source.includes(contract.requiredApiUrl),
    `Release bundle is missing expected API target: ${contract.requiredApiUrl}`
  );
  assert(
    !source.includes(contract.forbiddenApiUrl),
    `Release bundle contains cross-environment API target: ${contract.forbiddenApiUrl}`
  );
  for (const pattern of LOCAL_API_PATTERNS) {
    assert(!pattern.test(source), `Release bundle contains a local API target matching ${pattern}`);
  }
}

export function checkBuildArtifacts({ root, target }) {
  const artifactRoot = path.resolve(root);
  const assetsDirectory = path.join(artifactRoot, 'assets');
  const indexHtml = path.join(artifactRoot, 'index.html');

  assert(existsSync(artifactRoot), `Missing build output directory: ${artifactRoot}`);
  assert(existsSync(assetsDirectory), `Missing build assets directory: ${assetsDirectory}`);
  assert(existsSync(indexHtml), `Missing build HTML: ${indexHtml}`);

  const files = javascriptFiles(assetsDirectory);
  assert(files.length > 0, `No JavaScript assets found under ${assetsDirectory}`);
  assertChunkSplit(files);
  assertInitialHtmlDoesNotEagerLoadHeavyChunks(indexHtml);
  assertApiTarget(files, target);

  const allAssets = readdirSync(assetsDirectory);
  const shellHtml = readFileSync(indexHtml, 'utf8');
  assertEagerChunkExclusions({ assetsDirectory, files: allAssets, shellHtml });
  assertRouteStaticChunkExclusions({ assetsDirectory, files: allAssets });
  return assertRouteFirstLoadBudgets({
    assetsDirectory,
    files: allAssets,
    shellHtml,
  });
}

function parseArgs(argv) {
  const values = {};
  // `--report` is a bare flag; every other flag takes the next argument.
  const booleanFlags = new Set(['--report']);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    assert(flag?.startsWith('--'), `Unexpected argument: ${flag}`);
    if (booleanFlags.has(flag)) {
      values[flag.slice(2)] = true;
      continue;
    }
    const value = argv[index + 1];
    assert(value && !value.startsWith('--'), `Flag ${flag} needs a value`);
    values[flag.slice(2)] = value;
    index += 1;
  }
  assert(values.root, 'Usage: --target production|staging --root <artifact-root> [--report]');
  return values;
}

function reportRouteBudgets({ root }) {
  const artifactRoot = path.resolve(root);
  const assetsDirectory = path.join(artifactRoot, 'assets');
  const assets = readdirSync(assetsDirectory);
  const shellHtml = readFileSync(path.join(artifactRoot, 'index.html'), 'utf8');
  for (const budget of ROUTE_FIRST_LOAD_BUDGETS) {
    const { gzipBytes: gzipTotal, brotliBytes } = measureRouteFirstLoadSizes({
      assetsDirectory,
      files: assets,
      shellHtml,
      prefixes: budget.prefixes,
    });
    console.log(
      `${budget.name}: ${gzipTotal} gzip bytes (${(gzipTotal / 1024).toFixed(0)} KB), `
      + `${brotliBytes} brotli bytes (${(brotliBytes / 1024).toFixed(0)} KB)`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.report) {
    reportRouteBudgets({ root: args.root });
  } else {
    const budgets = checkBuildArtifacts(args);
    for (const budget of budgets) {
      console.log(`${budget.name}: ${budget.measuredGzipBytes} / ${budget.ceilingGzipBytes} gzip bytes`);
    }
    console.log('Build artifact checks passed.');
  }
}
