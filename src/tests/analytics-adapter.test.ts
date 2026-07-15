import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAnalytics,
  createReliabilityReporter,
  navigationLatencyBucket,
  normalizeAnalyticsPath,
  routeFamilyFromPath,
} from '../services/analytics';

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

describe('reliability reporter (plan §2.5)', () => {
  const UUID2 = '70c1a9f0-e14e-4fc4-8d77-51a8fc99e4b1';

  it('classifies route families from paths', () => {
    expect(routeFamilyFromPath('/app/admin')).toBe('admin');
    expect(routeFamilyFromPath('/app/m/bio-methanol/singapore/spot')).toBe('platform');
    expect(routeFamilyFromPath('/login')).toBe('signup');
    expect(routeFamilyFromPath('/register/step-2')).toBe('signup');
    expect(routeFamilyFromPath('/en/pilot')).toBe('landing');
  });

  it('buckets navigation latency into the bounded enum', () => {
    expect(navigationLatencyBucket(0)).toBe('lt250');
    expect(navigationLatencyBucket(249)).toBe('lt250');
    expect(navigationLatencyBucket(250)).toBe('250_500');
    expect(navigationLatencyBucket(499)).toBe('250_500');
    expect(navigationLatencyBucket(500)).toBe('500_1000');
    expect(navigationLatencyBucket(1000)).toBe('1000_2500');
    expect(navigationLatencyBucket(2500)).toBe('gte2500');
    expect(navigationLatencyBucket(60_000)).toBe('gte2500');
  });

  it('deduplicates identical category and route-family pairs for 60 seconds', () => {
    let nowMs = 0;
    const track = vi.fn();
    const reporter = createReliabilityReporter({
      track,
      now: () => nowMs,
      random: () => 0,
      storage: null,
      getPath: () => '/app/marketplace',
    });

    reporter.reportFrontendError('render');
    reporter.reportFrontendError('render'); // duplicate inside the window
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('frontend_error', {
      route_family: 'platform',
      category: 'render',
    });

    reporter.reportFrontendError('chunk'); // different category is distinct
    expect(track).toHaveBeenCalledTimes(2);

    nowMs = 60_000; // window elapsed → same pair reports again
    reporter.reportFrontendError('render');
    expect(track).toHaveBeenCalledTimes(3);
  });

  it('reports backend unavailability per family and never as landing', () => {
    const track = vi.fn();
    const reporter = createReliabilityReporter({
      track,
      now: () => 0,
      storage: null,
      getPath: () => '/en/pilot',
    });

    reporter.reportBackendUnavailable();
    expect(track).toHaveBeenCalledWith('backend_unavailable', { route_family: 'signup' });

    const adminTrack = vi.fn();
    const adminReporter = createReliabilityReporter({
      track: adminTrack,
      now: () => 0,
      storage: null,
      getPath: () => '/app/admin',
    });
    adminReporter.reportBackendUnavailable();
    adminReporter.reportBackendUnavailable(); // deduplicated
    expect(adminTrack).toHaveBeenCalledTimes(1);
    expect(adminTrack).toHaveBeenCalledWith('backend_unavailable', { route_family: 'admin' });
  });

  it('samples navigation performance with one stable per-session decision', () => {
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
    };
    const track = vi.fn();
    const random = vi.fn(() => 0.05); // < 0.1 → sampled in
    const reporter = createReliabilityReporter({
      track,
      now: () => 0,
      random,
      storage,
      getPath: () => '/app',
    });

    reporter.reportNavigationPerformance('marketplace', 'BUYER', 320);
    reporter.reportNavigationPerformance('map', 'SUPPLIER', 30);

    expect(track).toHaveBeenCalledTimes(2);
    expect(track.mock.calls[0]).toEqual([
      'navigation_performance',
      { destination: 'marketplace', view_mode: 'BUYER', latency_bucket: '250_500' },
    ]);
    // Decision made once and persisted for the session.
    expect(random).toHaveBeenCalledTimes(1);
    expect(stored.get('verdaxis:nav-perf-sample')).toBe('1');

    const outTrack = vi.fn();
    const outReporter = createReliabilityReporter({
      track: outTrack,
      now: () => 0,
      random: () => 0.95, // sampled out for the whole session
      storage: null,
      getPath: () => '/app',
    });
    outReporter.reportNavigationPerformance('map', 'BUYER', 10);
    outReporter.reportNavigationPerformance('map', 'BUYER', 10);
    expect(outTrack).not.toHaveBeenCalled();
  });

  it('delivers typed reliability events through the adapter and drops invalid values', () => {
    const track = vi.fn();
    (window as Window & { umami?: { track: typeof track } }).umami = { track };
    const analytics = createAnalytics({ host: 'https://analytics.example.com', websiteId: UUID2 });

    analytics.track('frontend_error', { route_family: 'platform', category: 'render' });
    expect(track).toHaveBeenCalledWith(
      'frontend_error',
      expect.objectContaining({ route_family: 'platform', category: 'render' }),
    );

    track.mockClear();
    analytics.track('frontend_error', {
      route_family: 'https://evil.example/#stack-trace',
      category: 'render',
      stack: 'Error at secretFunction (app.js:1:1)',
    } as never);
    const delivered = track.mock.calls[0]?.[1] as Record<string, string> | undefined;
    expect(delivered?.route_family).toBeUndefined();
    expect(delivered?.stack).toBeUndefined();
    expect(delivered?.category).toBe('render');
  });
});
