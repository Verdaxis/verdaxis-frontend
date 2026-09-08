import { useEffect } from 'react';
import type { Page } from '../types';
import { recordDashboardContentReady } from '../utils/navigationPerformance';

/** Record usable content after React's update has had a chance to paint. */
export function useDashboardContentReady(page: Page, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    let paintFrame: number | undefined;
    const commitFrame = requestAnimationFrame(() => {
      paintFrame = requestAnimationFrame(() => recordDashboardContentReady(page));
    });
    return () => {
      cancelAnimationFrame(commitFrame);
      if (paintFrame !== undefined) cancelAnimationFrame(paintFrame);
    };
  }, [page, ready]);
}
