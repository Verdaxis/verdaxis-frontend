# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**unknown** — 28 models

### AggregatedListingResponse

- `region`: string _(required)_
- `fuel_type`: string _(required)_
- `min_price`: string _(required)_
- `max_price`: string _(required)_
- `total_quantity`: string _(required)_
- `listing_count`: integer _(required)_

### Body_chat_api_ai_chat_post

- `message`: string _(required)_
- `history`: object[]

### Body_verify_document_api_compliance_verify_post

- `file`: string(binary) _(required)_

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

### ComplianceLedgerResponse

- `transaction_type`: string _(required)_
- `amount`: number _(required)_
- `currency`: string
- `units`: unknown
- `description`: unknown
- `reference_id`: unknown
- `id`: string(uuid) _(required, uuid)_
- `organization_id`: unknown
- `created_at`: string(date-time) _(required)_

### HTTPValidationError

- `detail`: ValidationError[]

### InventoryCreate

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: number _(required)_
- `incoming_stock_mt`: number
- `reserved_stock_mt`: number
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean

### InventoryResponse

- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `product_name`: unknown
- `current_stock_mt`: number _(required)_
- `incoming_stock_mt`: number
- `reserved_stock_mt`: number
- `price_per_mt_usd`: unknown
- `energy_density_mj_kg`: unknown
- `is_certified`: boolean
- `id`: string(uuid) _(required, uuid)_
- `supplier_id`: string(uuid) _(required, uuid)_
- `updated_at`: string(date-time) _(required)_

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

### PublicListingCreate

- `region`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: FuelGrade
- `quantity_mt`: unknown _(required)_
- `price_per_mt_usd`: unknown _(required)_
- `availability_window`: AvailabilityWindow
- `certifications`: string[]
- `tier_label`: TierLabel

### PublicListingResponse

- `id`: string(uuid) _(required, uuid)_
- `region`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: FuelGrade _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: AvailabilityWindow _(required)_
- `tier_label`: TierLabel _(required)_
- `certifications`: string[] _(required)_
- `is_verdaxis_verified`: boolean _(required)_
- `status`: ListingStatus _(required)_
- `created_at`: string(date-time) _(required)_

### PublicListingSupplierResponse

- `id`: string(uuid) _(required, uuid)_
- `region`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: FuelGrade _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `availability_window`: AvailabilityWindow _(required)_
- `tier_label`: TierLabel _(required)_
- `certifications`: string[] _(required)_
- `is_verdaxis_verified`: boolean _(required)_
- `status`: ListingStatus _(required)_
- `created_at`: string(date-time) _(required)_
- `supplier_id`: string(uuid) _(required, uuid)_
- `match_count`: integer

### PublicListingUpdate

- `quantity_mt`: unknown
- `price_per_mt_usd`: unknown
- `availability_window`: unknown
- `status`: unknown
- `certifications`: unknown

### QuoteCreate

- `vessel_id`: string(uuid) _(required, uuid)_
- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `quantity_mt`: number _(required)_
- `delivery_window_start`: unknown
- `delivery_window_end`: unknown

### QuoteResponse

- `vessel_id`: string(uuid) _(required, uuid)_
- `port_id`: string _(required)_
- `fuel_type`: FuelType _(required)_
- `quantity_mt`: number _(required)_
- `delivery_window_start`: unknown
- `delivery_window_end`: unknown
- `id`: string(uuid) _(required, uuid)_
- `buyer_id`: unknown
- `status`: QuoteStatus _(required)_
- `awarded_supplier_id`: unknown
- `final_price_usd`: unknown
- `final_price_per_mt`: unknown
- `created_at`: string(date-time) _(required)_
- `updated_at`: string(date-time) _(required)_

### QuoteUpdate

- `status`: unknown
- `final_price_usd`: unknown
- `final_price_per_mt`: unknown
- `awarded_supplier_id`: unknown

### RFQMatchComplete

- `final_quantity_mt`: unknown _(required)_
- `final_price_per_mt`: unknown _(required)_

### RFQMatchDetailResponse

- `id`: string(uuid) _(required, uuid)_
- `listing_id`: string(uuid) _(required, uuid)_
- `buyer_id`: string(uuid) _(required, uuid)_
- `status`: MatchStatus _(required)_
- `buyer_accepted_terms_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_
- `region`: string _(required)_
- `fuel_type`: string _(required)_
- `fuel_grade`: FuelGrade _(required)_
- `quantity_mt`: string _(required)_
- `price_per_mt_usd`: string _(required)_
- `supplier_id`: string(uuid) _(required, uuid)_
- `supplier_name`: string _(required)_
- `buyer_name`: string _(required)_
- `final_quantity_mt`: unknown
- `final_price_per_mt`: unknown
- `final_total_usd`: unknown

### RFQMatchResponse

- `id`: string(uuid) _(required, uuid)_
- `listing_id`: string(uuid) _(required, uuid)_
- `buyer_id`: string(uuid) _(required, uuid)_
- `status`: MatchStatus _(required)_
- `buyer_accepted_terms_at`: string(date-time) _(required)_
- `created_at`: string(date-time) _(required)_

### RFQMatchUpdate

- `status`: MatchStatus _(required)_

### RFQRequestCreate

- `listing_id`: string(uuid) _(required, uuid)_
- `accepted_terms`: boolean _(required)_

### Token

- `access_token`: string _(required)_
- `token_type`: string _(required)_

### UserResponse

- `email`: string(email) _(required)_
- `first_name`: unknown
- `last_name`: unknown
- `role`: UserRole _(required)_
- `id`: string(uuid) _(required, uuid)_
- `status`: UserStatus _(required)_
- `organization_id`: unknown

### ValidationError

- `loc`: any[] _(required)_
- `msg`: string _(required)_
- `type`: string _(required)_

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

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_