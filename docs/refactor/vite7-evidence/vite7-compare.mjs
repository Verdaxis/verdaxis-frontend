import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  chunkStem,
  measureRouteFirstLoadSizes,
  ROUTE_FIRST_LOAD_BUDGETS,
} from '../../../scripts/check-build-artifacts.mjs';

const normalizeHashes = (text) => text.replace(/-[A-Za-z0-9_-]{8}(?=\.(?:js|css|woff2|webp|json))/g, '-HASH');

function filePaths(root, directory = '') {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return filePaths(root, relative);
    return [relative];
  }).sort();
}

function snapshot(root) {
  const assetsDirectory = path.join(root, 'assets');
  const files = readdirSync(assetsDirectory).sort();
  const shellHtml = readFileSync(path.join(root, 'index.html'), 'utf8');
  const emittedFiles = filePaths(root);
  const pages = emittedFiles.filter((file) => file.endsWith('.html'));
  const staticFiles = emittedFiles.filter((file) => !file.endsWith('.html') && !/\.(js|css)$/.test(file));
  const hints = (html) => [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /rel="(?:preload|modulepreload|preconnect|dns-prefetch)"/.test(tag))
    .map(normalizeHashes);
  return {
    pages,
    chunks: files.filter((file) => /\.(js|css)$/.test(file)).map((file) => `${chunkStem(file)}${path.extname(file)}`).sort(),
    shellHints: hints(shellHtml),
    pageHints: Object.fromEntries(pages.map((page) => [page, hints(readFileSync(path.join(root, page), 'utf8'))])),
    assets: files.filter((file) => !/\.(js|css)$/.test(file)),
    staticFiles: Object.fromEntries(staticFiles.map((file) => [file, createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex')])),
    chunkFiles: files.filter((file) => /\.(js|css)$/.test(file)),
    routes: ROUTE_FIRST_LOAD_BUDGETS.map((budget) => ({
      name: budget.name,
      ceilingGzipBytes: budget.ceilingGzipBytes,
      ...measureRouteFirstLoadSizes({ assetsDirectory, files, shellHtml, prefixes: budget.prefixes }),
    })),
  };
}

const beforeRoot = 'work/vite6-reference/dist';
const afterRoot = 'dist';
const before = snapshot(beforeRoot);
const after = snapshot(afterRoot);
const normalizedHtmlChanges = before.pages.filter((page) => normalizeHashes(readFileSync(path.join(beforeRoot, page), 'utf8')) !== normalizeHashes(readFileSync(path.join(afterRoot, page), 'utf8')));
const comparison = {
  before,
  after,
  normalizedHtmlChanges,
  routeChanges: before.routes.map((route, index) => ({
    name: route.name,
    before: route.gzipBytes,
    after: after.routes[index].gzipBytes,
    delta: after.routes[index].gzipBytes - route.gzipBytes,
    percent: 100 * (after.routes[index].gzipBytes / route.gzipBytes - 1),
  })),
};
writeFileSync('docs/refactor/vite7-evidence/vite7-build-comparison.json', `${JSON.stringify(comparison, null, 2)}\n`);
assert.deepEqual(after.pages, before.pages, 'emitted HTML paths changed');
assert.deepEqual(after.chunks, before.chunks, 'named chunk set changed');
assert.deepEqual(after.shellHints, before.shellHints, 'shell resource hints changed');
assert.deepEqual(after.pageHints, before.pageHints, 'prerendered resource hints changed');
assert.deepEqual(after.assets, before.assets, 'emitted static asset names changed');
assert.deepEqual(after.staticFiles, before.staticFiles, 'static file names or bytes changed');
assert.deepEqual(normalizedHtmlChanges, [], 'HTML changed beyond content hashes');
console.log(JSON.stringify({ pages: after.pages.length, chunks: after.chunks.length, normalizedHtmlChanges, routeChanges: comparison.routeChanges }, null, 2));
