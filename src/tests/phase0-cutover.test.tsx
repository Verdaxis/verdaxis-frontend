import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { setAccessToken, clearAccessToken } from '../services/authToken';
import { getMarketplaceProductValue } from '../utils/marketProducts';
import { pinnedProductionClient } from './phase0-pinned-client';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { invalidateReadCache } from '../services/readCache';

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
  const oldClient = pinnedProductionClient();
  expect(await oldClient.preferences.getAll()).toEqual(saved);
  await oldClient.preferences.put('marketplace', saved.marketplace);
  requests.length = 0;
  expect(await api.preferences.getAll()).toEqual(saved);
  await api.preferences.put('marketplace', saved.marketplace);
  for (const code of ['B30', 'B100', 'BIO_LNG']) expect(getMarketplaceProductValue(code)).toBe(code);
  expect(requests).toEqual([
    { path: '/api/users/me/preferences', method: 'GET', body: null },
    { path: '/api/users/me/preferences/marketplace', method: 'PUT', body: saved.marketplace },
  ]);
  expect(requests.some(request => request.path.includes('/activity'))).toBe(false);
});

it('retires cached activity with one 404, not a refresh or retry loop', async () => {
  setAccessToken('synthetic-session');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
  expect(await pinnedProductionClient().activity.record({ events: [] })).toBe('rejected');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api/activity/events');
  expect(api).not.toHaveProperty('activity');
  expect(api).not.toHaveProperty('rfq');
});

it('reads only the planned public notification projection and null compliance values in both clients', async () => {
  setAccessToken('synthetic-session');
  const notification = { id: 'notice-1', type: 'ORDER', title: 'Order expiring', message: 'Synthetic',
    data: { event: 'order_expiring', expires_at: '2026-10-20T00:00:00Z' }, is_read: false };
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    if (String(url).endsWith('/notifications')) return Response.json([notification]);
    if (String(url).endsWith('/notifications/unread-count')) return Response.json({ count: 1 });
    return Response.json({ ets_cost_eur: null, pricing_status: 'UNPRICED', adjustment_usd: 0 });
  });
  for (const client of [pinnedProductionClient(), api]) {
    invalidateReadCache();
    expect(await client.notifications.list()).toEqual([notification]);
    expect(JSON.stringify(await client.notifications.list())).not.toContain('_email_');
    const scenario = await client.compliance.scenario('synthetic-vessel', {}, 2026);
    expect(scenario).toEqual({ ets_cost_eur: null, pricing_status: 'UNPRICED', adjustment_usd: 0 });
  }
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/activity'))).toBe(false);
});

function CutoverSession() {
  const { isLoading, isAuthenticated, login, user } = useAuth();
  return <div><span>{isLoading ? 'restoring' : isAuthenticated ? 'signed in' : 'sign in again'}</span>
    <output data-testid="eligibility">{JSON.stringify(user?.execution_eligibility)}</output>
    <button onClick={() => void login('synthetic-new-token')}>Login</button></div>;
}

it('requires re-login after copied refresh sessions are absent', async () => {
  clearAccessToken();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    if (String(url).endsWith('/auth/refresh')) return new Response('{}', { status: 401 });
    if (String(url).endsWith('/auth/me')) return Response.json({ id: 'synthetic-user', email: 'pilot@example.test',
      role: 'BUYER', is_active: true, organization_id: 'synthetic-org',
      execution_eligibility: { eligible: true, reason: 'KYC_NOT_ENFORCED', grace_expires_at: null } });
    throw new Error(`Unclassified auth request: ${url}`);
  });
  render(<AuthProvider><CutoverSession /></AuthProvider>);
  await screen.findByText('sign in again');
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(screen.getByText('signed in')).toBeTruthy());
  expect(JSON.parse(screen.getByTestId('eligibility').textContent!)).toEqual({
    eligible: true, reason: 'KYC_NOT_ENFORCED', grace_expires_at: null,
  });
});
