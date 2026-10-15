import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { setAccessToken, clearAccessToken } from '../services/authToken';
import { getMarketplaceProductValue } from '../utils/marketProducts';

// Task 3 has not landed. These synthetic responses express the planned wire contract.
afterEach(() => { vi.restoreAllMocks(); clearAccessToken(); });

it('test_old_and_new_browser_contracts_during_cutover', async () => {
  setAccessToken('synthetic-session');
  const saved = { marketplace: { product: 'B30' }, radar: { products: ['B100', 'BIO_LNG'] } };
  const requests: { path: string; method: string; body: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    const method = options?.method ?? 'GET';
    requests.push({ path, method, body: options?.body ? JSON.parse(String(options.body)) : null });
    if (path === '/api/users/me/preferences' && method === 'GET') return Response.json(saved);
    if (path === '/api/users/me/preferences/marketplace' && method === 'PUT') return Response.json({});
    throw new Error(`Unclassified request: ${method} ${path}`);
  });
  expect(await api.preferences.getAll()).toEqual(saved);
  await api.preferences.put('marketplace', saved.marketplace);
  for (const code of ['B30', 'B100', 'BIO_LNG']) expect(getMarketplaceProductValue(code)).toBe(code);
  expect(requests).toEqual([
    { path: '/api/users/me/preferences', method: 'GET', body: null },
    { path: '/api/users/me/preferences/marketplace', method: 'PUT', body: saved.marketplace },
  ]);
  expect(requests.some(request => request.path.includes('/activity'))).toBe(false);
});
