import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inventory, requireClassified } from './phase0-request-manifest.mjs';

const contract = JSON.parse(readFileSync('docs/phase0/request-contract.json', 'utf8'));
test('every current request has an approved disposition', () => {
  const calls = inventory('working');
  assert.ok(calls.some(call => call.method === 'POST' && call.path === '/api/auth/refresh'));
  requireClassified(calls, contract);
  for (const call of calls) {
    if (call.path) assert.doesNotMatch(contract.routes[`${call.method} ${call.path}`], /^(retired|stale-wrapper|disabled):/);
  }
});
test('unclassified method/path and dynamic adapters fail closed', () => {
  assert.throws(() => requireClassified([{ method: 'POST', path: '/api/unreviewed' }], contract), /Unclassified/);
  assert.throws(() => requireClassified([{ file: 'new.ts', transport: 'fetch', dynamic: 'input' }], contract), /Unclassified/);
  assert.throws(() => requireClassified([{ method: 'DELETE', path: '/api/users/me/preferences' }], contract), /Unclassified/);
});
