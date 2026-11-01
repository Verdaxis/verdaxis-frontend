import type { FameOfferTerms } from './fameRfq';

type TraceabilityField = 'batch_reference' | 'producing_site' | 'production_origin' | 'feedstock_origin' | 'shipping_location';

/** A supplier declaration before a buyer has supplied contract requirements. */
export interface SupplierOfferFuelTerms extends Omit<FameOfferTerms, 'matches_contract_terms' | 'available_quantity_mt' | TraceabilityField> {
    neat_fame: true;
    nomination_status: 'PENDING' | 'IDENTIFIED';
    batch_reference?: string | null;
    producing_site?: string | null;
    production_origin?: string | null;
    feedstock_origin?: string | null;
    shipping_location?: string | null;
}

type PrivateFuelField = 'certificate_reference' | 'certificate_holder' | 'document_references';

/** Public marketplace responses omit identity-bearing declaration fields. */
export interface SupplierOfferPublicFuelTerms extends Omit<SupplierOfferFuelTerms, PrivateFuelField> {
    certificate_reference?: string | null;
    certificate_holder?: string | null;
    document_references?: string[] | null;
}
