import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkOpenApiSource } from './check-openapi-source.mjs';

const BACKEND_SHA = 'f4663bf4091ea4261875414f017cd27cd5a2ceb1';

function digestOf(text) {
  return createHash('sha256').update(Buffer.from(text)).digest('hex');
}

function sourceFor(specText, overrides = {}) {
  return JSON.stringify({
    repository: 'Verdaxis/verdaxis-backend',
    sha: BACKEND_SHA,
    path: 'openapi.json',
    sha256: digestOf(specText),
    ...overrides,
  });
}

// A null `spec` or `source` omits that file, so the fixture can model a missing one.
function fixture(options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'verdaxis-openapi-'));
  const specText = 'spec' in options ? options.spec : JSON.stringify({ openapi: '3.1.0', paths: {} });
  if (specText !== null) writeFileSync(path.join(root, 'openapi.json'), specText);
  const sourceText = 'source' in options ? options.source : sourceFor(specText);
  if (sourceText !== null) writeFileSync(path.join(root, 'openapi.source.json'), sourceText);
  return root;
}

test('accepts a spec that matches its source metadata', () => {
  const root = fixture();
  const result = checkOpenApiSource({ root });
  assert.equal(result.sha, BACKEND_SHA);
  assert.equal(result.sha256, digestOf(JSON.stringify({ openapi: '3.1.0', paths: {} })));
});

test('rejects a spec whose digest does not match the metadata', () => {
  const root = fixture();
  writeFileSync(path.join(root, 'openapi.json'), JSON.stringify({ openapi: '3.0.0', paths: {} }));
  assert.throws(
    () => checkOpenApiSource({ root }),
    /does not match[\s\S]*git -C <verdaxis-backend> show f4663bf4091ea4261875414f017cd27cd5a2ceb1:openapi\.json/
  );
});

test('rejects a missing spec', () => {
  const root = fixture({ spec: null, source: sourceFor('{}') });
  assert.throws(() => checkOpenApiSource({ root }), /Missing vendored spec openapi\.json/);
});

test('rejects missing source metadata', () => {
  const root = fixture({ source: null });
  assert.throws(
    () => checkOpenApiSource({ root }),
    /Missing openapi\.source\.json[\s\S]*git -C <verdaxis-backend> show <backend-sha>:openapi\.json/
  );
});

test('rejects a spec that is not JSON', () => {
  const spec = '{ not json';
  const root = fixture({ spec, source: sourceFor(spec) });
  assert.throws(() => checkOpenApiSource({ root }), /Malformed openapi\.json/);
});

test('rejects source metadata that is not JSON', () => {
  const root = fixture({ source: '{ not json' });
  assert.throws(() => checkOpenApiSource({ root }), /Malformed openapi\.source\.json/);
});

for (const field of ['repository', 'sha', 'path', 'sha256']) {
  test(`rejects source metadata missing '${field}'`, () => {
    const spec = JSON.stringify({ openapi: '3.1.0', paths: {} });
    const root = fixture({ spec, source: sourceFor(spec, { [field]: '' }) });
    assert.throws(
      () => checkOpenApiSource({ root }),
      new RegExp(`missing required string field '${field}'`)
    );
  });
}

test('rejects a short or non-hex commit SHA', () => {
  const spec = JSON.stringify({ openapi: '3.1.0', paths: {} });
  const root = fixture({ spec, source: sourceFor(spec, { sha: 'f4663bf4' }) });
  assert.throws(() => checkOpenApiSource({ root }), /must be a full 40-character commit SHA/);
});

test('rejects a malformed sha256 digest', () => {
  const spec = JSON.stringify({ openapi: '3.1.0', paths: {} });
  const root = fixture({ spec, source: sourceFor(spec, { sha256: 'not-a-digest' }) });
  assert.throws(() => checkOpenApiSource({ root }), /must be a 64-character hex digest/);
});
