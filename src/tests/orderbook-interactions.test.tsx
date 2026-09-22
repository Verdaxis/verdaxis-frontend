import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';

const { listBids, listAsks } = vi.hoisted(() => ({ listBids: vi.fn(), listAsks: vi.fn() }));
vi.mock('../services/api', () => ({ api: { orderbook: { listBids, listAsks } } }));

const bid = {
    id: 'bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
    remaining_quantity_mt: 100, availability_window: '2028-Q1', region: 'Singapore',
    certifications: ['ISCC'],
};

beforeEach(() => {
  listBids.mockReset().mockResolvedValue([bid]);
  listAsks.mockReset().mockResolvedValue([]);
});

describe('orderbook inspection', () => {
  it.each([
    { marketProduct: 'UCOME_B100' },
    { marketProduct: 'UCOME_B100', executionMode: 'RFQ_ONLY' as const },
    { marketProduct: 'UNRECOGNIZED_PRODUCT' },
    { fuelType: 'Unrecognized fuel' },
  ])('does not request book data for unsupported product filters: %j', async (filters) => {
    const openTrade = vi.fn();
    await act(async () => {
      renderWithProviders(<OrderBook {...filters} actionableSide="BID" onLevelClick={openTrade} onInstantTrade={openTrade} />);
    });
    expect(listBids).not.toHaveBeenCalled();
    expect(listAsks).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
    expect(openTrade).not.toHaveBeenCalled();
  });

  it('discards a pending alcohol response after switching to an RFQ product', async () => {
    let resolveOld: (rows: unknown[]) => void = () => {};
    listBids.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const view = renderWithProviders(<OrderBook marketProduct="BIO_METHANOL" actionableSide="BID" onLevelClick={vi.fn()} />);
    await waitFor(() => expect(listBids).toHaveBeenCalledTimes(1));
    view.rerender(<OrderBook marketProduct="UCOME_B100" executionMode="RFQ_ONLY" actionableSide="BID" onLevelClick={vi.fn()} />);
    await act(async () => resolveOld([bid]));
    expect(listBids).toHaveBeenCalledTimes(1);
    expect(listAsks).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('$600')).toBeNull();
  });

  it('stops polling when the selected product changes to RFQ-only', async () => {
    vi.useFakeTimers();
    const view = renderWithProviders(<OrderBook marketProduct="BIO_METHANOL" />);
    try {
      await act(async () => {});
      expect(screen.getByRole('group', { name: /Bid.*600/ })).toBeTruthy();
      expect(listBids).toHaveBeenCalledTimes(1);
      expect(listAsks).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
      expect(listBids).toHaveBeenCalledTimes(2);
      expect(listAsks).toHaveBeenCalledTimes(2);
      view.rerender(<OrderBook marketProduct="UCOME_B100" executionMode="RFQ_ONLY" />);
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      expect(listBids).toHaveBeenCalledTimes(2);
      expect(listAsks).toHaveBeenCalledTimes(2);
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });

  it('shows canonical B100 orders while excluding unknown products returned by an unfiltered request', async () => {
    listBids.mockResolvedValue([
      bid,
      { ...bid, id: 'b100', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1200 },
      { ...bid, id: 'unknown', market_product: 'UNKNOWN_FUEL', price_per_mt_usd: 1250 },
      { ...bid, id: 'unclassified-fame', market_product: undefined, fuel_type: 'FAME', price_per_mt_usd: 1275 },
    ]);
    renderWithProviders(<OrderBook actionableSide="BID" onLevelClick={vi.fn()} onInstantTrade={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /bid.*600/i })).toBeTruthy();
    expect(screen.getByText('$1,200')).toBeTruthy();
    expect(screen.queryByText('$1,250')).toBeNull();
    expect(screen.queryByText('$1,275')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Sell' })).toHaveLength(2);
  });

  it('loads executable B100 orders and opens the same trade review interaction', async () => {
    const b100Ask = { ...bid, id: 'b100-ask', side: 'ASK', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1100 };
    listBids.mockResolvedValue([]);
    listAsks.mockResolvedValue([b100Ask]);
    const openTrade = vi.fn();
    renderWithProviders(<OrderBook fuelType="FAME" marketProduct="UCOME_B100" executionMode="ORDERBOOK" deliveryPointId="singapore" availability="SPOT" actionableSide="ASK" onLevelClick={openTrade} />);
    const level = await screen.findByRole('button', { name: /ask.*1,100/i });
    expect(listAsks).toHaveBeenCalledWith(expect.objectContaining({ fuel_type: 'FAME', market_product: 'UCOME_B100', delivery_point_id: 'singapore', availability: 'SPOT' }));
    fireEvent.keyDown(level, { key: 'Enter' });
    expect(openTrade).toHaveBeenCalledWith(expect.objectContaining(b100Ask));
    expect(screen.queryByText('Orderbook trading is unavailable for this product.')).toBeNull();
  });

  it('describes crossed B100 prices as overlap without claiming compatible fuel terms', async () => {
    listBids.mockResolvedValue([{ ...bid, market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1200 }]);
    listAsks.mockResolvedValue([{ ...bid, id: 'ask', side: 'ASK', market_product: 'UCOME_B100', fuel_type: 'FAME', price_per_mt_usd: 1100 }]);
    renderWithProviders(<OrderBook marketProduct="UCOME_B100" executionMode="ORDERBOOK" />);
    expect(await screen.findByRole('group', { name: /Bid.*1,200/ })).toBeTruthy();
    expect(screen.getAllByText('PRICE OVERLAP').length).toBeGreaterThan(0);
    expect(screen.getByText('Price overlap does not confirm matching fuel terms. Review the order requirements before trading.')).toBeTruthy();
    expect(screen.queryByText('CROSSED')).toBeNull();
  });

  it('formats API decimal strings as readable prices and quantities', async () => {
    listBids.mockResolvedValue([{ ...bid, price_per_mt_usd: '1260.20', remaining_quantity_mt: '1500' }]);
    renderWithProviders(<OrderBook />);
    expect(await screen.findByRole('group', { name: /Bid \$1,260.2 for 1,500 MT/ })).toBeTruthy();
  });

  it('forces fresh book data when the user selects Refresh', async () => {
    renderWithProviders(<OrderBook marketProduct="BIO_METHANOL" deliveryPointId="dp-1" availability="SPOT" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(listBids).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'BIO_METHANOL', delivery_point_id: 'dp-1', availability: 'SPOT' }), { force: true });
      expect(listAsks).toHaveBeenLastCalledWith(expect.objectContaining({ market_product: 'BIO_METHANOL', delivery_point_id: 'dp-1', availability: 'SPOT' }), { force: true });
    });
  });

  it('allows keyboard inspection without making the other side executable', async () => {
    const openTrade = vi.fn();
    renderWithProviders(<OrderBook actionableSide="ASK" onLevelClick={openTrade} />);
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

  it('does not show a demo-only cross as an executable spread', async () => {
    listBids.mockResolvedValue([{ ...bid, is_demo_listing: true }]);
    listAsks.mockResolvedValue([{ ...bid, id: 'ask', side: 'ASK', price_per_mt_usd: 590, is_demo_listing: true }]);
    renderWithProviders(<OrderBook />);
    expect(await screen.findByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    expect(screen.getByText('Live spread').textContent).toContain('—');
    expect(screen.queryByText('CROSSED')).toBeNull();
  });

  it('discards a superseded market request and clears its old tooltip', async () => {
    let resolveOld: (rows: unknown[]) => void = () => {};
    listBids.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const view = renderWithProviders(<OrderBook marketProduct="BIO_METHANOL" />);
    await waitFor(() => expect(listBids).toHaveBeenCalledTimes(1));
    listBids.mockResolvedValue([{ ...bid, id: 'new', market_product: 'E_METHANOL', price_per_mt_usd: 1600 }]);
    view.rerender(<OrderBook marketProduct="E_METHANOL" />);
    const current = await screen.findByRole('group', { name: /Bid.*1,600/ });
    await act(async () => resolveOld([bid]));
    expect(screen.queryByRole('group', { name: /Bid \$600/ })).toBeNull();
    fireEvent.focus(current);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    await act(async () => view.rerender(<OrderBook marketProduct="BIO_ETHANOL" />));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
