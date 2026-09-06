import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { MyTrades } from '../components/MyTrades';
import i18n from '../i18n';

const myTradesPagedMock = vi.fn();
const makeTradePage = (id: string, buyerName: string, status: string) => ({
  items: [{
    id,
    buyer_id: 'buyer-org',
    seller_id: 'seller-org',
    buyer_name: buyerName,
    seller_name: `${buyerName} seller`,
    initiated_by: 'BUYER',
    is_anonymous: false,
    quantity_mt: 100,
    price_per_mt_usd: 700,
    status,
    commission_rate_pct: 0,
    created_at: '2026-04-12T00:00:00Z',
    fuel_type: 'Methanol',
    region: 'Asia',
  }],
  total: 1,
  skip: 0,
  limit: 20,
});
const namespaceControl = vi.hoisted(() => ({
  ready: true,
  t: (key: string) => {
    if (key === 'myTrades.note.offPlatform') return 'Off-platform after confirmation';
    if (key === 'myTrades.error.message') return '无法加载交易，请重试。';
    return key;
  },
}));
const sseControl = vi.hoisted(() => ({
  handler: null as (() => void) | null,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'SUPPLIER', organization_id: 'seller-org' },
    isAuthenticated: true,
  }),
}));

vi.mock('../hooks/useSSE', () => ({
  useSSE: (_topic: string, handler: () => void) => {
    sseControl.handler = handler;
  },
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
      myTradesPaged: (...args: unknown[]) => myTradesPagedMock(...args),
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
    sseControl.handler = null;
    namespaceControl.ready = true;
    await i18n.changeLanguage('en');
    myTradesPagedMock.mockResolvedValue({
      items: [{
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
      }],
      total: 1,
      skip: 0,
      limit: 20,
    });
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

    myTradesPagedMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    fireEvent.click(screen.getByRole('button', { name: 'myTrades.tab.active' }));
    await waitFor(() => {
      expect(myTradesPagedMock).toHaveBeenLastCalledWith({ skip: 0, limit: 20, status_group: 'active' });
    });
  });

  it('uses server totals to paginate beyond the first twenty trades', async () => {
    myTradesPagedMock.mockResolvedValue({
      items: [{
        id: 'trade-page-1',
        buyer_id: 'buyer-org',
        seller_id: 'seller-org',
        buyer_name: 'Buy Corp',
        seller_name: 'Sell Corp',
        initiated_by: 'BUYER',
        is_anonymous: false,
        quantity_mt: 100,
        price_per_mt_usd: 700,
        status: 'PAID',
        commission_rate_pct: 0,
        created_at: '2026-04-12T00:00:00Z',
        fuel_type: 'Methanol',
        region: 'Asia',
      }],
      total: 41,
      skip: 0,
      limit: 20,
    });
    renderWithProviders(<MyTrades />);

    expect(await screen.findByRole('button', { name: 'Next page' })).toBeTruthy();
    expect(myTradesPagedMock).toHaveBeenCalledWith({ skip: 0, limit: 20, status_group: 'all' });
  });

  it('ignores a late response from an earlier refresh request', async () => {
    renderWithProviders(<MyTrades />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(myTradesPagedMock).toHaveBeenCalledWith({ skip: 0, limit: 20, status_group: 'all' });

    // The initial request is already resolved by the default mock. Wait for
    // the component to leave its loading state before firing refresh events.
    await waitFor(() => expect(screen.getByRole('button', { name: 'myTrades.tab.active' })).toBeTruthy());

    let resolveStale!: (value: ReturnType<typeof makeTradePage>) => void;
    let resolveFresh!: (value: ReturnType<typeof makeTradePage>) => void;
    const staleRequest = new Promise<ReturnType<typeof makeTradePage>>((resolve) => {
      resolveStale = resolve;
    });
    const freshRequest = new Promise<ReturnType<typeof makeTradePage>>((resolve) => {
      resolveFresh = resolve;
    });
    myTradesPagedMock
      .mockImplementationOnce(() => staleRequest)
      .mockImplementationOnce(() => freshRequest);

    act(() => {
      sseControl.handler?.();
      sseControl.handler?.();
    });

    await act(async () => {
      resolveFresh(makeTradePage('fresh-trade', 'Fresh buyer', 'PENDING_CONFIRMATION'));
    });

    await act(async () => {
      resolveStale(makeTradePage('stale-trade', 'Stale buyer', 'PAID'));
    });

    expect(screen.getByText('Fresh buyer')).toBeTruthy();
    expect(screen.queryByText('Stale buyer')).toBeNull();
  });

  it('waits for Chinese trading translations before loading and suppresses backend errors', async () => {
    await i18n.changeLanguage('zh');
    namespaceControl.ready = false;
    myTradesPagedMock.mockRejectedValue(new Error('Raw backend failure detail'));

    const { rerender } = renderWithProviders(<MyTrades />);

    expect(myTradesPagedMock).not.toHaveBeenCalled();

    namespaceControl.ready = true;
    rerender(<MyTrades />);

    expect(await screen.findByText('无法加载交易，请重试。')).toBeTruthy();
    expect(screen.queryByText('Raw backend failure detail')).toBeNull();
    expect(myTradesPagedMock).toHaveBeenCalledTimes(1);
    expect(myTradesPagedMock).toHaveBeenCalledWith({ skip: 0, limit: 20, status_group: 'all' });
  });
});
