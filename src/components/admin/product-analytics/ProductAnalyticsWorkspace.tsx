import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  filtersToQuery,
  useProductAnalyticsFilters,
} from '../../../hooks/useProductAnalyticsFilters';
import { api, isAbortError } from '../../../services/api';
import { AnalyticsTab } from '../../../types/productAnalytics';
import { AnalyticsFilterRail } from './AnalyticsFilterRail';
import { AnalyticsTabRail } from './AnalyticsTabRail';
import { TabError, TabLoading } from './AnalyticsStates';

const PANELS: Record<AnalyticsTab, React.LazyExoticComponent<React.ComponentType<{ data: never; compare: boolean; onSelectTab: (tab: AnalyticsTab) => void }>>> = {
  overview: lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab }))),
  acquisition: lazy(() => import('./AcquisitionTab').then(m => ({ default: m.AcquisitionTab }))),
  activation: lazy(() => import('./ActivationTab').then(m => ({ default: m.ActivationTab }))),
  engagement: lazy(() => import('./EngagementTab').then(m => ({ default: m.EngagementTab }))),
  marketplace: lazy(() => import('./MarketplaceTab').then(m => ({ default: m.MarketplaceTab }))),
  retention: lazy(() => import('./RetentionTab').then(m => ({ default: m.RetentionTab }))),
  reliability: lazy(() => import('./ReliabilityTab').then(m => ({ default: m.ReliabilityTab }))),
} as never;

interface TabState {
  status: 'loading' | 'ready' | 'error';
  data?: unknown;
  message?: string;
}

export const ProductAnalyticsWorkspace: React.FC = () => {
  const { t } = useTranslation('admin');
  const { filters, update } = useProductAnalyticsFilters();
  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const requestKey = `${filters.tab}|${JSON.stringify(query)}`;
  const [states, setStates] = useState<Record<string, TabState>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Fetch only the active tab (§2.6: no hidden-tab waterfall); an aborted
    // stale request neither renders an error nor overwrites current data.
    const controller = new AbortController();
    setStates(previous => ({ ...previous, [requestKey]: { status: 'loading' } }));
    api.productAnalytics[filters.tab](query, controller.signal)
      .then(data =>
        setStates(previous => ({ ...previous, [requestKey]: { status: 'ready', data } })),
      )
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setStates(previous => ({
          ...previous,
          [requestKey]: {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          },
        }));
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
            <Panel data={state.data as never} compare={filters.compare} onSelectTab={onSelectTab} />
          </Suspense>
        )}
      </div>
    </section>
  );
};
