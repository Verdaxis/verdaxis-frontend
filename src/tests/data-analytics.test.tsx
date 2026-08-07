import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderWithProviders, screen, waitFor } from './test-utils';
import { DataAnalytics } from '../components/DataAnalytics';
import i18n, { loadNamespace } from '../i18n';

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
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

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

  it('renders representative analytics chrome and analytical labels in Chinese', async () => {
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
    useAuthMock.mockReturnValue({ user: { role: 'BUYER' } });

    renderWithProviders(<DataAnalytics />);

    expect(await screen.findByRole('heading', { name: '数据与分析' })).toBeTruthy();
    expect(screen.getByText('供应：生产商项目储备')).toBeTruthy();
    expect(screen.getAllByText('中国').length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Bio Methanol')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MT\/yr/).length).toBeGreaterThan(0);
    expect(screen.getByText('解锁完整供需情报')).toBeTruthy();
    expect((await screen.findAllByText('已交付 4/10')).length).toBeGreaterThan(0);
  });

  it('does not leak an unknown backend fuel label into Chinese', async () => {
    fleetIntelligenceGetMock.mockResolvedValue({
      entries: [{
        fuel: 'Unreleased Blend',
        ordered_vessels: 2,
        delivered_vessels: 1,
        avg_consumption_mt: 5000,
        color: '#64748B',
      }],
      sources: [],
      last_updated: '2026-05-14T08:00:00Z',
    });
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
    useAuthMock.mockReturnValue({ user: { role: 'ADMIN' } });

    renderWithProviders(<DataAnalytics />);

    expect(await screen.findByText('其他燃料')).toBeTruthy();
    expect(screen.queryByText('Unreleased Blend')).toBeNull();
  });

  it('keeps the paywall overlay for free-tier non-admin users', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'BUYER' },
    });

    renderWithProviders(<DataAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Unlock Full Supply & Demand Intelligence')).toBeTruthy();
    });
    expect((await screen.findAllByText('4/10 delivered')).length).toBeGreaterThan(0);
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
    expect((await screen.findAllByText('4/10 delivered')).length).toBeGreaterThan(0);
  });
});
