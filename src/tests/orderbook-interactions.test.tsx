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
    view.rerender(<OrderBook marketProduct="BIO_ETHANOL" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
