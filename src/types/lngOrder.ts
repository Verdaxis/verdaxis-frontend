/**
 * Bio-LNG order terms (`lng_terms`), from the 2026-10-14 market-slice contract.
 * The server stays authoritative: it rejects terms on any other product and
 * derives the generic ASK metadata (scheme, standard, feedstock, origin) itself.
 */

export type LngSustainabilityScheme = 'ISCC_EU' | 'REDCERT_EU';
export type LngChainOfCustody = 'MASS_BALANCE' | 'PHYSICAL_SEGREGATION';
export type LngDeliveryMethod = 'SHIP_TO_SHIP' | 'TRUCK_TO_SHIP' | 'TERMINAL_TO_SHIP';
export type LngFeedstock =
    | 'MANURE'
    | 'FOOD_WASTE'
    | 'SEWAGE_SLUDGE'
    | 'LANDFILL_GAS'
    | 'AGRICULTURAL_RESIDUES'
    | 'OTHER_WASTES_AND_RESIDUES'
    | 'ENERGY_CROPS';
export type LngPosTiming = 'WITH_DELIVERY' | 'AFTER_DELIVERY';

/** Whether the certification was lodged in the EU Union Database. */
export type LngFueleuRecognition = 'UNION_DATABASE' | 'NOT_REGISTERED';

/** The only accepted specification standard for bio-LNG. */
export const LNG_SPECIFICATION_STANDARD = 'ISO 23306:2020';

/** Supplier declarations submitted through the standard ASK order endpoint. */
export interface LngAskTerms {
    side: 'ASK';
    sustainability_scheme: LngSustainabilityScheme;
    /** The seller's own scheme certificate. Omitted from the public view. */
    scheme_certificate_number: string;
    chain_of_custody: LngChainOfCustody;
    union_database_registered: boolean;
    bio_share_pct: number;
    feedstock: LngFeedstock;
    feedstock_detail?: string | null;
    /** ISO 3166-1 alpha-2, uppercase. */
    production_country: string;
    /** PoS well-to-tank value. Excludes engine methane slip. May be negative. */
    wtt_ghg_gco2e_mj: number;
    specification_standard: typeof LNG_SPECIFICATION_STANDARD;
    min_methane_number?: number | null;
    delivery_method: LngDeliveryMethod;
    /** False names the licensed physical supplier in `physical_supplier_name`. */
    seller_is_physical_supplier: boolean;
    physical_supplier_name: string;
    pos_timing: LngPosTiming;
}

/**
 * Anonymous orderbook view. Identity is withheld before confirmation and the
 * recognition flag is derived from `union_database_registered`.
 */
export interface LngPublicAskTerms extends Omit<LngAskTerms, 'scheme_certificate_number' | 'physical_supplier_name'> {
    reseller: boolean;
    fueleu_recognition: LngFueleuRecognition;
}

/** A confirmed trade snapshot carries the full ask; a pending one is redacted. */
export type LngAskTermsView = LngPublicAskTerms | LngAskTerms;

/** Buyer requirements for a bio-LNG order. */
export interface LngBidTerms {
    side: 'BID';
    accepted_schemes: LngSustainabilityScheme[];
    accepted_custody: LngChainOfCustody[];
    require_union_database: boolean;
    min_bio_share_pct?: number | null;
    max_wtt_ghg_gco2e_mj?: number | null;
    accepted_delivery_methods: LngDeliveryMethod[];
    min_methane_number?: number | null;
    /** False means "physical suppliers only". */
    accept_resellers: boolean;
}

export type LngOrderTerms = LngBidTerms | LngAskTerms;
export type LngOrderTermsView = LngBidTerms | LngAskTermsView;

/** Both sides' terms are frozen when a trade is created. */
export interface LngTermsSnapshot {
    bid: LngBidTerms;
    ask: LngAskTermsView;
}

const hasAskIdentity = (ask: LngAskTermsView): ask is LngAskTerms => (
    'physical_supplier_name' in ask || 'scheme_certificate_number' in ask
);

/** Reseller flag and FuelEU recognition, whether or not the API redacted identity. */
export function lngAskRecognition(ask: LngAskTermsView): {
    reseller: boolean;
    fueleu_recognition: LngFueleuRecognition;
} {
    if (hasAskIdentity(ask)) {
        return {
            reseller: !ask.seller_is_physical_supplier,
            fueleu_recognition: ask.union_database_registered ? 'UNION_DATABASE' : 'NOT_REGISTERED',
        };
    }
    return { reseller: ask.reseller, fueleu_recognition: ask.fueleu_recognition };
}
