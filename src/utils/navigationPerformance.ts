import { NavigationDestination, reliability } from '../services/analytics';
import { Page, ViewMode } from '../types';

const MAX_METRICS = 40;
const NAVIGATION_EVENT_NAME = 'verdaxis:dashboard-navigation';

// Canonical destination registry (Product Analytics plan §2.5). Legacy pages
// without their own view report nothing.
const PAGE_DESTINATIONS: Partial<Record<Page, NavigationDestination>> = {
  DASHBOARD: 'home',
  MAP: 'map',
  MARKETPLACE: 'marketplace',
  FORWARD_CURVE: 'curve',
  WATCHLISTS: 'watchlist',
  ANALYTICS: 'analytics',
  DATA_ANALYTICS: 'analytics',
  TRADES: 'trades',
  QUOTES: 'quotes',
  COMPLIANCE: 'compliance',
  TRAINING: 'training',
  SETTINGS: 'settings',
  ADMIN: 'admin',
};

// Route commit and usable content are different milestones. Only a page that
// has rendered its required data completes the navigation measurement.
export interface DashboardNavigationMetric {
  id: number;
  fromPage: Page;
  toPage: Page;
  viewMode: ViewMode;
  durationMs: number;
  startedAt: number;
  completedAt: number;
  shellDurationMs?: number;
}

interface ActiveNavigation {
  id: number;
  fromPage: Page;
  toPage: Page;
  viewMode: ViewMode;
  startedAt: number;
  shellDurationMs?: number;
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
  // A click handler starts the clock before navigation. The layout's route
  // observer is a fallback for history/direct navigation, not a second start.
  if (activeNavigation?.fromPage === fromPage
      && activeNavigation.toPage === toPage
      && activeNavigation.viewMode === viewMode) return activeNavigation.id;

  const id = ++navigationSequence;
  const startedAt = getNow();
  activeNavigation = { id, fromPage, toPage, viewMode, startedAt };
  mark(`verdaxis:dashboard-navigation:${id}:start`);
  return id;
};

export const recordDashboardRouteCommit = (page: Page, viewMode: ViewMode): void => {
  if (activeNavigation?.toPage !== page || activeNavigation.viewMode !== viewMode) return;
  activeNavigation.shellDurationMs ??= Math.max(0, getNow() - activeNavigation.startedAt);
};

export const cancelDashboardNavigation = (): void => {
  activeNavigation = null;
};

export const recordDashboardContentReady = (
  readyPage: Page,
  viewMode?: ViewMode,
): DashboardNavigationMetric | null => {
  if (!activeNavigation) return null;
  if (activeNavigation.toPage !== readyPage) return null;
  if (viewMode !== undefined && activeNavigation.viewMode !== viewMode) return null;

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

  const destination = PAGE_DESTINATIONS[metric.toPage];
  if (destination) {
    // Stable 10% per-session sample of successful navigations; the bucketed
    // latency is the only measurement that leaves the browser.
    reliability.reportNavigationPerformance(destination, metric.viewMode, metric.durationMs);
  }

  activeNavigation = null;
  return metric;
};

export const getDashboardNavigationEventName = () => NAVIGATION_EVENT_NAME;
