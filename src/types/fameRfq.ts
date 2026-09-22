/** Versioned declarations for the Singapore wholesale UCOME B100 RFQ pilot. */
export type FameStandard = 'EN_14214' | 'ASTM_D6751';
export type FameScheme = 'ISCC_EU' | 'REDCERT_EU';
export type FameEvidenceStatus = 'DECLARED' | 'PENDING' | 'AVAILABLE';

export interface FameContractTerms {
    schema_version: 1;
    neat_fame: true;
    standard: FameStandard;
    standard_edition: string;
    max_cfpp_c?: number | null;
    max_ci_gco2e_mj?: number | null;
    delivery_basis: 'EX_TANK' | 'FOB' | 'FCA' | 'CIF';
    named_location: string;
    delivery_start: string;
    delivery_end: string;
    quantity_tolerance_pct: number;
    min_fill_mt: number;
    payment_terms: string;
    inspection_terms: string;
    title_risk_terms: string;
    claims_terms: string;
    sustainability_scheme: FameScheme;
    evidence_due: 'BEFORE_LOADING' | 'BEFORE_DELIVERY';
}

export interface FameOfferTerms {
    schema_version: 1;
    matches_contract_terms: true;
    batch_reference: string;
    producing_site: string;
    production_origin: string;
    feedstock_origin: string;
    shipping_location: string;
    uco_mass_pct: 100;
    standard: FameStandard;
    standard_edition: string;
    cfpp_c?: number | null;
    ci_gco2e_mj?: number | null;
    ci_methodology?: string | null;
    sustainability_scheme: FameScheme;
    certificate_reference: string;
    certificate_holder: string;
    certificate_valid_until: string;
    evidence_status: FameEvidenceStatus;
    document_references: string[];
    available_quantity_mt: number;
    lhv_mj_kg?: number | null;
}

export interface FameRfqCreateInput {
    product_id: string;
    delivery_point_id: string;
    quantity_mt: number;
    target_price_per_mt?: number;
    availability_window: string;
    notes?: string;
    is_anonymous: boolean;
    expires_in_hours: number;
    contract_terms: FameContractTerms;
}

export interface FameQuoteInput {
    price_per_mt_usd: number;
    notes?: string;
    expires_at: string;
    offer_terms: FameOfferTerms;
}

export interface FameQuote {
    id: string;
    sellerOrgId: string;
    sellerOrgName: string | null;
    pricePerMtUsd: number;
    notes: string | null;
    status: string;
    createdAt: string;
    expiresAt: string | null;
    isExpired: boolean;
    revision: number;
    offerTerms: FameOfferTerms | null;
}

export interface FameRfq {
    id: string;
    buyerOrgId: string | null;
    buyerOrgName: string | null;
    isAnonymous: boolean;
    productId: string;
    productName: string | null;
    deliveryPointId: string | null;
    deliveryPointName: string | null;
    quantityMt: number;
    targetPricePerMt: number | null;
    notes: string | null;
    status: string;
    expiresAt: string;
    createdAt: string;
    quoteCount: number;
    quotes: FameQuote[];
    contractTerms: FameContractTerms | null;
    executionEnabled: boolean;
    canCancel: boolean;
}

export interface FameRfqList {
    items: FameRfq[];
    total: number;
}
