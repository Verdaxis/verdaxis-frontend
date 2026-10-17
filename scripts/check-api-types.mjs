#!/usr/bin/env node

// Guards the generated API types. src/api/generated/openapi.d.ts is produced by
// `npm run generate:api-types` from the vendored openapi.json, and this check
// fails when the committed file is not what that command would write today. The
// candidate is written to a temporary directory, so a stale file is reported
// rather than silently refreshed.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SPEC_FILE = 'openapi.json';
const GENERATED_FILE = 'src/api/generated/openapi.d.ts';
const REGENERATE_HINT = `Regenerate it with \`npm run generate:api-types\` and commit ${GENERATED_FILE}.`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// The first differing line is enough to tell a stale ordering from a changed
// field, and it keeps the failure short.
function describeDifference(committed, candidate) {
  if (committed === candidate) return null;
  const committedLines = committed.split('\n');
  const candidateLines = candidate.split('\n');
  const max = Math.max(committedLines.length, candidateLines.length);
  for (let index = 0; index < max; index += 1) {
    if (committedLines[index] === candidateLines[index]) continue;
    return [
      `first difference at line ${index + 1}:`,
      `  committed: ${committedLines[index] ?? '<end of file>'}`,
      `  generated: ${candidateLines[index] ?? '<end of file>'}`,
    ].join('\n');
  }
  return 'the files differ only in trailing newline handling.';
}

export function checkApiTypes({ root }) {
  const rootDir = path.resolve(root);
  const specPath = path.join(rootDir, SPEC_FILE);
  const generatedPath = path.join(rootDir, GENERATED_FILE);
  const cliPath = path.join(rootDir, 'node_modules', '.bin', 'openapi-typescript');

  assert(existsSync(specPath), `Missing vendored spec ${SPEC_FILE} at ${specPath}.`);
  assert(
    existsSync(generatedPath),
    `Missing generated types at ${generatedPath}. ${REGENERATE_HINT}`
  );
  assert(
    existsSync(cliPath),
    `Missing openapi-typescript at ${cliPath}. Run \`npm ci --legacy-peer-deps\` first.`
  );

  const scratchDir = mkdtempSync(path.join(tmpdir(), 'verdaxis-api-types-'));
  const candidatePath = path.join(scratchDir, 'openapi.d.ts');
  try {
    execFileSync(cliPath, [specPath, '-o', candidatePath], { cwd: rootDir, stdio: 'inherit' });
    const committed = readFileSync(generatedPath, 'utf8');
    const candidate = readFileSync(candidatePath, 'utf8');
    const difference = describeDifference(committed, candidate);
    assert(
      difference === null,
      `${GENERATED_FILE} is out of date with ${SPEC_FILE}. ${REGENERATE_HINT}\n${difference}`
    );
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  if (rootIndex === -1) return { root: process.cwd() };
  const value = argv[rootIndex + 1];
  assert(
    value && !value.startsWith('--'),
    'Usage: check-api-types.mjs [--root <directory>]'
  );
  return { root: value };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkApiTypes(parseArgs(process.argv.slice(2)));
  console.log(`${GENERATED_FILE} matches ${SPEC_FILE}.`);
}
