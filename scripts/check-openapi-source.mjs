#!/usr/bin/env node

// Guards the vendored backend contract. The frontend never edits openapi.json;
// it is a verbatim copy of the backend's committed contract, and
// openapi.source.json records the backend repository, commit SHA, path, and the
// digest of that copy. This check fails when the copy drifts from the metadata.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SPEC_FILE = 'openapi.json';
const SOURCE_FILE = 'openapi.source.json';
const REQUIRED_SOURCE_FIELDS = ['repository', 'sha', 'path', 'sha256'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// The same instructions cover every failure: both files travel together, and the
// backend commit is the only source. `sha` is present when the metadata parsed.
function updateHint(sha) {
  const commit = sha || '<backend-sha>';
  return [
    'Update both files together from the backend contract:',
    `  git -C <verdaxis-backend> show ${commit}:${SPEC_FILE} > ${SPEC_FILE}`,
    `  then set "sha": "${commit}" and "sha256" to the new digest in ${SOURCE_FILE}`,
    `  (shasum -a 256 ${SPEC_FILE}).`,
  ].join('\n');
}

function readText(filePath, label) {
  return readBytes(filePath, label).toString('utf8');
}

function readBytes(filePath, label) {
  try {
    return readFileSync(filePath);
  } catch (error) {
    throw new Error(`Cannot read ${label} at ${filePath}: ${error.message}\n${updateHint()}`);
  }
}

function parseObject(text, filePath, label) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`Malformed ${label} at ${filePath}: ${error.message}\n${updateHint()}`);
  }
  assert(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `Malformed ${label} at ${filePath}: expected a JSON object.\n${updateHint()}`
  );
  return value;
}

function assertSourceFields(source, filePath) {
  for (const field of REQUIRED_SOURCE_FIELDS) {
    assert(
      typeof source[field] === 'string' && source[field].length > 0,
      `Malformed ${filePath}: missing required string field '${field}'.\n${updateHint()}`
    );
  }
  assert(
    /^[0-9a-f]{40}$/.test(source.sha),
    `Malformed ${filePath}: 'sha' must be a full 40-character commit SHA, got '${source.sha}'.\n${updateHint()}`
  );
  assert(
    /^[0-9a-f]{64}$/.test(source.sha256),
    `Malformed ${filePath}: 'sha256' must be a 64-character hex digest, got '${source.sha256}'.\n${updateHint()}`
  );
}

export function checkOpenApiSource({ root }) {
  const rootDir = path.resolve(root);
  const specPath = path.join(rootDir, SPEC_FILE);
  const sourcePath = path.join(rootDir, SOURCE_FILE);

  assert(
    existsSync(sourcePath),
    `Missing ${SOURCE_FILE} at ${sourcePath}.\n${updateHint()}`
  );
  assert(
    existsSync(specPath),
    `Missing vendored spec ${SPEC_FILE} at ${specPath}.\n${updateHint()}`
  );

  const source = parseObject(readText(sourcePath, SOURCE_FILE), sourcePath, SOURCE_FILE);
  assertSourceFields(source, sourcePath);

  // Hash the raw bytes, so the digest matches `shasum -a 256 openapi.json`.
  const specBytes = readBytes(specPath, SPEC_FILE);
  parseObject(specBytes.toString('utf8'), specPath, SPEC_FILE);

  const digest = createHash('sha256').update(specBytes).digest('hex');
  assert(
    digest === source.sha256,
    `${SPEC_FILE} sha256 ${digest} does not match ${SOURCE_FILE} ${source.sha256}.\n${updateHint(source.sha)}`
  );

  return { sha: source.sha, sha256: digest };
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  if (rootIndex === -1) return { root: process.cwd() };
  const value = argv[rootIndex + 1];
  assert(
    value && !value.startsWith('--'),
    'Usage: check-openapi-source.mjs [--root <directory>]'
  );
  return { root: value };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { sha } = checkOpenApiSource(parseArgs(process.argv.slice(2)));
  console.log(`Vendored OpenAPI contract matches backend ${sha}.`);
}
