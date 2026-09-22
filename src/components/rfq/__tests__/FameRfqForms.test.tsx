import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/rfq.json';
import type { FameContractTerms, FameRfq } from '../../../types/fameRfq';
import { FameQuoteForm, FameRequestForm } from '../FameRfqForms';
import { mapSupplierOfferResponse } from '../../../services/fameSupplierOffer';

const contract: FameContractTerms = {
    schema_version: 1,
    neat_fame: true,
    standard: 'EN_14214',
    standard_edition: '2012+A2:2019',
    max_cfpp_c: 0,
    max_ci_gco2e_mj: 20,
    delivery_basis: 'EX_TANK',
    named_location: 'Singapore Terminal A',
    delivery_start: '2026-10-01',
    delivery_end: '2026-10-05',
    quantity_tolerance_pct: 5,
    min_fill_mt: 1000,
    payment_terms: 'Payment against documents',
    inspection_terms: 'Independent inspection at loading',
    title_risk_terms: 'At the loading flange',
    claims_terms: 'Written claims within 30 days',
    sustainability_scheme: 'REDCERT_EU',
    evidence_due: 'BEFORE_LOADING',
};

const rfq: FameRfq = {
    id: 'request-1',
    buyerOrgId: 'buyer-1',
    buyerOrgName: 'Buyer',
    productId: 'product-1',
    productName: 'UCOME B100',
    deliveryPointId: 'singapore',
    deliveryPointName: 'Singapore',
    quantityMt: 1000,
    targetPricePerMt: null,
    notes: null,
    status: 'OPEN',
    expiresAt: '2026-09-24T04:00:00.000Z',
    createdAt: '2026-09-22T04:00:00.000Z',
    quoteCount: 0,
    quotes: [],
    contractTerms: contract,
    executionEnabled: false,
    canCancel: false,
    isAnonymous: true,
};

function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidRequest() {
    fill(copy.form.standardEdition, '2012+A2:2019');
    fill(copy.form.namedLocation, 'Singapore Terminal A');
    fill(copy.form.deliveryStart, '2026-10-01');
    fill(copy.form.deliveryEnd, '2026-10-05');
    fill(copy.form.paymentTerms, 'Payment against documents');
    fill(copy.form.inspectionTerms, 'Independent inspection');
    fill(copy.form.titleRiskTerms, 'At loading flange');
    fill(copy.form.claimsTerms, 'Written claims within 30 days');
}

function fillValidQuote() {
    fill(copy.form.quotePrice, '1050.50');
    fill(copy.form.shippingLocation, 'Singapore Terminal A');
    fill(copy.form.batchReference, 'BATCH-2026-01');
    fill(copy.form.producingSite, 'Plant A');
    fill(copy.form.productionOrigin, 'Singapore');
    fill(copy.form.feedstockOrigin, 'Malaysia');
    fill(copy.form.cfpp, '-2');
    fill(copy.form.ci, '0');
    fill(copy.form.ciMethodology, 'RED lifecycle calculation');
    fill(copy.form.certificateReference, 'REDCERT-001');
    fill(copy.form.certificateHolder, 'Supplier A');
    fill(copy.form.certificateValidUntil, '2026-10-05');
    fireEvent.click(screen.getByRole('checkbox', { name: copy.form.confirmTerms }));
}

beforeAll(async () => {
    await loadNamespace('rfq');
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-22T04:00:00.000Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

describe('FameRequestForm', () => {
    it('uses the selected offer revision, bounds and fixed fuel requirements for a targeted request', async () => {
        const source = mapSupplierOfferResponse({
            ...contract,
            id: 'offer-1', product_id: 'ucome-product', delivery_point_id: 'singapore',
            quantity_mt: 500, min_fill_mt: 100, price_per_mt_usd: 1020,
            availability_window: 'SPOT', status: 'OPEN', revision: 6,
            expires_at: '2026-09-25T04:00:00.000Z',
            fuel_terms: {
                schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100,
                standard: 'ASTM_D6751', standard_edition: '2024', astm_grade: '1-B S15 LM',
                cfpp_c: -2, ci_gco2e_mj: 0, sustainability_scheme: 'REDCERT_EU',
                certificate_valid_until: '2026-10-05', evidence_status: 'PENDING',
            },
        });
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameRequestForm productId="ignored-default" deliveryPointId="ignored-default" sourceOffer={source} onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        const quantity = screen.getByLabelText(copy.form.quantity) as HTMLInputElement;
        expect(quantity.min).toBe('100');
        expect(quantity.max).toBe('500');
        expect(screen.getByRole('combobox', { name: copy.form.standard })).toHaveProperty('disabled', true);
        expect(screen.getByLabelText(copy.form.standardEdition)).toHaveProperty('readOnly', true);
        expect(screen.getByRole('combobox', { name: copy.declaration.astmGrade })).toHaveProperty('disabled', true);
        fill(copy.form.quantity, '600');
        fireEvent.submit(screen.getByRole('form', { name: copy.form.requestTitle }));
        expect(screen.getByRole('alert').textContent).toBe(copy.validation.sourceQuantity);
        expect(onSubmit).not.toHaveBeenCalled();

        fill(copy.form.quantity, '500');
        fireEvent.submit(screen.getByRole('form', { name: copy.form.requestTitle }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            source_offer_id: 'offer-1', expected_source_offer_revision: 6,
            product_id: 'ucome-product', delivery_point_id: 'singapore',
            quantity_mt: 500, target_price_per_mt: 1020,
            contract_terms: expect.objectContaining({ standard: 'ASTM_D6751', standard_edition: '2024', astm_grade: '1-B S15 LM', max_ci_gco2e_mj: 0, max_cfpp_c: -2 }),
        }));
        vi.setSystemTime(new Date('2026-09-26T04:00:00.000Z'));
        fireEvent.submit(screen.getByRole('form', { name: copy.form.requestTitle }));
        expect(screen.getByRole('alert').textContent).toBe(copy.sourceOfferConflict);
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it.each([
        { label: copy.form.deliveryStart, value: '2026-09-21', error: copy.validation.deliveryDates },
        { label: copy.form.deliveryEnd, value: '2026-09-30', error: copy.validation.deliveryDates },
        { label: copy.form.minimumFill, value: '1001', error: copy.validation.minimumFill },
    ])('rejects invalid $label before creating a request', ({ label, value, error }) => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameRequestForm productId="product-1" deliveryPointId="singapore" onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidRequest();
        fill(label, value);

        fireEvent.submit(screen.getByRole('form', { name: copy.form.requestTitle }));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(error);
    });

    it('uses the Singapore calendar day for the earliest delivery date', () => {
        vi.setSystemTime(new Date('2026-09-22T17:00:00.000Z'));
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameRequestForm productId="product-1" deliveryPointId="singapore" onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidRequest();
        const deliveryStart = screen.getByLabelText(copy.form.deliveryStart) as HTMLInputElement;
        expect(deliveryStart.min).toBe('2026-09-23');
        fill(copy.form.deliveryStart, '2026-09-22');

        fireEvent.submit(screen.getByRole('form', { name: copy.form.requestTitle }));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(copy.validation.deliveryDates);
    });

    it('requires the request deadline to fall within the Singapore delivery period', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameRequestForm productId="product-1" deliveryPointId="singapore" onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidRequest();
        fill(copy.form.deliveryStart, '2026-09-22');
        fill(copy.form.deliveryEnd, '2026-09-22');
        const form = screen.getByRole('form', { name: copy.form.requestTitle });

        fireEvent.submit(form);

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(copy.validation.requestExpiry);
        fill(copy.form.requestExpiry, '1');
        fireEvent.submit(form);

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            product_id: 'product-1',
            delivery_point_id: 'singapore',
            is_anonymous: true,
            expires_in_hours: 1,
            contract_terms: expect.objectContaining({ delivery_start: '2026-09-22', delivery_end: '2026-09-22' }),
        }));
    });
});

describe('FameQuoteForm', () => {
    it.each([
        { label: copy.form.cfpp, value: '1', error: copy.validation.cfppLimit },
        { label: copy.form.ci, value: '21', error: copy.validation.ciLimit },
        { label: copy.form.ciMethodology, value: '   ', error: copy.validation.ciMethodology },
        { label: copy.form.certificateValidUntil, value: '2026-10-04', error: copy.validation.certificateDate },
        { label: copy.form.quoteExpiry, value: '2026-09-20T12:00', error: copy.validation.quoteExpiry },
        { label: copy.form.quoteExpiry, value: '2026-09-25T12:00', error: copy.validation.quoteExpiry },
    ])('rejects invalid $label before submitting a quote', ({ label, value, error }) => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameQuoteForm rfq={rfq} onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidQuote();
        fill(label, value);

        fireEvent.submit(screen.getByRole('form', { name: copy.form.quoteTitle }));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(error);
    });

    it('preserves zero CI and the exact requested standard edition and scheme', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameQuoteForm rfq={rfq} onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidQuote();

        const form = screen.getByRole('form', { name: copy.form.quoteTitle }) as HTMLFormElement;
        expect(form.checkValidity()).toBe(true);
        fireEvent.submit(form);

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith({
            price_per_mt_usd: 1050.5,
            expires_at: rfq.expiresAt,
            notes: undefined,
            offer_terms: expect.objectContaining({
                schema_version: 1,
                matches_contract_terms: true,
                batch_reference: 'BATCH-2026-01',
                producing_site: 'Plant A',
                production_origin: 'Singapore',
                feedstock_origin: 'Malaysia',
                shipping_location: 'Singapore Terminal A',
                uco_mass_pct: 100,
                standard: 'EN_14214',
                standard_edition: '2012+A2:2019',
                cfpp_c: -2,
                ci_gco2e_mj: 0,
                ci_methodology: 'RED lifecycle calculation',
                sustainability_scheme: 'REDCERT_EU',
                certificate_reference: 'REDCERT-001',
                certificate_holder: 'Supplier A',
                certificate_valid_until: '2026-10-05',
                evidence_status: 'DECLARED',
                document_references: [],
                available_quantity_mt: 1000,
                lhv_mj_kg: null,
            }),
        });
    });

    it('initializes and locks the requested ASTM grade for a firm quote', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const astmRequest = { ...rfq, contractTerms: { ...contract, standard: 'ASTM_D6751' as const, standard_edition: '2024', astm_grade: '2-B S15 LM' as const } };
        render(<FameQuoteForm rfq={astmRequest} onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidQuote();
        const grade = screen.getByRole('combobox', { name: copy.declaration.astmGrade });
        expect(grade).toHaveProperty('disabled', true);
        expect(grade.textContent).toContain('2-B S15 LM');
        fireEvent.submit(screen.getByRole('form', { name: copy.form.quoteTitle }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0][0].offer_terms).toMatchObject({ standard: 'ASTM_D6751', standard_edition: '2024', astm_grade: '2-B S15 LM' });
        expect(onSubmit.mock.calls[0][0].offer_terms).not.toHaveProperty('nomination_status');
        expect(onSubmit.mock.calls[0][0].offer_terms).not.toHaveProperty('neat_fame');
    });

    it('requires references when the supplier declares that documents are available', () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FameQuoteForm rfq={rfq} onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />);
        fillValidQuote();
        fireEvent.click(screen.getByRole('combobox', { name: copy.form.evidenceStatus }));
        fireEvent.click(screen.getByRole('option', { name: copy.form.evidenceStatusOptions.AVAILABLE }));

        fireEvent.submit(screen.getByRole('form', { name: copy.form.quoteTitle }));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(copy.validation.evidenceReferences);
    });
});
