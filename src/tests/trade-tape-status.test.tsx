import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('shows confirmed B100 trades with their exact product filter and no generic grade fallback', async () => {
    tradeTapeList.mockResolvedValue({ items: [{
      id: 'b100-trade', market_product: 'UCOME_B100', fuel_type: 'FAME', fuel_grade: 'UCOME',
      region: 'Singapore', quantity_mt: '450', price_per_mt_usd: '1125.50',
      confirmed_at: new Date().toISOString(), availability_window: 'SPOT', provenance_kind: 'CONFIRMED_TRADE',
    }], total: 1 });
    renderWithProviders(<TradeTape fuelType="FAME" marketProduct="UCOME_B100" deliveryPointId="singapore" availability="SPOT" />);
    expect(await screen.findByText('UCOME B100')).toBeTruthy();
    expect(screen.getByText('450 MT')).toBeTruthy();
    expect(screen.getByText('$1,125.5/MT')).toBeTruthy();
    expect(screen.queryByText('Other grade')).toBeNull();
    expect(tradeTapeList).toHaveBeenCalledWith(expect.objectContaining({ fuel_type: 'FAME', market_product: 'UCOME_B100', delivery_point_id: 'singapore' }));
  });

  it('pauses polling while hidden and refreshes immediately when visible', async () => {
    let poll: (() => void) | undefined;
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(window, 'setInterval').mockImplementation(((handler: TimerHandler, timeout?: number) => {
      if (timeout === 30_000 && typeof handler === 'function') poll = handler as () => void;
      return 1;
    }) as typeof window.setInterval);

    renderWithProviders(<TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />);
    await waitFor(() => expect(tradeTapeList).toHaveBeenCalledTimes(1));
    expect(poll).toBeTypeOf('function');

    hidden.mockReturnValue(true);
    await act(async () => { poll?.(); });
    expect(tradeTapeList).toHaveBeenCalledTimes(1);

    hidden.mockReturnValue(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(tradeTapeList).toHaveBeenCalledTimes(2));
  }, 30_000);

  it('clears the prior scope total when a new scope fails to load', async () => {
    tradeTapeList
      .mockResolvedValueOnce({ items: [], total: 7, market_hours: false })
      .mockRejectedValueOnce(new Error('Tape unavailable'));

    const view = renderWithProviders(
      <TradeTape marketProduct="BIO_METHANOL" region="Singapore" availability="SPOT" />,
    );
    expect(await screen.findByText('7 trades')).toBeTruthy();

    view.rerender(<TradeTape marketProduct="E_METHANOL" region="Singapore" availability="SPOT" />);

    expect(await screen.findByText('0 trades')).toBeTruthy();
    expect(screen.queryByText('7 trades')).toBeNull();
  }, 30_000);

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
