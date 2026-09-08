import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDashboardContentReady } from '../hooks/useDashboardContentReady';
import { cancelDashboardNavigation, recordDashboardNavigationStart } from '../utils/navigationPerformance';

vi.mock('../services/analytics', () => ({
  reliability: { reportNavigationPerformance: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  cancelDashboardNavigation();
});

it('waits for ready content to paint and cancels completion if readiness changes', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const paint = () => act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(performance.now()));
  });

  window.__VERDAXIS_NAV_METRICS__ = [];
  recordDashboardNavigationStart('MAP', 'MARKETPLACE', 'BUYER');
  const { rerender, unmount } = renderHook(
    ({ ready }) => useDashboardContentReady('MARKETPLACE', ready),
    { initialProps: { ready: false } },
  );
  expect(frames.size).toBe(0);
  rerender({ ready: true });
  paint();
  expect(window.__VERDAXIS_NAV_METRICS__).toHaveLength(0);
  rerender({ ready: false });
  paint();
  expect(window.__VERDAXIS_NAV_METRICS__).toHaveLength(0);
  rerender({ ready: true });
  paint();
  paint();
  expect(window.__VERDAXIS_NAV_METRICS__).toHaveLength(1);
  unmount();
  expect(frames.size).toBe(0);
});
