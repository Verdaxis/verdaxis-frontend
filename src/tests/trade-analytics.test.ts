import { describe, expect, it } from 'vitest';
import type { Trade } from '../types';
import { buildTradePerformanceModel, tradeSliceKey } from '../utils/tradeAnalytics';

const baseTrade: Trade = {
  id: 'trade-1',
  buyer_id: 'buyer',
  seller_id: 'seller',
  buyer_name: 'Buyer',
  seller_name: 'Seller',
  initiated_by: 'BUYER',
  is_anonymous: false,
  quantity_mt: 100,
  price_per_mt_usd: 700,
  status: 'CONFIRMED',
  commission_rate_pct: 0.5,
  created_at: '2026-04-15T00:00:00Z',
  product_id: 'bio-methanol',
  product_name: 'Bio Methanol',
  delivery_point_id: 'sg-sin',
  delivery_point_name: 'Singapore',
  fuel_type: 'Bio Methanol',
  region: 'Singapore',
};

describe('tradeAnalytics', () => {
  it('keys trades by product and delivery point for reference prices', () => {
    expect(tradeSliceKey(baseTrade)).toBe('bio-methanol|sg-sin');
  });

  it('builds weighted performance and benchmark comparisons', () => {
    const secondTrade: Trade = {
      ...baseTrade,
      id: 'trade-2',
      quantity_mt: 300,
      price_per_mt_usd: 740,
      confirmed_at: '2026-04-16T00:00:00Z',
    };

    const model = buildTradePerformanceModel(
      [baseTrade, secondTrade],
      { 'bio-methanol|sg-sin': 720 }
    );

    expect(model.totalTrades).toBe(2);
    expect(model.totalVolumeMt).toBe(400);
    expect(model.weightedAveragePriceUsd).toBe(730);
    expect(model.grossNotionalUsd).toBe(292000);
    expect(model.volumeByFuel).toEqual([{ fuel: 'Bio Methanol', volumeMt: 400 }]);
    expect(model.fuelComparisons[0]).toMatchObject({
      fuel: 'Bio Methanol',
      weightedExecutionUsd: 730,
      weightedBenchmarkUsd: 720,
      differenceUsd: 10,
    });
  });

  it('excludes cancelled and declined trades from analytics', () => {
    const model = buildTradePerformanceModel([
      baseTrade,
      { ...baseTrade, id: 'trade-2', status: 'CANCELLED', quantity_mt: 900 },
      { ...baseTrade, id: 'trade-3', status: 'DECLINED', quantity_mt: 900 },
    ]);

    expect(model.totalTrades).toBe(1);
    expect(model.totalVolumeMt).toBe(100);
  });
});
