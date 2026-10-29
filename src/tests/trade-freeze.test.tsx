import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { MyTrades } from '../components/MyTrades';
import { ApiError } from '../services/api';
import i18n, { loadNamespace } from '../i18n';

const controls = vi.hoisted(() => ({
  page: vi.fn(), confirm: vi.fn(), decline: vi.fn(), toast: vi.fn(),
  user: { id: 'participant', role: 'SUPPLIER', organization_id: 'seller-org', status: 'APPROVED' },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: controls.user, isAuthenticated: true }) }));
vi.mock('../hooks/useSSE', () => ({ useSSE: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ addToast: controls.toast }) }));
vi.mock('../services/api', async importOriginal => ({
  ...await importOriginal<typeof import('../services/api')>(),
  api: { trades: { myTradesPaged: controls.page, confirm: controls.confirm, decline: controls.decline } },
}));

const setAt = '2026-10-29T12:34:00Z';
const trade = (extra: object = {}) => ({
  id: 'trade-freeze', buyer_id: 'buyer-org', seller_id: 'seller-org',
  buyer_name: 'Synthetic buyer', seller_name: 'Synthetic seller', initiated_by: 'BUYER',
  quantity_mt: 100, price_per_mt_usd: 700, commission_rate_pct: 0,
  status: 'PENDING_CONFIRMATION', created_at: '2026-10-28T00:00:00Z',
  fuel_type: 'Biofuel', region: 'Asia', is_anonymous: false,
  ...extra,
});
const frozen = (extra: object = {}) => trade({ is_frozen: true, freeze: { reason_code: 'PAYMENT_DISPUTE', set_at: setAt }, ...extra });
const page = (item: object) => ({ items: [item], total: 1, skip: 0, limit: 20 });
const mount = (item: object, embedded = false) => {
  controls.page.mockResolvedValue(page(item));
  return renderWithProviders(<MyTrades embedded={embedded} />);
};

describe('Trade freeze presentation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    controls.user = { id: 'participant', role: 'SUPPLIER', organization_id: 'seller-org', status: 'APPROVED' };
    controls.confirm.mockReset();
    controls.decline.mockReset();
    controls.page.mockReset();
    await i18n.changeLanguage('en');
    await loadNamespace('trading');
  });

  it.each([false, true])('frontend_shows_frozen_trade_and_disables_settlement_actions (embedded=%s)', async embedded => {
    mount(frozen(), embedded);
    const confirm = await screen.findByRole('button', { name: 'Confirm' });
    const decline = screen.getByRole('button', { name: 'Decline' });
    expect(confirm).toHaveProperty('disabled', true);
    expect(decline).toHaveProperty('disabled', true);
    expect(screen.getByText('Payment dispute')).toBeTruthy();
    expect(screen.getByText('Trade frozen')).toBeTruthy();
    expect(screen.getByText('Confirmation, decline, delivery and payment are blocked while this trade is frozen.')).toBeTruthy();
    const time = document.querySelector('time');
    expect(time?.dateTime).toBe(setAt);
    expect(time?.textContent).toBe(new Date(setAt).toLocaleString(i18n.resolvedLanguage ?? 'en'));
    fireEvent.click(confirm);
    fireEvent.click(decline);
    expect(controls.confirm).not.toHaveBeenCalled();
    expect(controls.decline).not.toHaveBeenCalled();
  });

  it('delivered_unpaid_frozen_trade_shows_the_pay_block', async () => {
    mount(frozen({ status: 'DELIVERED', paid_at: null }));
    expect(await screen.findByText('Payment is blocked while this delivered trade is frozen.')).toBeTruthy();
    expect(screen.queryByText('Off-platform after confirmation')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark Paid' })).toBeNull();
  });

  it('confirmed_frozen_trade_replaces_off_platform_information', async () => {
    mount(frozen({ status: 'CONFIRMED' }));
    expect(await screen.findByText('Delivery and payment are blocked while this trade is frozen.')).toBeTruthy();
    expect(screen.queryByText('Off-platform after confirmation')).toBeNull();
  });

  it.each(['CONFIRMED', 'DELIVERED'])('rejected_party_still_sees_settlement_information (%s)', async status => {
    controls.user.status = 'REJECTED';
    mount(trade({ status }));
    expect(await screen.findByText('Off-platform after confirmation')).toBeTruthy();
    expect(screen.getByText('Synthetic buyer')).toBeTruthy();
  });

  it.each([{}, { is_frozen: false, freeze: null }])('keeps normal actions for an unfrozen projection %j', async projection => {
    mount(trade(projection));
    expect(await screen.findByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Decline' })).toHaveProperty('disabled', false);
    expect(screen.queryByText('Trade frozen')).toBeNull();
  });

  it.each([null, undefined, { reason_code: 'UNRECOGNIZED', set_at: 'not-a-date' }])('blocks an active freeze with incomplete details %j', async freeze => {
    mount(frozen({ freeze }));
    expect(await screen.findByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Reason unavailable')).toBeTruthy();
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });

  it('shows the reason and payment explanation in Chinese', async () => {
    await i18n.changeLanguage('zh');
    await loadNamespace('trading');
    mount(frozen({ status: 'DELIVERED' }));
    expect(await screen.findByText('付款争议')).toBeTruthy();
    expect(screen.getByText('交易已冻结')).toBeTruthy();
    expect(screen.getByText('此已交付交易被冻结，无法确认付款。')).toBeTruthy();
  });

  it.each(['confirm', 'decline'] as const)('explains a stale-read freeze refusal on %s and refreshes the row', async operation => {
    controls.page.mockResolvedValueOnce(page(trade())).mockResolvedValue(page(frozen()));
    controls[operation].mockRejectedValueOnce(new ApiError('Server text', 409, 'TRADE_FROZEN'));
    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: operation === 'confirm' ? 'Confirm' : 'Decline' }));
    await waitFor(() => expect(controls.toast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'warning', title: 'Trade frozen', message: 'This trade is frozen. No action was completed. Refresh the trade details before trying again.',
    })));
    await screen.findByText('Payment dispute');
    expect(controls.page).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
    expect(controls.toast.mock.calls.some(([toast]) => toast.type === 'success')).toBe(false);
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('button', { name: /Retry safely/ })).toBeNull();
  });

  it.each(['BUYER', 'OUTSIDE'])('does not grant a pending action to a non-counterparty (%s)', async side => {
    controls.user.organization_id = side === 'BUYER' ? 'buyer-org' : 'other-org';
    controls.user.role = 'BUYER';
    mount(frozen());
    await screen.findByText('Trade frozen');
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  });

  it('keeps the KYC refusal separate from freeze handling', async () => {
    controls.confirm.mockRejectedValue(new ApiError('KYC required', 403, 'KYC_REQUIRED'));
    mount(trade());
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('link', { name: /KYC/i })).toBeTruthy();
    expect(controls.toast).not.toHaveBeenCalled();
  });

  it('keeps ordinary errors on the existing failure path', async () => {
    controls.confirm.mockRejectedValue(new ApiError('Ordinary conflict', 409, 'OTHER_CONFLICT'));
    mount(trade());
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(controls.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Confirm Failed', message: 'Ordinary conflict' })));
    expect(controls.page).toHaveBeenCalledTimes(1);
  });
});
