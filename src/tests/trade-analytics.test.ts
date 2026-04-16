import { describe, expect, it } from 'vitest';

import { buildTradePerformanceModel, normalizeTradeLifecycleStatus } from '../utils/tradeAnalytics';
import type { Trade } from '../types';

const baseTrade = {
  buyer_id: 'buyer-org',
  seller_id: 'seller-org',
  buyer_name: 'Buyer',
  seller_name: 'Seller',
  initiated_by: 'BUYER',
  is_anonymous: false,
  fuel_type: 'Methanol',
  region: 'Asia',
} satisfies Partial<Trade>;

describe('tradeAnalytics', () => {
  it('normalizes delivered and paid trades to confirmed for UI purposes', () => {
    expect(normalizeTradeLifecycleStatus('DELIVERED')).toBe('CONFIRMED');
    expect(normalizeTradeLifecycleStatus('PAID')).toBe('CONFIRMED');
    expect(normalizeTradeLifecycleStatus('DECLINED')).toBe('DECLINED');
  });

  it('builds numeric performance metrics from decimal-like API payloads', () => {
    const trades = [
      {
        ...baseTrade,
        id: 't-1',
        status: 'CONFIRMED',
        quantity_mt: '1000',
        price_per_mt_usd: '1050',
        created_at: '2026-04-10T00:00:00Z',
        product_name: 'Bio Methanol',
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        delivery_point_name: 'Singapore',
        availability_window: 'SPOT',
      },
      {
        ...baseTrade,
        id: 't-2',
        status: 'PAID',
        quantity_mt: '500',
        price_per_mt_usd: '1100',
        final_quantity_mt: '500',
        final_price_per_mt: '1090',
        created_at: '2026-03-05T00:00:00Z',
        product_name: 'Bio Methanol',
        market_product: 'BIO_METHANOL',
        delivery_point_id: 'dp-singapore',
        delivery_point_name: 'Singapore',
        availability_window: 'SPOT',
      },
    ] as unknown as Trade[];

    const model = buildTradePerformanceModel(
      trades,
      {
        'BIO_METHANOL::dp-singapore::SPOT': 1060,
      },
      new Date('2026-04-16T00:00:00Z')
    );

    expect(model.totalTrades).toBe(2);
    expect(model.totalVolumeMt).toBe(1500);
    expect(model.grossNotionalUsd).toBe(1595000);
    expect(model.weightedAveragePriceUsd).toBeCloseTo(1063.33, 2);
    expect(model.fuelComparisons[0]).toMatchObject({
      fuel: 'Bio Methanol',
      weightedExecutionUsd: 1063.33,
      weightedBenchmarkUsd: 1060,
      differenceUsd: 3.33,
    });
    expect(model.monthlyTradeCounts.map((entry) => entry.label)).toEqual(['Feb 2026', 'Mar 2026', 'Apr 2026']);
  });
});
