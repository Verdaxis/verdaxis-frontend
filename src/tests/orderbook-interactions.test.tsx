import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';
import { queuePublicMarketRefresh } from '../services/publicMarketSync';

const { snapshot } = vi.hoisted(() => ({ snapshot: vi.fn() }));

vi.mock('../services/api', () => ({ api: { orderbook: {
  snapshot,
} } }));

const MARKET = {
  marketProduct: 'BIO_METHANOL',
  deliveryPointId: 'delivery-point',
  availability: 'SPOT',
} as const;

const makeSnapshot = (bids: unknown[] = [], asks: unknown[] = [], generatedAt = new Date().toISOString()) => ({
  market_product: 'BIO_METHANOL',
  delivery_point_id: MARKET.deliveryPointId,
  availability_window: MARKET.availability,
  generated_at: generatedAt,
  source_kind: 'LIVE_ORDER',
  scope: 'DELIVERY_POINT',
  demo_status: 'REAL_ONLY',
  bids,
  asks,
});

describe('orderbook inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshot.mockImplementation(async (params: { market_product?: string }) => makeSnapshot([{
        id: 'bid', side: 'BID', market_product: params.market_product ?? 'BIO_METHANOL', price_per_mt_usd: 600,
        remaining_quantity_mt: 100, availability_window: '2028-Q1', region: 'Singapore',
        certifications: ['ISCC'],
      }], []));
  });

  it('allows keyboard inspection without making the other side executable', async () => {
    const openTrade = vi.fn();
    renderWithProviders(<OrderBook {...MARKET} actionableSide="ASK" onLevelClick={openTrade} />);
    const level = await screen.findByRole('group', { name: /Bid.*600/ });
    expect(level.tabIndex).toBe(0);
    fireEvent.focus(level);
    expect(screen.getByRole('tooltip').textContent).toContain('Q1 2028');
    fireEvent.keyDown(level, { key: 'Enter' });
    fireEvent.click(level);
    expect(openTrade).not.toHaveBeenCalled();
    fireEvent.keyDown(level, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('labels provenance-only demo rows and preserves two-decimal depth', async () => {
    snapshot.mockResolvedValue(makeSnapshot([{
      id: 'demo-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 12.34, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
    }], []));

    renderWithProviders(<OrderBook {...MARKET} />);
    const level = await screen.findByRole('group', { name: /Bid \$600 for 12\.34 MT/ });
    fireEvent.focus(level);
    expect(screen.getByRole('tooltip').textContent).toContain('Demo listing seeded for platform preview');
  });

  it('omits the spread footer for a demo-only cross', async () => {
    snapshot.mockResolvedValue(makeSnapshot([{
      id: 'demo-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], is_demo_listing: true,
    }], [{
      id: 'demo-ask', side: 'ASK', market_product: 'BIO_METHANOL', price_per_mt_usd: 590,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], is_demo_listing: true,
    }]));

    renderWithProviders(<OrderBook {...MARKET} />);
    expect(await screen.findByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    expect(screen.getByText('Live spread').textContent).toContain('—');
    expect(screen.queryByText('Crossed')).toBeNull();
  });

  it.each([
    { marketProduct: 'UCOME_B100' },
    { marketProduct: 'UCOME_B100', executionMode: 'RFQ_ONLY' as const },
    { marketProduct: 'UNRECOGNIZED_PRODUCT' },
    { marketProduct: 'BIO_METHANOL', fuelType: 'Unrecognized fuel' },
  ])('does not request a snapshot for unsupported product filters: %j', async (filters) => {
    const openTrade = vi.fn();
    renderWithProviders(<OrderBook {...MARKET} {...filters} actionableSide="BID" onLevelClick={openTrade} onInstantTrade={openTrade} />);
    await act(async () => {});
    expect(snapshot).not.toHaveBeenCalled();
    expect(openTrade).not.toHaveBeenCalled();
  });

  it('loads executable B100 orders and opens the same trade review interaction', async () => {
    const b100Ask = {
      id: 'b100-ask', side: 'ASK', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1100,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
    };
    snapshot.mockResolvedValue(makeSnapshot([], [b100Ask]));
    const openTrade = vi.fn();
    renderWithProviders(<OrderBook {...MARKET} fuelType="FAME" marketProduct="UCOME_B100" executionMode="ORDERBOOK" actionableSide="ASK" onLevelClick={openTrade} />);
    const level = await screen.findByRole('button', { name: /ask.*1,100/i });
    expect(snapshot).toHaveBeenCalledWith(expect.objectContaining({
      market_product: 'UCOME_B100',
      delivery_point_id: MARKET.deliveryPointId,
      availability_window: MARKET.availability,
    }), { force: false });
    fireEvent.keyDown(level, { key: 'Enter' });
    expect(openTrade).toHaveBeenCalledWith(expect.objectContaining(b100Ask));
  });

  it('describes crossed B100 prices as overlap without claiming compatible fuel terms', async () => {
    snapshot.mockResolvedValue(makeSnapshot([{
      id: 'bid', side: 'BID', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1200,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
    }], [{
      id: 'ask', side: 'ASK', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1100,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
    }]));
    renderWithProviders(<OrderBook {...MARKET} marketProduct="UCOME_B100" executionMode="ORDERBOOK" />);
    expect(await screen.findByRole('group', { name: /Bid.*1,200/ })).toBeTruthy();
    expect(screen.getAllByText('PRICE OVERLAP').length).toBeGreaterThan(0);
    expect(screen.getByText('Price overlap does not confirm matching fuel terms. Review the order requirements before trading.')).toBeTruthy();
    expect(screen.queryByText('CROSSED')).toBeNull();
  });

  it('formats API decimal strings as readable prices and quantities', async () => {
    snapshot.mockResolvedValue(makeSnapshot([{
      id: 'bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: '1260.20',
      remaining_quantity_mt: '1500.25', availability_window: 'SPOT', region: 'Singapore', certifications: [],
    }], []));
    renderWithProviders(<OrderBook {...MARKET} />);
    expect(await screen.findByRole('group', { name: /Bid \$1,260.2 for 1,500.25 MT/ })).toBeTruthy();
  });

  it('discards a stale response after the market product changes', async () => {
    let resolveBio!: (value: ReturnType<typeof makeSnapshot>) => void;
    let resolveEMethanol!: (value: ReturnType<typeof makeSnapshot>) => void;
    const bioRequest = new Promise<ReturnType<typeof makeSnapshot>>(resolve => { resolveBio = resolve; });
    const eMethanolRequest = new Promise<ReturnType<typeof makeSnapshot>>(resolve => { resolveEMethanol = resolve; });
    snapshot.mockImplementation(({ market_product }: { market_product?: string }) => (
      market_product === 'E_METHANOL' ? eMethanolRequest : bioRequest
    ));

    const view = renderWithProviders(<OrderBook {...MARKET} marketProduct="BIO_METHANOL" />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'BIO_METHANOL' }), { force: false }));

    view.rerender(<OrderBook {...MARKET} marketProduct="E_METHANOL" />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'E_METHANOL' }), { force: false }));

    await act(async () => {
      resolveEMethanol(makeSnapshot([{
        id: 'bid-e', side: 'BID', market_product: 'E_METHANOL', price_per_mt_usd: 700,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }], []));
    });
    expect(await screen.findByRole('group', { name: /Bid.*700/ })).toBeTruthy();

    await act(async () => {
      resolveBio(makeSnapshot([{
        id: 'bid-bio', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }], []));
    });
    expect(screen.getByRole('group', { name: /Bid.*700/ })).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Bid.*600/ })).toBeNull();
  }, 30_000);

  it('keeps depth visible and reports stale data after a failed forced refresh', async () => {
    snapshot.mockResolvedValueOnce(makeSnapshot([{
      id: 'bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
    }], [], new Date(Date.now() - 30_000).toISOString()));
    renderWithProviders(<OrderBook {...MARKET} />);

    expect(await screen.findByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    expect(screen.getByTestId('orderbook-freshness').textContent).toContain('Stale');

    snapshot.mockRejectedValueOnce(new Error('network unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh orderbook' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('refresh failed'));
    expect(screen.getByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    expect(snapshot).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
  });

  it('lets a forced resume refresh supersede an ordinary in-flight read', async () => {
    let resolveOrdinary!: (value: ReturnType<typeof makeSnapshot>) => void;
    const ordinaryRequest = new Promise<ReturnType<typeof makeSnapshot>>(resolve => { resolveOrdinary = resolve; });
    snapshot.mockImplementationOnce(() => ordinaryRequest);
    snapshot.mockResolvedValueOnce(makeSnapshot([{
      id: 'fresh-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 700,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
    }], []));

    renderWithProviders(<OrderBook {...MARKET} />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledWith(expect.any(Object), { force: false }));

    act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(2));
    expect(snapshot).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
    expect(await screen.findByRole('group', { name: /Bid.*700/ })).toBeTruthy();

    await act(async () => {
      resolveOrdinary(makeSnapshot([{
        id: 'old-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }], []));
    });
    expect(screen.getByRole('group', { name: /Bid.*700/ })).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Bid.*600/ })).toBeNull();
  });

  it('waits for an active forced request before refreshing for a committed public event', async () => {
    let resolveBusyRefresh!: (value: ReturnType<typeof makeSnapshot>) => void;
    const busyRefresh = new Promise<ReturnType<typeof makeSnapshot>>(resolve => {
      resolveBusyRefresh = resolve;
    });
    snapshot
      .mockResolvedValueOnce(makeSnapshot())
      .mockImplementationOnce(() => busyRefresh)
      .mockResolvedValueOnce(makeSnapshot([{
        id: 'event-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 710,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }], []));

    renderWithProviders(<OrderBook {...MARKET} />);
    const refreshButton = await screen.findByRole('button', { name: 'Refresh orderbook' });
    expect(snapshot).toHaveBeenCalledTimes(1);
    fireEvent.click(refreshButton);
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(2));

    vi.useFakeTimers();
    try {
      await act(async () => {
        queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(snapshot).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveBusyRefresh(makeSnapshot());
        await busyRefresh;
        await Promise.resolve();
      });
      expect(snapshot).toHaveBeenCalledTimes(3);
      expect(snapshot).toHaveBeenLastCalledWith(expect.any(Object), { force: true });
    } finally {
      vi.useRealTimers();
    }
  });

});
