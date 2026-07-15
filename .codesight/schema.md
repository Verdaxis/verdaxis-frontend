# Schema

### AdminRejectBody
- reason: string (required)

### AggregatedOrderbookResponse
- product_id: string(uuid) (required, uuid)
- product_name: string
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- side: OrderSide (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- order_count: integer (required)

### AlertCreate
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
- direction: string (required)
- threshold_usd: unknown (required)

### AlertResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown (required)
- direction: string (required)
- threshold_usd: string (required)
- is_active: boolean (required)
- triggered_at: unknown (required)
- created_at: string(date-time) (required)

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

### Body_chat_api_ai_chat_post
- message: string (required)
- history: object[]

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

### Body_verify_document_api_compliance_verify_post
- file: string (required)

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

### ComplianceLedgerResponse
- transaction_type: string (required)
- amount: number (required)
- currency: string
- units: unknown
- description: unknown
- reference_id: unknown
- id: string(uuid) (required, uuid)
- organization_id: unknown
- created_at: string(date-time) (required)

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

### DailyStat
- date: string(date) (required)
- orders_placed: integer (required)
- trades_executed: integer (required)
- volume_mt: number (required)
- gmv_usd: number (required)
- commission_usd: number (required)

### DeliveryPointResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- region: string (required)
- timezone: unknown
- is_active: boolean (required)

### DemandSignal
- fuel_type: string (required)
- region: string (required)
- volume_mt: string (required)
- max_price_per_mt: string (required)
- urgency: UrgencyLevel (required)
- bid_count: integer (required)
- earliest_delivery: string (required)
- created_at: string(date-time) (required)

### EUETSResponse
- total_co2_tonnes: string (required)
- ets_price_per_tonne_eur: string (required)
- phase_in_pct: string (required)
- estimated_cost_eur: string (required)
- score: integer (required)

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

### FuelEUResponse
- ghg_intensity_gco2_mj: string (required)
- target_intensity_gco2_mj: string (required)
- reduction_pct: string (required)
- compliance_balance_gco2: string (required)
- estimated_penalty_eur: string (required)
- score: integer (required)

### HTTPValidationError
- detail: ValidationError[]

### InventoryCreate
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean

### InventoryItemUpdate
- product_name: unknown
- current_stock_mt: unknown
- incoming_stock_mt: unknown
- price_per_mt_usd: unknown

### InventoryResponse
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- id: string(uuid) (required, uuid)
- supplier_id: string(uuid) (required, uuid)
- updated_at: string(date-time) (required)

### LeaderboardEntry
- rank: integer (required)
- user_name: string (required)
- organization_name: unknown
- referral_count: integer (required)

### NegotiationCounterRequest
- proposed_price: unknown (required)
- notes: unknown

### NegotiationCreateRequest
- bid_order_id: unknown
- ask_order_id: unknown
- counterparty_org_id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
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
- initiator_side: string (required)
- product_id: string(uuid) (required, uuid)
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

### OrderCreate
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

### OrderMyResponse
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean
- organization_id: string(uuid) (required, uuid)
- vessel_id: unknown
- updated_at: string(date-time) (required)
- trade_count: integer

### OrderResponse
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean

### OrderResponseWithCI
- id: string(uuid) (required, uuid)
- side: OrderSide (required)
- product_id: string(uuid) (required, uuid)
- product_name: string
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
- carbon_intensity_gco2_mj: unknown
- is_crossed: boolean
- ci_adjusted_price: unknown

### OrderUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- certifications: unknown
- expires_at: unknown

### OrganizationCreate
- name: string (required)
- type: OrgType (required)
- tax_id: unknown
- country_code: unknown

### OverviewResponse
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

### PortFuelAvailability
- port_id: string (required)
- port_name: string (required)
- lat: number (required)
- lng: number (required)
- fuel_type: string (required)
- total_stock_mt: string (required)
- supplier_count: integer (required)
- availability_level: AvailabilityLevel (required)
- avg_price_per_mt: unknown

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
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- last_price: unknown
- avg_price_24h: unknown
- high_24h: unknown
- low_24h: unknown
- volume_24h: string
- trade_count_24h: integer
- price_change_pct: unknown
- last_trade_at: unknown

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

### ProductResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- fuel_type: string (required)
- fuel_grade: string (required)
- unit: string (required)
- min_lot_size: string (required)
- is_active: boolean (required)

### RFQCreateRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown
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
- buyer_org_id: string(uuid) (required, uuid)
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

### ReferencePriceItem
- product_id: unknown
- product_name: string
- fuel_type: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string
- vwap_usd: string (required)
- total_volume_mt: string (required)
- trade_count: integer (required)
- date: string(date) (required)
- visibility: string

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

### ScenarioInput
- vessel_id: string (required)
- fuel_mix: object (required)
- year: integer

### SubscriptionResponse
- id: string(uuid) (required, uuid)
- org_id: string(uuid) (required, uuid)
- tier: SubscriptionTier (required)
- started_at: unknown
- expires_at: unknown
- is_active: boolean (required)

### SubscriptionUpdate
- tier: SubscriptionTier (required)

### SystemHealth
- status: string (required)
- uptime_seconds: number (required)
- cpu_usage_pct: number (required)
- memory_usage_pct: number (required)
- disk_free_gb: number (required)
- disk_used_pct: number (required)
- platform: string (required)

### Token
- access_token: string (required)
- token_type: string (required)

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
- fuel_type: string
- fuel_grade: string
- delivery_point_id: unknown
- delivery_point_name: unknown
- region: string

### TradeTapeEntry
- id: string (required)
- fuel_type: string (required)
- fuel_grade: string (required)
- region: string (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- total_usd: string (required)
- confirmed_at: string(date-time) (required)
- availability_window: string (required)

### TradeTapeResponse
- items: TradeTapeEntry[] (required)
- total: integer (required)
- market_hours: boolean (required)

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

### WatchlistEntryAddRequest
- product_id: string(uuid) (required, uuid)
- delivery_point_id: unknown

### WatchlistEntryResponse
- id: string(uuid) (required, uuid)
- product_id: string(uuid) (required, uuid)
- product_name: unknown
- delivery_point_id: unknown
- delivery_point_name: unknown
- created_at: string(date-time) (required)

### WatchlistResponse
- id: string(uuid) (required, uuid)
- name: string (required)
- entry_count: integer
- entries: WatchlistEntryResponse[]
- created_at: string(date-time) (required)
