import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getDashboardNavigationEventName,
  recordDashboardContentReady,
  recordDashboardNavigationStart,
} from '../utils/navigationPerformance';

describe('dashboard navigation performance metrics', () => {
  beforeEach(() => {
    window.__VERDAXIS_NAV_METRICS__ = [];
    performance.clearMarks();
    performance.clearMeasures();
  });

  it('records a bounded browser-visible metric when the requested dashboard page commits', () => {
    const listener = vi.fn();
    window.addEventListener(getDashboardNavigationEventName(), listener);

    const id = recordDashboardNavigationStart('MAP', 'MARKETPLACE', 'BUYER');
    const metric = recordDashboardContentReady('MARKETPLACE', 'BUYER');

    window.removeEventListener(getDashboardNavigationEventName(), listener);

    expect(id).toBeTypeOf('number');
    expect(metric).toMatchObject({
      id,
      fromPage: 'MAP',
      toPage: 'MARKETPLACE',
      viewMode: 'BUYER',
    });
    expect(metric?.durationMs).toBeGreaterThanOrEqual(0);
    expect(window.__VERDAXIS_NAV_METRICS__).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toMatchObject({ toPage: 'MARKETPLACE' });
    expect(performance.getEntriesByName('verdaxis:dashboard-navigation:MARKETPLACE')).toHaveLength(1);
  });

  it('ignores repeated page selections and stale content commits', () => {
    expect(recordDashboardNavigationStart('MAP', 'MAP', 'BUYER')).toBeNull();

    recordDashboardNavigationStart('MAP', 'FORWARD_CURVE', 'BUYER');
    expect(recordDashboardContentReady('MARKETPLACE', 'BUYER')).toBeNull();
    expect(recordDashboardContentReady('FORWARD_CURVE', 'SUPPLIER')).toBeNull();

    const metric = recordDashboardContentReady('FORWARD_CURVE', 'BUYER');
    expect(metric?.toPage).toBe('FORWARD_CURVE');
    expect(window.__VERDAXIS_NAV_METRICS__).toHaveLength(1);
  });
});
