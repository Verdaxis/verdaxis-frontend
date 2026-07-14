import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAnalytics, normalizeAnalyticsPath } from '../services/analytics';

const UUID = '70c1a9f0-e14e-4fc4-8d77-51a8fc99e4b1';

describe('behavioral analytics adapter', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as Window & { umami?: unknown }).umami;
  });

  it('does not add a tracker script or dispatch when configuration is disabled', () => {
    const analytics = createAnalytics({ host: '', websiteId: '' });

    analytics.initialize();
    analytics.track('login_submitted');

    expect(document.querySelector('script[data-verdaxis-analytics]')).toBeNull();
  });

  it('normalizes page paths without query strings or hashes', () => {
    expect(normalizeAnalyticsPath('/en/pilot?email=person@example.com#form')).toBe('/en/pilot');
    expect(normalizeAnalyticsPath('https://app.verdaxis.exchange/app/marketplace?search=secret')).toBe('/app/marketplace');
  });

  it('preserves Umami base fields when sending a manual pageview', () => {
    const track = vi.fn((payload: unknown) => {
      if (typeof payload === 'function') {
        return payload({ website: UUID, hostname: 'staging.verdaxis.exchange' });
      }
      return undefined;
    });
    (window as Window & { umami?: { track: typeof track } }).umami = { track };
    const analytics = createAnalytics({ host: 'https://analytics.example.com', websiteId: UUID });

    analytics.trackPage('/en/pilot?email=person@example.com#form');

    const payloadFactory = track.mock.calls[0][0] as (base: Record<string, string>) => Record<string, string>;
    expect(payloadFactory({ website: UUID, hostname: 'staging.verdaxis.exchange' })).toEqual({
      website: UUID,
      hostname: 'staging.verdaxis.exchange',
      url: '/en/pilot',
    });
  });

  it('dispatches typed events and drops forbidden or unapproved properties', () => {
    const track = vi.fn();
    (window as Window & { umami?: { track: typeof track } }).umami = { track };
    const analytics = createAnalytics({ host: 'https://analytics.example.com/', websiteId: UUID });

    analytics.track('market_slice_selected', {
      product: 'BIO_METHANOL',
      delivery_point: 'singapore',
      window: 'SPOT',
      email: 'person@example.com',
      price: 680,
    } as never);

    expect(track).toHaveBeenCalledWith('market_slice_selected', {
      product: 'BIO_METHANOL',
      delivery_point: 'singapore',
      window: 'SPOT',
    });
  });

  it('contains tracker failures and never throws into the product flow', () => {
    (window as Window & { umami?: { track: () => never } }).umami = {
      track: () => { throw new Error('collector unavailable'); },
    };
    const analytics = createAnalytics({ host: 'https://analytics.example.com', websiteId: UUID });

    expect(() => analytics.track('login_submitted')).not.toThrow();
    expect(() => analytics.trackPage('/login?email=person@example.com')).not.toThrow();
  });
});
