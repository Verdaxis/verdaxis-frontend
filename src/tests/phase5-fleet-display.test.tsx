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
const emptyObservationText = 'The fleet observation reported no demand entries for this update.';
const paywallTitle = 'Unlock Full Supply & Demand Intelligence';

const observedEntry = {
  fuel: 'Bio Methanol',
  ordered_vessels: 10,
  delivered_vessels: 4,
  avg_consumption_mt: 9000,
  color: '#5DADE2',
};

// The fleet publishers report a calendar date without a time.
const observation = {
  entries: [observedEntry],
  sources: ['Fleet intelligence live'],
  last_updated: '2026-05-14',
};

const expectLabeledBaseline = async () => {
  expect((await screen.findAllByText(baselineLabel)).length).toBeGreaterThan(0);
  // The baseline figures stay on screen; only their label changes.
  expect(screen.getAllByText(/112\/323 delivered/).length).toBeGreaterThan(0);
  expect(screen.getByText(baselineNotice)).toBeTruthy();
  // A baseline has no observed date or source to claim.
  expect(screen.queryByText(/^Source:/)).toBeNull();
  expect(screen.queryByText(/^Updated:/)).toBeNull();
  expect(screen.queryByText(historicalLabel)).toBeNull();
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

    await expectLabeledBaseline();
    expect(screen.getByText(/Estimated demand \(derived\): 1064k MT\/yr/)).toBeTruthy();
  });

  it('keeps the labeled baseline on a network failure', async () => {
    fleetIntelligenceGetMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    await expectLabeledBaseline();
  });

  const entryWithout = (field: keyof typeof observedEntry): Record<string, unknown> => {
    const entry: Record<string, unknown> = { ...observedEntry };
    delete entry[field];
    return entry;
  };
  const malformedDocuments: Array<[string, unknown]> = [
    ['entries that are not a list', { ...observation, entries: 'not-an-array' }],
    ['an entry that is null', { ...observation, entries: [null] }],
    ['sources that are null', { ...observation, sources: null }],
    ['a source that is not text', { ...observation, sources: ['Fleet intelligence live', 7] }],
    ['a count that is not a number', { ...observation, entries: [{ ...observedEntry, ordered_vessels: 'ten' }] }],
    ['a missing count', { ...observation, entries: [entryWithout('delivered_vessels')] }],
    ['a negative count', { ...observation, entries: [{ ...observedEntry, delivered_vessels: -1 }] }],
    ['a fractional count', { ...observation, entries: [{ ...observedEntry, ordered_vessels: 10.5 }] }],
    ['a missing consumption figure', { ...observation, entries: [entryWithout('avg_consumption_mt')] }],
    ['a missing fuel', { ...observation, entries: [entryWithout('fuel')] }],
    ['a missing color', { ...observation, entries: [{ ...observedEntry, color: null }] }],
    ['an update date that is not a date', { ...observation, last_updated: 'last week' }],
    ['an update date that is not a calendar day', { ...observation, last_updated: '2026-02-30' }],
    ['an update date that is a number', { ...observation, last_updated: 1778716800 }],
    ['an update time without an offset', { ...observation, last_updated: '2026-05-14T08:00:00' }],
    ['a missing update date', { entries: observation.entries, sources: observation.sources }],
    ['a document that is null', null],
  ];

  it.each(malformedDocuments)('keeps the labeled baseline for %s', async (_case, document) => {
    fleetIntelligenceGetMock.mockResolvedValue(document);
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    await expectLabeledBaseline();
  });

  it('does not present the loading placeholders as an observation', async () => {
    fleetIntelligenceGetMock.mockReturnValue(new Promise(() => undefined));
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(loadingLabel)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/112\/323 delivered/).length).toBeGreaterThan(0);
    expect(screen.queryByText(historicalLabel)).toBeNull();
    expect(screen.queryByText(/^Source:/)).toBeNull();
    expect(screen.queryByText(/^Updated:/)).toBeNull();
  });

  it('shows the reported date exactly as received for a historical observation', async () => {
    fleetIntelligenceGetMock.mockResolvedValue(observation);
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(historicalLabel)).length).toBeGreaterThan(0);
    expect(screen.getByText('Source: Fleet intelligence live')).toBeTruthy();
    // The publisher reported a day only, so no time or time zone is added.
    expect(screen.getByText('Updated: 2026-05-14')).toBeTruthy();
    expect(screen.getByText(historicalNote)).toBeTruthy();
    expect(screen.getByText(/Estimated demand \(derived\): 36k MT\/yr/)).toBeTruthy();
    expect(screen.getByText('MT/yr Estimated demand (derived)')).toBeTruthy();
    expect(screen.queryByText(baselineNotice)).toBeNull();
  });

  it('shows a reported time in UTC when the source has one', async () => {
    fleetIntelligenceGetMock.mockResolvedValue({ ...observation, last_updated: '2026-05-14T16:30:00+08:00' });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(historicalLabel)).length).toBeGreaterThan(0);
    expect(screen.getByText('Updated: 2026-05-14 08:30:00 UTC')).toBeTruthy();
  });

  it('keeps a valid empty observation empty with its reported context', async () => {
    fleetIntelligenceGetMock.mockResolvedValue({
      entries: [],
      sources: ['Fleet intelligence live'],
      last_updated: '2026-05-15',
    });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText('Historical fleet observation returned zero entries')).length).toBeGreaterThan(0);
    expect(screen.getByText(emptyObservationText)).toBeTruthy();
    expect(screen.getByText('Source: Fleet intelligence live')).toBeTruthy();
    expect(screen.getByText('Updated: 2026-05-15')).toBeTruthy();
    // The totals come from the empty observation, not from the baseline.
    expect(screen.getAllByText('0/0 delivered').length).toBeGreaterThan(0);
    expect(screen.queryByText(/112\/323 delivered/)).toBeNull();
    expect(screen.queryByText(baselineNotice)).toBeNull();
    expect(screen.queryByText(baselineLabel)).toBeNull();
  });

  it('keeps the detailed panels locked until the subscription read returns a paid tier', async () => {
    let resolveSubscription!: (value: unknown) => void;
    subscriptionsMeMock.mockReturnValue(new Promise(resolve => { resolveSubscription = resolve; }));
    fleetIntelligenceGetMock.mockResolvedValue(observation);
    useAuthMock.mockReturnValue({ user: { id: 'buyer-1', role: 'BUYER' } });
    await loadNamespace('dashboard');

    renderWithProviders(<DataAnalytics />);

    expect((await screen.findAllByText(historicalLabel)).length).toBeGreaterThan(0);
    expect(subscriptionsMeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(paywallTitle)).toBeTruthy();

    await act(async () => {
      resolveSubscription({ id: 'sub-1', org_id: 'org-1', tier: 'premium', is_active: true });
    });

    await waitFor(() => expect(screen.queryByText(paywallTitle)).toBeNull());
  });
});
