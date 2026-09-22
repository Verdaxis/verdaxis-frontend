import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/rfq.json';
import type { FameContractTerms, FameRfq } from '../../../types/fameRfq';
import { FameQuoteForm, FameRequestForm } from '../FameRfqForms';

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
            offer_terms: {
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
                lhv_mj_kg: undefined,
            },
        });
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
