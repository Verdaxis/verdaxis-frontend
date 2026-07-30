#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
  'vendor-maplibre',
  'vendor-leaflet',
  'vendor-lightweight-charts',
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    assert(flag?.startsWith('--') && value, 'Usage: --target production|staging --root <artifact-root>');
    values[flag.slice(2)] = value;
  }
  assert(values.target && values.root, 'Usage: --target production|staging --root <artifact-root>');
  return values;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkBuildArtifacts(parseArgs(process.argv.slice(2)));
  console.log('Build artifact checks passed.');
}
