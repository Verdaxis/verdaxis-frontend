
export interface GeoLocation {
    lat: number;
    lng: number;
}

export interface PortDetails {
    congestionLevel: 'Low' | 'Moderate' | 'High';
    avgWaitingTime: number; // hours
    activeBarges: number;
    forecastSupply: 'Tight' | 'Balanced' | 'Surplus';
    priceHistory: number[]; // Last 7 days
    // New Financial Data
    plattsPrice?: number;
    ffaPrice?: number;
    swapPrice?: number;
    lastDone?: string; // e.g., "500MT @ $540"
    upcomingProjects?: { 
        year: string; 
        project: string; 
        capacity: string; 
    }[];
}

export interface Port {
    id: string;
    name: string;
    location: GeoLocation;
    country: string;
    methanolSupply: 'High' | 'Medium' | 'Low';
    biofuelSupply: 'High' | 'Medium' | 'Low';
    priceMethanol: number; // USD per MT
    priceTrend: number; // Percentage change
    details?: PortDetails; // Dynamic intelligence data
}

export interface RiskProfile {
    creditScore: number; // 0-100
    kybStatus: 'Verified' | 'Pending' | 'Unverified';
    sanctionsClear: boolean;
    paymentTerms: string; // e.g. "Net 30"
    solvencyGrade?: 'AAA' | 'AA' | 'A' | 'B' | 'C'; // For Buyers
    avgPaymentDays?: number; // For Buyers
}

export interface Supplier {
    id: string;
    name: string;
    rating: number;
    isVerdaxisCertified: boolean;
    ports: string[]; // Port IDs
    availableStock: number;
    energyDensity: number; // MJ/kg (Shipergy feature)
    lastDonePrice: number; // ZeroNorth feature
    riskProfile: RiskProfile;
}

export interface Vessel {
    id: string;
    name: string;
    imo: string;
    vesselType: string;
    status: 'At Sea' | 'In Port' | 'Dry Dock';
    complianceEUETS: 'Compliant' | 'Warning' | 'Non-Compliant';
    complianceFuelEU: 'Compliant' | 'Warning' | 'Non-Compliant';
    ciiGrade: 'A' | 'B' | 'C' | 'D' | 'E';
    nextVoyage: string;
    nextDryDock: string;
    location?: GeoLocation; // Live position
    previousLocation?: GeoLocation; // For heading
}

export interface Course {
    id: string;
    title: string;
    description: string;
    duration: string;
    category: 'Safety' | 'Technical' | 'Compliance';
    requiredForFuel: string[]; // e.g. ['Methanol']
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    syllabus: string[];
}

export interface InventoryItem {
    id: string;
    productName: string;
    portId: string;
    portName: string;
    currentStock: number;
    incomingStock: number;
    pricePerMt: number;
    status: 'Available' | 'Low Stock' | 'Out of Stock';
    certification_declared?: boolean;
    certification_scheme?: string | null;
    specification_standard?: string | null;
    msds_available?: boolean;
    carbon_intensity_gco2_mj?: number | null;
    carbon_intensity_method?: string | null;
    feedstock?: string | null;
    origin?: string | null;
    off_spec?: boolean;
    off_spec_notes?: string | null;
}

export interface TraceEvent {
    id: string;
    stage: 'Origin' | 'Production' | 'Logistics' | 'Bunkering' | 'Combustion';
    location: string;
    timestamp: string;
    description: string;
    verificationType: 'Document' | 'Digital Twin' | 'Physical Tracer';
    verificationId: string; // e.g. Cert ID or Nanolumi Tag
    status: 'Verified' | 'Pending';
}

export interface Notification {
    id: string;
    type: 'SYSTEM' | 'ORDER_UPDATE' | 'DIRECT_ORDER' | 'DIRECT_ORDER_OFFER' | 'USER_STATUS';
    title: string;
    message: string;
    data?: any;
    is_read: boolean;
    created_at: string;
}

export interface MarketWatchItem {
    pair: string;
    val: string;
    change: string;
    up: boolean;
}

export type ViewMode = 'BUYER' | 'SUPPLIER';

// ============== Catalog Types ==============
export const MARKET_PRODUCTS = [
    'BIO_METHANOL',
    'E_METHANOL',
    'BIO_ETHANOL',
    'SYNTHETIC_ETHANOL',
] as const;

export type MarketProduct = typeof MARKET_PRODUCTS[number];

export interface Product {
    id: string;
    name: string;
    market_product?: MarketProduct | null;
    fuel_type: string;
    fuel_grade: string;
    unit: string;
    min_lot_size: number;
    spec_description?: string;
    is_active: boolean;
}

export interface DeliveryPoint {
    id: string;
    name: string;
    region: string;
    timezone?: string;
    is_active: boolean;
}

// ============== Order Marketplace Types ==============
export type FuelGrade = 'Conventional' | 'Green' | 'Bio' | 'E' | 'Synthetic';
export type AvailabilityWindow = string; // Canonical API codes: SPOT, YYYY-MM, YYYY-QN, and legacy YYYY-CAL
export type TierLabel = 'TIER_1_PRODUCER' | 'MAJOR_TRADER' | 'REGIONAL_SUPPLIER' | 'INDEPENDENT';

// ============== Unified Orderbook Types ==============
export type OrderSide = 'BID' | 'ASK';
export type OrderBookStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
export type TradeStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DELIVERED' | 'PAID' | 'CANCELLED' | 'DECLINED';
export type Initiator = 'BUYER' | 'SELLER';

export interface OrderBookOrder {
    id: string;
    organization_id?: string; // Only in "my" view
    side: OrderSide;
    // Product/DeliveryPoint FK fields (new model)
    product_id?: string;
    product_name?: string;
    market_product?: MarketProduct | null;
    delivery_point_id?: string;
    delivery_point_name?: string;
    // Denormalized fields from product/delivery_point (always present in API responses)
    fuel_type: string;
    fuel_grade: FuelGrade;
    region: string;
    port_id?: string;
    vessel_id?: string;
    quantity_mt: number;
    remaining_quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: AvailabilityWindow;
    certifications: string[];
    certification_declared?: boolean;
    certification_scheme?: string | null;
    specification_standard?: string | null;
    msds_available?: boolean;
    is_verdaxis_verified: boolean;
    carbon_intensity_gco2_mj?: number | null;
    carbon_intensity_method?: string | null;
    feedstock?: string | null;
    origin?: string | null;
    off_spec?: boolean;
    off_spec_notes?: string | null;
    tier_label: TierLabel;
    status: OrderBookStatus;
    expires_at?: string;
    created_at: string;
    updated_at?: string;
    trade_count?: number; // Only in "my" view
    benchmark_price_per_mt_usd?: number | null;
    premium_discount_per_mt_usd?: number | null;
    benchmark_source?: string | null;
}

export interface SupplierListingTemplate {
    product_id: string;
    delivery_point_id: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: AvailabilityWindow;
    certifications: string[];
    certification_declared: boolean;
    certification_scheme?: string | null;
    specification_standard?: string | null;
    msds_available?: boolean;
    carbon_intensity_gco2_mj?: number | null;
    carbon_intensity_method?: string | null;
    feedstock?: string | null;
    origin?: string | null;
    off_spec?: boolean;
    off_spec_notes?: string | null;
}

export interface Trade {
    id: string;
    bid_order_id?: string;
    ask_order_id?: string;
    buyer_id: string;
    seller_id: string;
    buyer_name: string;
    seller_name: string;
    initiated_by: Initiator;
    is_anonymous: boolean;
    quantity_mt: number;
    price_per_mt_usd: number;
    status: TradeStatus;
    final_quantity_mt?: number;
    final_price_per_mt?: number;
    final_total_usd?: number;
    commission_rate_pct: number;
    commission_amount_usd?: number;
    confirmed_at?: string;
    delivered_at?: string;
    paid_at?: string;
    created_at: string;
    // Denormalized from order product/delivery_point
    product_id?: string;
    product_name?: string;
    market_product?: MarketProduct | null;
    delivery_point_id?: string;
    delivery_point_name?: string;
    fuel_type: string;
    fuel_grade?: FuelGrade;
    region: string;
}

export interface AggregatedOrderbook {
    delivery_point_name?: string;
    region: string;
    fuel_type: string;
    side: OrderSide;
    min_price: number;
    max_price: number;
    total_quantity: number;
    order_count: number;
}

// ============== Price Discovery Types ==============
export interface PriceSummary {
    fuel_type: string;
    region: string;
    last_price: number | null;
    avg_price_24h: number | null;
    high_24h: number | null;
    low_24h: number | null;
    volume_24h: number;
    trade_count_24h: number;
    price_change_pct: number | null;
    last_trade_at: string | null;
}

export interface PriceDiscoveryResponse {
    summaries: PriceSummary[];
    generated_at: string;
}

export interface BenchmarkQuote {
    market_product: MarketProduct;
    delivery_point_id: string;
    delivery_point_name: string;
    availability_window: AvailabilityWindow;
    benchmark_price_per_mt_usd: number;
    source: string;
    generated_at: string;
}

export interface BenchmarkQuoteResponse {
    items: BenchmarkQuote[];
    generated_at: string;
}

// ============== CI-Adjusted Pricing ==============
export interface CIAdjustedPrice {
    base_price_per_mt: number;
    carbon_intensity_gco2_mj: number;
    fueleu_ghg_intensity: number;
    compliance_cost_per_mt: number;
    effective_price_per_mt: number;
    ghg_reduction_pct: number;
}

export interface OrderBookOrderWithCI extends OrderBookOrder {
    ci_adjusted_price?: CIAdjustedPrice | null;
}

// ============== Matchmaking Types ==============
export type MatchStatus = 'SUGGESTED' | 'VIEWED' | 'ACTED' | 'DISMISSED';

export interface MatchSuggestion {
    id: string;
    bid_order_id: string;
    ask_order_id: string;
    score: number;
    match_reasons: string[];
    status: MatchStatus;
    recipient_org_id: string;
    created_at: string;
    bid_order?: OrderBookOrder;
    ask_order?: OrderBookOrder;
}

// ============== Producer Project Types ==============
export type ProjectStatus = 'ANNOUNCED' | 'UNDER_CONSTRUCTION' | 'OPERATIONAL' | 'CANCELLED';

export interface ProducerProject {
    id: string;
    name: string;
    fuel_type: string;
    capacity_kt_per_year?: number | null;
    country: string;
    region?: string | null;
    lat?: number | null;
    lng?: number | null;
    cod_date?: string | null;
    cod_year?: number | null;
    status: ProjectStatus;
    data_source?: string | null;
    gena_project_id?: string | null;
    organization_id?: string | null;
    feedstock?: string | null;
    technology?: string | null;
    carbon_intensity_gco2_mj?: number | null;
    notes?: string | null;
    created_at: string;
}

// ============== Availability Map Types ==============
export type AvailabilityLevel = 'AVAILABLE' | 'LIMITED' | 'NONE';

export interface PortFuelAvailability {
    port_id: string;
    port_name: string;
    lat: number;
    lng: number;
    fuel_type: string;
    total_stock_mt: number;
    supplier_count: number;
    availability_level: AvailabilityLevel;
    avg_price_per_mt: number | null;
}
export type Page = 'MAP' | 'MARKETPLACE' | 'COMPLIANCE' | 'TRAINING' | 'SETTINGS' | 'DASHBOARD' | 'QUOTES' | 'INVENTORY' | 'TERMINAL' | 'ANALYTICS' | 'ORDERBOOK' | 'DEMAND_FEED' | 'TRADES' | 'ADMIN' | 'DATA_ANALYTICS' | 'WATCHLISTS';

// ============== Data Products Types ==============
export interface ForwardCurvePoint {
    availability_window: string;
    mid_price: number | null;
    best_bid: number | null;
    best_ask: number | null;
    spread: number | null;
    volume_mt: number;
    order_count: number;
}

export interface ForwardCurveResponse {
    product_id: string;
    product_name?: string;
    delivery_point_id?: string | null;
    curve: ForwardCurvePoint[];
    generated_at: string;
}

export interface PriceAlert {
    id: string;
    product_id: string;
    delivery_point_id?: string;
    direction: 'above' | 'below';
    threshold_usd: number;
    is_active: boolean;
    triggered_at?: string;
}

export interface Subscription {
    id: string;
    org_id: string;
    tier: 'free' | 'standard' | 'enterprise';
    is_active: boolean;
}

export interface ActivityEvent {
    event: string;
    data: Record<string, unknown>;
    timestamp: string;
}

// ============== RFQ Types ==============
export type RFQStatus = 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type RFQQuoteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface RFQQuote {
    id: string;
    seller_org_id: string;
    seller_org_name?: string;
    price_per_mt_usd: number;
    notes?: string;
    status: RFQQuoteStatus;
    last_counter_by?: 'buyer' | 'seller' | null;
    created_at: string;
}

export interface RFQ {
    id: string;
    reference_number?: string;
    buyer_org_id: string;
    buyer_org_name?: string;
    product_id: string;
    product_name?: string;
    delivery_point_id?: string;
    delivery_point_name?: string;
    quantity_mt: number;
    target_price_per_mt?: number;
    availability_window: string;
    notes?: string;
    is_anonymous: boolean;
    status: RFQStatus;
    expires_at: string;
    created_at: string;
    quote_count: number;
    quotes: RFQQuote[];
}

// ============== Trade Tape Types ==============
export interface TradeTapeEntry {
    id: string;
    market_product?: MarketProduct | null;
    fuel_type: string;
    fuel_grade?: string;
    region: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    confirmed_at: string;
    availability_window?: string;
}

export interface TradeTapeResponse {
    items: TradeTapeEntry[];
    market_hours: boolean;
    total: number;
}

// ============== Watchlist Types ==============
export type WatchlistTargetType = 'SLICE' | 'PIN';

export interface WatchlistTarget {
    id: string;
    target_type: WatchlistTargetType;
    market_product_code?: MarketProduct | null;
    delivery_point_id?: string | null;
    delivery_point_name?: string | null;
    availability_window_code?: string | null;
    order_id?: string | null;
    snapshot_price_per_mt_usd?: number | null;
    snapshot_quantity_mt?: number | null;
    snapshot_remaining_quantity_mt?: number | null;
    snapshot_status?: string | null;
    snapshot_side?: OrderSide | string | null;
    snapshot_market_product?: string | null;
    snapshot_delivery_point_name?: string | null;
    snapshot_availability_window?: string | null;
    snapshot_counterparty_label?: string | null;
    active_order_count: number;
    unread_event_count: number;
    latest_event_at?: string | null;
    created_at: string;
}

export interface WatchlistSlice {
    id: string;
    target_type: 'SLICE';
    market_product_code: MarketProduct;
    delivery_point_id: string;
    delivery_point_name?: string | null;
    availability_window_code: string;
    active_order_count: number;
    unread_event_count: number;
    latest_event_at?: string | null;
    pins: WatchlistTarget[];
    created_at: string;
}

export interface WatchlistSummary {
    id: string;
    name: string;
    kind: string;
    unread_event_count: number;
    latest_event_at?: string | null;
    total_slice_count: number;
    has_more_slices: boolean;
    slices: WatchlistSlice[];
    created_at: string;
}

export interface WatchlistEvent {
    id: string;
    watchlist_id: string;
    watchlist_target_id: string;
    target_type: WatchlistTargetType;
    event_type: string;
    event_payload: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
}

export interface WatchlistEventsPage {
    items: WatchlistEvent[];
    next_cursor?: string | null;
}
