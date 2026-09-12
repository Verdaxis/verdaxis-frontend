import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { TradeHistoryPage } from '../components/TradeHistoryPage';

const apiMock = vi.hoisted(() => ({ myTrades: vi.fn(), getReference: vi.fn() }));
vi.mock('../services/api', () => ({ api: {
  trades: { myTrades: apiMock.myTrades },
  prices: { getReference: apiMock.getReference },
} }));
vi.mock('../components/MyTrades', () => ({ MyTrades: () => null }));

describe('trade performance references', () => {
  it('requests each exact window and ignores reference rows for a different slice', async () => {
    const trade = {
      product_id: 'methanol', delivery_point_id: 'singapore', product_name: 'Methanol',
      status: 'CONFIRMED', quantity_mt: 100, price_per_mt_usd: 700,
      created_at: '2026-09-01T00:00:00Z',
    };
    apiMock.myTrades.mockResolvedValue([
      { ...trade, id: 'spot', availability_window: 'SPOT' },
      { ...trade, id: 'forward', availability_window: '2028-Q1' },
      { ...trade, id: 'legacy' },
    ]);
    apiMock.getReference.mockImplementation(async (params) => ({ prices: [
      { ...params, delivery_point_id: 'another-port', vwap_usd: 9999, date: '2026-09-03' },
      { ...params, vwap_usd: params.availability_window === 'SPOT' ? 600 : 800, date: '2026-09-02' },
    ] }));

    renderWithProviders(<TradeHistoryPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Performance' }));

    await waitFor(() => expect(apiMock.getReference).toHaveBeenCalledTimes(2));
    for (const availability_window of ['SPOT', '2028-Q1']) {
      expect(apiMock.getReference).toHaveBeenCalledWith({
        product_id: 'methanol', delivery_point_id: 'singapore', availability_window, visibility: 'internal',
      });
    }
    expect(await screen.findByText('+0.00 (0.0%)')).toBeTruthy();
    expect(screen.getByText(/Latest daily reference dates/).textContent).toContain('2026');
  });
});
