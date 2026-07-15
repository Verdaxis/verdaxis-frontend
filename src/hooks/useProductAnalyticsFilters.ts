import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  AnalyticsActivity,
  AnalyticsAudience,
  AnalyticsTab,
  ProductAnalyticsQueryParams,
} from '../types/productAnalytics';

// URL-addressable workspace state on /app/admin (plan §1.1):
// ?analytics=<tab>&period=<period>[&from&to&compare&audience&activity&product&port&window]
// Unknown values canonicalize to safe defaults with history replace; unrelated
// query parameters are always preserved.

export const ANALYTICS_TABS: readonly AnalyticsTab[] = [
  'overview', 'acquisition', 'activation', 'engagement',
  'marketplace', 'retention', 'reliability',
] as const;

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'custom';

const PERIODS: readonly AnalyticsPeriod[] = ['7d', '30d', '90d', 'custom'] as const;
const AUDIENCES: readonly AnalyticsAudience[] = ['ALL', 'BUYER', 'SUPPLIER'] as const;
const ACTIVITIES: readonly AnalyticsActivity[] = ['LIVE', 'DEMO', 'REFERENCE', 'ALL'] as const;
const AUDIENCE_TABS: readonly AnalyticsTab[] = ['activation', 'engagement', 'retention'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOW_PATTERN = /^(SPOT|\d{4}-(0[1-9]|1[0-2])|\d{4}-Q[1-4]|\d{4}-CAL)$/;

// Cache-friendly rolling windows: the end instant is floored to five-minute
// boundaries so repeated requests share backend cache entries.
const PERIOD_QUANTUM_MS = 5 * 60 * 1000;

export interface ProductAnalyticsFilters {
  tab: AnalyticsTab;
  period: AnalyticsPeriod;
  from: string | null;
  to: string | null;
  compare: boolean;
  audience: AnalyticsAudience;
  activity: AnalyticsActivity;
  productId: string | null;
  deliveryPointId: string | null;
  availabilityWindow: string | null;
}

const OWNED_PARAMS = [
  'analytics', 'period', 'from', 'to', 'compare',
  'audience', 'activity', 'product', 'port', 'window',
] as const;

const oneOf = <T extends string>(values: readonly T[], raw: string | null, fallback: T): T =>
  raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : fallback;

const validDate = (raw: string | null): string | null =>
  raw !== null && DATE_PATTERN.test(raw) && !Number.isNaN(Date.parse(`${raw}T00:00:00Z`))
    ? raw
    : null;

export const parseProductAnalyticsFilters = (
  params: URLSearchParams,
): ProductAnalyticsFilters => {
  const tab = oneOf(ANALYTICS_TABS, params.get('analytics'), 'overview');
  let period = oneOf(PERIODS, params.get('period'), '30d');
  let from = validDate(params.get('from'));
  let to = validDate(params.get('to'));
  if (period === 'custom' && (!from || !to || from >= to)) {
    period = '30d';
    from = null;
    to = null;
  }
  if (period !== 'custom') {
    from = null;
    to = null;
  }

  const audience = AUDIENCE_TABS.includes(tab)
    ? oneOf(AUDIENCES, params.get('audience'), 'ALL')
    : 'ALL';
  const marketplace = tab === 'marketplace';
  const activity = marketplace
    ? oneOf(ACTIVITIES, params.get('activity'), 'LIVE')
    : 'LIVE';
  const productRaw = params.get('product');
  const portRaw = params.get('port');
  const windowRaw = params.get('window');
  return {
    tab,
    period,
    from,
    to,
    compare: params.get('compare') !== '0',
    audience,
    activity,
    productId: marketplace && productRaw && UUID_PATTERN.test(productRaw) ? productRaw : null,
    deliveryPointId: marketplace && portRaw && UUID_PATTERN.test(portRaw) ? portRaw : null,
    availabilityWindow:
      marketplace && windowRaw && WINDOW_PATTERN.test(windowRaw) ? windowRaw : null,
  };
};

export const serializeProductAnalyticsFilters = (
  filters: ProductAnalyticsFilters,
  existing: URLSearchParams,
): URLSearchParams => {
  // Preserve every parameter this workspace does not own.
  const params = new URLSearchParams(existing);
  for (const owned of OWNED_PARAMS) params.delete(owned);

  params.set('analytics', filters.tab);
  if (filters.period !== '30d') params.set('period', filters.period);
  if (filters.period === 'custom' && filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }
  if (!filters.compare) params.set('compare', '0');
  if (filters.audience !== 'ALL') params.set('audience', filters.audience);
  if (filters.activity !== 'LIVE') params.set('activity', filters.activity);
  if (filters.productId) params.set('product', filters.productId);
  if (filters.deliveryPointId) params.set('port', filters.deliveryPointId);
  if (filters.availabilityWindow) params.set('window', filters.availabilityWindow);
  return params;
};

export const filtersToQuery = (
  filters: ProductAnalyticsFilters,
  now: Date = new Date(),
): ProductAnalyticsQueryParams => {
  let start: Date;
  let end: Date;
  if (filters.period === 'custom' && filters.from && filters.to) {
    start = new Date(`${filters.from}T00:00:00Z`);
    // Half-open interval: the "to" date is included by ending at the next
    // UTC midnight.
    end = new Date(new Date(`${filters.to}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000);
  } else {
    const days = filters.period === '7d' ? 7 : filters.period === '90d' ? 90 : 30;
    const quantized = Math.floor(now.getTime() / PERIOD_QUANTUM_MS) * PERIOD_QUANTUM_MS;
    end = new Date(quantized);
    start = new Date(quantized - days * 24 * 60 * 60 * 1000);
  }
  const iso = (value: Date) => value.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return {
    start: iso(start),
    end: iso(end),
    compare: filters.compare,
    audience: filters.audience,
    activity: filters.tab === 'marketplace' ? filters.activity : 'LIVE',
    product_id: filters.tab === 'marketplace' ? filters.productId ?? undefined : undefined,
    delivery_point_id:
      filters.tab === 'marketplace' ? filters.deliveryPointId ?? undefined : undefined,
    availability_window:
      filters.tab === 'marketplace' ? filters.availabilityWindow ?? undefined : undefined,
  };
};

export const useProductAnalyticsFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseProductAnalyticsFilters(searchParams), [searchParams]);

  // Canonicalize invalid or non-canonical URL state with replace so the
  // history stack never accumulates broken entries.
  useEffect(() => {
    const canonical = serializeProductAnalyticsFilters(filters, searchParams);
    if (canonical.toString() !== searchParams.toString()) {
      setSearchParams(canonical, { replace: true });
    }
    // searchParams identity changes with the location; filters derive from it.
  }, [filters, searchParams, setSearchParams]);

  const update = useCallback(
    (changes: Partial<ProductAnalyticsFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        previous => {
          const next = { ...parseProductAnalyticsFilters(previous), ...changes };
          return serializeProductAnalyticsFilters(next, previous);
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  return { filters, update };
};
