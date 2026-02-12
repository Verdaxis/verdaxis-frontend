
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

// ============== Order Marketplace Types ==============
export type FuelGrade = 'Conventional' | 'Green' | 'Bio';
export type AvailabilityWindow = 'Spot' | 'Q1 2025' | 'Q2 2025' | 'Q3 2025' | 'Q4 2025' | 'Q1 2026' | 'Q2 2026' | 'Q3 2026' | 'Q4 2026' | 'Forward 2027' | 'Forward 2028';
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
    fuel_type: string;
    fuel_grade: FuelGrade;
    region: string;
    port_id?: string;
    vessel_id?: string;
    quantity_mt: number;
    remaining_quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: AvailabilityWindow;
    delivery_window_start?: string;
    delivery_window_end?: string;
    certifications: string[];
    is_verdaxis_verified: boolean;
    tier_label: TierLabel;
    status: OrderBookStatus;
    expires_at?: string;
    created_at: string;
    updated_at?: string;
    trade_count?: number; // Only in "my" view
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
    // Denormalized from order
    fuel_type: string;
    fuel_grade?: FuelGrade;
    region: string;
}

export interface AggregatedOrderbook {
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

// ============== Demand Signal Types ==============
export type UrgencyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DemandSignal {
    fuel_type: string;
    region: string;
    volume_mt: number;
    max_price_per_mt: number;
    urgency: UrgencyLevel;
    bid_count: number;
    earliest_delivery: string;
    created_at: string;
}

export type Page = 'MAP' | 'MARKETPLACE' | 'FLEET' | 'COMPLIANCE' | 'TRAINING' | 'SETTINGS' | 'DASHBOARD' | 'QUOTES' | 'INVENTORY' | 'STATS' | 'TERMINAL' | 'ANALYTICS' | 'ORDERBOOK' | 'DEMAND_FEED';
