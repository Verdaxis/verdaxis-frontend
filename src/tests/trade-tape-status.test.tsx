import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { TradeTape } from '../components/TradeTape';
import i18n, { loadNamespace } from '../i18n';
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
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    tradeTapeList.mockReset();
    tradeTapeList.mockResolvedValue({ items: [], total: 0, market_hours: false });
  });

  it('uses 24-hour marketplace history copy instead of market-closed status', async () => {
    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />);

    await waitFor(() => {
      expect(screen.getByText('24h market · 7D region history')).toBeTruthy();
    });

    expect(screen.getByText('No confirmed trades in the last 7 days')).toBeTruthy();
    expect(screen.queryByText('Unavailable')).toBeNull();
    expect(screen.queryByText('Live · 7D history')).toBeNull();
    expect(tradeTapeList).toHaveBeenCalledWith({
      fuel_type: undefined,
      market_product: 'BIO_METHANOL',
      delivery_point_id: undefined,
      region: 'Singapore',
      availability_window: 'SPOT',
      limit: 20,
    });
  });

  it('uses exact delivery point filtering when a catalog delivery point id is available', async () => {
    renderWithProviders(
      <TradeTape
        marketProduct="BIO_METHANOL"
        deliveryPointId="dp-singapore"
        region="Singapore"
        availability="SPOT"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('24h market · 7D delivery-point history')).toBeTruthy();
      expect(tradeTapeList).toHaveBeenCalledWith({
        fuel_type: undefined,
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        region: undefined,
        availability_window: 'SPOT',
        limit: 20,
      });
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
        quantity_mt: '1200.50',
        price_per_mt_usd: '710.25',
        confirmed_at: new Date().toISOString(),
        availability_window: 'SPOT',
        provenance_kind: 'DEMO_SEED',
      }],
      total: 1,
      market_hours: false,
    });

    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />);

    await waitFor(() => {
      expect(screen.getByText('24h market · 7D region history')).toBeTruthy();
    });

    expect(screen.getByText('Demo')).toBeTruthy();
    expect(screen.getByText('1,200.5 MT')).toBeTruthy();
    expect(screen.getByText('$710.25/MT')).toBeTruthy();
    expect(screen.getByLabelText('Demo activity seeded for platform preview. Not user-posted liquidity.')).toBeTruthy();
    expect(screen.queryByText('Unavailable')).toBeNull();
  });

  it('renders minute, hour, and day relative times naturally in Chinese', async () => {
    await i18n.changeLanguage('zh');
    const now = Date.now();
    const trade = {
      market_product: 'BIO_METHANOL',
      fuel_type: 'Methanol',
      fuel_grade: 'Bio',
      region: 'Singapore',
      quantity_mt: '1000',
      price_per_mt_usd: '710',
      availability_window: 'SPOT',
      provenance_kind: 'CONFIRMED_TRADE' as const,
    };
    tradeTapeList.mockResolvedValue({
      items: [
        { ...trade, id: 'trade-minutes', confirmed_at: new Date(now - (5 * 60_000) - 1_000).toISOString() },
        { ...trade, id: 'trade-hours', confirmed_at: new Date(now - (2 * 60 * 60_000) - 1_000).toISOString() },
        { ...trade, id: 'trade-days', confirmed_at: new Date(now - (3 * 24 * 60 * 60_000) - 1_000).toISOString() },
      ],
      total: 3,
      market_hours: false,
    });

    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />);

    expect(await screen.findByText('5分钟前')).toBeTruthy();
    expect(screen.getByText('2小时前')).toBeTruthy();
    expect(screen.getByText('3天前')).toBeTruthy();
    expect(screen.queryByText('5m')).toBeNull();
  });
});
