import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { MyTrades } from '../components/MyTrades';
import i18n from '../i18n';

const myTradesMock = vi.fn();
const namespaceControl = vi.hoisted(() => ({
  ready: true,
  t: (key: string) => {
    if (key === 'myTrades.note.offPlatform') return 'Off-platform after confirmation';
    if (key === 'myTrades.error.message') return '无法加载交易，请重试。';
    return key;
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'SUPPLIER', organization_id: 'seller-org' },
    isAuthenticated: true,
  }),
}));

vi.mock('../hooks/useSSE', () => ({
  useSSE: () => undefined,
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => namespaceControl,
}));

vi.mock('../services/api', () => ({
  api: {
    trades: {
      myTrades: (...args: unknown[]) => myTradesMock(...args),
      confirm: vi.fn(),
      decline: vi.fn(),
      deliver: vi.fn(),
      pay: vi.fn(),
    },
  },
}));

describe('MyTrades lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    namespaceControl.ready = true;
    await i18n.changeLanguage('en');
    myTradesMock.mockResolvedValue([
      {
        id: 'trade-1',
        bid_order_id: 'bid-1',
        ask_order_id: 'ask-1',
        buyer_id: 'buyer-org',
        seller_id: 'seller-org',
        buyer_name: 'Buy Corp',
        seller_name: 'Sell Corp',
        initiated_by: 'BUYER',
        is_anonymous: false,
        quantity_mt: 1000,
        price_per_mt_usd: 1050,
        status: 'PAID',
        commission_rate_pct: 0.5,
        commission_amount_usd: 5250,
        created_at: '2026-04-12T00:00:00Z',
        confirmed_at: '2026-04-12T01:00:00Z',
        product_name: 'Bio Methanol',
        market_product: 'BIO_METHANOL',
        delivery_point_name: 'Singapore',
        delivery_point_id: 'dp-singapore',
        availability_window: 'SPOT',
        fuel_type: 'Methanol',
        region: 'Asia',
      },
    ]);
  });

  it('treats post-confirmation trades as off-platform and reveals counterparties', async () => {
    renderWithProviders(<MyTrades />);

    await waitFor(() => {
      expect(screen.getByText('Buy Corp')).toBeTruthy();
    });

    expect(screen.getByText('myTrades.status.confirmed')).toBeTruthy();
    expect(screen.getByText(/Off-platform after confirmation/i)).toBeTruthy();
    expect(screen.queryByText(/Revealed after payment/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirm Delivery/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mark as Paid/i })).toBeNull();
  });

  it('waits for Chinese trading translations before loading and suppresses backend errors', async () => {
    await i18n.changeLanguage('zh');
    namespaceControl.ready = false;
    myTradesMock.mockRejectedValue(new Error('Raw backend failure detail'));

    const { rerender } = renderWithProviders(<MyTrades />);

    expect(myTradesMock).not.toHaveBeenCalled();

    namespaceControl.ready = true;
    rerender(<MyTrades />);

    expect(await screen.findByText('无法加载交易，请重试。')).toBeTruthy();
    expect(screen.queryByText('Raw backend failure detail')).toBeNull();
    expect(myTradesMock).toHaveBeenCalledTimes(1);
  });
});
