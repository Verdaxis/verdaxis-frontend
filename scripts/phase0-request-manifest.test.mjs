import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inventory, PINS, requireClassified } from './phase0-request-manifest.mjs';

const contract = JSON.parse(readFileSync('docs/phase0/request-contract.json', 'utf8'));
for (const [name, ref] of Object.entries({ ...PINS, working: 'working' })) {
  test(`${name}: all static and direct requests have an explicit disposition`, () => {
    const calls = inventory(ref);
    assert.ok(calls.length > 100);
    requireClassified(calls, contract);
    if (name === 'working') {
      for (const call of calls) {
        if (call.path) assert.doesNotMatch(contract.routes[`${call.method} ${call.path}`], /^(retired|stale-wrapper|disabled):/);
      }
    }
  });
}
test('unclassified method/path and dynamic adapters fail closed', () => {
  assert.throws(() => requireClassified([{ method: 'POST', path: '/api/unreviewed' }], contract), /Unclassified/);
  assert.throws(() => requireClassified([{ file: 'new.ts', transport: 'fetch', dynamic: 'input' }], contract), /Unclassified/);
  assert.throws(() => requireClassified([{ method: 'DELETE', path: '/api/users/me/preferences' }], contract), /Unclassified/);
});
