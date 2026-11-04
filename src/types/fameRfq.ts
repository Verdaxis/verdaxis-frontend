
/** Versioned FAME declarations that the standard UCOME B100 order terms share. */
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
