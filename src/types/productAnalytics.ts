// Product Analytics workspace contracts — explicit mirrors of the backend
// response models in be/app/schemas/product_analytics.py. Decimals arrive as
// strings for precision; null means unavailable or suppressed, never zero.

export type AnalyticsTab =
  | 'overview' | 'acquisition' | 'activation' | 'engagement'
  | 'marketplace' | 'retention' | 'reliability';

export type AnalyticsAudience = 'ALL' | 'BUYER' | 'SUPPLIER';
export type AnalyticsActivity = 'LIVE' | 'DEMO' | 'REFERENCE' | 'ALL';

export type AnalyticsSourceStatus = 'available' | 'partial' | 'unavailable' | 'not_applicable';
export type AnalyticsDiagnostic =
  | 'disabled' | 'configuration' | 'authentication' | 'timeout'
  | 'upstream' | 'malformed_response' | 'insufficient_coverage';

export interface AnalyticsSourceCoverage {
  coverage_start: string | null;
  coverage_end: string | null;
  observed_at: string | null;
  status: AnalyticsSourceStatus;
  diagnostic: AnalyticsDiagnostic | null;
}

export interface AnalyticsCoverage {
  authoritative: AnalyticsSourceCoverage;
  behavioral: AnalyticsSourceCoverage;
  login_history: AnalyticsSourceCoverage;
  status_history: AnalyticsSourceCoverage;
  reference: AnalyticsSourceCoverage;
}

export interface AnalyticsDataQuality {
  legacy_timestamp_fallback_count: number;
  missing_paid_at_count: number;
  missing_commission_payment_date_count: number;
  suppressed_cell_count: number;
  cohort_complete: boolean;
}

export interface AnalyticsMeta {
  start: string;
  end: string;
  previous_start: string | null;
  previous_end: string | null;
  observed_at: string;
  coverage: AnalyticsCoverage;
  data_quality: AnalyticsDataQuality;
}

export interface AggregateCell {
  key: string;
  count: number | null;
  suppressed: boolean;
}

export interface MetricValue {
  value: number | null;
  previous: number | null;
  suppressed: boolean;
}

export interface DecimalMetricValue {
  value: string | null;
  previous: string | null;
  suppressed: boolean;
}

export interface RatioValue {
  numerator: number | null;
  denominator: number | null;
  rate_pct: string | null;
  suppressed: boolean;
  cohort_complete: boolean;
}

export interface SeriesPoint {
  date: string;
  value: number | null;
}

export interface RankedRow {
  key: string;
  label: string;
  count: number | null;
  share_pct: string | null;
  suppressed: boolean;
}

// --- Overview ---------------------------------------------------------------

export type LifecycleStageKey =
  | 'visitors' | 'registered' | 'active' | 'participating' | 'trading' | 'retained';

export interface LifecycleStage {
  key: LifecycleStageKey;
  count: number | null;
  previous: number | null;
  coverage: AnalyticsSourceStatus;
  detail_tab: string;
}

export interface ActivityTrend {
  visitors: SeriesPoint[];
  active_members: SeriesPoint[];
  orders: SeriesPoint[];
  confirmed_trades: SeriesPoint[];
}

export interface MarketplaceBalance {
  buyer_organizations: MetricValue;
  supplier_organizations: MetricValue;
  bid_orders: MetricValue;
  ask_orders: MetricValue;
}

export type NeedsAttentionRule =
  | 'approved_members_never_logged_in' | 'signup_submission_drop'
  | 'one_sided_live_market' | 'elevated_login_failures'
  | 'degraded_analytics_collection';

export interface NeedsAttentionItem {
  rule: NeedsAttentionRule;
  count: number | null;
}

export interface OverviewKpis {
  qualified_organizations: MetricValue;
  active_members: MetricValue;
  participating_organizations: MetricValue;
  live_orders: MetricValue;
  confirmed_trades: MetricValue;
}

export interface OverviewResponse {
  meta: AnalyticsMeta;
  kpis: OverviewKpis;
  lifecycle: LifecycleStage[];
  activity_trend: ActivityTrend;
  marketplace_balance: MarketplaceBalance;
  needs_attention: NeedsAttentionItem[];
}

// --- Acquisition ------------------------------------------------------------

export interface AcquisitionKpis {
  visitors: MetricValue;
  visits: MetricValue;
  pageviews: MetricValue;
  average_session_duration_seconds: DecimalMetricValue;
  cta_clicks: MetricValue;
}

export interface CtaMatrixRow {
  cta: string;
  placement: string;
  clicks: number | null;
  share_pct: string | null;
  suppressed: boolean;
}

export interface CalculatorFunnel {
  starts: MetricValue;
  completions: MetricValue;
}

export interface AcquisitionResponse {
  meta: AnalyticsMeta;
  kpis: AcquisitionKpis;
  visitors_trend: SeriesPoint[];
  previous_visitors_trend: SeriesPoint[];
  visits_trend: SeriesPoint[];
  referrers: RankedRow[];
  entry_pages: RankedRow[];
  cta_matrix: CtaMatrixRow[];
  languages: RankedRow[];
  calculator: CalculatorFunnel;
}

// --- Activation ---------------------------------------------------------------

export type JourneySource = 'behavioral' | 'authoritative';
export type ConversionRatioKind = 'user_cohort' | 'organization_cohort' | 'aggregate_event';

export interface JourneyStage {
  key: string;
  source: JourneySource;
  total: AggregateCell;
  buyer: AggregateCell | null;
  supplier: AggregateCell | null;
}

export interface DurationBucket {
  bucket: string;
  cell: AggregateCell;
}

export interface DurationDistribution {
  buckets: DurationBucket[];
  median_hours: string | null;
  sample_size: number | null;
  suppressed: boolean;
}

export interface LabeledRatio {
  key: string;
  kind: ConversionRatioKind;
  ratio: RatioValue;
}

export interface ActivationResponse {
  meta: AnalyticsMeta;
  journey: JourneyStage[];
  time_to_first_login: DurationDistribution;
  time_to_first_live_order: DurationDistribution;
  drop_off: AggregateCell[];
  ratios: LabeledRatio[];
}

// --- Engagement ---------------------------------------------------------------

export interface EngagementKpis {
  dau: MetricValue;
  wau: MetricValue;
  mau: MetricValue;
  stickiness_pct: string | null;
}

export interface FeatureAdoptionRow {
  family: string;
  events: number | null;
  suppressed: boolean;
}

export type NavigationDestinationKey =
  | 'home' | 'map' | 'marketplace' | 'curve' | 'watchlist' | 'analytics'
  | 'trades' | 'quotes' | 'compliance' | 'training' | 'settings' | 'admin';

export interface NavigationDestinationRow {
  destination: NavigationDestinationKey;
  total: AggregateCell;
  buyer: AggregateCell | null;
  supplier: AggregateCell | null;
}

export interface TutorialStepRow {
  step: string;
  completed: AggregateCell;
  skipped: AggregateCell;
}

export interface EngagementResponse {
  meta: AnalyticsMeta;
  kpis: EngagementKpis;
  active_members_trend: SeriesPoint[];
  feature_adoption: FeatureAdoptionRow[];
  workflow_ratios: LabeledRatio[];
  navigation_destinations: NavigationDestinationRow[];
  tutorial_steps: TutorialStepRow[];
}

// --- Marketplace --------------------------------------------------------------

export interface MarketplaceKpis {
  participating_organizations: MetricValue;
  open_bids: MetricValue;
  open_asks: MetricValue;
  confirmed_trades: MetricValue;
  confirmed_volume_mt: DecimalMetricValue;
  execution_rate: RatioValue;
}

export interface SliceLiquidityRow {
  product_key: string;
  product_label: string;
  delivery_point_key: string;
  delivery_point_label: string;
  availability_window: string;
  availability_window_label: string;
  contributing_organizations: number | null;
  best_bid_usd_per_mt: string | null;
  best_ask_usd_per_mt: string | null;
  spread_usd_per_mt: string | null;
  spread_bps: string | null;
  best_bid_depth_mt: string | null;
  best_ask_depth_mt: string | null;
  one_percent_bid_depth_mt: string | null;
  one_percent_ask_depth_mt: string | null;
  crossed: boolean | null;
  suppressed: boolean;
}

export interface LiquiditySummary {
  two_sided_slices: number | null;
  one_sided_slices: number | null;
  crossed_slices: number | null;
  median_spread_usd_per_mt: string | null;
  median_spread_bps: string | null;
  median_open_order_age_hours: string | null;
  median_hours_to_first_fill: string | null;
  slices: SliceLiquidityRow[];
}

export interface MarketBalanceTrend {
  buyer_organizations: SeriesPoint[];
  supplier_organizations: SeriesPoint[];
  bids: SeriesPoint[];
  asks: SeriesPoint[];
}

export interface ProductPortCell {
  product_key: string;
  product_label: string;
  delivery_point_key: string;
  delivery_point_label: string;
  orders: AggregateCell;
  organizations: AggregateCell;
}

export interface OrganizationConcentration {
  hhi_band: 'low' | 'moderate' | 'high' | null;
  suppressed: boolean;
}

export interface CommercialSummary {
  realized_gmv_usd: DecimalMetricValue;
  realized_revenue_usd: DecimalMetricValue;
  commission_pending_usd: string | null;
  commission_invoiced_usd: string | null;
}

export interface MarketActivitySection {
  kpis: MarketplaceKpis;
  liquidity: LiquiditySummary;
  balance_trend: MarketBalanceTrend;
  product_port_matrix: ProductPortCell[];
  window_distribution: RankedRow[];
  order_status_distribution: AggregateCell[];
  trade_status_distribution: AggregateCell[];
  concentration: OrganizationConcentration;
}

export type ReferenceCoverageStatus = 'current' | 'stale' | 'unavailable';

export interface ReferenceCoverageRow {
  product_key: string;
  product_label: string;
  delivery_point_key: string;
  delivery_point_label: string;
  availability_window: string;
  availability_window_label: string;
  benchmark_price_usd_per_mt: string | null;
  source_label: 'MANUAL_OVERRIDE' | 'SEED_MATRIX' | 'OTHER';
  generated_at: string;
  observed_at: string | null;
  source_kind: 'ADMIN_BENCHMARK' | 'SEEDED_BENCHMARK' | 'TRADE_DERIVED_VWAP' | 'OTHER';
  scope: 'EXACT_SLICE' | 'WINDOW_ADJUSTED' | 'OTHER';
  coverage_status: ReferenceCoverageStatus;
}

export interface ReferenceCoverageSection {
  rows: ReferenceCoverageRow[];
}

export interface MarketplaceResponse {
  meta: AnalyticsMeta;
  live: MarketActivitySection | null;
  demo: MarketActivitySection | null;
  unknown: MarketActivitySection | null;
  reference: ReferenceCoverageSection | null;
  commercial: CommercialSummary | null;
}

// --- Retention ----------------------------------------------------------------

export interface CohortCell {
  offset: number;
  cell: AggregateCell;
  pct: string | null;
}

export interface CohortRow {
  cohort_start: string;
  size: AggregateCell;
  cells: CohortCell[];
}

export interface RetentionKpis {
  returning_members: MetricValue;
  retained_organizations: MetricValue;
  reactivated_organizations: MetricValue;
  dormant_approved_members: MetricValue;
}

export interface RetentionResponse {
  meta: AnalyticsMeta;
  kpis: RetentionKpis;
  member_cohorts: CohortRow[];
  organization_cohorts: CohortRow[];
  repeat_participation: AggregateCell[];
}

// --- Reliability ----------------------------------------------------------------

export interface CollectorState {
  status: AnalyticsSourceStatus;
  diagnostic: AnalyticsDiagnostic | null;
  last_observation_at: string | null;
}

export interface LoginFailurePanel {
  total: MetricValue;
  categories: AggregateCell[];
  trend: SeriesPoint[];
}

export interface FrontendErrorPanel {
  total: MetricValue;
  by_route_family: AggregateCell[];
  by_category: AggregateCell[];
}

export interface BackendUnavailablePanel {
  total: MetricValue;
  by_route_family: AggregateCell[];
}

export interface NavigationLatencyRow {
  destination: NavigationDestinationKey | 'all';
  buckets: AggregateCell[];
}

export interface AuditActivityRow {
  occurred_at: string;
  action: string;
  resource_type: string | null;
  actor_role: string | null;
}

export interface ReliabilityResponse {
  meta: AnalyticsMeta;
  collector: CollectorState;
  login_failures: LoginFailurePanel;
  frontend_errors: FrontendErrorPanel;
  backend_unavailable: BackendUnavailablePanel;
  navigation_latency: NavigationLatencyRow[];
  audit_activity: AuditActivityRow[];
}

// --- Query --------------------------------------------------------------------

export interface ProductAnalyticsQueryParams {
  start: string;                    // ISO instant, Z suffix
  end: string;                      // ISO instant, Z suffix (exclusive)
  compare?: boolean;
  audience?: AnalyticsAudience;
  activity?: AnalyticsActivity;
  product_id?: string;
  delivery_point_id?: string;
  availability_window?: string;
}
