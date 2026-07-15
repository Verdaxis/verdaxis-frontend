// Shared typed fixtures for product analytics component tests.
import {
  AnalyticsMeta,
  MarketActivitySection,
  MarketplaceResponse,
  MetricValue,
  OverviewResponse,
  RetentionResponse,
} from '../types/productAnalytics';

export const paMeta = (overrides: Partial<AnalyticsMeta> = {}): AnalyticsMeta => ({
  start: '2026-06-01T00:00:00Z',
  end: '2026-07-01T00:00:00Z',
  previous_start: '2026-05-02T00:00:00Z',
  previous_end: '2026-06-01T00:00:00Z',
  observed_at: '2026-07-15T00:00:00Z',
  coverage: {
    authoritative: { coverage_start: null, coverage_end: null, observed_at: '2026-07-15T00:00:00Z', status: 'available', diagnostic: null },
    behavioral: { coverage_start: null, coverage_end: null, observed_at: '2026-07-15T00:00:00Z', status: 'available', diagnostic: null },
    login_history: { coverage_start: '2026-05-20T00:00:00Z', coverage_end: null, observed_at: null, status: 'partial', diagnostic: 'insufficient_coverage' },
    status_history: { coverage_start: '2026-05-01T00:00:00Z', coverage_end: null, observed_at: null, status: 'available', diagnostic: null },
    reference: { coverage_start: null, coverage_end: null, observed_at: null, status: 'not_applicable', diagnostic: null },
  },
  data_quality: {
    legacy_timestamp_fallback_count: 1,
    missing_paid_at_count: 1,
    missing_commission_payment_date_count: 1,
    suppressed_cell_count: 4,
    cohort_complete: true,
  },
  ...overrides,
});

const metric = (value: number | null, previous: number | null = null, suppressed = false): MetricValue =>
  ({ value, previous, suppressed });

export const paOverview = (): OverviewResponse => ({
  meta: paMeta(),
  kpis: {
    qualified_organizations: metric(3, 3),
    active_members: metric(3, null),
    participating_organizations: metric(3, 1),
    live_orders: metric(7, 1),
    confirmed_trades: metric(4, 1),
  },
  lifecycle: [
    { key: 'visitors', count: 120, previous: 90, coverage: 'available', detail_tab: 'acquisition' },
    { key: 'registered', count: 2, previous: 2, coverage: 'available', detail_tab: 'activation' },
    { key: 'active', count: 3, previous: null, coverage: 'partial', detail_tab: 'engagement' },
    { key: 'participating', count: 3, previous: 1, coverage: 'available', detail_tab: 'marketplace' },
    { key: 'trading', count: 2, previous: 2, coverage: 'available', detail_tab: 'marketplace' },
    { key: 'retained', count: 2, previous: 0, coverage: 'available', detail_tab: 'retention' },
  ],
  activity_trend: {
    visitors: [{ date: '2026-06-10', value: 30 }],
    active_members: [{ date: '2026-06-10', value: 1 }],
    orders: [{ date: '2026-06-10', value: 2 }],
    confirmed_trades: [{ date: '2026-06-10', value: 1 }],
  },
  marketplace_balance: {
    buyer_organizations: metric(null, null, true),
    supplier_organizations: metric(null, null, true),
    bid_orders: metric(4),
    ask_orders: metric(3),
  },
  needs_attention: [
    { rule: 'approved_members_never_logged_in', count: 2 },
    { rule: 'degraded_analytics_collection', count: null },
  ],
});

export const paMarketSection = (): MarketActivitySection => ({
  kpis: {
    participating_organizations: metric(3, 1),
    open_bids: metric(4),
    open_asks: metric(3),
    confirmed_trades: metric(4, 1),
    confirmed_volume_mt: { value: '850.00', previous: '290.00', suppressed: false },
    execution_rate: { numerator: 3, denominator: 7, rate_pct: '42.86', suppressed: false, cohort_complete: false },
  },
  liquidity: {
    two_sided_slices: 1,
    one_sided_slices: 1,
    crossed_slices: 0,
    median_spread_usd_per_mt: '20.00',
    median_spread_bps: '253.16',
    median_open_order_age_hours: '552.0',
    median_hours_to_first_fill: '69.0',
    slices: [
      {
        product_key: 'BIO_METHANOL', product_label: 'Bio Methanol',
        delivery_point_key: 'singapore', delivery_point_label: 'Singapore',
        availability_window: 'SPOT', availability_window_label: 'Spot',
        contributing_organizations: 3,
        best_bid_usd_per_mt: '780.00', best_ask_usd_per_mt: '800.00',
        spread_usd_per_mt: '20.00', spread_bps: '253.16',
        best_bid_depth_mt: '500.00', best_ask_depth_mt: '1000.00',
        one_percent_bid_depth_mt: '700.00', one_percent_ask_depth_mt: '1000.00',
        crossed: false, suppressed: false,
      },
      {
        product_key: 'BIO_METHANOL', product_label: 'Bio Methanol',
        delivery_point_key: 'rotterdam', delivery_point_label: 'Rotterdam',
        availability_window: 'SPOT', availability_window_label: 'Spot',
        contributing_organizations: null,
        best_bid_usd_per_mt: null, best_ask_usd_per_mt: null,
        spread_usd_per_mt: null, spread_bps: null,
        best_bid_depth_mt: null, best_ask_depth_mt: null,
        one_percent_bid_depth_mt: null, one_percent_ask_depth_mt: null,
        crossed: null, suppressed: true,
      },
    ],
  },
  balance_trend: {
    buyer_organizations: [{ date: '2026-06-10', value: 1 }],
    supplier_organizations: [{ date: '2026-06-10', value: 1 }],
    bids: [{ date: '2026-06-10', value: 2 }],
    asks: [{ date: '2026-06-10', value: 1 }],
  },
  product_port_matrix: [
    {
      product_key: 'BIO_METHANOL', product_label: 'Bio Methanol',
      delivery_point_key: 'singapore', delivery_point_label: 'Singapore',
      orders: { key: 'orders', count: 6, suppressed: false },
      organizations: { key: 'organizations', count: 3, suppressed: false },
    },
    {
      product_key: 'BIO_METHANOL', product_label: 'Bio Methanol',
      delivery_point_key: 'rotterdam', delivery_point_label: 'Rotterdam',
      orders: { key: 'orders', count: null, suppressed: true },
      organizations: { key: 'organizations', count: null, suppressed: true },
    },
  ],
  window_distribution: [
    { key: 'SPOT', label: 'Spot', count: 7, share_pct: '100.00', suppressed: false },
  ],
  order_status_distribution: [
    { key: 'OPEN', count: 3, suppressed: false },
    { key: 'FILLED', count: null, suppressed: true },
  ],
  trade_status_distribution: [{ key: 'PAID', count: null, suppressed: true }],
  concentration: { hhi_band: 'high', suppressed: false },
});

export const paMarketplace = (): MarketplaceResponse => ({
  meta: paMeta(),
  live: paMarketSection(),
  demo: {
    ...paMarketSection(),
    kpis: {
      ...paMarketSection().kpis,
      open_bids: metric(1),
      confirmed_trades: metric(1),
    },
  },
  unknown: null,
  reference: {
    rows: [
      {
        product_key: 'BIO_METHANOL', product_label: 'Bio Methanol',
        delivery_point_key: 'singapore', delivery_point_label: 'Singapore',
        availability_window: 'SPOT', availability_window_label: 'Spot',
        benchmark_price_usd_per_mt: '1080.00', source_label: 'SEED_MATRIX',
        generated_at: '2026-07-15T00:00:00Z', observed_at: null,
        source_kind: 'SEEDED_BENCHMARK', scope: 'WINDOW_ADJUSTED', coverage_status: 'stale',
      },
    ],
  },
  commercial: {
    realized_gmv_usd: { value: '316000.00', previous: '0.00', suppressed: false },
    realized_revenue_usd: { value: '1580.00', previous: '0.00', suppressed: false },
    commission_pending_usd: '1012.50',
    commission_invoiced_usd: '1152.75',
  },
});

export const paRetention = (): RetentionResponse => ({
  meta: paMeta(),
  kpis: {
    returning_members: metric(null),
    retained_organizations: metric(2, 0),
    reactivated_organizations: metric(1, 0),
    dormant_approved_members: metric(2),
  },
  member_cohorts: [
    {
      cohort_start: '2026-05-18',
      size: { key: '2026-05-18', count: null, suppressed: true },
      cells: [
        { offset: 0, cell: { key: '0', count: null, suppressed: true }, pct: null },
        { offset: 3, cell: { key: '3', count: null, suppressed: true }, pct: null },
      ],
    },
  ],
  organization_cohorts: [],
  repeat_participation: [
    { key: '1', count: null, suppressed: true },
    { key: '2', count: 0, suppressed: false },
    { key: '3_plus', count: null, suppressed: true },
  ],
});
