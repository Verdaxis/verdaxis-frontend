
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

export interface QuoteRequest {
    id: string;
    portId: string;
    fuelType: 'Methanol' | 'Biofuel' | 'LNG' | 'Ammonia (Green)';
    quantity: number;
    deliveryDate: string;
    vesselId: string;
    status: 'Pending' | 'Quoted' | 'Confirmed';
    supplierId?: string;
    price?: number;
    offers?: QuoteOffer[];
    buyerName?: string; // For Supplier View
    buyerRiskProfile?: RiskProfile; // For Supplier View
}

export interface QuoteOffer {
    id: string;
    requestId: string;
    supplierId: string;
    pricePerMt: number;
    validUntil?: string;
    terms?: string;
    isAccepted: boolean;
    createdAt: string;
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
    id: number;
    title: string;
    desc: string;
    time: string;
    type: 'info' | 'warning' | 'success';
}

export interface MarketWatchItem {
    pair: string;
    val: string;
    change: string;
    up: boolean;
}

export type ViewMode = 'BUYER' | 'SUPPLIER';

// ============== RFQ Marketplace Types ==============
export type FuelGrade = 'Conventional' | 'Green' | 'Bio';
export type AvailabilityWindow = 'Spot' | 'Q1 2025' | 'Q2 2025' | 'Q3 2025' | 'Q4 2025' | 'Q1 2026' | 'Q2 2026' | 'Forward 2027' | 'Forward 2028';
export type TierLabel = 'Tier 1 Producer' | 'Major Trader' | 'Regional Supplier' | 'Independent Supplier';
export type ListingStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type MatchStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export interface PublicListing {
    id: string;
    region: string;
    fuel_type: string;
    fuel_grade: FuelGrade;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: AvailabilityWindow;
    tier_label: TierLabel;
    certifications: string[];
    is_verdaxis_verified: boolean;
    status: ListingStatus;
    created_at: string;
}

export interface RFQMatch {
    id: string;
    listing_id: string;
    buyer_id?: string;
    status: MatchStatus;
    buyer_accepted_terms_at: string;
    created_at: string;
    // De-anonymized details (after match)
    supplier_name?: string;
    buyer_name?: string;
    final_quantity_mt?: number;
    final_price_per_mt?: number;
    final_total_usd?: number;
}

export type Page = 'MAP' | 'MARKETPLACE' | 'FLEET' | 'COMPLIANCE' | 'TRAINING' | 'SETTINGS' | 'DASHBOARD' | 'QUOTES' | 'INVENTORY' | 'STATS' | 'TERMINAL' | 'RFQ_MARKETPLACE' | 'LISTINGS';
