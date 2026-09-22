import type { FameAstmGrade, FameScheme, FameStandard } from './fameRfq';
import type { SupplierOfferFuelTerms, SupplierOfferPublicFuelTerms } from './fameSupplierOffer';

/** Buyer requirements for a standard UCOME B100 order. */
export interface FameOrderBidTerms {
    side: 'BID';
    schema_version: 1;
    neat_fame: true;
    standard: FameStandard;
    standard_edition: string;
    astm_grade?: FameAstmGrade | null;
    en_climate_class?: string | null;
    max_cfpp_c?: number | null;
    max_cloud_point_c?: number | null;
    max_ci_gco2e_mj?: number | null;
    ci_methodology?: string | null;
    ci_boundary?: string | null;
    ci_basis?: 'ACTUAL' | 'DEFAULT' | null;
    sustainability_scheme: FameScheme;
    require_quality_evidence: boolean;
    require_sustainability_evidence: boolean;
    evidence_due: 'BEFORE_LOADING' | 'BEFORE_DELIVERY';
}

/** Supplier declarations submitted through the standard ASK order endpoint. */
export interface FameOrderAskTerms extends SupplierOfferFuelTerms {
    side: 'ASK';
    evidence_due: 'BEFORE_LOADING' | 'BEFORE_DELIVERY';
}

export type FameOrderTerms = FameOrderBidTerms | FameOrderAskTerms;

/** Anonymous order views retain fuel specifications and omit supplier identifiers. */
export interface FameOrderPublicAskTerms extends SupplierOfferPublicFuelTerms {
    side: 'ASK';
    evidence_due: 'BEFORE_LOADING' | 'BEFORE_DELIVERY';
}

export type FameOrderPublicTerms = FameOrderBidTerms | FameOrderPublicAskTerms;

/** Both sides' requirements and declarations are frozen when a trade is created. */
export interface FameTermsSnapshot {
    schema_version: 1;
    bid: FameOrderBidTerms;
    ask: FameOrderPublicAskTerms;
}
