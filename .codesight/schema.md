# Schema

### AggregatedListingResponse
- region: string (required)
- fuel_type: string (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- listing_count: integer (required)

### Body_chat_api_ai_chat_post
- message: string (required)
- history: object[]

### Body_verify_document_api_compliance_verify_post
- file: string(binary) (required)

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

### PublicListingCreate
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade
- quantity_mt: unknown (required)
- price_per_mt_usd: unknown (required)
- availability_window: AvailabilityWindow
- certifications: string[]
- tier_label: TierLabel

### PublicListingResponse
- id: string(uuid) (required, uuid)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: AvailabilityWindow (required)
- tier_label: TierLabel (required)
- certifications: string[] (required)
- is_verdaxis_verified: boolean (required)
- status: ListingStatus (required)
- created_at: string(date-time) (required)

### PublicListingSupplierResponse
- id: string(uuid) (required, uuid)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: AvailabilityWindow (required)
- tier_label: TierLabel (required)
- certifications: string[] (required)
- is_verdaxis_verified: boolean (required)
- status: ListingStatus (required)
- created_at: string(date-time) (required)
- supplier_id: string(uuid) (required, uuid)
- match_count: integer

### PublicListingUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- status: unknown
- certifications: unknown

### QuoteCreate
- vessel_id: string(uuid) (required, uuid)
- port_id: string (required)
- fuel_type: FuelType (required)
- quantity_mt: number (required)
- delivery_window_start: unknown
- delivery_window_end: unknown

### QuoteResponse
- vessel_id: string(uuid) (required, uuid)
- port_id: string (required)
- fuel_type: FuelType (required)
- quantity_mt: number (required)
- delivery_window_start: unknown
- delivery_window_end: unknown
- id: string(uuid) (required, uuid)
- buyer_id: unknown
- status: QuoteStatus (required)
- awarded_supplier_id: unknown
- final_price_usd: unknown
- final_price_per_mt: unknown
- created_at: string(date-time) (required)
- updated_at: string(date-time) (required)

### QuoteUpdate
- status: unknown
- final_price_usd: unknown
- final_price_per_mt: unknown
- awarded_supplier_id: unknown

### RFQMatchComplete
- final_quantity_mt: unknown (required)
- final_price_per_mt: unknown (required)

### RFQMatchDetailResponse
- id: string(uuid) (required, uuid)
- listing_id: string(uuid) (required, uuid)
- buyer_id: string(uuid) (required, uuid)
- status: MatchStatus (required)
- buyer_accepted_terms_at: string(date-time) (required)
- created_at: string(date-time) (required)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- supplier_id: string(uuid) (required, uuid)
- supplier_name: string (required)
- buyer_name: string (required)
- final_quantity_mt: unknown
- final_price_per_mt: unknown
- final_total_usd: unknown

### RFQMatchResponse
- id: string(uuid) (required, uuid)
- listing_id: string(uuid) (required, uuid)
- buyer_id: string(uuid) (required, uuid)
- status: MatchStatus (required)
- buyer_accepted_terms_at: string(date-time) (required)
- created_at: string(date-time) (required)

### RFQMatchUpdate
- status: MatchStatus (required)

### RFQRequestCreate
- listing_id: string(uuid) (required, uuid)
- accepted_terms: boolean (required)

### Token
- access_token: string (required)
- token_type: string (required)

### UserResponse
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- id: string(uuid) (required, uuid)
- status: UserStatus (required)
- organization_id: unknown

### ValidationError
- loc: any[] (required)
- msg: string (required)
- type: string (required)

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
