import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';

vi.mock('../services/api', () => ({ api: { orderbook: {
  listBids: async (params: { market_product?: string }) => [{
    id: 'bid', side: 'BID', market_product: params.market_product ?? 'BIO_METHANOL', price_per_mt_usd: 600,
    remaining_quantity_mt: 100, availability_window: '2028-Q1', region: 'Singapore',
    certifications: ['ISCC'],
  }],
  listAsks: async () => [],
} } }));

describe('orderbook inspection', () => {
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
});
