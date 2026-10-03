import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACTIVITY_PAGES,
  activityPageFromPath,
  createActivityTracker,
} from '../services/activityTracking';
import { MARKET_PRODUCTS } from '../types';

const DELIVERY_POINT_ID = '70c1a9f0-e14e-4fc4-8d77-51a8fc99e4b1';

describe('identified activity tracking', () => {
  let id = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    id = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createId = () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`;

  it('tracks authenticated users without an anonymous analytics preference', () => {
    const send = vi.fn();
    const tracker = createActivityTracker({ send, createId });

    tracker.trackPage('home');
    tracker.setSession('user-1');
    tracker.trackPage('home');
    tracker.setSession(null);
    vi.runAllTimers();
    expect(send).not.toHaveBeenCalled();

    tracker.setSession('user-1');
    vi.runAllTimers();
    expect(send).not.toHaveBeenCalled();

    tracker.trackPage('marketplace');
    tracker.setSession('user-2');
    tracker.trackPage('curve');
    vi.runAllTimers();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      events: [{ id: expect.any(String), action: 'page_view', page: 'curve' }],
    });
    expect(JSON.stringify(send.mock.calls)).not.toContain('user-1');
    expect(JSON.stringify(send.mock.calls)).not.toContain('user-2');
  });

  it('drops a queued batch if the auth session changes before the provider rerenders', () => {
    let sessionEpoch = 1;
    const send = vi.fn();
    const tracker = createActivityTracker({
      send,
      createId,
      getSessionEpoch: () => sessionEpoch,
    });

    tracker.setSession('user-1');
    tracker.trackPage('marketplace');
    sessionEpoch = 2;
    vi.runAllTimers();
    expect(send).not.toHaveBeenCalled();

    tracker.setSession('user-2');
    tracker.trackPage('curve');
    vi.runAllTimers();
    expect(send).toHaveBeenCalledWith({
      events: [{ id: expect.any(String), action: 'page_view', page: 'curve' }],
    });
  });

  it('allows only bounded canonical fields, normalizes windows, and deduplicates repeats', () => {
    const send = vi.fn();
    const tracker = createActivityTracker({ send, createId });
    tracker.setSession('user-1');

    tracker.trackPage('/app/home?email=private@example.com');
    tracker.trackMarketView({ page: 'marketplace', marketProduct: 'not-a-product' });
    tracker.trackMarketView({
      page: 'marketplace',
      marketProduct: 'BIO_METHANOL',
      deliveryPointId: 'not-a-uuid',
      availabilityWindow: '2027-Q1',
    });
    tracker.trackMarketView({
      page: 'marketplace',
      marketProduct: 'BIO_METHANOL',
      deliveryPointId: 'not-a-uuid',
      availabilityWindow: '2027-Q1',
    });
    tracker.trackMarketFilter({ page: 'marketplace' });
    vi.runAllTimers();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({
      events: [
        {
          id: expect.any(String),
          action: 'market_view',
          page: 'marketplace',
          market_product: 'BIO_METHANOL',
          availability_window: '2027-Q1',
        },
        {
          id: expect.any(String),
          action: 'market_filter',
          page: 'marketplace',
        },
      ],
    });
  });

  it('sends at most 50 events per batch without blocking the caller', () => {
    const send = vi.fn();
    const tracker = createActivityTracker({ send, createId });
    tracker.setSession('user-1');

    let count = 0;
    for (const page of ACTIVITY_PAGES) {
      for (const marketProduct of MARKET_PRODUCTS) {
        for (const availabilityWindow of ['SPOT', '2027-Q1']) {
          tracker.trackMarketFilter({
            page,
            marketProduct,
            deliveryPointId: DELIVERY_POINT_ID,
            availabilityWindow,
          });
          count += 1;
          if (count === 51) break;
        }
        if (count === 51) break;
      }
      if (count === 51) break;
    }

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].events).toHaveLength(50);
    vi.runAllTimers();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].events).toHaveLength(1);
  });

  it('retries transient failures with the same UUIDs and records accepted delivery', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce('retryable')
      .mockResolvedValueOnce('accepted');
    const tracker = createActivityTracker({ send, createId, retryDelayMs: 10 });
    tracker.setSession('user-1');
    tracker.trackPage('home');

    await vi.advanceTimersByTimeAsync(250);
    const firstBatch = send.mock.calls[0][0];
    await vi.advanceTimersByTimeAsync(10);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toEqual(firstBatch);
    expect(tracker.getDeliveryStats()).toEqual({
      accepted: 1,
      rejected: 0,
      retried: 1,
      dropped: 0,
      pending: 0,
    });
  });

  it('stops after the attempt cap and accounts for dropped events', async () => {
    const send = vi.fn().mockResolvedValue('retryable');
    const tracker = createActivityTracker({
      send,
      createId,
      retryDelayMs: 10,
      maxDeliveryAttempts: 2,
    });
    tracker.setSession('user-1');
    tracker.trackPage('home');

    await vi.advanceTimersByTimeAsync(260);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
    expect(tracker.getDeliveryStats()).toEqual({
      accepted: 0,
      rejected: 0,
      retried: 1,
      dropped: 1,
      pending: 0,
    });
  });

  it('bounds the buffer and counts permanent rejection separately', async () => {
    const send = vi.fn().mockResolvedValue('rejected');
    const tracker = createActivityTracker({ send, createId, maxBufferedEvents: 2 });
    tracker.setSession('user-1');
    tracker.trackPage('home');
    tracker.trackPage('map');
    tracker.trackPage('curve');

    await vi.advanceTimersByTimeAsync(250);

    expect(send.mock.calls[0][0].events).toHaveLength(2);
    expect(tracker.getDeliveryStats()).toEqual({
      accepted: 0,
      rejected: 2,
      retried: 0,
      dropped: 1,
      pending: 0,
    });
  });

  it('drops an aged retry without another network attempt', async () => {
    let now = 0;
    const send = vi.fn().mockResolvedValue('retryable');
    const tracker = createActivityTracker({
      send,
      createId,
      retryDelayMs: 10,
      maxEventAgeMs: 5,
      now: () => now,
    });
    tracker.setSession('user-1');
    tracker.trackPage('home');

    await vi.advanceTimersByTimeAsync(250);
    now = 6;
    await vi.advanceTimersByTimeAsync(10);

    expect(send).toHaveBeenCalledTimes(1);
    expect(tracker.getDeliveryStats().dropped).toBe(1);
    expect(tracker.getDeliveryStats().pending).toBe(0);
  });

  it('maps authenticated routes to the fixed page registry without retaining URL values', () => {
    expect(activityPageFromPath('/app/home')).toBe('home');
    expect(activityPageFromPath('/app/home?search=private')).toBeNull();
    expect(activityPageFromPath('/app/m/bio-methanol/singapore/spot')).toBe('marketplace');
    expect(activityPageFromPath('/app/admin/users')).toBe('admin');
    expect(activityPageFromPath('/app')).toBeNull();
    expect(activityPageFromPath('/en/privacy')).toBeNull();
    expect(activityPageFromPath('/app/unknown')).toBeNull();
  });
});
