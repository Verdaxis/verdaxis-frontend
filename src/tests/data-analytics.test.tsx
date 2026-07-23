import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from './test-utils';
import { DataAnalytics } from '../components/DataAnalytics';

const subscriptionsMeMock = vi.fn();
const fleetIntelligenceGetMock = vi.fn();
const useAuthMock = vi.fn();

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

describe('DataAnalytics', () => {
  beforeEach(() => {
    subscriptionsMeMock.mockReset();
    fleetIntelligenceGetMock.mockReset();
    useAuthMock.mockReset();

    subscriptionsMeMock.mockResolvedValue({ id: 'sub-1', org_id: 'org-1', tier: 'free', is_active: true });
    fleetIntelligenceGetMock.mockResolvedValue({
      entries: [
        {
          fuel: 'Bio Methanol',
          ordered_vessels: 10,
          delivered_vessels: 4,
          avg_consumption_mt: 9000,
          color: '#5DADE2',
        },
      ],
      sources: ['Fleet intelligence mock'],
      last_updated: '2026-05-14T08:00:00Z',
    });
  });

  it('keeps the paywall overlay for free-tier non-admin users', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'BUYER' },
    });

    renderWithProviders(<DataAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Unlock Full S&D Intelligence')).toBeTruthy();
    });
  });

  it('unlocks the screen for admin users even without a premium subscription', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'ADMIN' },
    });

    renderWithProviders(<DataAnalytics />);

    await waitFor(() => {
      expect(fleetIntelligenceGetMock).toHaveBeenCalled();
    });

    expect(subscriptionsMeMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Unlock Full S&D Intelligence')).toBeNull();
    expect(screen.getByText('Supply: Producer Pipeline')).toBeTruthy();
    expect(screen.getByText('Demand: Dual-Fuel Fleet')).toBeTruthy();
  });
});
