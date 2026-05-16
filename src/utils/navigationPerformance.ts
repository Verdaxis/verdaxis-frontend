import { Page, ViewMode } from '../types';

const MAX_METRICS = 40;
const NAVIGATION_EVENT_NAME = 'verdaxis:dashboard-navigation';

// Passive route commit timing. Dogfood scripts layer page-specific usability
// waits on top of this so Map/chart/data initialization is not undercounted.
export interface DashboardNavigationMetric {
  id: number;
  fromPage: Page;
  toPage: Page;
  viewMode: ViewMode;
  durationMs: number;
  startedAt: number;
  completedAt: number;
}

interface ActiveNavigation {
  id: number;
  fromPage: Page;
  toPage: Page;
  viewMode: ViewMode;
  startedAt: number;
}

declare global {
  interface Window {
    __VERDAXIS_NAV_METRICS__?: DashboardNavigationMetric[];
  }
}

let navigationSequence = 0;
let activeNavigation: ActiveNavigation | null = null;

const getNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const mark = (name: string) => {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(name);
    } catch {
      // Performance marks are diagnostic-only; never interrupt navigation.
    }
  }
};

const measure = (name: string, startMark: string, endMark: string) => {
  if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // Some browsers may drop marks under memory pressure.
    }
  }
};

export const recordDashboardNavigationStart = (
  fromPage: Page,
  toPage: Page,
  viewMode: ViewMode,
): number | null => {
  if (fromPage === toPage) return null;

  const id = ++navigationSequence;
  const startedAt = getNow();
  activeNavigation = { id, fromPage, toPage, viewMode, startedAt };
  mark(`verdaxis:dashboard-navigation:${id}:start`);
  return id;
};

export const recordDashboardContentReady = (
  readyPage: Page,
  viewMode: ViewMode,
): DashboardNavigationMetric | null => {
  if (!activeNavigation) return null;
  if (activeNavigation.toPage !== readyPage || activeNavigation.viewMode !== viewMode) return null;

  const completedAt = getNow();
  const metric: DashboardNavigationMetric = {
    ...activeNavigation,
    durationMs: Math.max(0, completedAt - activeNavigation.startedAt),
    completedAt,
  };

  const endMark = `verdaxis:dashboard-navigation:${metric.id}:end`;
  mark(endMark);
  measure(`${NAVIGATION_EVENT_NAME}:${metric.toPage}`, `verdaxis:dashboard-navigation:${metric.id}:start`, endMark);

  if (typeof window !== 'undefined') {
    const metrics = window.__VERDAXIS_NAV_METRICS__ ?? [];
    metrics.push(metric);
    window.__VERDAXIS_NAV_METRICS__ = metrics.slice(-MAX_METRICS);
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT_NAME, { detail: metric }));
  }

  activeNavigation = null;
  return metric;
};

export const getDashboardNavigationEventName = () => NAVIGATION_EVENT_NAME;
