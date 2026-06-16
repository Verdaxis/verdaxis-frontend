import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { TradeTape } from '../components/TradeTape';
import { renderWithProviders } from './test-utils';

const tradeTapeList = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    tradeTape: {
      list: (...args: unknown[]) => tradeTapeList(...args),
    },
  },
}));

describe('TradeTape status copy', () => {
  beforeEach(() => {
    tradeTapeList.mockReset();
    tradeTapeList.mockResolvedValue({ items: [], total: 0, market_hours: false });
  });

  it('uses 24-hour marketplace history copy instead of market-closed status', async () => {
    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" deliveryPointId="dp-1" availability="SPOT" />);

    await waitFor(() => {
      expect(screen.getByText('24h market · 7D confirmed trades')).toBeTruthy();
    });

    expect(screen.getByText('No confirmed trades in the last 7 days')).toBeTruthy();
    expect(screen.queryByText('Unavailable')).toBeNull();
    expect(screen.queryByText('Live · 7D history')).toBeNull();
    expect(tradeTapeList).toHaveBeenCalledWith({
      fuel_type: undefined,
      market_product: 'BIO_METHANOL',
      delivery_point_id: 'dp-1',
      region: 'Singapore',
      availability_window: 'SPOT',
      limit: 20,
    });
  });

  it('keeps demo trade badges visible while ignoring market-hours status', async () => {
    tradeTapeList.mockResolvedValue({
      items: [{
        id: 'demo-trade-1',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Bio',
        region: 'Singapore',
        quantity_mt: 1200,
        price_per_mt_usd: 710,
        confirmed_at: new Date().toISOString(),
        availability_window: 'SPOT',
        is_demo_trade: true,
      }],
      total: 1,
      market_hours: false,
    });

    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />);

    await waitFor(() => {
      expect(screen.getByText('24h market · 7D confirmed trades')).toBeTruthy();
    });

    expect(screen.getByText('Demo')).toBeTruthy();
    expect(screen.getByLabelText('Demo trade seeded for platform preview. Not user-posted liquidity.')).toBeTruthy();
    expect(screen.queryByText('Unavailable')).toBeNull();
  });
});
