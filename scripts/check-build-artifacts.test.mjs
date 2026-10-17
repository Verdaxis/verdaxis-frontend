import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  assertRouteFirstLoadBudgets,
  checkBuildArtifacts,
  measureRouteFirstLoadGzip,
  ROUTE_FIRST_LOAD_BUDGETS,
} from './check-build-artifacts.mjs';
const PROD = 'https://api.verdaxis.exchange/api';
const STAGING = 'https://api-staging.verdaxis.exchange/api';
const VENDORS = [
  'vendor-mapbox',
  'vendor-leaflet',
  'vendor-recharts',
];

// One chunk per declared route prefix, so the first-load budgets find their
// route chunks. Real Vite output names these files, so the fixture name matches.
const ROUTE_CHUNKS = [
  'LandingPage',
  'public',
  'Marketplace',
  'trading',
  'rfq',
  'BuyerMap',
  'addEcaLayers',
  'dashboard',
  'CommandCenter',
  'Compliance',
  'compliance',
  'AdminDashboard',
  'admin',
];

const EMPTY_CHUNK = 'export {};';
const entrySource = (apiSource) => `export const api = ${JSON.stringify(apiSource)};`;

function fixture(apiSource, { nested = false, chunks = {} } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'verdaxis-artifact-'));
  const assets = path.join(root, 'assets');
  const scripts = nested ? path.join(assets, 'nested') : assets;
  mkdirSync(scripts, { recursive: true });
  writeFileSync(path.join(root, 'index.html'), '<script type="module" src="/assets/index-test.js"></script>');
  writeFileSync(path.join(scripts, 'index-test.js'), entrySource(apiSource));
  for (const vendor of VENDORS) writeFileSync(path.join(assets, `${vendor}-test.js`), EMPTY_CHUNK);
  for (const name of ROUTE_CHUNKS) writeFileSync(path.join(assets, `${name}-test.js`), chunks[name] ?? EMPTY_CHUNK);
  for (const [name, source] of Object.entries(chunks)) {
    if (!ROUTE_CHUNKS.includes(name)) writeFileSync(path.join(assets, `${name}-test.js`), source);
  }
  return root;
}

function measure(root, prefixes) {
  const assetsDirectory = path.join(path.resolve(root), 'assets');
  return measureRouteFirstLoadGzip({
    assetsDirectory,
    files: readdirSync(assetsDirectory),
    shellHtml: readFileSync(path.join(path.resolve(root), 'index.html'), 'utf8'),
    prefixes,
  });
}

test('accepts the exact production target', () => {
  assert.doesNotThrow(() => checkBuildArtifacts({ root: fixture(PROD), target: 'production' }));
});

test('accepts the exact staging target', () => {
  assert.doesNotThrow(() => checkBuildArtifacts({ root: fixture(STAGING), target: 'staging' }));
});

test('rejects a staging artifact presented as production', () => {
  assert.throws(
    () => checkBuildArtifacts({ root: fixture(STAGING), target: 'production' }),
    /missing expected API target/
  );
});

test('rejects an artifact containing both environment targets', () => {
  assert.throws(
    () => checkBuildArtifacts({ root: fixture(`${PROD} ${STAGING}`), target: 'production' }),
    /cross-environment API target/
  );
});

for (const local of [
  'http://localhost:8000/api',
  'http://127.0.0.1:8000/api',
  'http://0.0.0.0:8000/api',
  'http://[::1]:8000/api',
]) {
  test(`rejects local target ${local}`, () => {
    assert.throws(
      () => checkBuildArtifacts({ root: fixture(`${PROD} ${local}`), target: 'production' }),
      /local API target/
    );
  });
}

test('checks JavaScript assets recursively', () => {
  assert.doesNotThrow(() => checkBuildArtifacts({
    root: fixture(PROD, { nested: true }),
    target: 'production',
  }));
});

test('rejects an unknown target', () => {
  assert.throws(
    () => checkBuildArtifacts({ root: fixture(PROD), target: 'preview' }),
    /Unknown artifact target/
  );
});

// --- per-route first-load budgets -----------------------------------------

test('a route first load counts the shell, the route chunk and its static chain only', () => {
  const marketplace = `import{a}from"./vendor-recharts-test.js";export const a = ${JSON.stringify('x'.repeat(4096))};`;
  const root = fixture(PROD, {
    chunks: {
      Marketplace: marketplace,
      // Neither file is in the marketplace chunk's static chain, so neither
      // may move the measurement however large it is.
      'vendor-leaflet': JSON.stringify('l'.repeat(64 * 1024)),
      'CommandCenter': JSON.stringify('c'.repeat(64 * 1024)),
    },
  });
  const assetsDirectory = path.join(path.resolve(root), 'assets');
  const gz = (name) => gzipSync(readFileSync(path.join(assetsDirectory, name)), { level: 9 }).length;
  assert.equal(
    measure(root, ['Marketplace-']),
    gz('index-test.js') + gz('Marketplace-test.js') + gz('vendor-recharts-test.js'),
  );
});

test('a bare side-effect import also pulls its chunk into the first load', () => {
  const marketplace = 'import"./vendor-recharts-test.js";export const a = 1;';
  const root = fixture(PROD, { chunks: { Marketplace: marketplace } });
  const assetsDirectory = path.join(path.resolve(root), 'assets');
  const gz = (name) => gzipSync(readFileSync(path.join(assetsDirectory, name)), { level: 9 }).length;
  assert.equal(
    measure(root, ['Marketplace-']),
    gz('index-test.js') + gz('Marketplace-test.js') + gz('vendor-recharts-test.js'),
  );
});

test('a chunk added to the route chain raises the measured first load by its own size', () => {
  const before = measure(fixture(PROD), ['Marketplace-']);
  const vendorMapbox = JSON.stringify('z'.repeat(64 * 1024));
  const grown = fixture(PROD, {
    chunks: {
      Marketplace: 'import{a}from"./vendor-mapbox-test.js";export const a = 1;',
      'vendor-mapbox': vendorMapbox,
    },
  });
  const assetsDirectory = path.join(path.resolve(grown), 'assets');
  const added = gzipSync(readFileSync(path.join(assetsDirectory, 'vendor-mapbox-test.js')), { level: 9 }).length;
  const routeDelta =
    gzipSync(Buffer.from('import{a}from"./vendor-mapbox-test.js";export const a = 1;'), { level: 9 }).length
    - gzipSync(Buffer.from(EMPTY_CHUNK), { level: 9 }).length;
  assert.equal(measure(grown, ['Marketplace-']), before + added + routeDelta);
});

test('a route whose chunk family vanished fails loudly instead of reporting zero', () => {
  assert.throws(() => measure(fixture(PROD), ['Renamed-Away-']), /No route chunk found/);
});

test('rejects a route over its ceiling and reports the numbers', () => {
  const root = fixture(PROD, { chunks: { Marketplace: JSON.stringify('x'.repeat(4096)) } });
  const assetsDirectory = path.join(path.resolve(root), 'assets');
  const common = {
    assetsDirectory,
    files: readdirSync(assetsDirectory),
    shellHtml: readFileSync(path.join(path.resolve(root), 'index.html'), 'utf8'),
  };
  const budget = { name: 'marketplace', prefixes: ['Marketplace-'], ceilingGzipBytes: 1 };
  assert.throws(
    () => assertRouteFirstLoadBudgets({ ...common, budgets: [budget] }),
    /Route 'marketplace' first load is \d+ gzip bytes, over its 1-byte ceiling/
  );
  const measured = measure(root, ['Marketplace-']);
  assert.deepEqual(
    assertRouteFirstLoadBudgets({
      ...common,
      budgets: [{ ...budget, ceilingGzipBytes: measured }],
    }),
    [{ name: 'marketplace', measuredGzipBytes: measured, ceilingGzipBytes: measured }],
  );
});

test('the committed route budgets cover the five documented routes', () => {
  assert.deepEqual(
    ROUTE_FIRST_LOAD_BUDGETS.map((budget) => budget.name),
    ['landing', 'marketplace', 'intelligence-map', 'command-center', 'compliance'],
  );
});

// --- entry-chunk exclusions ------------------------------------------------

test('passes when the tour library is outside the entry static closure', () => {
  const root = fixture(PROD, {
    chunks: {
      Marketplace: 'import{a}from"./GuidedTutorial-test.js";export const a = 1;',
      GuidedTutorial: 'export const floater = "react-floater";',
    },
  });
  assert.doesNotThrow(() => checkBuildArtifacts({ root, target: 'production' }));
});

test('fails when the entry chunk itself carries the tour library', () => {
  const root = fixture(`${PROD};const floater = "react-floater";`);
  assert.throws(
    () => checkBuildArtifacts({ root, target: 'production' }),
    /still carries react-joyride tour/,
  );
});

test('fails when a chunk statically linked from the entry carries the tour library', () => {
  const root = fixture(PROD, { chunks: { 'vendor-clsx': 'export const floater = "react-floater";' } });
  // A preload in the shell pulls the vendor chunk into the entry closure.
  const indexHtml = path.join(root, 'index.html');
  const html = readFileSync(indexHtml, 'utf8');
  writeFileSync(indexHtml, `${html}<link rel="modulepreload" href="/assets/vendor-clsx-test.js">`);
  assert.throws(
    () => checkBuildArtifacts({ root, target: 'production' }),
    /still carries react-joyride tour/,
  );
});

test('fails when a route statically imports the chart vendor chunk', () => {
  const root = fixture(PROD, {
    chunks: { Compliance: 'import{a}from"./vendor-recharts-test.js";export const a = 1;' },
  });
  assert.throws(
    () => checkBuildArtifacts({ root, target: 'production' }),
    /Route 'compliance' statically imports Recharts/,
  );
});

test('passes when only a lazily imported chunk reaches the chart vendor chunk', () => {
  const root = fixture(PROD, {
    chunks: {
      Compliance: 'export const load = () => import("./FuelEuBarChart-test.js");',
      FuelEuBarChart: 'import{a}from"./vendor-recharts-test.js";export const a = 1;',
    },
  });
  assert.doesNotThrow(() => checkBuildArtifacts({ root, target: 'production' }));
});
