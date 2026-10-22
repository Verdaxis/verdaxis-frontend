import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderWithProviders, screen, waitFor } from './test-utils';
import { DataAnalytics } from '../components/DataAnalytics';
import i18n, { loadNamespace } from '../i18n';

const subscriptionsMeMock = vi.fn();
const fleetIntelligenceGetMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../hooks/useDashboardContentReady', () => ({
  useDashboardContentReady: () => undefined,
}));

vi.mock('../services/api', () => ({
  api: {
    subscriptions: {
      me: (...args: unknown[]) => subscriptionsMeMock(...args),
    },
    fleetIntelligence: {
      get: (...args: unknown[]) => fleetIntelligenceGetMock(...args),
    },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const baselineLabel = 'Live fleet data is unavailable; the values below are a baseline estimate.';
const loadingLabel = 'Live fleet data is still loading; the values below are a baseline estimate.';
const baselineNotice = 'Baseline estimate: no observed date or source.';
const historicalLabel = 'Historical fleet observation';
const historicalNote = 'Reported by the dataset publisher; Verdaxis cannot certify facts the publisher did not record.';

const observation = {
  entries: [
    {
      fuel: 'Bio Methanol',
      ordered_vessels: 10,
      delivered_vessels: 4,
      avg_consumption_mt: 9000,
      color: '#5DADE2',
    },
  ],
  sources: ['Fleet intelligence live'],
  last_updated: '2026-05-14T08:00:00Z',
};

describe('fleet_display_states', () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  beforeEach(() => {
    subscriptionsMeMock.mockReset();
    fleetIntelligenceGetMock.mockReset();
    useAuthMock.mockReset();

    subscriptionsMeMock.mockResolvedValue({ id: 'sub-1', org_id: 'org-1', tier: 'premium', is_active: true });
    useAuthMock.mockReturnValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  });

  it('keeps the baseline numbers and labels them as an estimate on a 503', async () => {
    fleetIntelligenceGetMock.mockRejectedValue(Object.assign(new Error('Service Unavailable'), { status: 503 }));
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(baselineLabel)).length).toBeGreaterThan(0);
    // The baseline figures stay on screen; only their label changes.
    expect(screen.getAllByText(/112\/323 delivered/).length).toBeGreaterThan(0);
    expect(screen.getByText(baselineNotice)).toBeTruthy();
    expect(screen.getByText(/Estimated demand \(derived\): 1064k MT\/yr/)).toBeTruthy();
    // A baseline has no observed date or source to claim.
    expect(screen.queryByText(/^Source:/)).toBeNull();
    expect(screen.queryByText(/^Updated:/)).toBeNull();
    expect(screen.queryByText(historicalLabel)).toBeNull();
  });

  it('keeps the labeled baseline on a network failure', async () => {
    fleetIntelligenceGetMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(baselineLabel)).length).toBeGreaterThan(0);
    expect(screen.getByText(baselineNotice)).toBeTruthy();
    expect(screen.queryByText(/^Source:/)).toBeNull();
    expect(screen.queryByText(/^Updated:/)).toBeNull();
  });

  it('keeps the labeled baseline on a malformed payload', async () => {
    fleetIntelligenceGetMock.mockResolvedValue({ entries: 'not-an-array', sources: [], last_updated: '' });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(baselineLabel)).length).toBeGreaterThan(0);
    expect(screen.getByText(baselineNotice)).toBeTruthy();
    expect(screen.queryByText(historicalLabel)).toBeNull();
  });

  it('does not present the loading placeholders as an observation', async () => {
    fleetIntelligenceGetMock.mockReturnValue(new Promise(() => undefined));
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect(await screen.findByText(loadingLabel)).toBeTruthy();
    expect(screen.getAllByText(/112\/323 delivered/).length).toBeGreaterThan(0);
    expect(screen.queryByText(historicalLabel)).toBeNull();
    expect(screen.queryByText(/^Source:/)).toBeNull();
    expect(screen.queryByText(/^Updated:/)).toBeNull();
  });

  it('shows the reported date and source for a historical observation', async () => {
    fleetIntelligenceGetMock.mockResolvedValue(observation);
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(historicalLabel)).length).toBeGreaterThan(0);
    expect(screen.getByText('Source: Fleet intelligence live')).toBeTruthy();
    expect(screen.getByText('Updated: 2026-05-14 08:00:00 UTC')).toBeTruthy();
    expect(screen.getByText(historicalNote)).toBeTruthy();
    expect(screen.getByText(/Estimated demand \(derived\): 36k MT\/yr/)).toBeTruthy();
    expect(screen.getByText('MT/yr Estimated demand (derived)')).toBeTruthy();
    expect(screen.queryByText(baselineNotice)).toBeNull();
  });

  it('keeps a valid empty observation empty with its reported context', async () => {
    fleetIntelligenceGetMock.mockResolvedValue({
      entries: [],
      sources: ['Fleet intelligence live'],
      last_updated: '2026-05-15T08:00:00Z',
    });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText('Historical fleet observation returned zero entries')).length).toBeGreaterThan(0);
    expect(screen.getByText('The live dataset reported no fleet demand entries for this update.')).toBeTruthy();
    expect(screen.getByText('Source: Fleet intelligence live')).toBeTruthy();
    expect(screen.getByText('Updated: 2026-05-15 08:00:00 UTC')).toBeTruthy();
    expect(screen.queryByText(baselineNotice)).toBeNull();
    expect(screen.queryByText(baselineLabel)).toBeNull();
  });

  it('waits for the subscription read before it unlocks the detailed panels', async () => {
    fleetIntelligenceGetMock.mockResolvedValue(observation);
    useAuthMock.mockReturnValue({ user: { id: 'buyer-1', role: 'BUYER' } });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    await waitFor(() => expect(subscriptionsMeMock).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText(historicalLabel)).length).toBeGreaterThan(0);
  });
});
