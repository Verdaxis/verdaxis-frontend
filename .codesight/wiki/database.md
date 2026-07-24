# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**unknown** — 206 models

### AIChatRequest

- `message`: string _(required)_
- `history`: object[]

### AcquisitionKpis

- `visitors`: MetricValue _(required)_
- `visits`: MetricValue _(required)_
- `pageviews`: MetricValue _(required)_
- `average_session_duration_seconds`: DecimalMetricValue _(required)_
- `cta_clicks`: MetricValue _(required)_

### AcquisitionResponse

- `meta`: AnalyticsMeta _(required)_
- `kpis`: AcquisitionKpis _(required)_
- `visitors_trend`: SeriesPoint[]
- `previous_visitors_trend`: SeriesPoint[]
- `visits_trend`: SeriesPoint[]
- `referrers`: RankedRow[]
- `entry_pages`: RankedRow[]
- `cta_matrix`: CtaMatrixRow[]
- `languages`: RankedRow[]
- `calculator`: CalculatorFunnel _(required)_

### ActivationResponse

- `meta`: AnalyticsMeta _(required)_
- `journey`: JourneyStage[]
- `time_to_first_login`: DurationDistribution _(required)_
- `time_to_first_live_order`: DurationDistribution _(required)_
- `drop_off`: AggregateCell[]
- `ratios`: LabeledRatio[]

### ActivityTrend

- `visitors`: SeriesPoint[]
- `active_members`: SeriesPoint[]
- `orders`: SeriesPoint[]
- `confirmed_trades`: SeriesPoint[]

### AdminApproveBody

- `external_evidence_reference`: string _(required)_
- `review_note`: string _(required)_

### AdminDecisionBody

- `reason`: unknown

### AdminRejectBody

- `reason`: string _(required)_

### AdminUserEntry

- `id`: string(uuid) _(required, uuid)_
- `email`: string _(required)_
- `first_name`: unknown _(required)_
- `last_name`: unknown _(required)_
- `role`: string _(required)_
- `status`: string _(required)_
- `created_at`: string(date-time) _(required)_
- `org_name`: unknown _(required)_
- `org_type`: unknown _(required)_

### AdminUsersResponse

- `items`: AdminUserEntry[] _(required)_
- `total`: integer _(required)_

### AggregateCell

- `key`: string _(required)_
- `count`: unknown
- `suppressed`: boolean

### AggregatedOrderbookResponse

- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `market_product`: string _(required)_
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window`: string
- `region`: string
- `side`: OrderSide _(required)_
- `min_price`: string _(required)_
- `max_price`: string _(required)_
- `total_quantity`: string _(required)_
- `order_count`: integer _(required)_
- `product_total_order_count`: integer _(required)_
- `evidence_class`: string _(required)_
- `source_kind`: MarketSourceKind _(required)_
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus _(required)_
- `observed_at`: string(date-time) _(required)_

### AlertCreate

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `direction`: string _(required)_
- `threshold_usd`: unknown _(required)_

### AlertResponse

- `id`: string(uuid) _(required, uuid)_
- `org_id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `market_product`: unknown
- `delivery_point_id`: unknown _(required)_
- `direction`: string _(required)_
- `threshold_usd`: string _(required)_
- `is_active`: boolean _(required)_
- `triggered_at`: unknown _(required)_
- `created_at`: string(date-time) _(required)_

### AnalyticsCoverage

- `authoritative`: AnalyticsSourceCoverage _(required)_
- `behavioral`: AnalyticsSourceCoverage _(required)_
- `login_history`: AnalyticsSourceCoverage _(required)_
- `status_history`: AnalyticsSourceCoverage _(required)_
- `reference`: AnalyticsSourceCoverage _(required)_

### AnalyticsDataQuality

- `legacy_timestamp_fallback_count`: integer
- `missing_paid_at_count`: integer
- `missing_commission_payment_date_count`: integer
- `suppressed_cell_count`: integer
- `cohort_complete`: boolean

### AnalyticsMeta

- `start`: string(date-time) _(required)_
- `end`: string(date-time) _(required)_
- `previous_start`: unknown _(required)_
- `previous_end`: unknown _(required)_
- `observed_at`: string(date-time) _(required)_
- `coverage`: AnalyticsCoverage _(required)_
- `data_quality`: AnalyticsDataQuality _(required)_

### AnalyticsSourceCoverage

- `coverage_start`: unknown
- `coverage_end`: unknown
- `observed_at`: unknown
- `status`: AnalyticsSourceStatus _(required)_
- `diagnostic`: unknown

### AssistedListingCancel

- `reason`: string _(required)_

### AssistedListingCreate

- `authorization_id`: string(uuid) _(required, uuid)_
- `acknowledge_executable_standing_order`: boolean _(required)_

### AssistedListingResponse

- `order`: OrderResponse _(required)_
- `accountable_user_id`: string(uuid) _(required, uuid)_
- `created_by_actor_user_id`: string(uuid) _(required, uuid)_
- `creation_method`: OrderCreationMethod _(required)_
- `support_authorization_id`: string(uuid) _(required, uuid)_
- `version`: integer _(required)_
- `etag`: string _(required)_

### AuditActivityRow

- `occurred_at`: string(date-time) _(required)_
- `action`: string _(required)_
- `resource_type`: unknown
- `actor_role`: unknown

### AuditLogResponse

- `id`: string(uuid) _(required, uuid)_
- `user_id`: unknown _(required)_
- `action`: string _(required)_
- `resource_type`: string _(required)_
- `resource_id`: unknown _(required)_
- `changes`: unknown _(required)_
- `ip_address`: unknown _(required)_
- `request_id`: unknown _(required)_
- `timestamp`: string(date-time) _(required)_

### AuthoritativeUsage

- `registrations`: integer _(required)_
- `users_logging_in`: integer _(required)_
- `order_placing_organizations`: integer _(required)_

### AuthorizationCreate

- `accountable_user_id`: string(uuid) _(required, uuid)_
- `order`: OrderCreate-Input _(required)_
- `authorization_expires_at`: string(date-time) _(required)_
- `evidence_reference`: string _(required)_
- `evidence_sha256`: string _(required)_
- `commercial_consent_version`: string _(required)_
- `commercial_consent_reference`: string _(required)_
- `support_case_reference`: unknown

### AuthorizationResponse

- `id`: string(uuid) _(required, uuid)_
- `organization_id`: string(uuid) _(required, uuid)_
- `accountable_user_id`: string(uuid) _(required, uuid)_
- `status`: MarketSupportAuthorizationStatus _(required)_
- `order`: OrderCreate-Output _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `availability_window`: string _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `authorization_expires_at`: string(date-time) _(required)_
- `order_expires_at`: string(date-time) _(required)_
- `terms_digest`: string _(required)_
- `evidence_reference`: string _(required)_
- `evidence_sha256`: string _(required)_
- `commercial_consent_version`: string _(required)_
- `commercial_consent_reference`: string _(required)_
- `support_case_reference`: unknown _(required)_
- `created_by_actor_user_id`: string(uuid) _(required, uuid)_
- `created_at`: string(date-time) _(required)_
- `consumed_at`: unknown _(required)_
- `revoked_at`: unknown _(required)_
- `revoked_by_actor_user_id`: unknown _(required)_
- `revocation_reason`: unknown _(required)_

### AuthorizationRevoke

- `reason`: string _(required)_

### BackendUnavailablePanel

- `total`: MetricValue _(required)_
- `by_route_family`: AggregateCell[]

### BehavioralUsage

- `visitors`: integer _(required)_
- `visits`: integer _(required)_
- `pageviews`: integer _(required)_
- `total_time_seconds`: integer _(required)_
- `average_session_duration_seconds`: number _(required)_
- `event_totals`: object _(required)_
- `event_series`: DailyEventPoint[] _(required)_
- `daily_visitors`: DailyVisitorPoint[] _(required)_
- `top_entries`: MetricEntry[] _(required)_
- `top_referrers`: MetricEntry[] _(required)_

### BenchmarkQuote

- `market_product`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `availability_window`: string _(required)_
- `benchmark_price_per_mt_usd`: string _(required)_
- `source`: string _(required)_
- `generated_at`: string(date-time) _(required)_
- `observed_at`: unknown

### BenchmarkQuoteResponse

- `items`: BenchmarkQuote[] _(required)_
- `generated_at`: string(date-time) _(required)_

### Body_login_api_auth_login_post

- `grant_type`: unknown
- `username`: string _(required)_
- `password`: string(password) _(required)_
- `scope`: string
- `client_id`: unknown
- `client_secret`: undefined(password)

### Body_submit_kyc_api_kyc_submit_post

- `passport`: string _(required)_
- `company_doc`: string _(required)_
- `declared_company_name`: unknown
- `registration_number`: unknown

### CIAdjustedPrice

- `base_price_per_mt`: string _(required)_
- `carbon_intensity_gco2_mj`: string _(required)_
- `fueleu_ghg_intensity`: string _(required)_
- `compliance_cost_per_mt`: string _(required)_
- `effective_price_per_mt`: string _(required)_
- `ghg_reduction_pct`: string _(required)_

### CIIResponse

- `rating`: string _(required)_
- `score`: integer _(required)_

### CalculatorFunnel

- `starts`: MetricValue _(required)_
- `completions`: MetricValue _(required)_

### CapabilityAssignmentCreate

- `user_id`: string(uuid) _(required, uuid)_
- `capability`: MarketSupportCapability _(required)_
- `reason`: string _(required)_
- `expires_at`: unknown

### CapabilityAssignmentResponse

- `id`: string(uuid) _(required, uuid)_
- `user_id`: string(uuid) _(required, uuid)_
- `capability`: MarketSupportCapability _(required)_
- `reason`: string _(required)_
- `granted_by_user_id`: string(uuid) _(required, uuid)_
- `granted_at`: string(date-time) _(required)_
- `expires_at`: unknown _(required)_
- `revoked_at`: unknown _(required)_
- `revoked_by_user_id`: unknown _(required)_
- `revocation_reason`: unknown _(required)_

### CapabilityAssignmentRevoke

- `reason`: string _(required)_

### CohortCell

- `offset`: integer _(required)_
- `cell`: AggregateCell _(required)_
- `pct`: unknown

### CohortRow

- `cohort_start`: string(date) _(required)_
- `size`: AggregateCell _(required)_
- `cells`: CohortCell[]

### CollectorState

- `status`: AnalyticsSourceStatus _(required)_
- `diagnostic`: unknown
- `last_observation_at`: unknown

### CommercialSummary

- `realized_gmv_usd`: DecimalMetricValue _(required)_
- `realized_revenue_usd`: DecimalMetricValue _(required)_
- `commission_pending_usd`: unknown
- `commission_invoiced_usd`: unknown

### CommissionResponse

- `id`: string(uuid) _(required, uuid)_
- `match_id`: string(uuid) _(required, uuid)_
- `amount_usd`: string _(required)_
- `status`: CommissionStatus _(required)_
- `invoice_number`: unknown
- `invoice_date`: unknown
- `payment_date`: unknown
- `created_at`: string(date-time) _(required)_

### CommissionSummary

- `total_pending_usd`: string _(required)_
- `total_invoiced_usd`: string _(required)_
- `total_paid_usd`: string _(required)_
- `pending_count`: integer _(required)_
- `invoiced_count`: integer _(required)_
- `paid_count`: integer _(required)_

### CommissionUpdate

- `status`: unknown
- `invoice_number`: unknown
- `invoice_date`: unknown
- `payment_date`: unknown
- `notes`: unknown

### ComplianceScoreResponse

- `vessel_id`: string _(required)_
- `vessel_name`: string _(required)_
- `overall_score`: integer _(required)_
- `status`: string _(required)_
- `traffic_light`: string _(required)_
- `fueleu`: FuelEUResponse _(required)_
- `eu_ets`: EUETSResponse _(required)_
- `cii`: CIIResponse _(required)_
- `recommendations`: string[] _(required)_

### CtaMatrixRow

- `cta`: string _(required)_
- `placement`: string _(required)_
- `clicks`: unknown
- `share_pct`: unknown
- `suppressed`: boolean

### DailyEventPoint

- `date`: string _(required)_
- `event`: string _(required)_
- `value`: integer _(required)_

### DailyStat

- `date`: string(date) _(required)_
- `orders_placed`: integer _(required)_
- `trades_executed`: integer _(required)_
- `volume_mt`: number _(required)_
- `gmv_usd`: number _(required)_
- `commission_usd`: number _(required)_

### DailyVisitorPoint

- `date`: string _(required)_
- `value`: integer _(required)_

### DecimalMetricValue

- `value`: unknown
- `previous`: unknown
- `suppressed`: boolean

### DeliveryPointResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `region`: string _(required)_
- `timezone`: unknown
- `is_active`: boolean _(required)_

### DemandSignal

- `fuel_type`: string _(required)_
- `region`: string _(required)_
- `market_product_code`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window_code`: unknown
- `volume_mt`: unknown _(required)_
- `max_price_per_mt`: unknown _(required)_
- `urgency`: UrgencyLevel _(required)_
- `bid_count`: integer _(required)_
- `earliest_delivery`: string _(required)_
- `created_at`: string(date-time) _(required)_
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer

### DurationBucket

- `bucket`: string _(required)_
- `cell`: AggregateCell _(required)_

### DurationDistribution

- `buckets`: DurationBucket[]
- `median_hours`: unknown
- `sample_size`: unknown
- `suppressed`: boolean

### EUETSResponse

- `total_co2_tonnes`: string _(required)_
- `ets_price_per_tonne_eur`: string _(required)_
- `phase_in_pct`: string _(required)_
- `estimated_cost_eur`: string _(required)_
- `score`: integer _(required)_

### EngagementKpis

- `dau`: MetricValue _(required)_
- `wau`: MetricValue _(required)_
- `mau`: MetricValue _(required)_
- `stickiness_pct`: unknown

### EngagementResponse

- `meta`: AnalyticsMeta _(required)_
- `kpis`: EngagementKpis _(required)_
- `active_members_trend`: SeriesPoint[]
- `feature_adoption`: FeatureAdoptionRow[]
- `workflow_ratios`: LabeledRatio[]
- `navigation_destinations`: NavigationDestinationRow[]
- `tutorial_steps`: TutorialStepRow[]

### ErrorDetail

- `detail`: string _(required)_

### FeatureAdoptionRow

- `family`: string _(required)_
- `events`: unknown
- `suppressed`: boolean

### FleetComplianceSummary

- `total_vessels`: integer _(required)_
- `green_count`: integer _(required)_
- `amber_count`: integer _(required)_
- `red_count`: integer _(required)_
- `average_score`: number _(required)_
- `vessels`: ComplianceScoreResponse[] _(required)_

### FleetDemandEntry

- `fuel`: string _(required)_
- `ordered_vessels`: integer _(required)_
- `delivered_vessels`: integer _(required)_
- `avg_consumption_mt`: integer _(required)_
- `color`: string _(required)_

### FleetDemandResponse

- `entries`: FleetDemandEntry[] _(required)_
- `last_updated`: string _(required)_
- `sources`: string[] _(required)_

### ForgotPasswordRequest

- `email`: string _(required)_

### ForwardCurveBoardCell

- `product_id`: string(uuid) _(required, uuid)_
- `market_product`: string _(required)_
- `product_name`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `region`: string _(required)_
- `availability_window`: string _(required)_
- `benchmark_mid`: unknown
- `benchmark_source`: unknown
- `is_demo_benchmark`: boolean
- `order_source_kind`: MarketSourceKind
- `benchmark_source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `real_order_count`: integer
- `demo_order_count`: integer
- `unknown_order_count`: integer
- `real_best_bid`: unknown
- `real_best_ask`: unknown
- `demo_best_bid`: unknown
- `demo_best_ask`: unknown
- `best_bid_source_kind`: MarketSourceKind
- `best_ask_source_kind`: MarketSourceKind
- `order_observed_at`: unknown
- `benchmark_observed_at`: unknown
- `indication_summary`: ForwardCurveBoardIndicationSummary
- `fair_price_band`: unknown
- `fair_price_band_provenance`: ForwardCurveSignalProvenance
- `physical_stem_summary`: ForwardCurveBoardPhysicalStemSummary
- `best_bid`: unknown
- `best_ask`: unknown
- `spread`: unknown
- `volume_mt`: string
- `order_count`: integer

### ForwardCurveBoardDepthLevel

- `price_per_mt_usd`: string _(required)_
- `quantity_mt`: string _(required)_
- `order_count`: integer _(required)_
- `source_kind`: MarketSourceKind
- `demo_status`: MarketDemoStatus
- `real_order_count`: integer
- `demo_order_count`: integer
- `unknown_order_count`: integer

### ForwardCurveBoardFairPriceBand

- `low_price_per_mt_usd`: unknown
- `mid_price_per_mt_usd`: unknown
- `high_price_per_mt_usd`: unknown
- `provenance`: ForwardCurveSignalProvenance _(required)_

### ForwardCurveBoardFocus

- `product_id`: string(uuid) _(required, uuid)_
- `market_product`: string _(required)_
- `product_name`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `region`: string _(required)_
- `availability_window`: string _(required)_
- `curve`: ForwardCurveBoardCell[] _(required)_
- `depth_bids`: ForwardCurveBoardDepthLevel[] _(required)_
- `depth_asks`: ForwardCurveBoardDepthLevel[] _(required)_
- `indications`: ForwardCurveBoardIndication[]
- `fair_price_band`: unknown
- `fair_price_band_provenance`: ForwardCurveSignalProvenance
- `physical_stems`: ForwardCurveBoardPhysicalStem[]

### ForwardCurveBoardIndication

- `side`: ForwardCurveIndicationSide _(required)_
- `price_per_mt_usd`: string _(required)_
- `quantity_mt`: unknown
- `provenance`: ForwardCurveSignalProvenance _(required)_

### ForwardCurveBoardIndicationSummary

- `provenance`: ForwardCurveSignalProvenance
- `latest_bid_price_per_mt_usd`: unknown
- `latest_ask_price_per_mt_usd`: unknown
- `latest_mid_price_per_mt_usd`: unknown
- `total_quantity_mt`: unknown
- `indication_count`: integer

### ForwardCurveBoardPhysicalStem

- `quantity_mt`: string _(required)_
- `status`: ForwardCurvePhysicalStemStatus _(required)_
- `stem_start`: unknown
- `stem_end`: unknown
- `provenance`: ForwardCurveSignalProvenance _(required)_

### ForwardCurveBoardPhysicalStemSummary

- `provenance`: ForwardCurveSignalProvenance
- `available_quantity_mt`: unknown
- `tentative_quantity_mt`: unknown
- `stem_count`: integer
- `earliest_stem_start`: unknown
- `latest_stem_end`: unknown

### ForwardCurveBoardPort

- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `region`: string _(required)_
- `cells`: ForwardCurveBoardCell[] _(required)_

### ForwardCurveBoardProduct

- `product_id`: string(uuid) _(required, uuid)_
- `market_product`: string _(required)_
- `product_name`: string _(required)_

### ForwardCurveBoardResponse

- `availability_window`: string _(required)_
- `products`: ForwardCurveBoardProduct[] _(required)_
- `ports`: ForwardCurveBoardPort[] _(required)_
- `focus`: ForwardCurveBoardFocus _(required)_
- `generated_at`: string(date-time) _(required)_

### ForwardCurveLabelPolicy

- `public_label`: string _(required)_
- `tooltip`: unknown
- `allowed_terms`: string[]
- `forbidden_terms`: string[]
- `disclaimer`: unknown

### ForwardCurveLatestSignal

- `market_product`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `availability_window`: string _(required)_
- `primary_value`: unknown
- `primary_signal_type`: MarketSignalType
- `primary_source_kind`: MarketSourceKind
- `public_source_label`: string
- `demo_status`: MarketDemoStatus
- `observed_at`: unknown
- `staleness_status`: ForwardCurveStalenessStatus

### ForwardCurveMarketCell

- `market_product`: string _(required)_
- `product_name`: string _(required)_
- `representative_product_id`: string(uuid) _(required, uuid)_
- `product_count`: integer
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `region`: string _(required)_
- `availability_window`: string _(required)_
- `primary_value`: unknown
- `primary_signal_type`: MarketSignalType
- `primary_source_kind`: MarketSourceKind
- `public_source_label`: string
- `label_policy`: ForwardCurveLabelPolicy
- `staleness_status`: ForwardCurveStalenessStatus
- `is_executable`: boolean
- `is_reference`: boolean
- `demo_status`: MarketDemoStatus
- `scope`: MarketScope
- `observed_at`: unknown
- `generated_at`: string(date-time) _(required)_
- `best_bid`: unknown
- `best_ask`: unknown
- `spread`: unknown
- `volume_mt`: string
- `order_count`: integer
- `real_order_count`: integer
- `demo_order_count`: integer
- `unknown_order_count`: integer
- `real_best_bid`: unknown
- `real_best_ask`: unknown
- `demo_best_bid`: unknown
- `demo_best_ask`: unknown
- `benchmark_mid`: unknown
- `benchmark_source_kind`: MarketSourceKind
- `benchmark_observed_at`: unknown
- `indication_summary`: ForwardCurveBoardIndicationSummary
- `fair_price_band`: unknown
- `fair_price_band_provenance`: ForwardCurveSignalProvenance
- `physical_stem_summary`: ForwardCurveBoardPhysicalStemSummary

### ForwardCurvePoint

- `availability_window`: string _(required)_
- `best_bid`: unknown
- `best_ask`: unknown
- `mid_price`: unknown
- `spread`: unknown
- `volume_mt`: string _(required)_
- `order_count`: integer _(required)_

### ForwardCurveResponse

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `curve`: ForwardCurvePoint[] _(required)_
- `generated_at`: string(date-time) _(required)_

### ForwardCurveSignalProvenance

- `signal_type`: MarketSignalType _(required)_
- `signal_source_kind`: ForwardCurveSignalSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `observed_at`: unknown
- `generated_at`: string(date-time) _(required)_
- `real_count`: integer
- `demo_count`: integer
- `unknown_count`: integer

### ForwardCurveSliceEvidencePoint

- `layer`: ForwardCurveEvidenceLayer _(required)_
- `side`: unknown
- `price_per_mt_usd`: unknown
- `low_price_per_mt_usd`: unknown
- `high_price_per_mt_usd`: unknown
- `quantity_mt`: unknown
- `observed_at`: unknown
- `public_source_label`: string _(required)_
- `source_kind`: MarketSourceKind
- `demo_status`: MarketDemoStatus

### ForwardCurveSliceResponse

- `cell`: ForwardCurveMarketCell _(required)_
- `previous_window`: unknown
- `next_window`: unknown
- `depth_bids`: ForwardCurveBoardDepthLevel[]
- `depth_asks`: ForwardCurveBoardDepthLevel[]
- `trades`: ForwardCurveSliceTrade[]
- `indications`: ForwardCurveBoardIndication[]
- `fair_price_band`: unknown
- `physical_stems`: ForwardCurveBoardPhysicalStem[]
- `evidence_points`: ForwardCurveSliceEvidencePoint[]
- `generated_at`: string(date-time) _(required)_
- `disclaimer`: string

### ForwardCurveSliceTrade

- `price_per_mt_usd`: string _(required)_
- `quantity_mt`: string _(required)_
- `confirmed_at`: string(date-time) _(required)_
- `source_kind`: MarketSourceKind _(required)_
- `demo_status`: MarketDemoStatus _(required)_

### ForwardCurveTableCell

- `primary_value`: unknown
- `primary_signal_type`: MarketSignalType
- `primary_source_kind`: MarketSourceKind
- `public_source_label`: string
- `staleness_status`: ForwardCurveStalenessStatus
- `is_executable`: boolean
- `is_reference`: boolean
- `demo_status`: MarketDemoStatus
- `observed_at`: unknown
- `best_bid`: unknown
- `best_ask`: unknown
- `spread`: unknown
- `volume_mt`: string
- `order_count`: integer
- `real_order_count`: integer
- `demo_order_count`: integer
- `unknown_order_count`: integer

### ForwardCurveTableColumn

- `availability_window`: string _(required)_
- `display_label`: string _(required)_
- `group`: string _(required)_

### ForwardCurveTableResponse

- `columns`: ForwardCurveTableColumn[] _(required)_
- `rows`: ForwardCurveTableRow[] _(required)_
- `latest_signals`: ForwardCurveLatestSignal[]
- `generated_at`: string(date-time) _(required)_
- `disclaimer`: string

### ForwardCurveTableRow

- `row_key`: string _(required)_
- `market_product`: string _(required)_
- `product_name`: string _(required)_
- `representative_product_id`: string(uuid) _(required, uuid)_
- `product_count`: integer
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: string _(required)_
- `region`: string _(required)_
- `cells`: object _(required)_

### FrontendErrorPanel

- `total`: MetricValue _(required)_
- `by_route_family`: AggregateCell[]
- `by_category`: AggregateCell[]

### FuelEUResponse

- `ghg_intensity_gco2_mj`: string _(required)_
- `target_intensity_gco2_mj`: string _(required)_
- `reduction_pct`: string _(required)_
- `compliance_balance_gco2`: string _(required)_
- `estimated_penalty_eur`: string _(required)_
- `score`: integer _(required)_

### FunnelStage

- `name`: string _(required)_
- `value`: integer _(required)_
- `conversion_from_previous_pct`: unknown

### HTTPValidationError

- `detail`: ValidationError[]

### InventoryCreate

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: unknown _(required)_
- `incoming_stock_mt`: unknown
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean
- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown

### InventoryItemUpdate

- `product_name`: unknown
- `current_stock_mt`: unknown
- `incoming_stock_mt`: unknown
- `price_per_mt_usd`: unknown
- `certification_declared`: unknown
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: unknown
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: unknown
- `off_spec_notes`: unknown

### InventoryResponse

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: string _(required)_
- `incoming_stock_mt`: string
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean
- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `id`: string(uuid) _(required, uuid)_
- `supplier_id`: string(uuid) _(required, uuid)_
- `reserved_stock_mt`: string _(required)_
- `updated_at`: string(date-time) _(required)_

### JoinReviewBody

- `review_note`: string _(required)_

### JourneyStage

- `key`: string _(required)_
- `source`: JourneySource _(required)_
- `total`: AggregateCell _(required)_
- `buyer`: unknown
- `supplier`: unknown

### LabeledRatio

- `key`: string _(required)_
- `kind`: ConversionRatioKind _(required)_
- `ratio`: RatioValue _(required)_

### LeaderboardEntry

- `rank`: integer _(required)_
- `user_name`: string _(required)_
- `organization_name`: unknown
- `referral_count`: integer _(required)_

### LifecycleStage

- `key`: LifecycleStageKey _(required)_
- `count`: unknown
- `previous`: unknown
- `coverage`: AnalyticsSourceStatus _(required)_
- `detail_tab`: string _(required)_

### LiquiditySummary

- `two_sided_slices`: unknown
- `one_sided_slices`: unknown
- `crossed_slices`: unknown
- `median_spread_usd_per_mt`: unknown
- `median_spread_bps`: unknown
- `median_open_order_age_hours`: unknown
- `median_hours_to_first_fill`: unknown
- `slices`: SliceLiquidityRow[]

### ListingOverlay

- `penalty_avoided_eur_per_mt`: string _(required)_
- `penalty_avoided_usd_per_mt`: string _(required)_
- `tco2e_avoided_per_mt`: string _(required)_
- `ci_gco2_mj`: string _(required)_
- `ci_basis`: string _(required)_
- `lcv_mj_kg`: string _(required)_
- `lcv_basis`: string _(required)_

### LoginFailurePanel

- `total`: MetricValue _(required)_
- `categories`: AggregateCell[]
- `trend`: SeriesPoint[]

### MarketActivitySection

- `kpis`: MarketplaceKpis _(required)_
- `liquidity`: LiquiditySummary _(required)_
- `balance_trend`: MarketBalanceTrend _(required)_
- `product_port_matrix`: ProductPortCell[]
- `window_distribution`: RankedRow[]
- `order_status_distribution`: AggregateCell[]
- `trade_status_distribution`: AggregateCell[]
- `concentration`: OrganizationConcentration _(required)_

### MarketBalanceTrend

- `buyer_organizations`: SeriesPoint[]
- `supplier_organizations`: SeriesPoint[]
- `bids`: SeriesPoint[]
- `asks`: SeriesPoint[]

### MarketSupportContext

- `organization`: MarketSupportOrganization _(required)_
- `eligible_principals`: MarketSupportPrincipal[] _(required)_
- `authorizations`: AuthorizationResponse[] _(required)_
- `listings`: AssistedListingResponse[] _(required)_

### MarketSupportOrganization

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `domain`: unknown _(required)_
- `type`: string _(required)_

### MarketSupportPrincipal

- `id`: string(uuid) _(required, uuid)_
- `email`: string _(required)_
- `name`: string _(required)_

### MarketplaceBalance

- `buyer_organizations`: MetricValue _(required)_
- `supplier_organizations`: MetricValue _(required)_
- `bid_orders`: MetricValue _(required)_
- `ask_orders`: MetricValue _(required)_

### MarketplaceKpis

- `participating_organizations`: MetricValue _(required)_
- `open_bids`: MetricValue _(required)_
- `open_asks`: MetricValue _(required)_
- `confirmed_trades`: MetricValue _(required)_
- `confirmed_volume_mt`: DecimalMetricValue _(required)_
- `execution_rate`: RatioValue _(required)_

### MarketplaceResponse

- `meta`: AnalyticsMeta _(required)_
- `live`: unknown
- `demo`: unknown
- `unknown`: unknown
- `reference`: unknown
- `commercial`: unknown

### MetricEntry

- `name`: string _(required)_
- `value`: integer _(required)_

### MetricValue

- `value`: unknown
- `previous`: unknown
- `suppressed`: boolean

### NavigationDestinationRow

- `destination`: NavigationDestination _(required)_
- `total`: AggregateCell _(required)_
- `buyer`: unknown
- `supplier`: unknown

### NavigationLatencyRow

- `destination`: unknown _(required)_
- `buckets`: AggregateCell[]

### NeedsAttentionItem

- `rule`: NeedsAttentionRule _(required)_
- `count`: unknown

### NegotiationCounterRequest

- `proposed_price`: unknown _(required)_
- `notes`: unknown

### NegotiationCreateRequest

- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `counterparty_org_id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `availability_window`: string
- `quantity_mt`: unknown _(required)_
- `proposed_price`: unknown _(required)_
- `notes`: unknown
- `expires_in_hours`: integer

### NegotiationListResponse

- `items`: NegotiationResponse[] _(required)_
- `total`: integer _(required)_

### NegotiationResponse

- `id`: string(uuid) _(required, uuid)_
- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `initiator_org_id`: string(uuid) _(required, uuid)_
- `initiator_org_name`: unknown
- `counterparty_org_id`: string(uuid) _(required, uuid)_
- `counterparty_org_name`: unknown
- `initiator_user_id`: unknown
- `counterparty_user_id`: unknown
- `accepted_by_user_id`: unknown
- `initiator_side`: string _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown
- `availability_window`: string
- `product_name`: unknown
- `quantity_mt`: string _(required)_
- `current_price`: string _(required)_
- `status`: string _(required)_
- `last_actor_org_id`: string(uuid) _(required, uuid)_
- `trade_id`: unknown
- `expires_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_
- `updated_at`: string(date-time) _(required)_
- `rounds`: NegotiationRoundResponse[]

### NegotiationRoundResponse

- `id`: string(uuid) _(required, uuid)_
- `round_number`: integer _(required)_
- `proposer_org_id`: string(uuid) _(required, uuid)_
- `proposer_org_name`: unknown
- `proposer_user_id`: unknown
- `proposed_price`: string _(required)_
- `notes`: unknown
- `created_at`: string(date-time) _(required)_

### NotificationResponse

- `id`: string(uuid4) _(required)_
- `type`: string _(required)_
- `title`: string _(required)_
- `message`: string _(required)_
- `data`: unknown _(required)_
- `is_read`: boolean _(required)_
- `created_at`: string(date-time) _(required)_

### OrderCreate-Input

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `port_id`: unknown
- `vessel_id`: unknown
- `quantity_mt`: unknown _(required)_
- `price_per_mt_usd`: unknown _(required)_
- `availability_window`: string
- `certifications`: string[]
- `expires_at`: unknown
- `is_anonymous`: boolean

### OrderCreate-Output

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `port_id`: unknown
- `vessel_id`: unknown
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string
- `certifications`: string[]
- `expires_at`: unknown
- `is_anonymous`: boolean

### OrderMyResponse

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `benchmark_price_per_mt_usd`: unknown
- `premium_discount_per_mt_usd`: unknown
- `benchmark_source`: unknown
- `is_crossed`: boolean
- `is_demo_listing`: boolean
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer
- `organization_id`: string(uuid) _(required, uuid)_
- `vessel_id`: unknown
- `updated_at`: string(date-time) _(required)_
- `trade_count`: integer
- `creation_method`: string
- `version`: integer
- `etag`: unknown

### OrderResponse

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `benchmark_price_per_mt_usd`: unknown
- `premium_discount_per_mt_usd`: unknown
- `benchmark_source`: unknown
- `is_crossed`: boolean
- `is_demo_listing`: boolean
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer

### OrderResponseWithCI

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `id`: string(uuid) _(required, uuid)_
- `side`: OrderSide _(required)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string
- `port_id`: unknown
- `quantity_mt`: string _(required)_
- `remaining_quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]
- `is_verdaxis_verified`: boolean _(required)_
- `tier_label`: TierLabel
- `status`: OrderBookStatus _(required)_
- `expires_at`: unknown
- `created_at`: string(date-time) _(required)_
- `benchmark_price_per_mt_usd`: unknown
- `premium_discount_per_mt_usd`: unknown
- `benchmark_source`: unknown
- `is_crossed`: boolean
- `is_demo_listing`: boolean
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer
- `ci_adjusted_price`: unknown

### OrderUpdate

- `quantity_mt`: unknown
- `price_per_mt_usd`: unknown
- `availability_window`: unknown
- `certifications`: unknown
- `certification_declared`: unknown
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: unknown
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: unknown
- `off_spec_notes`: unknown
- `expires_at`: unknown

### OrganizationConcentration

- `hhi_band`: unknown
- `suppressed`: boolean

### OrganizationCreate

- `name`: string _(required)_
- `type`: OrgType _(required)_
- `tax_id`: unknown
- `country_code`: unknown

### OverlayAssumptions

- `eur_usd_rate`: string _(required)_
- `vlsfo_baseline_gco2_mj`: string _(required)_
- `ghgie_actual_gco2_mj`: string _(required)_
- `fleet_intensity_basis`: string _(required)_
- `fleet_vessel_count`: integer _(required)_
- `penalty_eur_per_tonne`: string _(required)_
- `year`: integer _(required)_
- `year_target`: string _(required)_
- `excluded_factors`: string[] _(required)_

### OverviewKpis

- `qualified_organizations`: MetricValue _(required)_
- `active_members`: MetricValue _(required)_
- `participating_organizations`: MetricValue _(required)_
- `live_orders`: MetricValue _(required)_
- `confirmed_trades`: MetricValue _(required)_

### PaginatedResponse_AssistedListingResponse_

- `items`: AssistedListingResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PaginatedResponse_AuthorizationResponse_

- `items`: AuthorizationResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PaginatedResponse_MarketSupportOrganization_

- `items`: MarketSupportOrganization[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PaginatedResponse_OrderResponse_

- `items`: OrderResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PaginatedResponse_TradeResponse_

- `items`: TradeResponse[] _(required)_
- `total`: integer _(required)_
- `skip`: integer _(required)_
- `limit`: integer _(required)_

### PasswordChangeRequest

- `current_password`: string _(required)_
- `new_password`: string _(required)_

### PinTargetCreate

- `target_type`: string _(required)_
- `order_id`: string(uuid) _(required, uuid)_

### PortFuelAvailability

- `port_id`: string _(required)_
- `port_name`: string _(required)_
- `lat`: number _(required)_
- `lng`: number _(required)_
- `fuel_type`: string _(required)_
- `market_product_code`: string _(required)_
- `total_stock_mt`: unknown _(required)_
- `supplier_count`: integer _(required)_
- `availability_level`: AvailabilityLevel _(required)_
- `avg_price_per_mt`: unknown
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer

### PortIntelligenceBase

- `congestion_level`: unknown
- `methanol_price_avg`: unknown
- `biofuel_price_avg`: unknown
- `captured_at`: string(date-time) _(required)_

### PortResponse

- `id`: string _(required)_
- `name`: string _(required)_
- `country`: string _(required)_
- `location`: unknown
- `timezone`: unknown
- `is_active`: boolean
- `lat`: unknown
- `lng`: unknown
- `intelligence`: unknown

### PriceDiscoveryResponse

- `summaries`: PriceSummary[] _(required)_
- `generated_at`: string(date-time) _(required)_

### PriceSummary

- `product_id`: unknown
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window`: string
- `region`: string
- `last_price`: unknown
- `avg_price_24h`: unknown
- `high_24h`: unknown
- `low_24h`: unknown
- `volume_24h`: string
- `trade_count_24h`: integer
- `price_change_pct`: unknown
- `last_trade_at`: unknown
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `is_reference`: boolean
- `observed_at`: unknown
- `real_trade_count_24h`: integer
- `demo_trade_count_24h`: integer
- `unknown_trade_count_24h`: integer

### PricingOverlayRequest

- `order_ids`: string[] _(required)_
- `year`: integer

### PricingOverlayResponse

- `overlays`: object _(required)_
- `assumptions`: OverlayAssumptions _(required)_

### ProducerProjectResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `fuel_type`: string _(required)_
- `capacity_kt_per_year`: unknown
- `country`: string _(required)_
- `region`: unknown
- `lat`: unknown
- `lng`: unknown
- `cod_date`: unknown
- `cod_year`: unknown
- `status`: string _(required)_
- `data_source`: unknown
- `gena_project_id`: unknown
- `organization_id`: unknown
- `feedstock`: unknown
- `technology`: unknown
- `carbon_intensity_gco2_mj`: unknown
- `notes`: unknown
- `created_at`: string(date-time) _(required)_

### ProductPortCell

- `product_key`: string _(required)_
- `product_label`: string _(required)_
- `delivery_point_key`: string _(required)_
- `delivery_point_label`: string _(required)_
- `orders`: AggregateCell _(required)_
- `organizations`: AggregateCell _(required)_

### ProductResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `market_product`: unknown
- `fuel_type`: string _(required)_
- `fuel_grade`: string _(required)_
- `unit`: string _(required)_
- `min_lot_size`: string _(required)_
- `is_active`: boolean _(required)_

### ProductUsageResponse

- `days`: integer _(required)_
- `period_start`: string(date-time) _(required)_
- `period_end`: string(date-time) _(required)_
- `behavioral_status`: string _(required)_
- `diagnostic`: unknown _(required)_
- `observed_at`: string(date-time) _(required)_
- `behavioral`: BehavioralUsage _(required)_
- `authoritative`: AuthoritativeUsage _(required)_
- `funnel`: FunnelStage[] _(required)_

### RFQCreateRequest

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `quantity_mt`: unknown _(required)_
- `target_price_per_mt`: unknown
- `availability_window`: string
- `notes`: unknown
- `is_anonymous`: boolean
- `expires_in_hours`: integer

### RFQListResponse

- `items`: RFQResponse[] _(required)_
- `total`: integer _(required)_

### RFQQuoteRequest

- `price_per_mt_usd`: unknown _(required)_
- `notes`: unknown

### RFQQuoteResponse

- `id`: string(uuid) _(required, uuid)_
- `seller_org_id`: string(uuid) _(required, uuid)_
- `seller_org_name`: unknown
- `price_per_mt_usd`: string _(required)_
- `notes`: unknown
- `status`: string _(required)_
- `created_at`: string(date-time) _(required)_

### RFQResponse

- `id`: string(uuid) _(required, uuid)_
- `buyer_org_id`: unknown
- `buyer_org_name`: unknown
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `quantity_mt`: string _(required)_
- `target_price_per_mt`: unknown
- `availability_window`: string _(required)_
- `notes`: unknown
- `is_anonymous`: boolean _(required)_
- `status`: string _(required)_
- `expires_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_
- `quote_count`: integer
- `quotes`: RFQQuoteResponse[]

### RankedRow

- `key`: string _(required)_
- `label`: string _(required)_
- `count`: unknown
- `share_pct`: unknown
- `suppressed`: boolean

### RatioValue

- `numerator`: unknown
- `denominator`: unknown
- `rate_pct`: unknown
- `suppressed`: boolean
- `cohort_complete`: boolean

### ReferenceCoverageRow

- `product_key`: string _(required)_
- `product_label`: string _(required)_
- `delivery_point_key`: string _(required)_
- `delivery_point_label`: string _(required)_
- `availability_window`: string _(required)_
- `availability_window_label`: string _(required)_
- `benchmark_price_usd_per_mt`: unknown
- `source_label`: ReferenceSourceLabel _(required)_
- `generated_at`: string(date-time) _(required)_
- `observed_at`: unknown
- `source_kind`: ReferenceSourceKind _(required)_
- `scope`: ReferenceScope _(required)_
- `coverage_status`: string _(required)_

### ReferenceCoverageSection

- `rows`: ReferenceCoverageRow[]

### ReferencePriceItem

- `product_id`: unknown
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window`: string
- `region`: string
- `vwap_usd`: string _(required)_
- `total_volume_mt`: string _(required)_
- `trade_count`: integer _(required)_
- `date`: string(date) _(required)_
- `visibility`: string
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `is_reference`: boolean

### ReferencePriceResponse

- `prices`: ReferencePriceItem[] _(required)_
- `generated_at`: string(date-time) _(required)_

### ReferralCodeResponse

- `referral_code`: string _(required)_
- `referral_link`: string _(required)_

### ReferralInviteRequest

- `email`: string(email) _(required)_

### ReferralListItem

- `organization_name`: unknown
- `role`: unknown
- `status`: string _(required)_
- `signed_up_at`: string(date-time) _(required)_

### ReferralStatsResponse

- `total`: integer _(required)_
- `verified`: integer _(required)_
- `active`: integer _(required)_
- `referrals`: ReferralListItem[] _(required)_

### RefreshRequest

- `refresh_token`: unknown

### RegisterWithOrgRequest

- `registration_token`: string _(required)_
- `organization`: OrganizationCreate _(required)_

### RegistrationResponse

- `status`: string _(required)_
- `user`: unknown
- `registration_token`: unknown

### ReliabilityResponse

- `meta`: AnalyticsMeta _(required)_
- `collector`: CollectorState _(required)_
- `login_failures`: LoginFailurePanel _(required)_
- `frontend_errors`: FrontendErrorPanel _(required)_
- `backend_unavailable`: BackendUnavailablePanel _(required)_
- `navigation_latency`: NavigationLatencyRow[]
- `audit_activity`: AuditActivityRow[]

### ResendVerificationRequest

- `email`: string _(required)_

### ResetPasswordRequest

- `token`: string _(required)_
- `new_password`: string _(required)_

### ResolveCodeResponse

- `valid`: boolean _(required)_
- `organization_name`: unknown
- `organization_type`: unknown
- `referrer_name`: unknown

### RetentionKpis

- `returning_members`: MetricValue _(required)_
- `retained_organizations`: MetricValue _(required)_
- `reactivated_organizations`: MetricValue _(required)_
- `dormant_approved_members`: MetricValue _(required)_

### RetentionResponse

- `meta`: AnalyticsMeta _(required)_
- `kpis`: RetentionKpis _(required)_
- `member_cohorts`: CohortRow[]
- `organization_cohorts`: CohortRow[]
- `repeat_participation`: AggregateCell[]

### ScenarioInput

- `vessel_id`: string _(required)_
- `fuel_mix`: object _(required)_
- `year`: integer

### SeriesPoint

- `date`: string(date) _(required)_
- `value`: unknown

### SliceLiquidityRow

- `product_key`: string _(required)_
- `product_label`: string _(required)_
- `delivery_point_key`: string _(required)_
- `delivery_point_label`: string _(required)_
- `availability_window`: string _(required)_
- `availability_window_label`: string _(required)_
- `contributing_organizations`: unknown
- `best_bid_usd_per_mt`: unknown
- `best_ask_usd_per_mt`: unknown
- `spread_usd_per_mt`: unknown
- `spread_bps`: unknown
- `best_bid_depth_mt`: unknown
- `best_ask_depth_mt`: unknown
- `one_percent_bid_depth_mt`: unknown
- `one_percent_ask_depth_mt`: unknown
- `crossed`: unknown
- `suppressed`: boolean

### SliceTargetCreate

- `target_type`: string _(required)_
- `market_product_code`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `availability_window_code`: string _(required)_

### SubscriptionResponse

- `id`: string(uuid) _(required, uuid)_
- `org_id`: string(uuid) _(required, uuid)_
- `tier`: SubscriptionTier _(required)_
- `started_at`: unknown
- `expires_at`: unknown
- `is_active`: boolean _(required)_

### SubscriptionUpdate

- `tier`: SubscriptionTier _(required)_

### SupplierListingTemplateResponse

- `certification_declared`: boolean
- `certification_scheme`: unknown
- `specification_standard`: unknown
- `msds_available`: boolean
- `carbon_intensity_gco2_mj`: unknown
- `carbon_intensity_method`: unknown
- `feedstock`: unknown
- `origin`: unknown
- `off_spec`: boolean
- `off_spec_notes`: unknown
- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: string _(required)_
- `certifications`: string[]

### SurveySubmission

- `use_case`: string _(required)_
- `referral_source`: unknown

### TradeCreate

- `order_id`: string(uuid) _(required, uuid)_
- `quantity_mt`: unknown _(required)_

### TradeDeliverPayload

- `final_quantity_mt`: unknown _(required)_
- `final_price_per_mt`: unknown _(required)_

### TradeResponse

- `id`: string(uuid) _(required, uuid)_
- `bid_order_id`: unknown
- `ask_order_id`: unknown
- `buyer_id`: string(uuid) _(required, uuid)_
- `seller_id`: string(uuid) _(required, uuid)_
- `buyer_name`: string
- `seller_name`: string
- `initiated_by`: Initiator _(required)_
- `is_anonymous`: boolean
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `status`: TradeStatus _(required)_
- `final_quantity_mt`: unknown
- `final_price_per_mt`: unknown
- `final_total_usd`: unknown
- `commission_rate_pct`: string
- `commission_amount_usd`: unknown
- `confirmed_at`: unknown
- `delivered_at`: unknown
- `paid_at`: unknown
- `created_at`: string(date-time) _(required)_
- `product_id`: unknown
- `product_name`: string
- `market_product`: unknown
- `fuel_type`: string
- `fuel_grade`: string
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window`: unknown
- `region`: string
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `unknown_count`: integer

### TradeTapeEntry

- `id`: string _(required)_
- `product_id`: unknown
- `market_product`: unknown
- `fuel_type`: string _(required)_
- `fuel_grade`: string _(required)_
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `region`: string _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `total_usd`: string _(required)_
- `confirmed_at`: string(date-time) _(required)_
- `availability_window`: string _(required)_
- `is_demo_trade`: boolean
- `scope`: string
- `provenance_kind`: string
- `source_kind`: MarketSourceKind
- `demo_status`: MarketDemoStatus

### TradeTapeResponse

- `items`: TradeTapeEntry[] _(required)_
- `total`: integer _(required)_
- `market_hours`: boolean _(required)_

### TutorialStepRow

- `step`: string _(required)_
- `completed`: AggregateCell _(required)_
- `skipped`: AggregateCell _(required)_

### UserCreate

- `email`: string(email) _(required)_
- `first_name`: unknown
- `last_name`: unknown
- `role`: UserRole _(required)_
- `password`: string _(required)_
- `organization_id`: unknown
- `referral_code`: unknown

### UserResponse

- `email`: string(email) _(required)_
- `first_name`: unknown
- `last_name`: unknown
- `role`: UserRole _(required)_
- `id`: string(uuid) _(required, uuid)_
- `status`: UserStatus _(required)_
- `organization_id`: unknown
- `referral_code`: unknown
- `must_change_password`: boolean

### UserUpdate

- `first_name`: unknown
- `last_name`: unknown
- `role`: unknown

### ValidationError

- `loc`: any[] _(required)_
- `msg`: string _(required)_
- `type`: string _(required)_
- `input`: unknown
- `ctx`: object

### VesselResponse

- `name`: string _(required)_
- `imo_number`: string _(required)_
- `vessel_type`: unknown
- `flag_state`: unknown
- `dwt`: unknown
- `cii_rating`: unknown
- `eu_ets_status`: unknown
- `fueleu_status`: unknown
- `current_location`: unknown
- `previous_location`: unknown
- `lat`: unknown
- `lng`: unknown
- `prev_lat`: unknown
- `prev_lng`: unknown
- `id`: string _(required)_
- `organization_id`: unknown
- `updated_at`: string(date-time) _(required)_

### WatchlistCreateRequest

- `name`: string _(required)_

### WatchlistDetailResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `kind`: string _(required)_
- `unread_event_count`: integer
- `latest_event_at`: unknown
- `total_slice_count`: integer
- `has_more_slices`: boolean
- `slices`: WatchlistSliceResponse[]
- `created_at`: string(date-time) _(required)_

### WatchlistEntryAddRequest

- `product_id`: string(uuid) _(required, uuid)_
- `delivery_point_id`: unknown

### WatchlistEntryResponse

- `id`: string(uuid) _(required, uuid)_
- `product_id`: string(uuid) _(required, uuid)_
- `product_name`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `best_bid`: unknown
- `best_ask`: unknown
- `created_at`: string(date-time) _(required)_

### WatchlistEventResponse

- `id`: string(uuid) _(required, uuid)_
- `watchlist_id`: string(uuid) _(required, uuid)_
- `watchlist_target_id`: string(uuid) _(required, uuid)_
- `target_type`: string _(required)_
- `event_type`: string _(required)_
- `event_payload`: object
- `source_kind`: MarketSourceKind
- `scope`: MarketScope
- `demo_status`: MarketDemoStatus
- `observed_at`: unknown
- `market_product_code`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window_code`: unknown
- `order_id`: unknown
- `is_read`: boolean _(required)_
- `created_at`: string(date-time) _(required)_

### WatchlistEventsPageResponse

- `items`: WatchlistEventResponse[]
- `next_cursor`: unknown

### WatchlistResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `entry_count`: integer
- `entries`: WatchlistEntryResponse[]
- `created_at`: string(date-time) _(required)_

### WatchlistSliceResponse

- `id`: string(uuid) _(required, uuid)_
- `target_type`: string
- `market_product_code`: string _(required)_
- `delivery_point_id`: string(uuid) _(required, uuid)_
- `delivery_point_name`: unknown
- `availability_window_code`: string _(required)_
- `active_order_count`: integer
- `unread_event_count`: integer
- `latest_event_at`: unknown
- `pins`: WatchlistTargetResponse[]
- `created_at`: string(date-time) _(required)_

### WatchlistSummaryResponse

- `id`: string(uuid) _(required, uuid)_
- `name`: string _(required)_
- `kind`: string _(required)_
- `unread_event_count`: integer
- `latest_event_at`: unknown
- `total_slice_count`: integer
- `has_more_slices`: boolean
- `slices`: WatchlistSliceResponse[]
- `created_at`: string(date-time) _(required)_

### WatchlistTargetResponse

- `id`: string(uuid) _(required, uuid)_
- `target_type`: string _(required)_
- `market_product_code`: unknown
- `delivery_point_id`: unknown
- `delivery_point_name`: unknown
- `availability_window_code`: unknown
- `order_id`: unknown
- `snapshot_price_per_mt_usd`: unknown
- `snapshot_quantity_mt`: unknown
- `snapshot_remaining_quantity_mt`: unknown
- `snapshot_status`: unknown
- `snapshot_side`: unknown
- `snapshot_market_product`: unknown
- `snapshot_delivery_point_name`: unknown
- `snapshot_availability_window`: unknown
- `snapshot_counterparty_label`: unknown
- `active_order_count`: integer
- `unread_event_count`: integer
- `latest_event_at`: unknown
- `created_at`: string(date-time) _(required)_

### app__routers__admin_analytics__OverviewResponse

- `total_users`: integer _(required)_
- `active_users_7d`: integer _(required)_
- `total_organizations`: integer _(required)_
- `total_orders`: integer _(required)_
- `open_orders`: integer _(required)_
- `total_trades`: integer _(required)_
- `confirmed_trades`: integer _(required)_
- `total_volume_mt`: number _(required)_
- `total_revenue_usd`: number _(required)_
- `total_gmv_usd`: number _(required)_

### app__schemas__product_analytics__OverviewResponse

- `meta`: AnalyticsMeta _(required)_
- `kpis`: OverviewKpis _(required)_
- `lifecycle`: LifecycleStage[]
- `activity_trend`: ActivityTrend _(required)_
- `marketplace_balance`: MarketplaceBalance _(required)_
- `needs_attention`: NeedsAttentionItem[]

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_