import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFuelPrices } from '../data/fuelPrices';

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
});
