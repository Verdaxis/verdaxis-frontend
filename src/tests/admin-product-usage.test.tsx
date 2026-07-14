import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductUsageSection } from '../components/admin/ProductUsageSection';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import i18n from '../i18n';

const { productUsage, overview, daily, auditLogs, commissionSummary } = vi.hoisted(() => ({
  productUsage: vi.fn(), overview: vi.fn(), daily: vi.fn(), auditLogs: vi.fn(), commissionSummary: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: { admin: { productUsage, overview, daily, auditLogs, commissionSummary } } }));
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

const readyResponse = {
  behavioralStatus: 'ready' as const,
  observedAt: '2026-07-14T08:00:00Z',
  periodDays: 30 as const,
  metrics: {
    visitors: 120,
    visits: 160,
    pageviews: 410,
    totalTimeSeconds: 32000,
    averageSessionDurationSeconds: 200,
    signupStarts: 24,
    completedRegistrations: 8,
    registrationConversionRate: 0.3333,
  },
  funnel: [
    { key: 'landing_visitors', count: 120, conversionRate: null },
    { key: 'signup_starts', count: 24, conversionRate: 0.2 },
  ],
  daily: [{ date: '2026-07-14', visitors: 5, completedRegistrations: null }],
  featureUsage: [{ event: 'market_slice_selected', count: 18 }],
  topEntryPages: [{ value: '/en', count: 44 }],
  topReferrers: [{ value: 'linkedin.com', count: 12 }],
};

const renderSection = () => render(
  <I18nextProvider i18n={i18n}>
    <ProductUsageSection />
  </I18nextProvider>,
);

describe('Admin Product Usage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => { await i18n.changeLanguage('en'); });
    overview.mockResolvedValue({ total_users: 12, active_users_7d: 4, total_organizations: 7, total_orders: 3, open_orders: 2, total_trades: 1, confirmed_trades: 1, total_volume_mt: 100, total_revenue_usd: 50, total_gmv_usd: 1000 });
    daily.mockResolvedValue([]);
    auditLogs.mockResolvedValue([]);
    commissionSummary.mockResolvedValue(null);
  });

  it('switches among bounded 7, 30, and 90 day periods', async () => {
    productUsage.mockResolvedValue(readyResponse);
    renderSection();

    await screen.findByText('Product Usage');
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));

    await waitFor(() => expect(productUsage).toHaveBeenLastCalledWith(7));
  });

  it('renders an unavailable state without throwing or hiding its section', async () => {
    productUsage.mockResolvedValue({
      ...readyResponse,
      behavioralStatus: 'unavailable',
      diagnosticCategory: 'upstream_timeout',
    });
    renderSection();

    expect(await screen.findByText('Behavioral analytics is temporarily unavailable.')).toBeTruthy();
    expect(screen.getByText('Product Usage')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('renders loading and empty states independently', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    productUsage.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    const view = renderSection();
    expect(screen.getByText('Loading product usage...')).toBeTruthy();

    await act(async () => resolveRequest({
      ...readyResponse,
      behavioralStatus: 'empty',
      metrics: { ...readyResponse.metrics, visitors: 0, visits: 0, pageviews: 0, signupStarts: 0 },
      funnel: [],
      daily: [],
      featureUsage: [],
      topEntryPages: [],
      topReferrers: [],
    }));
    expect(await screen.findByText('No behavioral activity was recorded for this period.')).toBeTruthy();
    view.unmount();
  });

  it('keeps commercial analytics visible when behavioral analytics is unavailable', async () => {
    productUsage.mockResolvedValue({ ...readyResponse, behavioralStatus: 'unavailable' });
    render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/app/admin']}><AdminDashboard /></MemoryRouter></I18nextProvider>);

    expect(await screen.findByText('Total Users')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(await screen.findByText('Behavioral analytics is temporarily unavailable.')).toBeTruthy();
  });
});
