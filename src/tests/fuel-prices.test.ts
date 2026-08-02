import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFuelPrices } from '../data/fuelPrices';

describe('fetchFuelPrices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows every quoted active catalog fuel in port-major order', async () => {
    const ports = [
      'Dalian',
      'Busan',
      'Shanghai',
      'Singapore',
      'Rotterdam',
      'Houston',
      'Los Angeles',
      'Santos',
    ];
    const products = [
      'BIO_METHANOL',
      'E_METHANOL',
      'BIO_ETHANOL',
      'SYNTHETIC_ETHANOL',
    ];
    const rows = ports.flatMap((port, portIndex) => products.flatMap((product, productIndex) => {
      const bid = 800 + (portIndex * 10) + (productIndex * 100);
      return [
        {
          market_product: product,
          delivery_point_name: port,
          availability_window: '2026-08',
          side: 'BID',
          min_price: String(bid),
          max_price: String(bid),
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
          observed_at: '2026-08-01T00:00:00Z',
        },
        {
          market_product: product,
          delivery_point_name: port,
          availability_window: '2026-08',
          side: 'ASK',
          min_price: String(bid + 20),
          max_price: String(bid + 20),
          source_kind: 'DEMO_SEED',
          demo_status: 'DEMO_ONLY',
          observed_at: '2026-08-01T00:00:00Z',
        },
      ];
    }));
    rows.push({
      market_product: 'BIO_METHANOL',
      delivery_point_name: 'Port Klang',
      availability_window: '2026-08',
      side: 'ASK',
      min_price: '900',
      max_price: '900',
      source_kind: 'DEMO_SEED',
      demo_status: 'DEMO_ONLY',
      observed_at: '2026-08-01T00:00:00Z',
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => rows })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => products.map(market_product => ({ market_product, is_active: true })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [...ports, 'Port Klang'].map(name => ({ name, is_active: true })),
      });
    vi.stubGlobal('fetch', fetchMock);

    const prices = await fetchFuelPrices();
    const singaporeEMethanol = prices.find(price => (
      price.fuel === 'e-Methanol' && price.region === 'Singapore'
    ));

    expect(prices).toHaveLength(32);
    expect(prices.slice(0, 4).map(price => price.region)).toEqual(Array(4).fill('Dalian'));
    expect(prices.slice(0, 4).map(price => price.fuel)).toEqual([
      'Bio Methanol',
      'e-Methanol',
      'Bio Ethanol',
      'e-Ethanol',
    ]);
    expect(new Set(prices.map(price => price.fuel))).toEqual(new Set([
      'Bio Methanol',
      'e-Methanol',
      'Bio Ethanol',
      'e-Ethanol',
    ]));
    expect(singaporeEMethanol).toEqual(expect.objectContaining({
      price: 940,
      unit: 'USD/mt',
      sourceLabel: 'Demo',
      availabilityWindow: '2026-08',
    }));
    expect(prices.some(price => price.region === 'Port Klang')).toBe(false);
  });

  it('throws on marketplace API errors so the ticker can retain its built-in demo values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }));

    await expect(fetchFuelPrices()).rejects.toThrow('Marketplace prices request failed: 502');
  });
});
