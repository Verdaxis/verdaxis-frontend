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
  expect(api.rfq).not.toHaveProperty('decline');
  expect(api.rfq).not.toHaveProperty('counter');
  expect(api.rfq).not.toHaveProperty('sellerAccept');
});

it('keeps copied scalar RFQ history readable and revises quotes with PUT and a revision', async () => {
  setAccessToken('synthetic-session');
  const legacy = { id: 'rfq-1', product_id: '74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5',
    quantity_mt: '200', status: 'CANCELLED', quotes: [], contract_terms: null };
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') return Response.json({ id: 'quote-1', price_per_mt_usd: '900', revision: 3 });
    if (String(url).includes('/accept/')) return new Response('{}', { status: 409 });
    return Response.json(legacy);
  });
  const old = pinnedProductionClient();
  expect((await old.rfq.get('rfq-1')).product_id).toBe(legacy.product_id);
  expect((await api.rfq.get('rfq-1')).productId).toBe(legacy.product_id);
  const quote = { price_per_mt_usd: 900, expected_revision: 2, expires_at: '2026-10-20T00:00:00Z',
    offer_terms: { schema_version: 1 as const, matches_contract_terms: true as const,
      batch_reference: 'synthetic-batch', producing_site: 'Synthetic site', production_origin: 'SG',
      feedstock_origin: 'SG', shipping_location: 'Singapore', uco_mass_pct: 100 as const,
      standard: 'EN_14214' as const, standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU' as const,
      certificate_reference: 'synthetic-cert', certificate_holder: 'Synthetic supplier', certificate_valid_until: '2027-01-01',
      evidence_status: 'PENDING' as const, document_references: [], available_quantity_mt: 200 } };
  await api.rfq.revise('rfq-1', 'quote-1', quote);
  const revision = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
  expect(String(revision?.[0])).toBe('/api/rfq/rfq-1/quotes/quote-1');
  expect(JSON.parse(String(revision?.[1]?.body))).toEqual(quote);
  await expect(old.rfq.accept('rfq-1', 'quote-1')).rejects.toMatchObject({ status: 409 });
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
  const { isLoading, isAuthenticated, login } = useAuth();
  return <div><span>{isLoading ? 'restoring' : isAuthenticated ? 'signed in' : 'sign in again'}</span>
    <button onClick={() => void login('synthetic-new-token')}>Login</button></div>;
}

it('requires re-login after copied refresh sessions are absent', async () => {
  clearAccessToken();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    if (String(url).endsWith('/auth/refresh')) return new Response('{}', { status: 401 });
    if (String(url).endsWith('/auth/me')) return Response.json({ id: 'synthetic-user', email: 'pilot@example.test',
      role: 'BUYER', is_active: true, organization_id: 'synthetic-org',
      execution_eligibility: { allowed: true, reason: 'KYC_GATE_DISABLED' } });
    throw new Error(`Unclassified auth request: ${url}`);
  });
  render(<AuthProvider><CutoverSession /></AuthProvider>);
  await screen.findByText('sign in again');
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(screen.getByText('signed in')).toBeTruthy());
});
