import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFuelTickerItems, fetchFuelPrices, type FuelPrice } from '../data/fuelPrices';

describe('fetchFuelPrices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the nearest demo marketplace window without mixing products or ports', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          market_product: 'E_METHANOL',
          delivery_point_name: 'Singapore',
          availability_window: '2026-08',
          side: 'BID',
          min_price: '1090',
          max_price: '1170',
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
          observed_at: '2026-08-01T00:00:00Z',
        },
        {
          market_product: 'E_METHANOL',
          delivery_point_name: 'Singapore',
          availability_window: '2026-08',
          side: 'ASK',
          min_price: '1205',
          max_price: '1285',
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
          observed_at: '2026-08-01T00:00:00Z',
        },
        {
          market_product: 'E_METHANOL',
          delivery_point_name: 'Singapore',
          availability_window: '2026-09',
          side: 'BID',
          min_price: '2000',
          max_price: '2000',
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
        },
        {
          market_product: 'BIO_METHANOL',
          delivery_point_name: 'Shanghai',
          availability_window: '2026-08',
          side: 'ASK',
          min_price: '945',
          max_price: '985',
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
        },
      ],
    }));

    const prices = await fetchFuelPrices();
    const singaporeEMethanol = prices.find(price => (
      price.fuel === 'e-Methanol' && price.region === 'Singapore'
    ));

    expect(prices).toHaveLength(8);
    expect(new Set(prices.map(price => price.fuel))).toEqual(new Set([
      'Bio Methanol',
      'e-Methanol',
      'Bio Ethanol',
      'e-Ethanol',
    ]));
    expect(singaporeEMethanol).toEqual(expect.objectContaining({
      price: 1187.5,
      unit: 'USD/mt',
      sourceLabel: 'Demo',
      availabilityWindow: '2026-08',
    }));
  });

  it('throws on marketplace API errors so the ticker can retain its built-in demo values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }));

    await expect(fetchFuelPrices()).rejects.toThrow('Marketplace prices request failed: 502');
  });

  it('adds only like-for-like location spreads and pathway premiums', () => {
    const prices: FuelPrice[] = [
      { fuel: 'Bio Methanol', region: 'Singapore', price: 985, unit: 'USD/mt', change: null, source: 'marketplace-demo', sourceLabel: 'Demo', priceDate: '2026-08-01', availabilityWindow: '2026-08' },
      { fuel: 'e-Methanol', region: 'Singapore', price: 1188, unit: 'USD/mt', change: null, source: 'marketplace-demo', sourceLabel: 'Demo', priceDate: '2026-08-01', availabilityWindow: '2026-08' },
      { fuel: 'Bio Methanol', region: 'Shanghai', price: 935, unit: 'USD/mt', change: null, source: 'marketplace-demo', sourceLabel: 'Demo', priceDate: '2026-08-01', availabilityWindow: '2026-08' },
      { fuel: 'e-Methanol', region: 'Shanghai', price: 1095, unit: 'USD/mt', change: null, source: 'marketplace-demo', sourceLabel: 'Demo', priceDate: '2026-08-01', availabilityWindow: '2026-09' },
    ];

    const items = buildFuelTickerItems(prices);

    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'location-spread',
        fuel: 'Bio Methanol spread',
        region: 'Singapore vs Shanghai',
        price: 50,
      }),
      expect.objectContaining({
        kind: 'pathway-premium',
        fuel: 'e-Methanol premium',
        region: 'Singapore vs Bio Methanol',
        price: 203,
      }),
    ]));
    expect(items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'location-spread',
        fuel: 'e-Methanol spread',
      }),
    ]));
    expect(items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'pathway-premium',
        region: 'Shanghai vs Bio Methanol',
      }),
    ]));
  });
});
