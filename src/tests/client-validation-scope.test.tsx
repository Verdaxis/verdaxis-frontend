import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateOrganizationPage from '../pages/CreateOrganizationPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import i18n, { loadNamespace } from '../i18n';
import { api, ApiError } from '../services/api';
import { setAccessToken } from '../services/authToken';
import { invalidateReadCache } from '../services/readCache';
import { renderWithProviders } from './test-utils';
import { paMeta } from './product-analytics-fixtures';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'synthetic-session' }) }));
afterEach(() => vi.restoreAllMocks());

beforeEach(async () => {
  await loadNamespace('auth');
  await loadNamespace('admin');
  await i18n.changeLanguage('en');
  invalidateReadCache();
  setAccessToken('synthetic-session');
});

describe('server-side validation stays visible', () => {
  it('shows the structured country rejection on organization creation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'INVALID_COUNTRY', message: 'Country code is not an assigned ISO alpha-2 code' },
    }, { status: 422 }));
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/create-organization',
          state: { registration_token: 'synthetic-token', role: 'BUYER' },
        }]}
      >
        <CreateOrganizationPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Northstar Shipping' } });
    const country = screen.getByRole('button', { name: /country/i });
    fireEvent.click(country);
    fireEvent.click(await screen.findByText('Singapore'));
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/register-with-org');
    expect(await screen.findByText(/not an assigned ISO alpha-2/i)).toBeTruthy();
  });
});

describe('client keeps tenant-scope failures', () => {
  it('surfaces a malformed vessel identifier as a validation error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'VALIDATION_ERROR', message: 'vessel_id is not a valid UUID' },
    }, { status: 422 }));
    await expect(api.vessels.updateStatus('not-a-uuid', 'At Sea')).rejects.toMatchObject({
      status: 422, code: 'VALIDATION_ERROR',
    });
    expect(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).toContain('/vessels/not-a-uuid');
  });

  it('passes a negative audit limit to the server instead of hiding it', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'VALIDATION_ERROR', message: 'limit must be at least 1' },
    }, { status: 422 }));
    await expect(api.admin.auditLogs({ limit: -5 })).rejects.toBeInstanceOf(ApiError);
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=-5');
  });

  it('keeps an out-of-domain analytics window as an error', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'WINDOW_OUT_OF_DOMAIN', message: 'The requested window precedes recorded history' },
    }, { status: 422 }));
    await expect(api.productAnalytics.overview({
      start: '2020-01-01T00:00:00Z', end: '2020-01-08T00:00:00Z',
    })).rejects.toMatchObject({ status: 422, code: 'WINDOW_OUT_OF_DOMAIN' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('start=2020-01-01T00%3A00%3A00Z');
    expect(url).toContain('end=2020-01-08T00%3A00%3A00Z');
  });

  it('reports the previous-comparison window underflow separately', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'PREVIOUS_WINDOW_OUT_OF_DOMAIN', message: 'The comparison window precedes recorded history' },
    }, { status: 422 }));
    await expect(api.productAnalytics.overview({
      start: '2026-01-01T00:00:00Z', end: '2026-01-08T00:00:00Z', compare: true,
    })).rejects.toMatchObject({ status: 422, code: 'PREVIOUS_WINDOW_OUT_OF_DOMAIN' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/product-analytics/overview');
    expect(url).not.toContain('compare=false');
  });

  it('sends the requested period for the reliability audit activity', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      meta: paMeta(),
      collector: { status: 'ok', diagnostic: null, last_observation_at: null },
      login_failures: { total: { value: 0, previous: null, suppressed: false }, categories: [], trend: [] },
      frontend_errors: { total: { value: 0, previous: null, suppressed: false }, by_route_family: [], by_category: [] },
      backend_unavailable: { total: { value: 0, previous: null, suppressed: false }, by_route_family: [] },
      navigation_latency: [],
      audit_activity: [],
    }));
    const result = await api.productAnalytics.reliability({
      start: '2026-07-01T00:00:00Z', end: '2026-07-08T00:00:00Z',
    });
    expect(result.audit_activity).toEqual([]);
    // Only the requested half-open window is asked for; the rows shown can
    // come from no other period.
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/product-analytics/reliability');
    expect(url).toContain('start=2026-07-01T00%3A00%3A00Z');
    expect(url).toContain('end=2026-07-08T00%3A00%3A00Z');
  });

  it('does not mint a free tier when the subscription read fails on scope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      detail: { code: 'ORGANIZATION_REQUIRED', message: 'Organization required' },
    }, { status: 403 }));
    await expect(api.subscriptions.me()).rejects.toMatchObject({ status: 403, code: 'ORGANIZATION_REQUIRED' });
  });

  it('keeps the current principal on the profile update write', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      email: 'a@example.test', role: 'SUPPLIER', first_name: 'A', last_name: 'B',
    }));
    const { container } = renderWithProviders(<OnboardingPage />);
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: /buyer/i }));
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/me$/);
    expect(options?.method).toBe('PUT');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer synthetic-session');
    expect(JSON.parse(String(options?.body))).toEqual({ first_name: 'A', last_name: 'B', role: 'BUYER' });
  });
});
