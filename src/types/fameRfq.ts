import type { SupplierOfferSnapshot } from './fameSupplierOffer';

/** Versioned declarations for the Singapore wholesale UCOME B100 RFQ pilot. */
export type FameStandard = 'EN_14214' | 'ASTM_D6751';
export type FameScheme = 'ISCC_EU' | 'REDCERT_EU';
export type FameEvidenceStatus = 'DECLARED' | 'PENDING' | 'AVAILABLE';
export type FameAstmGrade = '1-B S15' | '1-B S15 LM' | '1-B S500' | '2-B S15' | '2-B S15 LM' | '2-B S500';
export type FameQualityProperty =
    | 'ESTER_CONTENT_MASS_PCT' | 'DENSITY_15C_KG_M3' | 'KINEMATIC_VISCOSITY_40C_MM2_S'
    | 'WATER_MG_KG' | 'WATER_AND_SEDIMENT_VOL_PCT' | 'ACID_VALUE_MG_KOH_G'
    | 'OXIDATION_STABILITY_H' | 'SULFUR_MG_KG' | 'FLASH_POINT_C'
    | 'FREE_GLYCEROL_MASS_PCT' | 'TOTAL_GLYCEROL_MASS_PCT' | 'MONOGLYCERIDES_MASS_PCT'
    | 'PHOSPHORUS_MG_KG' | 'SODIUM_POTASSIUM_MG_KG' | 'CALCIUM_MAGNESIUM_MG_KG'
    | 'METHANOL_MASS_PCT' | 'TOTAL_CONTAMINATION_MG_KG';

export interface FameQualityResult {
    property: FameQualityProperty;
    value: number;
    method?: string | null;
}

export interface FameQualityEvidence {
    status: 'PENDING' | 'AVAILABLE';
    reference?: string | null;
    batch_reference?: string | null;
    laboratory?: string | null;
    sampled_on?: string | null;
    tested_on?: string | null;
    results: FameQualityResult[];
}

export interface FameSustainabilityEvidence {
    status: 'PENDING' | 'AVAILABLE';
    document_type: 'POS' | 'SD' | 'POC';
    reference?: string | null;
    issuer?: string | null;
    quantity_mt?: number | null;
    supply_date?: string | null;
    due: 'BEFORE_LOADING' | 'BEFORE_DELIVERY';
}

export interface FameContractTerms {
    schema_version: 1;
    neat_fame: true;
    standard: FameStandard;
    standard_edition: string;
    astm_grade?: FameAstmGrade | null;
    en_climate_class?: string | null;
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
    neat_fame?: true;
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
    astm_grade?: FameAstmGrade | null;
    en_climate_class?: string | null;
    cloud_point_c?: number | null;
    ci_boundary?: string | null;
    ci_basis?: 'ACTUAL' | 'DEFAULT' | null;
    certificate_scope?: string | null;
    quality_evidence?: FameQualityEvidence | null;
    sustainability_evidence?: FameSustainabilityEvidence | null;
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
    source_offer_id?: string;
    expected_source_offer_revision?: number;
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
    sourceOfferId?: string | null;
    targetSupplierOrgId?: string | null;
    sourceOfferSnapshot?: SupplierOfferSnapshot | null;
}

export interface FameRfqList {
    items: FameRfq[];
    total: number;
}
