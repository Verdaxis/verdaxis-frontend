import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

// The backend has no `POST /api/activity/events` and no
// `GET /api/admin/users/{id}/activity` route, so any call to them answers 404.
describe('retired account activity reporting', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers no client for the removed routes', () => {
    expect('activity' in api).toBe(false);
    expect('userActivity' in api.admin).toBe(false);
  });

  it('does not request the removed routes when public reads run', async () => {
    await api.ports.list().catch(() => undefined);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.some((url) => /\/activity(\/|$|\?)/.test(url))).toBe(false);
  });

  it('keeps the removed routes out of the source', () => {
    const srcRoot = join(__dirname, '..');
    const files: string[] = [];
    const walk = (directory: string) => {
      for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(srcRoot);

    const offenders = files
      .filter((file) => !file.endsWith('no-activity-reporter.test.ts'))
      .filter((file) => /activity\/events|\/activity\?\$\{|ActivityTrackingProvider/.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
