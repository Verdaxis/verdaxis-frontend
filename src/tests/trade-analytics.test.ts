import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Trade } from '../types';
import {
  buildTradePerformanceModel,
  isActiveTradeStatus,
  isCompletedTradeStatus,
  isConfirmedLikeTrade,
  tradeSliceKey,
} from '../utils/tradeAnalytics';

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
  availability_window: 'SPOT',
  fuel_type: 'Bio Methanol',
  region: 'Singapore',
};

describe('tradeAnalytics', () => {
  afterEach(() => vi.useRealTimers());
  it('keeps pending confirmation active and excludes it from completed performance', () => {
    expect(isActiveTradeStatus('PENDING_CONFIRMATION')).toBe(true);
    expect(isCompletedTradeStatus('PENDING_CONFIRMATION')).toBe(false);
    expect(isConfirmedLikeTrade('PENDING_CONFIRMATION')).toBe(false);
    expect(buildTradePerformanceModel([{ ...baseTrade, status: 'PENDING_CONFIRMATION' }]).totalTrades).toBe(0);
  });

  it('treats confirmed trades as completed and confirmed-like', () => {
    expect(isActiveTradeStatus('CONFIRMED')).toBe(false);
    expect(isCompletedTradeStatus('CONFIRMED')).toBe(true);
    expect(isConfirmedLikeTrade('CONFIRMED')).toBe(true);
  });

  it('requires an exact product, delivery point and window for reference prices', () => {
    expect(tradeSliceKey(baseTrade)).toBe('bio-methanol|sg-sin|SPOT');
    expect(tradeSliceKey({ ...baseTrade, availability_window: 'Q1_2026' })).toBe('bio-methanol|sg-sin|2026-Q1');
    expect(tradeSliceKey({ ...baseTrade, availability_window: undefined })).toBe('');
    expect(tradeSliceKey({ ...baseTrade, product_id: undefined })).toBe('');
    expect(tradeSliceKey({ ...baseTrade, delivery_point_id: undefined })).toBe('');
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
      { 'bio-methanol|sg-sin|SPOT': 720 }
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

  it('counts only the last six UTC year-months across a year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    const dates = [
      '2025-01-15T00:00:00Z', // Same month in the previous year is outside the chart.
      '2025-07-31T23:59:59Z',
      '2025-08-01T00:00:00Z',
      '2025-12-31T23:30:00-02:00', // January in UTC.
      '2026-01-15T00:00:00Z',
      '2026-02-01T00:00:00Z',
    ];
    const model = buildTradePerformanceModel(dates.map((created_at) => ({ ...baseTrade, created_at })));

    expect(model.monthlyTradeCounts.map(({ count }) => count)).toEqual([1, 0, 0, 0, 0, 2]);
    expect(model.monthlyTradeCounts[0].label).toContain('2025');
    expect(model.monthlyTradeCounts[5].label).toContain('2026');
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
