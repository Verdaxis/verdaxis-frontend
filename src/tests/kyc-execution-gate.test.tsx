import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { KycDeadlineBanner } from '../components/layout/KycDeadlineBanner';
import { MyTrades } from '../components/MyTrades';
import type { ExecutionEligibility } from '../types';
import i18n from '../i18n';
import { setAccessToken } from '../services/authToken';

const { myTradesPagedMock, confirmMock, declineMock, addToastMock, TestApiOutcomeUnknownError } = vi.hoisted(() => ({
  myTradesPagedMock: vi.fn(),
  confirmMock: vi.fn(),
  declineMock: vi.fn(),
  addToastMock: vi.fn(),
  TestApiOutcomeUnknownError: class extends Error {},
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'SUPPLIER', organization_id: 'seller-org' },
    isAuthenticated: true,
  }),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ context: null, isActive: false }),
}));

vi.mock('../hooks/useSSE', () => ({ useSSE: () => undefined }));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

// Keep the real ApiError and isKycRequiredError so the blocked path is exercised
// through the same detection the app uses.
vi.mock('../services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ApiError: actual.ApiError,
    isKycRequiredError: actual.isKycRequiredError,
    ApiOutcomeUnknownError: TestApiOutcomeUnknownError,
    api: {
      trades: {
        myTradesPaged: myTradesPagedMock,
        confirm: confirmMock,
        decline: declineMock,
        deliver: vi.fn(),
        pay: vi.fn(),
      },
    },
  };
});

const eligibility = (overrides: Partial<ExecutionEligibility>): ExecutionEligibility => ({
  eligible: false,
  reason: 'KYC_REQUIRED',
  grace_expires_at: null,
  ...overrides,
});

const pendingTrade = (id: string) => ({
  items: [{
    id,
    buyer_id: 'buyer-org',
    seller_id: 'seller-org',
    buyer_name: 'Buy Corp',
    seller_name: 'Sell Corp',
    initiated_by: 'BUYER',
    is_anonymous: false,
    quantity_mt: 100,
    price_per_mt_usd: 700,
    status: 'PENDING_CONFIRMATION',
    commission_rate_pct: 0,
    created_at: '2026-10-12T00:00:00Z',
    fuel_type: 'Methanol',
    region: 'Asia',
  }],
  total: 1,
  skip: 0,
  limit: 20,
});

describe('KYC deadline banner', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the grace deadline with a link to /kyc', () => {
    const graceExpiresAt = '2026-10-28T09:00:00Z';
    renderWithProviders(
      <KycDeadlineBanner eligibility={eligibility({ reason: 'KYC_GRACE', grace_expires_at: graceExpiresAt })} />,
    );

    const expectedDate = new Date(graceExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    expect(screen.getByText(`Complete KYC by ${expectedDate} to keep trading`)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Complete KYC' }).getAttribute('href')).toBe('/kyc');
  });

  it('shows the required reason without a date', () => {
    renderWithProviders(<KycDeadlineBanner eligibility={eligibility({ reason: 'KYC_REQUIRED' })} />);
    expect(screen.getByText('Complete KYC verification to trade')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Complete KYC' })).toBeTruthy();
  });

  it('shows the rejected reason', () => {
    renderWithProviders(<KycDeadlineBanner eligibility={eligibility({ reason: 'KYC_REJECTED' })} />);
    expect(screen.getByText('Your KYC verification was rejected')).toBeTruthy();
  });

  it('stays hidden for approved and not-applicable accounts', () => {
    const approved = renderWithProviders(
      <KycDeadlineBanner eligibility={eligibility({ eligible: true, reason: 'KYC_APPROVED' })} />,
    );
    expect(approved.container.textContent).toBe('');

    const notApplicable = renderWithProviders(
      <KycDeadlineBanner eligibility={eligibility({ reason: 'NOT_APPLICABLE' })} />,
    );
    expect(notApplicable.container.textContent).toBe('');

    const missing = renderWithProviders(<KycDeadlineBanner eligibility={undefined} />);
    expect(missing.container.textContent).toBe('');
  });
});

describe('KYC execution gate on trade actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setAccessToken('kyc-gate-session');
    confirmMock.mockReset();
    declineMock.mockReset().mockResolvedValue(undefined);
    myTradesPagedMock.mockReset().mockResolvedValue(pendingTrade('trade-kyc'));
    await i18n.changeLanguage('en');
  });

  it('shows the localized reason and the /kyc link when a confirmation is blocked', async () => {
    const { ApiError } = await import('../services/api');
    confirmMock.mockRejectedValue(new ApiError('Complete KYC verification to trade.', 403, 'KYC_REQUIRED'));

    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Complete KYC verification to trade.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Complete KYC' }).getAttribute('href')).toBe('/kyc');
    // The generic confirm-failure toast is replaced by the KYC reason.
    expect(addToastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Confirm Failed' }));
  });

  it('keeps the decline cleanup action enabled and working while blocked', async () => {
    const { ApiError } = await import('../services/api');
    confirmMock.mockRejectedValue(new ApiError('Complete KYC verification to trade.', 403, 'KYC_REQUIRED'));

    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await screen.findByText('Complete KYC verification to trade.');

    const declineButton = screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement;
    expect(declineButton.disabled).toBe(false);

    fireEvent.click(declineButton);
    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(1));
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Trade Declined' }));
  });
});
