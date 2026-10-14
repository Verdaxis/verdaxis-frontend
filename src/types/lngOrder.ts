/**
 * Bio-LNG (`BIO_LNG`) order terms.
 *
 * These names and enum values are the shared contract with the backend
 * `lng_terms` payload. See
 * `biolng-backend/docs/plans/2026-10-14-bio-lng-design.md` (section 3).
 * Do not rename them here without changing the server.
 */

export const SUSTAINABILITY_SCHEMES = ['ISCC_EU', 'REDCERT_EU'] as const;
export type SustainabilityScheme = (typeof SUSTAINABILITY_SCHEMES)[number];

export const CHAINS_OF_CUSTODY = ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'] as const;
export type ChainOfCustody = (typeof CHAINS_OF_CUSTODY)[number];

export const DELIVERY_METHODS = ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const FEEDSTOCK_CATEGORIES = [
    'MANURE',
    'FOOD_WASTE',
    'SEWAGE_SLUDGE',
    'LANDFILL_GAS',
    'AGRICULTURAL_RESIDUES',
    'OTHER_WASTES_AND_RESIDUES',
    'ENERGY_CROPS',
] as const;
export type FeedstockCategory = (typeof FEEDSTOCK_CATEGORIES)[number];

export const POS_TIMINGS = ['WITH_DELIVERY', 'AFTER_DELIVERY'] as const;
export type PosTiming = (typeof POS_TIMINGS)[number];

/** The only specification standard accepted for bio-LNG. */
export const LNG_SPECIFICATION_STANDARD = 'ISO 23306:2020';

/** FuelEU recognition of the buyer-visible ask, derived by the server. */
export const LNG_FUELEU_RECOGNITION = ['UNION_DATABASE', 'NOT_REGISTERED'] as const;
export type LngFueleuRecognition = (typeof LNG_FUELEU_RECOGNITION)[number];

/** Stable error code returned when a direct take fails the terms check. */
export const LNG_TERMS_INCOMPATIBLE = 'LNG_TERMS_INCOMPATIBLE';

/**
 * Server-side field bounds. The client mirrors them so an order is never sent
 * with values the API will reject.
 */
export const LNG_TERMS_LIMITS = {
    certificateNumberMin: 3,
    certificateNumberMax: 64,
    feedstockDetailMax: 200,
    bioSharePctMin: 1,
    bioSharePctMax: 100,
    /** The certified well-to-tank value can be negative (for example manure). */
    wttGhgMin: -150,
    wttGhgMax: 100,
    minMethaneNumberMin: 0,
    minMethaneNumberMax: 100,
    physicalSupplierNameMin: 2,
    physicalSupplierNameMax: 120,
} as const;

/** ISO 3166-1 alpha-2, uppercase. */
export const ISO_COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

/** Seller declarations. Required on a BIO_LNG ask, rejected on any other product. */
export interface LngAskTerms {
    side: 'ASK';
    sustainability_scheme: SustainabilityScheme;
    /** The seller's own scheme certificate, not the physical supplier's. */
    scheme_certificate_number: string;
    chain_of_custody: ChainOfCustody;
    union_database_registered: boolean;
    bio_share_pct: number;
    feedstock: FeedstockCategory;
    feedstock_detail?: string;
    production_country: string;
    /** PoS well-to-tank value. Excludes engine methane slip. */
    wtt_ghg_gco2e_mj: number;
    specification_standard: typeof LNG_SPECIFICATION_STANDARD;
    min_methane_number?: number;
    delivery_method: DeliveryMethod;
    seller_is_physical_supplier: boolean;
    /** The licensed physical supplier or bunkering partner when the seller resells. */
    physical_supplier_name: string;
    pos_timing: PosTiming;
}

/**
 * The public order book view of an ask. Identity is withheld until the trade is
 * confirmed, so the certificate number and supplier name are absent.
 */
export interface LngPublicAskTerms extends Omit<LngAskTerms, 'scheme_certificate_number' | 'physical_supplier_name'> {
    /** Derived: the seller is not the physical supplier. */
    reseller: boolean;
    /** Derived from `union_database_registered`. */
    fueleu_recognition: LngFueleuRecognition;
}

/** Buyer requirements. */
export interface LngBidTerms {
    side: 'BID';
    accepted_schemes: SustainabilityScheme[];
    accepted_custody: ChainOfCustody[];
    require_union_database: boolean;
    min_bio_share_pct?: number;
    max_wtt_ghg_gco2e_mj?: number;
    accepted_delivery_methods: DeliveryMethod[];
    min_methane_number?: number;
    /** "Physical suppliers only" sets this to false. */
    accept_resellers: boolean;
}

/** Terms as stored on an order before the public projection. */
export type LngOrderTerms = LngAskTerms | LngBidTerms;

/**
 * Any `lng_terms` payload a client may receive. The full ask reaches the client
 * only through a confirmed trade snapshot.
 */
export type LngVisibleTerms = LngAskTerms | LngPublicAskTerms | LngBidTerms;

/** Frozen on the trade at creation and immutable afterwards. */
export interface LngTradeSnapshot {
    bid: LngBidTerms;
    ask: LngAskTerms;
}

/** Trade snapshot as published before confirmation. */
export interface LngPublicTradeSnapshot {
    bid: LngBidTerms;
    ask: LngPublicAskTerms;
}
