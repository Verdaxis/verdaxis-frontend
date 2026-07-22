# Schema

### AIChatRequest
- message: string (required)
- history: object[]

### AcquisitionKpis
- visitors: MetricValue (required)
- visits: MetricValue (required)
- pageviews: MetricValue (required)
- average_session_duration_seconds: DecimalMetricValue (required)
- cta_clicks: MetricValue (required)

### AcquisitionResponse
- meta: AnalyticsMeta (required)
- kpis: AcquisitionKpis (required)
- visitors_trend: SeriesPoint[]
- previous_visitors_trend: SeriesPoint[]
- visits_trend: SeriesPoint[]
- referrers: RankedRow[]
- entry_pages: RankedRow[]
- cta_matrix: CtaMatrixRow[]
- languages: RankedRow[]
- calculator: CalculatorFunnel (required)

### ActivationResponse
- meta: AnalyticsMeta (required)
- journey: JourneyStage[]
- time_to_first_login: DurationDistribution (required)
- time_to_first_live_order: DurationDistribution (required)
- drop_off: AggregateCell[]
- ratios: LabeledRatio[]

### ActivityTrend
- visitors: SeriesPoint[]
- active_members: SeriesPoint[]
- orders: SeriesPoint[]
- confirmed_trades: SeriesPoint[]

### AdminApproveBody
- external_evidence_reference: string (required)
- review_note: string (required)

### AdminDecisionBody
- reason: unknown

### AdminRejectBody
- reason: string (required)

### AdminUserEntry
- id: string(uuid) (required, uuid)
- email: string (required)
- first_name: unknown (required)
- last_name: unknown (required)
- role: string (required)
- status: string (required)
- created_at: string(date-time) (required)
- org_name: unknown (required)
- org_type: unknown (required)

### AdminUsersResponse
- items: AdminUserEntry[] (required)
- total: integer (required)

### AggregateCell
- key: string (required)
- count: unknown
- suppressed: boolean

### AggregatedOrderbookResponse
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: string (required)
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- side: OrderSide (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- order_count: integer (required)
- product_total_order_count: integer (required)
- evidence_class: string (required)
- source_kind: MarketSourceKind (required)
- scope: MarketScope
- demo_status: MarketDemoStatus (required)
- observed_at: string(date-time) (required)

### AlertCreate
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- direction: string (required)
- threshold_usd: unknown (required)

### AlertResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- market_product: unknown
- delivery_point_id: unknown (required)
- direction: string (required)
- threshold_usd: string (required)
- is_active: boolean (required)
- triggered_at: unknown (required)
- created_at: string(date-time) (required)

### AnalyticsCoverage
- authoritative: AnalyticsSourceCoverage (required)
- behavioral: AnalyticsSourceCoverage (required)
- login_history: AnalyticsSourceCoverage (required)
- status_history: AnalyticsSourceCoverage (required)
- reference: AnalyticsSourceCoverage (required)

### AnalyticsDataQuality
- legacy_timestamp_fallback_count: integer
- missing_paid_at_count: integer
- missing_commission_payment_date_count: integer
- suppressed_cell_count: integer
- cohort_complete: boolean

### AnalyticsMeta
- start: string(date-time) (required)
- end: string(date-time) (required)
- previous_start: unknown (required)
- previous_end: unknown (required)
- observed_at: string(date-time) (required)
- coverage: AnalyticsCoverage (required)
- data_quality: AnalyticsDataQuality (required)

### AnalyticsSourceCoverage
- coverage_start: unknown
- coverage_end: unknown
- observed_at: unknown
- status: AnalyticsSourceStatus (required)
- diagnostic: unknown

### AssistedListingCancel
- reason: string (required)

### AssistedListingCreate
- authorization_id: string(uuid) (required, uuid)
- acknowledge_executable_standing_order: boolean (required)

### AssistedListingResponse
- order: OrderResponse (required)
- accountable_user_id: string(uuid) (required, uuid)
- created_by_actor_user_id: string(uuid) (required, uuid)
- creation_method: OrderCreationMethod (required)
- support_authorization_id: string(uuid) (required, uuid)
- version: integer (required)
- etag: string (required)

### AuditActivityRow
- occurred_at: string(date-time) (required)
- action: string (required)
- resource_type: unknown
- actor_role: unknown

### AuditLogResponse
- id: string(uuid) (required, uuid)
- user_id: unknown (required)
- action: string (required)
- resource_type: string (required)
- resource_id: unknown (required)
- changes: unknown (required)
- ip_address: unknown (required)
- request_id: unknown (required)
- timestamp: string(date-time) (required)

### AuthoritativeUsage
- registrations: integer (required)
- users_logging_in: integer (required)
- order_placing_organizations: integer (required)

### AuthorizationCreate
- accountable_user_id: string(uuid) (required, uuid)
- order: OrderCreate-Input (required)
- authorization_expires_at: string(date-time) (required)
- evidence_reference: string (required)
- evidence_sha256: string (required)
- commercial_consent_version: string (required)
- commercial_consent_reference: string (required)
- support_case_reference: unknown

### AuthorizationResponse
- id: string(uuid) (required, uuid)
- organization_id: string(uuid) (required, uuid)
- accountable_user_id: string(uuid) (required, uuid)
- status: MarketSupportAuthorizationStatus (required)
- order: OrderCreate-Output (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- authorization_expires_at: string(date-time) (required)
- order_expires_at: string(date-time) (required)
- terms_digest: string (required)
- evidence_reference: string (required)
- evidence_sha256: string (required)
- commercial_consent_version: string (required)
- commercial_consent_reference: string (required)
- support_case_reference: unknown (required)
- created_by_actor_user_id: string(uuid) (required, uuid)
- created_at: string(date-time) (required)
- consumed_at: unknown (required)
- revoked_at: unknown (required)
- revoked_by_actor_user_id: unknown (required)
- revocation_reason: unknown (required)

### AuthorizationRevoke
- reason: string (required)

### BackendUnavailablePanel
- total: MetricValue (required)
- by_route_family: AggregateCell[]

### BehavioralUsage
- visitors: integer (required)
- visits: integer (required)
- pageviews: integer (required)
- total_time_seconds: integer (required)
- average_session_duration_seconds: number (required)
- event_totals: object (required)
- event_series: DailyEventPoint[] (required)
- daily_visitors: DailyVisitorPoint[] (required)
- top_entries: MetricEntry[] (required)
- top_referrers: MetricEntry[] (required)

### BenchmarkQuote
- market_product: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- availability_window: string (required)
- benchmark_price_per_mt_usd: string (required)
- source: string (required)
- generated_at: string(date-time) (required)
- observed_at: unknown

### BenchmarkQuoteResponse
- items: BenchmarkQuote[] (required)
- generated_at: string(date-time) (required)

### Body_login_api_auth_login_post
- grant_type: unknown
- username: string (required)
- password: string(password) (required)
- scope: string
- client_id: unknown
- client_secret: undefined(password)

### Body_submit_kyc_api_kyc_submit_post
- passport: string (required)
- company_doc: string (required)
- declared_company_name: unknown
- registration_number: unknown

### CIAdjustedPrice
- base_price_per_mt: string (required)
- carbon_intensity_gco2_mj: string (required)
- fueleu_ghg_intensity: string (required)
- compliance_cost_per_mt: string (required)
- effective_price_per_mt: string (required)
- ghg_reduction_pct: string (required)

### CIIResponse
- rating: string (required)
- score: integer (required)

### CalculatorFunnel
- starts: MetricValue (required)
- completions: MetricValue (required)

### CapabilityAssignmentCreate
- user_id: string(uuid) (required, uuid)
- capability: MarketSupportCapability (required)
- reason: string (required)
- expires_at: unknown

### CapabilityAssignmentResponse
- id: string(uuid) (required, uuid)
- user_id: string(uuid) (required, uuid)
- capability: MarketSupportCapability (required)
- reason: string (required)
- granted_by_user_id: string(uuid) (required, uuid)
- granted_at: string(date-time) (required)
- expires_at: unknown (required)
- revoked_at: unknown (required)
- revoked_by_user_id: unknown (required)
- revocation_reason: unknown (required)

### CapabilityAssignmentRevoke
- reason: string (required)

### CohortCell
- offset: integer (required)
- cell: AggregateCell (required)
- pct: unknown

### CohortRow
- cohort_start: string(date) (required)
- size: AggregateCell (required)
- cells: CohortCell[]

### CollectorState
- status: AnalyticsSourceStatus (required)
- diagnostic: unknown
- last_observation_at: unknown

### CommercialSummary
- realized_gmv_usd: DecimalMetricValue (required)
- realized_revenue_usd: DecimalMetricValue (required)
- commission_pending_usd: unknown
- commission_invoiced_usd: unknown

### CommissionResponse
- id: string(uuid) (required, uuid)
- match_id: string(uuid) (required, uuid)
- amount_usd: string (required)
- status: CommissionStatus (required)
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- created_at: string(date-time) (required)

### CommissionSummary
- total_pending_usd: string (required)
- total_invoiced_usd: string (required)
- total_paid_usd: string (required)
- pending_count: integer (required)
- invoiced_count: integer (required)
- paid_count: integer (required)

### CommissionUpdate
- status: unknown
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- notes: unknown

### ComplianceScoreResponse
- vessel_id: string (required)
- vessel_name: string (required)
- overall_score: integer (required)
- status: string (required)
- traffic_light: string (required)
- fueleu: FuelEUResponse (required)
- eu_ets: EUETSResponse (required)
- cii: CIIResponse (required)
- recommendations: string[] (required)

### CtaMatrixRow
- cta: string (required)
- placement: string (required)
- clicks: unknown
- share_pct: unknown
- suppressed: boolean

### DailyEventPoint
- date: string (required)
- event: string (required)
- value: integer (required)

### DailyStat
- date: string(date) (required)
- orders_placed: integer (required)
- trades_executed: integer (required)
- volume_mt: number (required)
- gmv_usd: number (required)
- commission_usd: number (required)

### DailyVisitorPoint
- date: string (required)
- value: integer (required)

### DecimalMetricValue
- value: unknown
- previous: unknown
- suppressed: boolean

### DeliveryPointResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- region: string (required)
- timezone: unknown
- is_active: boolean (required)

### DemandSignal
- fuel_type: string (required)
- region: string (required)
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- volume_mt: unknown (required)
- max_price_per_mt: unknown (required)
- urgency: UrgencyLevel (required)
- bid_count: integer (required)
- earliest_delivery: string (required)
- created_at: string(date-time) (required)
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### DurationBucket
- bucket: string (required)
- cell: AggregateCell (required)

### DurationDistribution
- buckets: DurationBucket[]
- median_hours: unknown
- sample_size: unknown
- suppressed: boolean

### EUETSResponse
- total_co2_tonnes: string (required)
- ets_price_per_tonne_eur: string (required)
- phase_in_pct: string (required)
- estimated_cost_eur: string (required)
- score: integer (required)

### EngagementKpis
- dau: MetricValue (required)
- wau: MetricValue (required)
- mau: MetricValue (required)
- stickiness_pct: unknown

### EngagementResponse
- meta: AnalyticsMeta (required)
- kpis: EngagementKpis (required)
- active_members_trend: SeriesPoint[]
- feature_adoption: FeatureAdoptionRow[]
- workflow_ratios: LabeledRatio[]
- navigation_destinations: NavigationDestinationRow[]
- tutorial_steps: TutorialStepRow[]

### ErrorDetail
- detail: string (required)

### FeatureAdoptionRow
- family: string (required)
- events: unknown
- suppressed: boolean

### FleetComplianceSummary
- total_vessels: integer (required)
- green_count: integer (required)
- amber_count: integer (required)
- red_count: integer (required)
- average_score: number (required)
- vessels: ComplianceScoreResponse[] (required)

### FleetDemandEntry
- fuel: string (required)
- ordered_vessels: integer (required)
- delivered_vessels: integer (required)
- avg_consumption_mt: integer (required)
- color: string (required)

### FleetDemandResponse
- entries: FleetDemandEntry[] (required)
- last_updated: string (required)
- sources: string[] (required)

### ForgotPasswordRequest
- email: string (required)

### ForwardCurveBoardCell
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- benchmark_mid: unknown
- benchmark_source: unknown
- is_demo_benchmark: boolean
- order_source_kind: MarketSourceKind
- benchmark_source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer
- real_best_bid: unknown
- real_best_ask: unknown
- demo_best_bid: unknown
- demo_best_ask: unknown
- best_bid_source_kind: MarketSourceKind
- best_ask_source_kind: MarketSourceKind
- order_observed_at: unknown
- benchmark_observed_at: unknown
- indication_summary: ForwardCurveBoardIndicationSummary
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stem_summary: ForwardCurveBoardPhysicalStemSummary
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer

### ForwardCurveBoardDepthLevel
- price_per_mt_usd: string (required)
- quantity_mt: string (required)
- order_count: integer (required)
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer

### ForwardCurveBoardFairPriceBand
- low_price_per_mt_usd: unknown
- mid_price_per_mt_usd: unknown
- high_price_per_mt_usd: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardFocus
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- curve: ForwardCurveBoardCell[] (required)
- depth_bids: ForwardCurveBoardDepthLevel[] (required)
- depth_asks: ForwardCurveBoardDepthLevel[] (required)
- indications: ForwardCurveBoardIndication[]
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stems: ForwardCurveBoardPhysicalStem[]

### ForwardCurveBoardIndication
- side: ForwardCurveIndicationSide (required)
- price_per_mt_usd: string (required)
- quantity_mt: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardIndicationSummary
- provenance: ForwardCurveSignalProvenance
- latest_bid_price_per_mt_usd: unknown
- latest_ask_price_per_mt_usd: unknown
- latest_mid_price_per_mt_usd: unknown
- total_quantity_mt: unknown
- indication_count: integer

### ForwardCurveBoardPhysicalStem
- quantity_mt: string (required)
- status: ForwardCurvePhysicalStemStatus (required)
- stem_start: unknown
- stem_end: unknown
- provenance: ForwardCurveSignalProvenance (required)

### ForwardCurveBoardPhysicalStemSummary
- provenance: ForwardCurveSignalProvenance
- available_quantity_mt: unknown
- tentative_quantity_mt: unknown
- stem_count: integer
- earliest_stem_start: unknown
- latest_stem_end: unknown

### ForwardCurveBoardPort
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- cells: ForwardCurveBoardCell[] (required)

### ForwardCurveBoardProduct
- product_id: string(uuid) (required, uuid)
- market_product: string (required)
- product_name: string (required)

### ForwardCurveBoardResponse
- availability_window: string (required)
- products: ForwardCurveBoardProduct[] (required)
- ports: ForwardCurveBoardPort[] (required)
- focus: ForwardCurveBoardFocus (required)
- generated_at: string(date-time) (required)

### ForwardCurveLabelPolicy
- public_label: string (required)
- tooltip: unknown
- allowed_terms: string[]
- forbidden_terms: string[]
- disclaimer: unknown

### ForwardCurveLatestSignal
- market_product: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- availability_window: string (required)
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- demo_status: MarketDemoStatus
- observed_at: unknown
- staleness_status: ForwardCurveStalenessStatus

### ForwardCurveMarketCell
- market_product: string (required)
- product_name: string (required)
- representative_product_id: string(uuid) (required, uuid)
- product_count: integer
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- availability_window: string (required)
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- label_policy: ForwardCurveLabelPolicy
- staleness_status: ForwardCurveStalenessStatus
- is_executable: boolean
- is_reference: boolean
- demo_status: MarketDemoStatus
- scope: MarketScope
- observed_at: unknown
- generated_at: string(date-time) (required)
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer
- real_best_bid: unknown
- real_best_ask: unknown
- demo_best_bid: unknown
- demo_best_ask: unknown
- benchmark_mid: unknown
- benchmark_source_kind: MarketSourceKind
- benchmark_observed_at: unknown
- indication_summary: ForwardCurveBoardIndicationSummary
- fair_price_band: unknown
- fair_price_band_provenance: ForwardCurveSignalProvenance
- physical_stem_summary: ForwardCurveBoardPhysicalStemSummary

### ForwardCurvePoint
- availability_window: string (required)
- best_bid: unknown
- best_ask: unknown
- mid_price: unknown
- spread: unknown
- volume_mt: string (required)
- order_count: integer (required)

### ForwardCurveResponse
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- curve: ForwardCurvePoint[] (required)
- generated_at: string(date-time) (required)

### ForwardCurveSignalProvenance
- signal_type: MarketSignalType (required)
- signal_source_kind: ForwardCurveSignalSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- observed_at: unknown
- generated_at: string(date-time) (required)
- real_count: integer
- demo_count: integer
- unknown_count: integer

### ForwardCurveSliceEvidencePoint
- layer: ForwardCurveEvidenceLayer (required)
- side: unknown
- price_per_mt_usd: unknown
- low_price_per_mt_usd: unknown
- high_price_per_mt_usd: unknown
- quantity_mt: unknown
- observed_at: unknown
- public_source_label: string (required)
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus

### ForwardCurveSliceResponse
- cell: ForwardCurveMarketCell (required)
- previous_window: unknown
- next_window: unknown
- depth_bids: ForwardCurveBoardDepthLevel[]
- depth_asks: ForwardCurveBoardDepthLevel[]
- trades: ForwardCurveSliceTrade[]
- indications: ForwardCurveBoardIndication[]
- fair_price_band: unknown
- physical_stems: ForwardCurveBoardPhysicalStem[]
- evidence_points: ForwardCurveSliceEvidencePoint[]
- generated_at: string(date-time) (required)
- disclaimer: string

### ForwardCurveSliceTrade
- price_per_mt_usd: string (required)
- quantity_mt: string (required)
- confirmed_at: string(date-time) (required)
- source_kind: MarketSourceKind (required)
- demo_status: MarketDemoStatus (required)

### ForwardCurveTableCell
- primary_value: unknown
- primary_signal_type: MarketSignalType
- primary_source_kind: MarketSourceKind
- public_source_label: string
- staleness_status: ForwardCurveStalenessStatus
- is_executable: boolean
- is_reference: boolean
- demo_status: MarketDemoStatus
- observed_at: unknown
- best_bid: unknown
- best_ask: unknown
- spread: unknown
- volume_mt: string
- order_count: integer
- real_order_count: integer
- demo_order_count: integer
- unknown_order_count: integer

### ForwardCurveTableColumn
- availability_window: string (required)
- display_label: string (required)
- group: string (required)

### ForwardCurveTableResponse
- columns: ForwardCurveTableColumn[] (required)
- rows: ForwardCurveTableRow[] (required)
- latest_signals: ForwardCurveLatestSignal[]
- generated_at: string(date-time) (required)
- disclaimer: string

### ForwardCurveTableRow
- row_key: string (required)
- market_product: string (required)
- product_name: string (required)
- representative_product_id: string(uuid) (required, uuid)
- product_count: integer
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: string (required)
- region: string (required)
- cells: object (required)

### FrontendErrorPanel
- total: MetricValue (required)
- by_route_family: AggregateCell[]
- by_category: AggregateCell[]

### FuelEUResponse
- ghg_intensity_gco2_mj: string (required)
- target_intensity_gco2_mj: string (required)
- reduction_pct: string (required)
- compliance_balance_gco2: string (required)
- estimated_penalty_eur: string (required)
- score: integer (required)

### FunnelStage
- name: string (required)
- value: integer (required)
- conversion_from_previous_pct: unknown

### HTTPValidationError
- detail: ValidationError[]

### InventoryCreate
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: unknown (required)
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown

### InventoryItemUpdate
- product_name: unknown
- current_stock_mt: unknown
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown
- certification_declared: unknown
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: unknown
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: unknown
- off_spec_notes: unknown

### InventoryResponse
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: string (required)
- incoming_stock_mt: string
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- supplier_id: string(uuid) (required, uuid)
- reserved_stock_mt: string (required)
- updated_at: string(date-time) (required)

### JoinReviewBody
- review_note: string (required)

### JourneyStage
- key: string (required)
- source: JourneySource (required)
- total: AggregateCell (required)
- buyer: unknown
- supplier: unknown

### LabeledRatio
- key: string (required)
- kind: ConversionRatioKind (required)
- ratio: RatioValue (required)

### LeaderboardEntry
- rank: integer (required)
- user_name: string (required)
- organization_name: unknown
- referral_count: integer (required)

### LifecycleStage
- key: LifecycleStageKey (required)
- count: unknown
- previous: unknown
- coverage: AnalyticsSourceStatus (required)
- detail_tab: string (required)

### LiquiditySummary
- two_sided_slices: unknown
- one_sided_slices: unknown
- crossed_slices: unknown
- median_spread_usd_per_mt: unknown
- median_spread_bps: unknown
- median_open_order_age_hours: unknown
- median_hours_to_first_fill: unknown
- slices: SliceLiquidityRow[]

### ListingOverlay
- penalty_avoided_eur_per_mt: string (required)
- penalty_avoided_usd_per_mt: string (required)
- tco2e_avoided_per_mt: string (required)
- ci_gco2_mj: string (required)
- ci_basis: string (required)
- lcv_mj_kg: string (required)
- lcv_basis: string (required)

### LoginFailurePanel
- total: MetricValue (required)
- categories: AggregateCell[]
- trend: SeriesPoint[]

### MarketActivitySection
- kpis: MarketplaceKpis (required)
- liquidity: LiquiditySummary (required)
- balance_trend: MarketBalanceTrend (required)
- product_port_matrix: ProductPortCell[]
- window_distribution: RankedRow[]
- order_status_distribution: AggregateCell[]
- trade_status_distribution: AggregateCell[]
- concentration: OrganizationConcentration (required)

### MarketBalanceTrend
- buyer_organizations: SeriesPoint[]
- supplier_organizations: SeriesPoint[]
- bids: SeriesPoint[]
- asks: SeriesPoint[]

### MarketSupportContext
- organization: MarketSupportOrganization (required)
- eligible_principals: MarketSupportPrincipal[] (required)
- authorizations: AuthorizationResponse[] (required)
- listings: AssistedListingResponse[] (required)

### MarketSupportOrganization
- id: string(uuid) (required, uuid)
- name: string (required)
- domain: unknown (required)
- type: string (required)

### MarketSupportPrincipal
- id: string(uuid) (required, uuid)
- email: string (required)
- name: string (required)

### MarketplaceBalance
- buyer_organizations: MetricValue (required)
- supplier_organizations: MetricValue (required)
- bid_orders: MetricValue (required)
- ask_orders: MetricValue (required)

### MarketplaceKpis
- participating_organizations: MetricValue (required)
- open_bids: MetricValue (required)
- open_asks: MetricValue (required)
- confirmed_trades: MetricValue (required)
- confirmed_volume_mt: DecimalMetricValue (required)
- execution_rate: RatioValue (required)

### MarketplaceResponse
- meta: AnalyticsMeta (required)
- live: unknown
- demo: unknown
- unknown: unknown
- reference: unknown
- commercial: unknown

### MetricEntry
- name: string (required)
- value: integer (required)

### MetricValue
- value: unknown
- previous: unknown
- suppressed: boolean

### NavigationDestinationRow
- destination: NavigationDestination (required)
- total: AggregateCell (required)
- buyer: unknown
- supplier: unknown

### NavigationLatencyRow
- destination: unknown (required)
- buckets: AggregateCell[]

### NeedsAttentionItem
- rule: NeedsAttentionRule (required)
- count: unknown

### NegotiationCounterRequest
- proposed_price: unknown (required)
- notes: unknown

### NegotiationCreateRequest
- bid_order_id: unknown
- ask_order_id: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window: string
- quantity_mt: unknown (required)
- proposed_price: unknown (required)
- notes: unknown
- expires_in_hours: integer

### NegotiationListResponse
- items: NegotiationResponse[] (required)
- total: integer (required)

### NegotiationResponse
- id: string(uuid) (required, uuid)
- bid_order_id: unknown
- ask_order_id: unknown
- initiator_org_id: string(uuid) (required, uuid)
- initiator_org_name: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- counterparty_org_name: unknown
- initiator_user_id: unknown
- counterparty_user_id: unknown
- accepted_by_user_id: unknown
- initiator_side: string (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- availability_window: string
- product_name: unknown
- quantity_mt: string (required)
- current_price: string (required)
- status: string (required)
- last_actor_org_id: string(uuid) (required, uuid)
- trade_id: unknown
- expires_at: string(date-time) (required)
- created_at: string(date-time) (required)
- updated_at: string(date-time) (required)
- rounds: NegotiationRoundResponse[]

### NegotiationRoundResponse
- id: string(uuid) (required, uuid)
- round_number: integer (required)
- proposer_org_id: string(uuid) (required, uuid)
- proposer_org_name: unknown
- proposer_user_id: unknown
- proposed_price: string (required)
- notes: unknown
- created_at: string(date-time) (required)

### NotificationResponse
- id: string(uuid4) (required)
- type: string (required)
- title: string (required)
- message: string (required)
- data: unknown (required)
- is_read: boolean (required)
- created_at: string(date-time) (required)

### OrderCreate-Input
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- port_id: unknown
- vessel_id: unknown
- quantity_mt: unknown (required)
- price_per_mt_usd: unknown (required)
- availability_window: string
- certifications: string[]
- expires_at: unknown
- is_anonymous: boolean

### OrderCreate-Output
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- port_id: unknown
- vessel_id: unknown
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string
- certifications: string[]
- expires_at: unknown
- is_anonymous: boolean

### OrderMyResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer
- organization_id: string(uuid) (required, uuid)
- vessel_id: unknown
- updated_at: string(date-time) (required)
- trade_count: integer
- creation_method: string
- version: integer
- etag: unknown

### OrderResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### OrderResponseWithCI
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- port_id: unknown
- quantity_mt: string (required)
- remaining_quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]
- is_verdaxis_verified: boolean (required)
- tier_label: TierLabel
- status: OrderBookStatus (required)
- expires_at: unknown
- created_at: string(date-time) (required)
- benchmark_price_per_mt_usd: unknown
- premium_discount_per_mt_usd: unknown
- benchmark_source: unknown
- is_crossed: boolean
- is_demo_listing: boolean
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer
- ci_adjusted_price: unknown

### OrderUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- certifications: unknown
- certification_declared: unknown
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: unknown
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: unknown
- off_spec_notes: unknown
- expires_at: unknown

### OrganizationConcentration
- hhi_band: unknown
- suppressed: boolean

### OrganizationCreate
- name: string (required)
- type: OrgType (required)
- tax_id: unknown
- country_code: unknown

### OverlayAssumptions
- eur_usd_rate: string (required)
- vlsfo_baseline_gco2_mj: string (required)
- ghgie_actual_gco2_mj: string (required)
- fleet_intensity_basis: string (required)
- fleet_vessel_count: integer (required)
- penalty_eur_per_tonne: string (required)
- year: integer (required)
- year_target: string (required)
- excluded_factors: string[] (required)

### OverviewKpis
- qualified_organizations: MetricValue (required)
- active_members: MetricValue (required)
- participating_organizations: MetricValue (required)
- live_orders: MetricValue (required)
- confirmed_trades: MetricValue (required)

### PaginatedResponse_AssistedListingResponse_
- items: AssistedListingResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_AuthorizationResponse_
- items: AuthorizationResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_MarketSupportOrganization_
- items: MarketSupportOrganization[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_OrderResponse_
- items: OrderResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PaginatedResponse_TradeResponse_
- items: TradeResponse[] (required)
- total: integer (required)
- skip: integer (required)
- limit: integer (required)

### PasswordChangeRequest
- current_password: string (required)
- new_password: string (required)

### PinTargetCreate
- target_type: string (required)
- order_id: string(uuid) (required, uuid)

### PortFuelAvailability
- port_id: string (required)
- port_name: string (required)
- lat: number (required)
- lng: number (required)
- fuel_type: string (required)
- market_product_code: string (required)
- total_stock_mt: unknown (required)
- supplier_count: integer (required)
- availability_level: AvailabilityLevel (required)
- avg_price_per_mt: unknown
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### PortIntelligenceBase
- congestion_level: unknown
- methanol_price_avg: unknown
- biofuel_price_avg: unknown
- captured_at: string(date-time) (required)

### PortResponse
- id: string (required)
- name: string (required)
- country: string (required)
- location: unknown
- timezone: unknown
- is_active: boolean
- lat: unknown
- lng: unknown
- intelligence: unknown

### PriceDiscoveryResponse
- summaries: PriceSummary[] (required)
- generated_at: string(date-time) (required)

### PriceSummary
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- last_price: unknown
- avg_price_24h: unknown
- high_24h: unknown
- low_24h: unknown
- volume_24h: string
- trade_count_24h: integer
- price_change_pct: unknown
- last_trade_at: unknown
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- is_reference: boolean
- observed_at: unknown
- real_trade_count_24h: integer
- demo_trade_count_24h: integer
- unknown_trade_count_24h: integer

### PricingOverlayRequest
- order_ids: string[] (required)
- year: integer

### PricingOverlayResponse
- overlays: object (required)
- assumptions: OverlayAssumptions (required)

### ProducerProjectResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- fuel_type: string (required)
- capacity_kt_per_year: unknown
- country: string (required)
- region: unknown
- lat: unknown
- lng: unknown
- cod_date: unknown
- cod_year: unknown
- status: string (required)
- data_source: unknown
- gena_project_id: unknown
- organization_id: unknown
- feedstock: unknown
- technology: unknown
- carbon_intensity_gco2_mj: unknown
- notes: unknown
- created_at: string(date-time) (required)

### ProductPortCell
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- orders: AggregateCell (required)
- organizations: AggregateCell (required)

### ProductResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- market_product: unknown
- fuel_type: string (required)
- fuel_grade: string (required)
- unit: string (required)
- min_lot_size: string (required)
- is_active: boolean (required)

### ProductUsageResponse
- days: integer (required)
- period_start: string(date-time) (required)
- period_end: string(date-time) (required)
- behavioral_status: string (required)
- diagnostic: unknown (required)
- observed_at: string(date-time) (required)
- behavioral: BehavioralUsage (required)
- authoritative: AuthoritativeUsage (required)
- funnel: FunnelStage[] (required)

### RFQCreateRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- quantity_mt: unknown (required)
- target_price_per_mt: unknown
- availability_window: string
- notes: unknown
- is_anonymous: boolean
- expires_in_hours: integer

### RFQListResponse
- items: RFQResponse[] (required)
- total: integer (required)

### RFQQuoteRequest
- price_per_mt_usd: unknown (required)
- notes: unknown

### RFQQuoteResponse
- id: string(uuid) (required, uuid)
- seller_org_id: string(uuid) (required, uuid)
- seller_org_name: unknown
- price_per_mt_usd: string (required)
- notes: unknown
- status: string (required)
- created_at: string(date-time) (required)

### RFQResponse
- id: string(uuid) (required, uuid)
- buyer_org_id: unknown
- buyer_org_name: unknown
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- quantity_mt: string (required)
- target_price_per_mt: unknown
- availability_window: string (required)
- notes: unknown
- is_anonymous: boolean (required)
- status: string (required)
- expires_at: string(date-time) (required)
- created_at: string(date-time) (required)
- quote_count: integer
- quotes: RFQQuoteResponse[]

### RankedRow
- key: string (required)
- label: string (required)
- count: unknown
- share_pct: unknown
- suppressed: boolean

### RatioValue
- numerator: unknown
- denominator: unknown
- rate_pct: unknown
- suppressed: boolean
- cohort_complete: boolean

### ReferenceCoverageRow
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- availability_window: string (required)
- availability_window_label: string (required)
- benchmark_price_usd_per_mt: unknown
- source_label: ReferenceSourceLabel (required)
- generated_at: string(date-time) (required)
- observed_at: unknown
- source_kind: ReferenceSourceKind (required)
- scope: ReferenceScope (required)
- coverage_status: string (required)

### ReferenceCoverageSection
- rows: ReferenceCoverageRow[]

### ReferencePriceItem
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: string
- region: string
- vwap_usd: string (required)
- total_volume_mt: string (required)
- trade_count: integer (required)
- date: string(date) (required)
- visibility: string
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- is_reference: boolean

### ReferencePriceResponse
- prices: ReferencePriceItem[] (required)
- generated_at: string(date-time) (required)

### ReferralCodeResponse
- referral_code: string (required)
- referral_link: string (required)

### ReferralInviteRequest
- email: string(email) (required)

### ReferralListItem
- organization_name: unknown
- role: unknown
- status: string (required)
- signed_up_at: string(date-time) (required)

### ReferralStatsResponse
- total: integer (required)
- verified: integer (required)
- active: integer (required)
- referrals: ReferralListItem[] (required)

### RefreshRequest
- refresh_token: unknown

### RegisterWithOrgRequest
- registration_token: string (required)
- organization: OrganizationCreate (required)

### RegistrationResponse
- status: string (required)
- user: unknown
- registration_token: unknown

### ReliabilityResponse
- meta: AnalyticsMeta (required)
- collector: CollectorState (required)
- login_failures: LoginFailurePanel (required)
- frontend_errors: FrontendErrorPanel (required)
- backend_unavailable: BackendUnavailablePanel (required)
- navigation_latency: NavigationLatencyRow[]
- audit_activity: AuditActivityRow[]

### ResendVerificationRequest
- email: string (required)

### ResetPasswordRequest
- token: string (required)
- new_password: string (required)

### ResolveCodeResponse
- valid: boolean (required)
- organization_name: unknown
- organization_type: unknown
- referrer_name: unknown

### RetentionKpis
- returning_members: MetricValue (required)
- retained_organizations: MetricValue (required)
- reactivated_organizations: MetricValue (required)
- dormant_approved_members: MetricValue (required)

### RetentionResponse
- meta: AnalyticsMeta (required)
- kpis: RetentionKpis (required)
- member_cohorts: CohortRow[]
- organization_cohorts: CohortRow[]
- repeat_participation: AggregateCell[]

### ScenarioInput
- vessel_id: string (required)
- fuel_mix: object (required)
- year: integer

### SeriesPoint
- date: string(date) (required)
- value: unknown

### SliceLiquidityRow
- product_key: string (required)
- product_label: string (required)
- delivery_point_key: string (required)
- delivery_point_label: string (required)
- availability_window: string (required)
- availability_window_label: string (required)
- contributing_organizations: unknown
- best_bid_usd_per_mt: unknown
- best_ask_usd_per_mt: unknown
- spread_usd_per_mt: unknown
- spread_bps: unknown
- best_bid_depth_mt: unknown
- best_ask_depth_mt: unknown
- one_percent_bid_depth_mt: unknown
- one_percent_ask_depth_mt: unknown
- crossed: unknown
- suppressed: boolean

### SliceTargetCreate
- target_type: string (required)
- market_product_code: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- availability_window_code: string (required)

### SubscriptionResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- tier: SubscriptionTier (required)
- started_at: unknown
- expires_at: unknown
- is_active: boolean (required)

### SubscriptionUpdate
- tier: SubscriptionTier (required)

### SupplierListingTemplateResponse
- certification_declared: boolean
- certification_scheme: unknown
- specification_standard: unknown
- msds_available: boolean
- carbon_intensity_gco2_mj: unknown
- carbon_intensity_method: unknown
- feedstock: unknown
- origin: unknown
- off_spec: boolean
- off_spec_notes: unknown
- product_id: string(uuid) (required, uuid)
- delivery_point_id: string(uuid) (required, uuid)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: string (required)
- certifications: string[]

### SurveySubmission
- use_case: string (required)
- referral_source: unknown

### TradeCreate
- order_id: string(uuid) (required, uuid)
- quantity_mt: unknown (required)

### TradeDeliverPayload
- final_quantity_mt: unknown (required)
- final_price_per_mt: unknown (required)

### TradeResponse
- id: string(uuid) (required, uuid)
- bid_order_id: unknown
- ask_order_id: unknown
- buyer_id: string(uuid) (required, uuid)
- seller_id: string(uuid) (required, uuid)
- buyer_name: string
- seller_name: string
- initiated_by: Initiator (required)
- is_anonymous: boolean
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- status: TradeStatus (required)
- final_quantity_mt: unknown
- final_price_per_mt: unknown
- final_total_usd: unknown
- commission_rate_pct: string
- commission_amount_usd: unknown
- confirmed_at: unknown
- delivered_at: unknown
- paid_at: unknown
- created_at: string(date-time) (required)
- product_id: unknown
- product_name: string
- market_product: unknown
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window: unknown
- region: string
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- unknown_count: integer

### TradeTapeEntry
- id: string (required)
- product_id: unknown
- market_product: unknown
- fuel_type: string (required)
- fuel_grade: string (required)
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- total_usd: string (required)
- confirmed_at: string(date-time) (required)
- availability_window: string (required)
- is_demo_trade: boolean
- scope: string
- provenance_kind: string
- source_kind: MarketSourceKind
- demo_status: MarketDemoStatus

### TradeTapeResponse
- items: TradeTapeEntry[] (required)
- total: integer (required)
- market_hours: boolean (required)

### TutorialStepRow
- step: string (required)
- completed: AggregateCell (required)
- skipped: AggregateCell (required)

### UserCreate
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- password: string (required)
- organization_id: unknown
- referral_code: unknown

### UserResponse
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- id: string(uuid) (required, uuid)
- status: UserStatus (required)
- organization_id: unknown
- referral_code: unknown
- must_change_password: boolean

### UserUpdate
- first_name: unknown
- last_name: unknown
- role: unknown

### ValidationError
- loc: any[] (required)
- msg: string (required)
- type: string (required)
- input: unknown
- ctx: object

### VesselResponse
- name: string (required)
- imo_number: string (required)
- vessel_type: unknown
- flag_state: unknown
- dwt: unknown
- cii_rating: unknown
- eu_ets_status: unknown
- fueleu_status: unknown
- current_location: unknown
- previous_location: unknown
- lat: unknown
- lng: unknown
- prev_lat: unknown
- prev_lng: unknown
- id: string (required)
- organization_id: unknown
- updated_at: string(date-time) (required)

### WatchlistCreateRequest
- name: string (required)

### WatchlistDetailResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- kind: string (required)
- unread_event_count: integer
- latest_event_at: unknown
- total_slice_count: integer
- has_more_slices: boolean
- slices: WatchlistSliceResponse[]
- created_at: string(date-time) (required)

### WatchlistEntryAddRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown

### WatchlistEntryResponse
- id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- best_bid: unknown
- best_ask: unknown
- created_at: string(date-time) (required)

### WatchlistEventResponse
- id: string(uuid) (required, uuid)
- watchlist_id: string(uuid) (required, uuid)
- watchlist_target_id: string(uuid) (required, uuid)
- target_type: string (required)
- event_type: string (required)
- event_payload: object
- source_kind: MarketSourceKind
- scope: MarketScope
- demo_status: MarketDemoStatus
- observed_at: unknown
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- order_id: unknown
- is_read: boolean (required)
- created_at: string(date-time) (required)

### WatchlistEventsPageResponse
- items: WatchlistEventResponse[]
- next_cursor: unknown

### WatchlistResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- entry_count: integer
- entries: WatchlistEntryResponse[]
- created_at: string(date-time) (required)

### WatchlistSliceResponse
- id: string(uuid) (required, uuid)
- target_type: string
- market_product_code: string (required)
- delivery_point_id: string(uuid) (required, uuid)
- delivery_point_name: unknown
- availability_window_code: string (required)
- active_order_count: integer
- unread_event_count: integer
- latest_event_at: unknown
- pins: WatchlistTargetResponse[]
- created_at: string(date-time) (required)

### WatchlistSummaryResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- kind: string (required)
- unread_event_count: integer
- latest_event_at: unknown
- total_slice_count: integer
- has_more_slices: boolean
- slices: WatchlistSliceResponse[]
- created_at: string(date-time) (required)

### WatchlistTargetResponse
- id: string(uuid) (required, uuid)
- target_type: string (required)
- market_product_code: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- availability_window_code: unknown
- order_id: unknown
- snapshot_price_per_mt_usd: unknown
- snapshot_quantity_mt: unknown
- snapshot_remaining_quantity_mt: unknown
- snapshot_status: unknown
- snapshot_side: unknown
- snapshot_market_product: unknown
- snapshot_delivery_point_name: unknown
- snapshot_availability_window: unknown
- snapshot_counterparty_label: unknown
- active_order_count: integer
- unread_event_count: integer
- latest_event_at: unknown
- created_at: string(date-time) (required)

### app__routers__admin_analytics__OverviewResponse
- total_users: integer (required)
- active_users_7d: integer (required)
- total_organizations: integer (required)
- total_orders: integer (required)
- open_orders: integer (required)
- total_trades: integer (required)
- confirmed_trades: integer (required)
- total_volume_mt: number (required)
- total_revenue_usd: number (required)
- total_gmv_usd: number (required)

### app__schemas__product_analytics__OverviewResponse
- meta: AnalyticsMeta (required)
- kpis: OverviewKpis (required)
- lifecycle: LifecycleStage[]
- activity_trend: ActivityTrend (required)
- marketplace_balance: MarketplaceBalance (required)
- needs_attention: NeedsAttentionItem[]
