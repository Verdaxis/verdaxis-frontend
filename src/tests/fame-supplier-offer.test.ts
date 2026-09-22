import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { clearAccessToken, setAccessToken } from '../services/authToken';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';
import { mapFameRfqResponse } from '../services/fameRfq';
import { mapSupplierOfferResponse, SUPPLIER_OFFERS_CHANGED_EVENT } from '../services/fameSupplierOffer';
import type { SupplierOfferCreateInput } from '../types/fameSupplierOffer';
import type { FameRfqCreateInput } from '../types/fameRfq';

const createInput: SupplierOfferCreateInput = {
    product_id: 'ucome', delivery_point_id: 'singapore', quantity_mt: 500, min_fill_mt: 100,
    price_per_mt_usd: 1100, availability_window: 'SPOT', delivery_basis: 'EX_TANK',
    named_location: 'Singapore', delivery_start: '2026-10-01', delivery_end: '2026-10-10',
    quantity_tolerance_pct: 5, evidence_due: 'BEFORE_LOADING', expires_at: '2026-09-25T12:00:00Z',
    fuel_terms: {
        schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100,
        standard: 'EN_14214', standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU',
        certificate_reference: 'private-reference', certificate_holder: 'private-holder',
        certificate_valid_until: '2026-12-31', evidence_status: 'PENDING', document_references: [],
    },
};

const publicResponse = {
    ...createInput,
    id: 'offer-1', status: 'OPEN', revision: 3, product_name: 'UCOME B100', delivery_point_name: 'Singapore',
    quantity_mt: '500.50', min_fill_mt: '100', price_per_mt_usd: '1100.25', quantity_tolerance_pct: '5',
    created_at: '2026-09-22T12:00:00Z', updated_at: '2026-09-22T12:30:00Z',
    execution_enabled: false, listing_kind: 'SUPPLIER_OFFER', can_edit: false, can_withdraw: false, can_request_quote: true,
    fuel_terms: {
        schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100,
        standard: 'EN_14214', standard_edition: '2012+A2:2019', sustainability_scheme: 'ISCC_EU',
        certificate_valid_until: '2026-12-31', evidence_status: 'PENDING',
        cfpp_c: '-5', cloud_point_c: '0', ci_gco2e_mj: '0', lhv_mj_kg: null,
        quality_evidence: { status: 'AVAILABLE', results: [{ property: 'WATER_MG_KG', value: '125.5' }] },
        sustainability_evidence: { status: 'PENDING', document_type: 'POS', due: 'BEFORE_LOADING' },
    },
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('supplier offer wire values', () => {
    it('normalizes declared measurements without restoring private fields in a marketplace response', () => {
        const offer = mapSupplierOfferResponse(publicResponse);
        expect(offer).toMatchObject({ quantityMt: 500.5, minFillMt: 100, pricePerMtUsd: 1100.25, quantityTolerancePct: 5 });
        expect(offer.fuelTerms).toMatchObject({ cfpp_c: -5, cloud_point_c: 0, ci_gco2e_mj: 0, lhv_mj_kg: null });
        expect(offer.fuelTerms.quality_evidence?.results[0].value).toBe(125.5);
        for (const field of ['batch_reference', 'producing_site', 'certificate_reference', 'certificate_holder', 'certificate_scope', 'document_references']) {
            expect(offer.fuelTerms).not.toHaveProperty(field);
        }
        expect(offer.fuelTerms.quality_evidence).not.toHaveProperty('reference');
        expect(offer.fuelTerms.sustainability_evidence).not.toHaveProperty('quantity_mt');
        expect(offer).not.toHaveProperty('supplierOrgId');
        expect(offer).not.toHaveProperty('supplierUserId');
        expect(offer.paymentTerms).toBeNull();
    });

    it('retains full owner declarations and explicit null without creating unknown measurements', () => {
        const offer = mapSupplierOfferResponse({
            ...publicResponse,
            supplier_org_id: 'owner',
            fuel_terms: { ...createInput.fuel_terms, batch_reference: null, ci_gco2e_mj: null,
                sustainability_evidence: { status: 'AVAILABLE', document_type: 'SD', reference: 'private-document', quantity_mt: '500.50', due: 'BEFORE_LOADING' } },
        });
        expect(offer.supplierOrgId).toBe('owner');
        expect(offer.fuelTerms.certificate_reference).toBe('private-reference');
        expect(offer.fuelTerms.batch_reference).toBeNull();
        expect(offer.fuelTerms.ci_gco2e_mj).toBeNull();
        expect(offer.fuelTerms.lhv_mj_kg).toBeNull();
        expect(offer.fuelTerms.sustainability_evidence?.quantity_mt).toBe(500.5);
    });

    it('fails closed for action permissions and never enables order execution', () => {
        const offer = mapSupplierOfferResponse({ ...publicResponse, execution_enabled: true, can_request_quote: 'true', can_edit: undefined });
        expect(offer.executionEnabled).toBe(false);
        expect(offer.canRequestQuote).toBe(false);
        expect(offer.canEdit).toBe(false);
    });

    it('keeps a source offer snapshot separate from mutable listing data and respects missing private RFQ fields', () => {
        const request = mapFameRfqResponse({
            source_offer_id: 'offer-1', target_supplier_org_id: 'supplier-1',
            source_offer_snapshot: {
                offer_id: 'offer-1', revision: '2', supplier_org_id: 'supplier-1',
                product_id: 'ucome', delivery_point_id: 'singapore', quantity_mt: '500', min_fill_mt: '100',
                price_per_mt_usd: '1090', availability_window: 'SPOT', expires_at: createInput.expires_at,
                listing_terms: { delivery_basis: 'EX_TANK', quantity_tolerance_pct: '5', fuel_terms: createInput.fuel_terms },
            },
        });
        expect(request.sourceOfferId).toBe('offer-1');
        expect(request.sourceOfferSnapshot).toMatchObject({ revision: 2, quantityMt: 500, pricePerMtUsd: 1090, listingTerms: { quantity_tolerance_pct: 5 } });
        expect(request.sourceOfferSnapshot?.listingTerms.fuel_terms.certificate_reference).toBe('private-reference');
        const redacted = mapFameRfqResponse({ source_offer_id: 'offer-1' });
        expect(redacted).not.toHaveProperty('sourceOfferSnapshot');
        expect(redacted).not.toHaveProperty('targetSupplierOrgId');
    });

    it.each([false, true])('keeps a buyer source snapshot anonymous with quote present: %s', (hasQuote) => {
        const request = mapFameRfqResponse({
            source_offer_id: 'offer-1', target_supplier_org_id: null,
            source_offer_snapshot: {
                offer_id: 'offer-1', revision: '2',
                product_id: 'ucome', delivery_point_id: 'singapore', quantity_mt: '500', min_fill_mt: '100',
                price_per_mt_usd: '1090', availability_window: 'SPOT', expires_at: createInput.expires_at,
                listing_terms: { delivery_basis: 'EX_TANK', quantity_tolerance_pct: '5', fuel_terms: publicResponse.fuel_terms },
            },
            quotes: hasQuote ? [{
                id: 'quote-1', seller_org_id: 'supplier-1', price_per_mt_usd: '1100',
                offer_terms: { ...createInput.fuel_terms, available_quantity_mt: '500', matches_contract_terms: true },
            }] : [],
        });
        const snapshot = request.sourceOfferSnapshot!;
        expect(request.targetSupplierOrgId).toBeNull();
        expect(snapshot).not.toHaveProperty('supplierOrgId');
        expect(snapshot.listingTerms.fuel_terms).toMatchObject({ ci_gco2e_mj: 0, lhv_mj_kg: null });
        for (const field of ['batch_reference', 'producing_site', 'certificate_reference', 'certificate_holder', 'certificate_scope', 'document_references']) {
            expect(snapshot.listingTerms.fuel_terms).not.toHaveProperty(field);
        }
        expect(snapshot.listingTerms.fuel_terms.quality_evidence).not.toHaveProperty('reference');
        expect(snapshot.listingTerms.fuel_terms.sustainability_evidence).not.toHaveProperty('issuer');
        if (hasQuote) expect(request.quotes[0].offerTerms?.certificate_reference).toBe('private-reference');
    });
});

describe('supplier offer API contract', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        clearMarketSupportContextId();
        setAccessToken('supplier-session');
    });

    afterEach(() => {
        clearMarketSupportContextId();
        clearAccessToken();
        vi.restoreAllMocks();
    });

    it('uses the dedicated listing endpoints and exact filter and paging names', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response({ items: [publicResponse], total: '1', skip: '20', limit: '10' }));
        const result = await api.supplierOffers.list({ product_id: 'ucome', delivery_point_id: 'singapore', availability_window: 'SPOT', region: 'Asia Pacific', sort_by: 'price_asc', skip: 20, limit: 10 });
        expect(String(fetchMock.mock.calls[0][0])).toContain('/supplier-offers?product_id=ucome&delivery_point_id=singapore&availability_window=SPOT&region=Asia+Pacific&sort_by=price_asc&skip=20&limit=10');
        expect(result).toMatchObject({ total: 1, skip: 20, limit: 10, items: [{ id: 'offer-1' }] });
        await api.supplierOffers.my({ status: 'WITHDRAWN' });
        expect(String(fetchMock.mock.calls[1][0])).toContain('/supplier-offers/my?status=WITHDRAWN&skip=0&limit=20');
    });

    it('passes the caller idempotency key and publishes a successful offer change', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(publicResponse, 201));
        const changed = vi.fn();
        window.addEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, changed);
        try {
            const offer = await api.supplierOffers.create(createInput, 'a7654f61-d36d-4f15-8c92-5d705b4707df');
            const [url, options] = fetchMock.mock.calls[0];
            expect(String(url)).toMatch(/\/supplier-offers$/);
            expect(options?.method).toBe('POST');
            expect(new Headers(options?.headers).get('Idempotency-Key')).toBe('a7654f61-d36d-4f15-8c92-5d705b4707df');
            expect(JSON.parse(String(options?.body))).toEqual(createInput);
            expect(offer.id).toBe('offer-1');
            expect(changed).toHaveBeenCalledOnce();
        } finally {
            window.removeEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, changed);
        }
    });

    it('uses safe detail paths and sends the expected revision for update and withdrawal', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response(publicResponse));
        await api.supplierOffers.get('offer/1');
        await api.supplierOffers.update('offer/1', { ...createInput, expected_revision: 3 });
        await api.supplierOffers.withdraw('offer/1', { expected_revision: 4 });
        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/supplier-offers\/offer%2F1$/);
        expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');
        expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ ...createInput, expected_revision: 3 });
        expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/supplier-offers\/offer%2F1\/withdraw$/);
        expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ expected_revision: 4 });
        expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/orderbook'))).toBe(true);
    });

    it('submits the selected source revision and fuel grade with a targeted request', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ source_offer_id: 'offer-1', quantity_mt: '200' }, 201));
        const request: FameRfqCreateInput = {
            product_id: 'ucome', delivery_point_id: 'singapore', quantity_mt: 200,
            availability_window: 'SPOT', is_anonymous: true, expires_in_hours: 24,
            source_offer_id: 'offer-1', expected_source_offer_revision: 3,
            contract_terms: {
                schema_version: 1, neat_fame: true, standard: 'ASTM_D6751', standard_edition: '2024', astm_grade: '1-B S15 LM',
                delivery_basis: 'EX_TANK', named_location: 'Singapore', delivery_start: '2026-10-01', delivery_end: '2026-10-10',
                quantity_tolerance_pct: 5, min_fill_mt: 100, payment_terms: 'Buyer terms', inspection_terms: 'Independent inspector',
                title_risk_terms: 'At delivery', claims_terms: 'Within 30 days', sustainability_scheme: 'ISCC_EU', evidence_due: 'BEFORE_LOADING',
            },
        };
        const result = await api.rfq.create(request);
        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/rfq$/);
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(request);
        expect(result.sourceOfferId).toBe('offer-1');
    });

    it('does not announce failed mutations or return data from a previous session', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ detail: 'Listing was revised' }, 409));
        const changed = vi.fn();
        window.addEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, changed);
        try {
            await expect(api.supplierOffers.withdraw('offer-1', { expected_revision: 2 })).rejects.toMatchObject({ status: 409 });
            fetchMock.mockImplementationOnce(async () => {
                setAccessToken('different-account');
                return response(publicResponse);
            });
            await expect(api.supplierOffers.create(createInput, 'key')).rejects.toMatchObject({ name: 'AbortError' });
            expect(changed).not.toHaveBeenCalled();
        } finally {
            window.removeEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, changed);
        }
    });

    it('keeps offer mutations outside assisted organization permissions', async () => {
        setMarketSupportContextId('assisted-context');
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        await expect(api.supplierOffers.create(createInput, 'key')).rejects.toMatchObject({ status: 403, code: 'MARKET_SUPPORT_MUTATION_BLOCKED' });
        await expect(api.supplierOffers.update('offer-1', { ...createInput, expected_revision: 3 })).rejects.toMatchObject({ status: 403 });
        await expect(api.supplierOffers.withdraw('offer-1', { expected_revision: 3 })).rejects.toMatchObject({ status: 403 });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
