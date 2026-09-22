import type { FameContractTerms, FameOfferTerms } from './fameRfq';

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

export interface SupplierOfferListingTerms {
    delivery_basis: FameContractTerms['delivery_basis'];
    named_location: string;
    delivery_start: string;
    delivery_end: string;
    quantity_tolerance_pct: number;
    payment_terms?: string | null;
    inspection_terms?: string | null;
    title_risk_terms?: string | null;
    claims_terms?: string | null;
    evidence_due: FameContractTerms['evidence_due'];
    notes?: string | null;
    fuel_terms: SupplierOfferFuelTerms;
}

/** Buyers receive the public declaration inside a frozen source snapshot. */
export interface SupplierOfferPublicListingTerms extends Omit<SupplierOfferListingTerms, 'fuel_terms'> {
    fuel_terms: SupplierOfferPublicFuelTerms;
}

export interface SupplierOfferCreateInput extends SupplierOfferListingTerms {
    product_id: string;
    delivery_point_id: string;
    quantity_mt: number;
    min_fill_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    expires_at: string;
}

export interface SupplierOfferUpdateInput extends SupplierOfferCreateInput {
    expected_revision: number;
}

export type SupplierOfferStatus = 'OPEN' | 'WITHDRAWN' | 'EXPIRED';

export interface SupplierOffer {
    id: string;
    productId: string;
    productName: string | null;
    deliveryPointId: string;
    deliveryPointName: string | null;
    quantityMt: number;
    minFillMt: number;
    pricePerMtUsd: number;
    availabilityWindow: string;
    deliveryBasis: FameContractTerms['delivery_basis'];
    namedLocation: string;
    deliveryStart: string;
    deliveryEnd: string;
    quantityTolerancePct: number;
    paymentTerms: string | null;
    inspectionTerms: string | null;
    titleRiskTerms: string | null;
    claimsTerms: string | null;
    evidenceDue: FameContractTerms['evidence_due'];
    expiresAt: string;
    notes: string | null;
    fuelTerms: SupplierOfferPublicFuelTerms;
    status: SupplierOfferStatus;
    revision: number;
    createdAt: string;
    updatedAt: string;
    executionEnabled: false;
    listingKind: 'SUPPLIER_OFFER';
    canEdit: boolean;
    canWithdraw: boolean;
    canRequestQuote: boolean;
    supplierOrgId?: string | null;
    supplierUserId?: string | null;
}

/** The server freezes these terms; only the target supplier sees private fields. */
export interface SupplierOfferSnapshot {
    offerId: string;
    revision: number;
    supplierOrgId?: string | null;
    productId: string;
    deliveryPointId: string;
    quantityMt: number;
    minFillMt: number;
    pricePerMtUsd: number;
    availabilityWindow: string;
    expiresAt: string;
    listingTerms: SupplierOfferPublicListingTerms;
}

export interface SupplierOfferListParams {
    product_id?: string;
    delivery_point_id?: string;
    availability_window?: string;
    region?: string;
    sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'quantity_desc';
    skip?: number;
    limit?: number;
}

export interface SupplierOfferMyListParams extends SupplierOfferListParams {
    status?: SupplierOfferStatus;
}

export interface SupplierOfferList {
    items: SupplierOffer[];
    total: number;
    skip: number;
    limit: number;
}
