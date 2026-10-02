import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';

const { listBids, listAsks } = vi.hoisted(() => ({
  listBids: vi.fn(),
  listAsks: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: { orderbook: {
  listBids,
  listAsks,
} } }));

describe('orderbook inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBids.mockImplementation(async (params: { market_product?: string }) => [{
      id: 'bid', side: 'BID', market_product: params.market_product ?? 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 100, availability_window: '2028-Q1', region: 'Singapore',
      certifications: ['ISCC'],
    }]);
    listAsks.mockResolvedValue([]);
  });

  it.each(['B30', 'B100'])('shows the fixed %s specification during keyboard inspection', async (product) => {
    renderWithProviders(<OrderBook marketProduct={product} actionableSide="ASK" />);
    fireEvent.focus(await screen.findByRole('group', { name: /Bid.*600/ }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain(product === 'B30' ? '70% VLSFO' : 'Neat FAME biodiesel (B100)');
    expect(tooltip.textContent).toContain('ISO 8217:2024');
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

  it('labels provenance-only demo rows and preserves two-decimal depth', async () => {
    listBids.mockResolvedValue([{
      id: 'demo-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 12.34, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY',
    }]);

    renderWithProviders(<OrderBook />);
    const level = await screen.findByRole('group', { name: /Bid \$600 for 12\.34 MT/ });
    fireEvent.focus(level);
    expect(screen.getByRole('tooltip').textContent).toContain('Demo listing seeded for platform preview');
  });

  it('omits the spread footer for a demo-only cross', async () => {
    listBids.mockResolvedValue([{
      id: 'demo-bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], is_demo_listing: true,
    }]);
    listAsks.mockResolvedValue([{
      id: 'demo-ask', side: 'ASK', market_product: 'BIO_METHANOL', price_per_mt_usd: 590,
      remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore',
      certifications: [], is_demo_listing: true,
    }]);

    renderWithProviders(<OrderBook />);
    expect(await screen.findByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    expect(screen.queryByText('Spread')).toBeNull();
    expect(screen.queryByText('Crossed')).toBeNull();
  });

  it('discards a stale response after the market product changes', async () => {
    let resolveBio!: (orders: unknown[]) => void;
    let resolveEMethanol!: (orders: unknown[]) => void;
    const bioRequest = new Promise<unknown[]>(resolve => { resolveBio = resolve; });
    const eMethanolRequest = new Promise<unknown[]>(resolve => { resolveEMethanol = resolve; });
    listBids.mockImplementation(({ market_product }: { market_product?: string }) => (
      market_product === 'E_METHANOL' ? eMethanolRequest : bioRequest
    ));

    const view = renderWithProviders(<OrderBook marketProduct="BIO_METHANOL" />);
    await waitFor(() => expect(listBids).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'BIO_METHANOL' })));

    view.rerender(<OrderBook marketProduct="E_METHANOL" />);
    await waitFor(() => expect(listBids).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'E_METHANOL' })));

    await act(async () => {
      resolveEMethanol([{
        id: 'bid-e', side: 'BID', market_product: 'E_METHANOL', price_per_mt_usd: 700,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }]);
    });
    expect(await screen.findByRole('group', { name: /Bid.*700/ })).toBeTruthy();

    await act(async () => {
      resolveBio([{
        id: 'bid-bio', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600,
        remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [],
      }]);
    });
    expect(screen.getByRole('group', { name: /Bid.*700/ })).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Bid.*600/ })).toBeNull();
  }, 30_000);
});
