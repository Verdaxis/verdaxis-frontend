import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { MyTrades } from '../components/MyTrades';
import i18n from '../i18n';
import { setAccessToken } from '../services/authToken';

const { myTradesPagedMock, confirmMock, declineMock, addToastMock, TestApiOutcomeUnknownError } = vi.hoisted(() => ({
  myTradesPagedMock: vi.fn(),
  confirmMock: vi.fn(),
  declineMock: vi.fn(),
  addToastMock: vi.fn(),
  TestApiOutcomeUnknownError: class extends Error {},
}));
const makeTradePage = (id: string, buyerName: string, status: string, isAnonymous = false) => ({
  items: [{
    id,
    buyer_id: 'buyer-org',
    seller_id: 'seller-org',
    buyer_name: buyerName,
    seller_name: `${buyerName} seller`,
    initiated_by: 'BUYER',
    is_anonymous: isAnonymous,
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
    user: { id: 'user-1', role: 'SUPPLIER', organization_id: 'seller-org' },
    isAuthenticated: true,
  }),
}));

vi.mock('../hooks/useSSE', () => ({
  useSSE: (_topic: string, handler: () => void) => {
    sseControl.handler = handler;
  },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => namespaceControl,
}));

vi.mock('../services/api', () => ({
  ApiOutcomeUnknownError: TestApiOutcomeUnknownError,
  api: {
    trades: {
      myTradesPaged: (...args: unknown[]) => myTradesPagedMock(...args),
      confirm: confirmMock,
      decline: declineMock,
      deliver: vi.fn(),
      pay: vi.fn(),
    },
  },
}));

describe('MyTrades lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setAccessToken('my-trades-session-a');
    confirmMock.mockResolvedValue(undefined);
    declineMock.mockResolvedValue(undefined);
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

  it('keeps legacy pending trades private and actionable', async () => {
    myTradesPagedMock.mockResolvedValue(makeTradePage('legacy-pending', 'Legacy buyer', 'PENDING', true));

    renderWithProviders(<MyTrades />);

    expect(await screen.findByText('myTrades.status.pending')).toBeTruthy();
    expect(screen.getByText('myTrades.anonymous')).toBeTruthy();
    expect(screen.queryByText('Legacy buyer')).toBeNull();
    expect(screen.getByRole('button', { name: 'myTrades.btn.confirm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'myTrades.btn.decline' })).toBeTruthy();
  });

  it('retries a confirmation with the same key after an unknown outcome', async () => {
    const page = makeTradePage('retry-confirm', 'Retry buyer', 'PENDING_CONFIRMATION');
    page.items.push({ ...page.items[0], id: 'blocked-confirm', buyer_name: 'Blocked buyer' });
    page.total = 2;
    myTradesPagedMock.mockResolvedValue(page);
    confirmMock
      .mockRejectedValueOnce(new TestApiOutcomeUnknownError('Outcome unknown'))
      .mockResolvedValueOnce({ ...makeTradePage('retry-confirm', 'Retry buyer', 'CONFIRMED').items[0], status: 'CONFIRMED' });

    renderWithProviders(<MyTrades />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'myTrades.btn.confirm' }))[0]);
    const retry = await screen.findByRole('button', { name: 'myTrades.btn.retrySafely' });
    expect(screen.queryByRole('button', { name: 'myTrades.btn.confirm' })).toBeNull();
    expect(screen.getByText('myTrades.retryPending')).toBeTruthy();
    fireEvent.click(retry);

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(2));
    expect(confirmMock.mock.calls[1]).toEqual(confirmMock.mock.calls[0]);
    expect(confirmMock.mock.calls[0][1]).toEqual(expect.any(String));
  });

  it('keeps confirmation retry visible after SSE refresh shows the committed trade', async () => {
    myTradesPagedMock.mockResolvedValue(makeTradePage('confirmed-after-loss', 'Retry buyer', 'PENDING_CONFIRMATION'));
    confirmMock.mockRejectedValueOnce(new TestApiOutcomeUnknownError('Outcome unknown')).mockResolvedValueOnce(undefined);
    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: 'myTrades.btn.confirm' }));
    const firstRequest = confirmMock.mock.calls[0];
    await screen.findByRole('button', { name: 'myTrades.btn.retrySafely' });

    myTradesPagedMock.mockResolvedValue(makeTradePage('confirmed-after-loss', 'Retry buyer', 'CONFIRMED'));
    act(() => sseControl.handler?.());
    await screen.findByText('myTrades.status.confirmed');
    fireEvent.click(screen.getByRole('button', { name: 'myTrades.btn.retrySafely' }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(2));
    expect(confirmMock.mock.calls[1]).toEqual(firstRequest);
  });

  it('keeps decline retry visible after SSE refresh removes the target row', async () => {
    myTradesPagedMock.mockResolvedValue(makeTradePage('declined-after-loss', 'Retry buyer', 'PENDING_CONFIRMATION'));
    declineMock.mockRejectedValueOnce(new TestApiOutcomeUnknownError('Outcome unknown')).mockResolvedValueOnce(undefined);
    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: 'myTrades.btn.decline' }));
    const firstRequest = declineMock.mock.calls[0];
    await screen.findByRole('button', { name: 'myTrades.btn.retrySafely' });

    myTradesPagedMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    act(() => sseControl.handler?.());
    await screen.findByText('myTrades.empty.title');
    fireEvent.click(screen.getByRole('button', { name: 'myTrades.btn.retrySafely' }));

    await waitFor(() => expect(declineMock).toHaveBeenCalledTimes(2));
    expect(declineMock.mock.calls[1]).toEqual(firstRequest);
  });

  it('discards a decline retry after the auth generation changes', async () => {
    myTradesPagedMock.mockResolvedValue(makeTradePage('retry-decline', 'Retry buyer', 'PENDING_CONFIRMATION'));
    declineMock.mockRejectedValueOnce(new TestApiOutcomeUnknownError('Outcome unknown'));

    renderWithProviders(<MyTrades />);
    fireEvent.click(await screen.findByRole('button', { name: 'myTrades.btn.decline' }));
    const retry = await screen.findByRole('button', { name: 'myTrades.btn.retrySafely' });
    setAccessToken('my-trades-session-b');
    fireEvent.click(retry);

    expect(declineMock).toHaveBeenCalledTimes(1);
    expect(addToastMock).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'myTrades.toast.contextChanged.title',
    }));
  });

  it('does not start another trade command while one is in flight', async () => {
    const page = makeTradePage('pending-a', 'Buyer A', 'PENDING_CONFIRMATION');
    page.items.push({ ...page.items[0], id: 'pending-b', buyer_name: 'Buyer B' });
    page.total = 2;
    myTradesPagedMock.mockResolvedValue(page);
    let resolveConfirmation!: (value: unknown) => void;
    confirmMock.mockReturnValueOnce(new Promise(resolve => { resolveConfirmation = resolve; }));
    renderWithProviders(<MyTrades />);

    const confirmButtons = await screen.findAllByRole('button', { name: 'myTrades.btn.confirm' });
    fireEvent.click(confirmButtons[0]);
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect((confirmButtons[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(confirmButtons[1]);
    expect(confirmMock).toHaveBeenCalledTimes(1);
    await act(async () => resolveConfirmation(undefined));
  });

  it('leaves the page heading to its parent when embedded and keeps the trade window visible', async () => {
    renderWithProviders(<MyTrades embedded />);
    await screen.findByText('Buy Corp');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'myTrades.btn.refresh' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'myTrades.tab.all' }).getAttribute('aria-pressed')).toBe('true');
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

  it('keeps the last valid trade table visible when a refresh fails', async () => {
    renderWithProviders(<MyTrades />);
    expect(await screen.findByText('Buy Corp')).toBeTruthy();

    myTradesPagedMock.mockRejectedValueOnce(new Error('Refresh unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'myTrades.btn.refresh' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Refresh unavailable');
    expect(screen.getByText('Buy Corp')).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
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
