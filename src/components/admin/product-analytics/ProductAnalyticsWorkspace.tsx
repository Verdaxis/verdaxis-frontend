import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  filtersToQuery,
  useProductAnalyticsFilters,
} from '../../../hooks/useProductAnalyticsFilters';
import { api, isAbortError } from '../../../services/api';
import {
  AcquisitionResponse,
  ActivationResponse,
  AnalyticsTab,
  EngagementResponse,
  MarketplaceResponse,
  OverviewResponse,
  ReliabilityResponse,
  RetentionResponse,
} from '../../../types/productAnalytics';
import { AnalyticsFilterRail } from './AnalyticsFilterRail';
import { AnalyticsTabRail } from './AnalyticsTabRail';
import { TabError, TabLoading } from './AnalyticsStates';

interface TabDataMap {
  overview: OverviewResponse;
  acquisition: AcquisitionResponse;
  activation: ActivationResponse;
  engagement: EngagementResponse;
  marketplace: MarketplaceResponse;
  retention: RetentionResponse;
  reliability: ReliabilityResponse;
}

type PanelProps<K extends AnalyticsTab> = {
  data: TabDataMap[K];
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
};

const PANELS: { [K in AnalyticsTab]: React.LazyExoticComponent<React.ComponentType<PanelProps<K>>> } = {
  overview: lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab }))),
  acquisition: lazy(() => import('./AcquisitionTab').then(m => ({ default: m.AcquisitionTab }))),
  activation: lazy(() => import('./ActivationTab').then(m => ({ default: m.ActivationTab }))),
  engagement: lazy(() => import('./EngagementTab').then(m => ({ default: m.EngagementTab }))),
  marketplace: lazy(() => import('./MarketplaceTab').then(m => ({ default: m.MarketplaceTab }))),
  retention: lazy(() => import('./RetentionTab').then(m => ({ default: m.RetentionTab }))),
  reliability: lazy(() => import('./ReliabilityTab').then(m => ({ default: m.ReliabilityTab }))),
};

// Warm-up order after the active tab resolves: behavioral tabs first — their
// first Umami fan-out per cache window is the multi-second cold path the
// runbook documents; authoritative-only tabs are cheap either way.
const WARMUP_ORDER: readonly AnalyticsTab[] = [
  'overview', 'acquisition', 'engagement', 'reliability',
  'activation', 'marketplace', 'retention',
];

// Session-cache freshness matches the backend's authoritative cache bound
// (plan §2.6: mutations may be hidden for at most 60s).
const FRESH_MS = 60_000;
const MAX_CACHE_ENTRIES = 24;

interface TabState {
  status: 'loading' | 'ready' | 'error';
  data?: unknown;
  message?: string;
  fetchedAt?: number;
}

export const ProductAnalyticsWorkspace: React.FC = () => {
  const { t } = useTranslation('admin');
  const { filters, update } = useProductAnalyticsFilters();
  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const requestKey = `${filters.tab}|${JSON.stringify(query)}`;
  const [states, setStates] = useState<Record<string, TabState>>({});
  const statesRef = useRef(states);
  const [attempt, setAttempt] = useState(0);

  const commit = useCallback((key: string, activeKey: string, state: TabState) => {
    setStates(previous => {
      const next = { ...previous, [key]: state };
      // Bound the session cache; never evict the tab on screen.
      const evictable = Object.keys(next).filter(k => k !== key && k !== activeKey);
      while (Object.keys(next).length > MAX_CACHE_ENTRIES && evictable.length > 0) {
        delete next[evictable.shift() as string];
      }
      statesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    // Fetch the active tab first (initial page load stays a single request,
    // §2.6); an aborted stale request neither renders an error nor
    // overwrites current data. Once the active tab is on screen — served
    // fresh from the session cache or newly fetched — the remaining tabs are
    // prefetched strictly one at a time to warm the server-side behavioral
    // cache, so switching tabs skips the documented Umami cold start.
    const controller = new AbortController();

    const warmRemaining = async () => {
      for (const tab of WARMUP_ORDER) {
        if (tab === filters.tab) continue;
        const tabQuery = filtersToQuery({ ...filters, tab });
        const key = `${tab}|${JSON.stringify(tabQuery)}`;
        const cached = statesRef.current[key];
        if (cached?.status === 'ready' && Date.now() - (cached.fetchedAt ?? 0) < FRESH_MS) {
          continue;
        }
        try {
          const data = await api.productAnalytics[tab](tabQuery, controller.signal);
          commit(key, requestKey, { status: 'ready', data, fetchedAt: Date.now() });
        } catch (error: unknown) {
          if (isAbortError(error)) return;
          // A warm-up failure stays silent; the tab fetches for real when
          // opened and shows its scoped error state there.
        }
      }
    };

    const cached = statesRef.current[requestKey];
    if (cached?.status === 'ready' && Date.now() - (cached.fetchedAt ?? 0) < FRESH_MS) {
      void warmRemaining();
      return () => controller.abort();
    }

    commit(requestKey, requestKey, { status: 'loading' });
    api.productAnalytics[filters.tab](query, controller.signal)
      .then(data => {
        commit(requestKey, requestKey, { status: 'ready', data, fetchedAt: Date.now() });
        void warmRemaining();
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.error(`[product-analytics] ${requestKey}`, error);
        commit(requestKey, requestKey, {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, attempt]);

  const onSelectTab = useCallback(
    (tab: AnalyticsTab) => update({ tab }),
    [update],
  );

  const state = states[requestKey] ?? { status: 'loading' as const };
  const Panel = PANELS[filters.tab];

  return (
    <section className="space-y-4" data-testid="product-analytics-workspace">
      <AnalyticsTabRail active={filters.tab} onSelect={onSelectTab} />
      <AnalyticsFilterRail filters={filters} onChange={update} />
      <div
        role="tabpanel"
        id={`pa-panel-${filters.tab}`}
        aria-labelledby={`pa-tab-${filters.tab}`}
      >
        {state.status === 'loading' && <TabLoading />}
        {state.status === 'error' && (
          <TabError
            message={state.message ?? t('pa.state.genericError')}
            onRetry={() => setAttempt(previous => previous + 1)}
          />
        )}
        {state.status === 'ready' && (
          <Suspense fallback={<TabLoading />}>
            {/* One deliberate cast: state.data was produced by this tab's own
                typed fetcher, but TS cannot correlate the union member here. */}
            <Panel data={state.data as never} compare={filters.compare} onSelectTab={onSelectTab} />
          </Suspense>
        )}
      </div>
    </section>
  );
};
