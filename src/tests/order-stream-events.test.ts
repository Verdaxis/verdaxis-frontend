import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWN_ORDERS_REFRESH_DEBOUNCE_MS,
  PRIVATE_ORDER_EVENTS,
  announceOwnOrdersChanged,
  eventChangesOwnOrders,
  isPrivateOrderEvent,
  subscribeToOwnOrderChanges,
} from '../services/orderStreamEvents';
import { cachedRead, invalidateReadCache, invalidateReadsForEvent } from '../services/readCache';

describe('private order events', () => {
  it('names the five events the backend sends to the private trades stream', () => {
    expect([...PRIVATE_ORDER_EVENTS]).toEqual([
      'order_created', 'order_updated', 'order_cancelled', 'orders_matched', 'order_expired',
    ]);
  });

  it('does not treat trade events, price alerts or control events as order events', () => {
    for (const event of ['trade_created', 'trade_confirmed', 'price_alert_triggered', 'market_invalidated', 'heartbeat']) {
      expect(isPrivateOrderEvent(event)).toBe(false);
      expect(eventChangesOwnOrders(event)).toBe(false);
    }
    expect(isPrivateOrderEvent(undefined)).toBe(false);
  });

  it('also reloads own orders after a stream gap', () => {
    expect(eventChangesOwnOrders('order_cancelled')).toBe(true);
    expect(eventChangesOwnOrders('reset')).toBe(true);
    expect(eventChangesOwnOrders('reconnect')).toBe(true);
  });
});

describe('own order change announcements', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tells listeners once after a burst of events', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOwnOrderChanges(listener);

    announceOwnOrdersChanged();
    announceOwnOrdersChanged();
    vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS - 1);
    announceOwnOrdersChanged();
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('announces again for a later burst', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOwnOrderChanges(listener);

    announceOwnOrdersChanged();
    vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS);
    announceOwnOrdersChanged();
    vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS);

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops after unsubscribe and survives a failing listener', () => {
    const failing = vi.fn(() => { throw new Error('view failed'); });
    const healthy = vi.fn();
    const removed = vi.fn();
    const unsubscribeFailing = subscribeToOwnOrderChanges(failing);
    const unsubscribeHealthy = subscribeToOwnOrderChanges(healthy);
    subscribeToOwnOrderChanges(removed)();

    announceOwnOrdersChanged();
    vi.advanceTimersByTime(OWN_ORDERS_REFRESH_DEBOUNCE_MS);

    expect(failing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    unsubscribeFailing();
    unsubscribeHealthy();
  });
});

describe('read cache invalidation for order events', () => {
  const load = vi.fn();

  beforeEach(() => {
    invalidateReadCache();
    load.mockReset();
    load.mockResolvedValue('value');
  });

  const warm = async () => {
    for (const key of ['orderbook:my', 'orderbook:/orderbook/asks', 'prices:x', 'curves:x', 'trades:my', 'trade-tape:x', 'watchlists:list']) {
      await cachedRead(key, 'public', 60_000, load);
    }
    load.mockClear();
  };

  const isCached = async (key: string) => {
    await cachedRead(key, 'public', 60_000, load);
    const wasCached = load.mock.calls.length === 0;
    load.mockClear();
    return wasCached;
  };

  it.each(PRIVATE_ORDER_EVENTS)('%s invalidates My Orders and nothing else', async (event) => {
    await warm();

    invalidateReadsForEvent('trades', event);

    expect(await isCached('orderbook:my')).toBe(false);
    for (const key of ['orderbook:/orderbook/asks', 'prices:x', 'curves:x', 'trades:my', 'trade-tape:x', 'watchlists:list']) {
      expect(await isCached(key)).toBe(true);
    }
  });

  it('still clears My Orders and trade history after a stream reset', async () => {
    await warm();

    invalidateReadsForEvent('trades', 'reset');

    expect(await isCached('orderbook:my')).toBe(false);
    expect(await isCached('trades:my')).toBe(false);
  });
});
