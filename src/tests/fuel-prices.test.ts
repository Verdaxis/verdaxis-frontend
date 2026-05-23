import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFuelPrices } from '../data/fuelPrices';

describe('fetchFuelPrices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps MarinaPulse rows into ticker benchmarks with daily movement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            source: 'ship_bunker',
            commodity: 'VLSFO',
            region: 'Global',
            price_usd: 896.5,
            unit: 'USD/mt',
            price_date: '2026-04-24',
          },
          {
            source: 'ship_bunker',
            commodity: 'VLSFO',
            region: 'Global',
            price_usd: 890,
            unit: 'USD/mt',
            price_date: '2026-04-23',
          },
          {
            source: 'yfinance',
            commodity: 'Corn Futures (CBOT)',
            region: 'US',
            price_usd: 464,
            unit: 'USc/bu',
            price_date: '2026-04-24',
          },
          {
            source: 'yfinance',
            commodity: 'Corn Futures (CBOT)',
            region: 'US',
            price_usd: 460,
            unit: 'USc/bu',
            price_date: '2026-04-23',
          },
        ],
      }),
    }));

    const prices = await fetchFuelPrices();

    expect(prices).toEqual([
      expect.objectContaining({
        fuel: 'VLSFO',
        region: 'Global bunker',
        price: 896.5,
        unit: 'USD/mt',
        sourceLabel: 'Ship & Bunker',
      }),
      expect.objectContaining({
        fuel: 'Corn',
        region: 'Biofuel feedstock',
        price: 464,
        unit: 'USc/bu',
        sourceLabel: 'Yahoo Finance',
      }),
    ]);
    expect(prices[0].change).toBeCloseTo(0.73, 2);
    expect(prices[1].change).toBeCloseTo(0.87, 2);
  });

  it('throws on MarinaPulse API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }));

    await expect(fetchFuelPrices()).rejects.toThrow('MarinaPulse prices request failed: 502');
  });
});
