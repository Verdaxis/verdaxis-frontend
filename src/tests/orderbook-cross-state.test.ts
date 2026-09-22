import { describe, expect, it } from 'vitest';

import { getExecutableCrossState } from '../components/OrderBook';
import type { OrderBookOrder } from '../types';

const makeOrder = (overrides: Partial<OrderBookOrder>): OrderBookOrder => ({
  id: overrides.id || 'order',
  side: overrides.side || 'BID',
  fuel_type: 'Methanol',
  fuel_grade: 'Bio',
  region: 'Singapore',
  quantity_mt: 1000,
  remaining_quantity_mt: 1000,
  price_per_mt_usd: 600,
  availability_window: 'Spot',
  certifications: [],
  is_verdaxis_verified: true,
  tier_label: 'INDEPENDENT',
  status: 'OPEN',
  created_at: '2026-04-08T10:00:00Z',
  ...overrides,
});

describe('getExecutableCrossState', () => {
  it('excludes RFQ products from executable cross calculations', () => {
    const state = getExecutableCrossState(
      [makeOrder({ id: 'rfq-bid', market_product: 'UCOME_B100', price_per_mt_usd: 1200 })],
      [makeOrder({ id: 'real-ask', side: 'ASK', market_product: 'BIO_METHANOL', price_per_mt_usd: 650 })],
    );

    expect(state.hasCross).toBe(false);
    expect(state.bidIds.size).toBe(0);
    expect(state.askIds.size).toBe(0);
    expect(state.spread).toBeNull();
  });

  it('compares decimal strings from the API numerically, not alphabetically', () => {
    const bid = makeOrder({ id: 'bid', price_per_mt_usd: '995.00' as unknown as number });
    const ask = makeOrder({ id: 'ask', side: 'ASK', price_per_mt_usd: '1050.00' as unknown as number });
    expect(getExecutableCrossState([bid], [ask]).hasCross).toBe(false);
    expect(getExecutableCrossState([bid], [ask]).spread).toBe(55);
  });

  it('ignores demo-only crosses so demo prices do not show as executable', () => {
    const state = getExecutableCrossState(
      [makeOrder({ id: 'demo-bid', side: 'BID', price_per_mt_usd: 700, is_demo_listing: true })],
      [makeOrder({ id: 'real-ask', side: 'ASK', price_per_mt_usd: 650 })],
    );

    expect(state.hasCross).toBe(false);
    expect(state.bidIds.size).toBe(0);
    expect(state.askIds.size).toBe(0);
  });

  it('detects real executable crosses below demo top-of-book levels', () => {
    const state = getExecutableCrossState(
      [
        makeOrder({ id: 'demo-bid', side: 'BID', price_per_mt_usd: 720, is_demo_listing: true }),
        makeOrder({ id: 'real-bid', side: 'BID', price_per_mt_usd: 680 }),
      ],
      [
        makeOrder({ id: 'demo-ask', side: 'ASK', price_per_mt_usd: 640, is_demo_listing: true }),
        makeOrder({ id: 'real-ask', side: 'ASK', price_per_mt_usd: 670 }),
      ],
    );

    expect(state.hasCross).toBe(true);
    expect(state.bidIds.has('real-bid')).toBe(true);
    expect(state.askIds.has('real-ask')).toBe(true);
    expect(state.bidIds.has('demo-bid')).toBe(false);
    expect(state.askIds.has('demo-ask')).toBe(false);
    expect(state.spread).toBe(-10);
  });
});
