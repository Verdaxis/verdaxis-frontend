import type { SupplierOffer, SupplierOfferList, SupplierOfferMyListParams } from '../types/fameSupplierOffer';
import { mapFameFuelMeasurements } from './fameRfq';

export const SUPPLIER_OFFERS_CHANGED_EVENT = 'verdaxis:supplier-offers-changed';

export function mapSupplierOfferResponse(value: Record<string, any>): SupplierOffer {
    return {
        id: value.id,
        productId: value.product_id,
        productName: value.product_name ?? null,
        deliveryPointId: value.delivery_point_id,
        deliveryPointName: value.delivery_point_name ?? null,
        quantityMt: Number(value.quantity_mt),
        minFillMt: Number(value.min_fill_mt),
        pricePerMtUsd: Number(value.price_per_mt_usd),
        availabilityWindow: value.availability_window,
        deliveryBasis: value.delivery_basis,
        namedLocation: value.named_location,
        deliveryStart: value.delivery_start,
        deliveryEnd: value.delivery_end,
        quantityTolerancePct: Number(value.quantity_tolerance_pct),
        paymentTerms: value.payment_terms ?? null,
        inspectionTerms: value.inspection_terms ?? null,
        titleRiskTerms: value.title_risk_terms ?? null,
        claimsTerms: value.claims_terms ?? null,
        evidenceDue: value.evidence_due,
        expiresAt: value.expires_at,
        notes: value.notes ?? null,
        fuelTerms: mapFameFuelMeasurements(value.fuel_terms),
        status: value.status,
        revision: Number(value.revision),
        createdAt: value.created_at,
        updatedAt: value.updated_at,
        // Supplier offers are indications. No response can enable execution.
        executionEnabled: false,
        listingKind: 'SUPPLIER_OFFER',
        canEdit: value.can_edit === true,
        canWithdraw: value.can_withdraw === true,
        canRequestQuote: value.can_request_quote === true,
        ...('supplier_org_id' in value && { supplierOrgId: value.supplier_org_id }),
        ...('supplier_user_id' in value && { supplierUserId: value.supplier_user_id }),
    };
}

export function mapSupplierOfferListResponse(value: Record<string, any>): SupplierOfferList {
    return {
        items: (value.items ?? []).map(mapSupplierOfferResponse),
        total: Number(value.total ?? 0),
        skip: Number(value.skip ?? 0),
        limit: Number(value.limit ?? 20),
    };
}

export function supplierOfferListQuery(params?: SupplierOfferMyListParams): string {
    const query = new URLSearchParams();
    if (params?.product_id) query.set('product_id', params.product_id);
    if (params?.delivery_point_id) query.set('delivery_point_id', params.delivery_point_id);
    if (params?.availability_window) query.set('availability_window', params.availability_window);
    if (params?.region) query.set('region', params.region);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.status) query.set('status', params.status);
    query.set('skip', String(params?.skip ?? 0));
    query.set('limit', String(params?.limit ?? 20));
    return query.toString();
}
