import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkBuildArtifacts } from './check-build-artifacts.mjs';

const PROD = 'https://api.verdaxis.exchange/api';
const STAGING = 'https://api-staging.verdaxis.exchange/api';
const VENDORS = [
  'vendor-maplibre',
  'vendor-leaflet',
  'vendor-lightweight-charts',
  'vendor-recharts',
];

function fixture(apiSource, { nested = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'verdaxis-artifact-'));
  const assets = path.join(root, 'assets');
  const scripts = nested ? path.join(assets, 'nested') : assets;
  mkdirSync(scripts, { recursive: true });
  writeFileSync(path.join(root, 'index.html'), '<script type="module" src="/assets/index-test.js"></script>');
  writeFileSync(path.join(scripts, 'index-test.js'), `export const api = ${JSON.stringify(apiSource)};`);
  for (const vendor of VENDORS) writeFileSync(path.join(assets, `${vendor}-test.js`), 'export {};');
  return root;
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
