import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { Settings } from '../components/Settings';

const billingApi = vi.hoisted(() => ({
  fees: vi.fn(),
  me: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: { subscriptions: billingApi } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { first_name: 'Test', last_name: 'Buyer', email: 'buyer@example.test', role: 'BUYER' },
  token: 'test-token',
  login: vi.fn(),
}) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));
vi.mock('../hooks/useServerPreference', () => ({ useServerPreference: (_ns: string, _key: string, _sanitize: unknown, defaults: unknown) => [defaults, vi.fn()] }));
vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('../components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));

const schedule = {
  currency: 'USD' as const,
  buyer_fee_per_mt_usd: '0',
  seller_fee_per_mt_usd: { free: '2.25', standard: '1.75', enterprise: null },
};

describe('billing fee display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingApi.fees.mockResolvedValue(schedule);
    billingApi.me.mockResolvedValue({ id: 'subscription', org_id: 'org', tier: 'standard', is_active: true });
  });

  afterEach(() => cleanup());

  const openBilling = async () => {
    renderWithProviders(<Settings viewMode="BUYER" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing' }));
    await screen.findByText('Buyer transaction fees are always free.');
  };

  it('uses the API schedule and identifies the active plan', async () => {
    await openBilling();
    const scheduleTable = screen.getByRole('table');
    expect(within(scheduleTable).getByText('$2.25/MT')).toBeTruthy();
    expect(within(scheduleTable).getByText('$1.75/MT')).toBeTruthy();
    const currentPlanCard = screen.getByText('Current Plan').parentElement?.parentElement;
    expect(currentPlanCard).toBeTruthy();
    expect(within(currentPlanCard as HTMLElement).getByText('Professional')).toBeTruthy();
    expect(within(currentPlanCard as HTMLElement).getByText('Seller transaction fee: $1.75/MT')).toBeTruthy();
    expect(screen.queryByText(/0\.5%/)).toBeNull();
    expect(billingApi.fees).toHaveBeenCalledTimes(1);
    expect(billingApi.me).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: 'Upgrade' })).toBeNull();
  });

  it.each([
    ['inactive', { is_active: false, expires_at: null }],
    ['expired', { is_active: true, expires_at: '2020-01-01T00:00:00Z' }],
  ])('falls back to Pilot when the subscription is %s', async (_reason, state) => {
    billingApi.me.mockResolvedValueOnce({ id: 'subscription', org_id: 'org', tier: 'standard', ...state });
    await openBilling();
    const currentPlanCard = screen.getByText('Current Plan').parentElement!.parentElement!;
    expect(within(currentPlanCard).getByText('Pilot')).toBeTruthy();
    expect(within(currentPlanCard).getByText('Seller transaction fee: $2.25/MT')).toBeTruthy();
    expect(within(currentPlanCard).queryByText('Professional')).toBeNull();
    expect(screen.getByRole('link', { name: 'Upgrade' }).getAttribute('href')).toBe('mailto:sales@verdaxis.exchange');
  });

  it('does not invent a negotiated Enterprise rate when it is absent', async () => {
    billingApi.me.mockResolvedValueOnce({ id: 'subscription', org_id: 'org', tier: 'enterprise', is_active: true, seller_fee_per_mt_usd: null });
    await openBilling();
    const currentPlanCard = screen.getByText('Current Plan').parentElement?.parentElement;
    expect(currentPlanCard).toBeTruthy();
    expect(within(currentPlanCard as HTMLElement).getByText(/Seller transaction fee: Unavailable/)).toBeTruthy();
    expect(within(screen.getByRole('table')).getByText('Negotiated')).toBeTruthy();
    expect(within(currentPlanCard as HTMLElement).queryByText(/\$0\.00\/MT/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Upgrade' })).toBeNull();
  });

  it('shows an honest error and retries both reads', async () => {
    billingApi.fees.mockRejectedValueOnce(new Error('unavailable'));
    renderWithProviders(<Settings viewMode="BUYER" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing' }));
    expect((await screen.findByRole('alert')).textContent).toContain('We could not load billing details.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Buyer transaction fees are always free.')).toBeTruthy());
    expect(billingApi.fees).toHaveBeenCalledTimes(2);
    expect(billingApi.me).toHaveBeenCalledTimes(2);
  });
});
