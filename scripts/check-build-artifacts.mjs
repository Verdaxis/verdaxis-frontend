#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const PRODUCTION_API_URL = 'https://api.verdaxis.exchange/api';
const STAGING_API_URL = 'https://api-staging.verdaxis.exchange/api';
const LOCAL_API_URL = 'http://localhost:8000/api';

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

const HEAVY_VENDOR_CHUNKS = [
  'vendor-maplibre',
  'vendor-leaflet',
  'vendor-lightweight-charts',
  'vendor-recharts',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assetFiles() {
  assert(existsSync(DIST_DIR), `Missing build output directory: ${DIST_DIR}`);
  assert(existsSync(ASSETS_DIR), `Missing build assets directory: ${ASSETS_DIR}`);
  assert(existsSync(INDEX_HTML), `Missing build HTML: ${INDEX_HTML}`);
  return readdirSync(ASSETS_DIR).filter((file) => file.endsWith('.js'));
}

function findChunk(files, prefix) {
  return files.filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.js'));
}

function assertChunkSplit(files) {
  for (const prefix of EXPECTED_VENDOR_CHUNKS) {
    const matches = findChunk(files, prefix);
    assert(
      matches.length === 1,
      `Expected exactly one ${prefix} JS chunk, found ${matches.length}: ${matches.join(', ') || 'none'}`
    );
  }

  for (const prefix of LEGACY_VENDOR_CHUNKS) {
    const matches = findChunk(files, prefix);
    assert(
      matches.length === 0,
      `Legacy grouped vendor chunk still exists for ${prefix}: ${matches.join(', ')}`
    );
  }
}

function assertInitialHtmlDoesNotEagerLoadHeavyChunks() {
  const html = readFileSync(INDEX_HTML, 'utf8');
  for (const prefix of HEAVY_VENDOR_CHUNKS) {
    const eagerReference = new RegExp(`(?:src|href)=["'][^"']*${prefix}-`);
    assert(
      !eagerReference.test(html),
      `Initial HTML eagerly references heavy vendor chunk ${prefix}`
    );
  }
}

function assertApiTarget(files) {
  const source = files
    .map((file) => readFileSync(path.join(ASSETS_DIR, file), 'utf8'))
    .join('\n');

  assert(!source.includes(LOCAL_API_URL), `Release bundle contains forbidden API target: ${LOCAL_API_URL}`);

  const expectedApiUrl = process.env.VERCEL_ENV === 'production'
    ? PRODUCTION_API_URL
    : process.env.VERDAXIS_EXPECTED_API_URL?.trim();

  if (expectedApiUrl) {
    assert(source.includes(expectedApiUrl), `Release bundle is missing expected API target: ${expectedApiUrl}`);
    return;
  }

  assert(
    source.includes(PRODUCTION_API_URL) || source.includes(STAGING_API_URL),
    'Release bundle is missing a deployable Verdaxis API target'
  );
}

const files = assetFiles();
assertChunkSplit(files);
assertInitialHtmlDoesNotEagerLoadHeavyChunks();
assertApiTarget(files);

console.log('Build artifact checks passed.');
