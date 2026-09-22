import type { FameContractTerms, FameOfferTerms, FameQuote, FameRfq, FameRfqList } from '../types/fameRfq';

// API Decimal values arrive as strings. Missing optional measurements stay
// unknown: zero is a real CI or cold-flow declaration, never a fallback.
export function optionalRfqNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function mapContractTerms(value: FameContractTerms | null): FameContractTerms | null {
    if (!value) return null;
    return {
        ...value,
        max_cfpp_c: optionalRfqNumber(value.max_cfpp_c),
        max_ci_gco2e_mj: optionalRfqNumber(value.max_ci_gco2e_mj),
        quantity_tolerance_pct: Number(value.quantity_tolerance_pct),
        min_fill_mt: Number(value.min_fill_mt),
    };
}

function mapOfferTerms(value: FameOfferTerms | null): FameOfferTerms | null {
    if (!value) return null;
    return {
        ...value,
        cfpp_c: optionalRfqNumber(value.cfpp_c),
        ci_gco2e_mj: optionalRfqNumber(value.ci_gco2e_mj),
        lhv_mj_kg: optionalRfqNumber(value.lhv_mj_kg),
        available_quantity_mt: Number(value.available_quantity_mt),
        document_references: value.document_references ?? [],
    };
}

export function mapFameQuoteResponse(value: Record<string, any>): FameQuote {
    return {
        id: value.id,
        sellerOrgId: value.seller_org_id,
        sellerOrgName: value.seller_org_name ?? null,
        pricePerMtUsd: Number(value.price_per_mt_usd),
        notes: value.notes ?? null,
        status: value.status,
        createdAt: value.created_at,
        expiresAt: value.expires_at ?? null,
        isExpired: value.is_expired === true,
        revision: Number(value.revision ?? 1),
        offerTerms: mapOfferTerms(value.offer_terms ?? null),
    };
}

export function mapFameRfqResponse(value: Record<string, any>): FameRfq {
    return {
        id: value.id,
        buyerOrgId: value.buyer_org_id ?? null,
        buyerOrgName: value.buyer_org_name ?? null,
        isAnonymous: value.is_anonymous === true,
        productId: value.product_id,
        productName: value.product_name ?? null,
        deliveryPointId: value.delivery_point_id ?? null,
        deliveryPointName: value.delivery_point_name ?? null,
        quantityMt: Number(value.quantity_mt),
        targetPricePerMt: optionalRfqNumber(value.target_price_per_mt),
        notes: value.notes ?? null,
        status: value.status,
        expiresAt: value.expires_at,
        createdAt: value.created_at,
        quoteCount: Number(value.quote_count ?? value.quotes?.length ?? 0),
        quotes: Array.isArray(value.quotes) ? value.quotes.map(mapFameQuoteResponse) : [],
        contractTerms: mapContractTerms(value.contract_terms ?? null),
        executionEnabled: value.execution_enabled === true,
        canCancel: value.can_cancel === true,
    };
}

export function mapFameRfqListResponse(value: Record<string, any>): FameRfqList {
    return { items: (value.items ?? []).map(mapFameRfqResponse), total: Number(value.total ?? 0) };
}

/** USD/MT divided by MJ/kg is USD/GJ because 1 MT × 1 MJ/kg = 1 GJ. */
export function quotePricePerGj(quote: FameQuote): number | null {
    const lhv = quote.offerTerms?.lhv_mj_kg;
    if (lhv == null || !Number.isFinite(lhv) || lhv <= 0) return null;
    return quote.pricePerMtUsd / lhv;
}

export function isFameRfqOpen(rfq: FameRfq, now: number): boolean {
    return ['OPEN', 'QUOTED'].includes(rfq.status) && Date.parse(rfq.expiresAt) > now;
}

export function isFameQuoteExpired(quote: FameQuote, now: number): boolean {
    const expiry = quote.expiresAt ? Date.parse(quote.expiresAt) : Number.NaN;
    return quote.isExpired || !Number.isFinite(expiry) || expiry <= now;
}

/** Map actionable API outcomes to translated copy without exposing server text. */
export function fameRfqErrorKey(error: unknown): string {
    if (!(error instanceof Error)) return 'saveError';
    const status = 'status' in error ? error.status : null;
    const message = error.message.toLowerCase();
    if (status === 409) return message.includes('revised') ? 'revisionConflict' : 'stateConflict';
    if (status === 403) return 'permissionError';
    if (status === 404) return 'missingError';
    if (status === 429) return 'rateLimitError';
    if (status === 400 && (message.includes('expired') || message.includes('not open') || message.includes('current state'))) return 'closedError';
    if (status === 422) {
        if (message.includes('delivery start') || message.includes('delivery_end')) return 'validation.deliveryDates';
        if (message.includes('rfq deadline must')) return 'validation.requestExpiry';
        if (message.includes('quote expiry') || message.includes('expires_at')) return 'validation.quoteExpiry';
        if (message.includes('cfpp')) return 'validation.cfppLimit';
        if (message.includes('ci_methodology')) return 'validation.ciMethodology';
        if (message.includes('carbon intensity')) return 'validation.ciLimit';
        if (message.includes('certificate')) return 'validation.certificateDate';
        if (message.includes('available quantity')) return 'validation.availableQuantity';
        if (message.includes('document_references')) return 'validation.evidenceReferences';
        if (message.includes('standard') || message.includes('sustainability scheme')) return 'contractMismatch';
        return 'validationRejected';
    }
    return 'saveError';
}
