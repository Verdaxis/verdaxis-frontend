import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/rfq.json';
import {
    FameSupplierOfferForm,
    buildFameSupplierOfferInput,
    validateFameSupplierOfferInput,
} from '../FameSupplierOfferForm';

const core = {
    product_id: 'ucome-b100',
    delivery_point_id: 'singapore',
    quantity_mt: 1000,
    price_per_mt_usd: 1050,
    availability_window: 'SPOT',
};

function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function choose(label: string, option: string) {
    fireEvent.click(screen.getByRole('combobox', { name: label }));
    fireEvent.click(screen.getByRole('option', { name: option }));
}

function readOffer() {
    const form = screen.getByRole('form', { name: 'offer' }) as HTMLFormElement;
    return buildFameSupplierOfferInput(new FormData(form), core);
}

function renderValidOffer() {
    render(<form aria-label="offer"><FameSupplierOfferForm quantityMt={core.quantity_mt} pending={false} /></form>);
    fill(copy.form.namedLocation, 'Singapore Terminal A');
    fill(copy.form.deliveryStart, '2026-10-01');
    fill(copy.form.deliveryEnd, '2026-10-05');
    fill(copy.offerForm.expiry, '2026-09-24T12:00');
    fill(copy.form.standardEdition, '2012+A2:2019');
    fill(copy.form.certificateReference, 'ISCC-001');
    fill(copy.form.certificateHolder, 'Supplier A');
    fill(copy.form.certificateValidUntil, '2026-10-05');
    fireEvent.click(screen.getByRole('checkbox', { name: copy.offerForm.declaration }));
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

describe('FameSupplierOfferForm', () => {
    it('keeps future batch details and blank measurements unknown', () => {
        renderValidOffer();

        const offer = readOffer();
        expect(offer.fuel_terms).toEqual(expect.objectContaining({
            nomination_status: 'PENDING',
            batch_reference: null,
            producing_site: null,
            production_origin: null,
            feedstock_origin: null,
            shipping_location: null,
            ci_gco2e_mj: null,
            ci_methodology: null,
            ci_boundary: null,
            ci_basis: null,
            cfpp_c: null,
            cloud_point_c: null,
            lhv_mj_kg: null,
            quality_evidence: null,
            sustainability_evidence: null,
        }));
        expect(validateFameSupplierOfferInput(offer)).toBeNull();
        expect((screen.getByRole('form', { name: 'offer' }) as HTMLFormElement).checkValidity()).toBe(true);

        choose(copy.declaration.nomination, copy.declaration.nominationOptions.IDENTIFIED);
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.nomination');
        expect((screen.getByLabelText(copy.form.batchReference) as HTMLInputElement).required).toBe(true);
    });

    it('preserves zero CI and requires its methodology, boundary and basis', () => {
        renderValidOffer();
        fill(copy.form.ci, '0');

        expect(readOffer().fuel_terms.ci_gco2e_mj).toBe(0);
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.ciMethodology');
        fill(copy.form.ciMethodology, 'RED lifecycle calculation');
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.ciContext');
        fill(copy.declaration.ciBoundary, 'Well-to-wake');
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.ciContext');
        choose(copy.declaration.ciBasis, copy.declaration.ciBasisOptions.ACTUAL);

        expect(readOffer().fuel_terms).toEqual(expect.objectContaining({
            ci_gco2e_mj: 0,
            ci_methodology: 'RED lifecycle calculation',
            ci_boundary: 'Well-to-wake',
            ci_basis: 'ACTUAL',
        }));
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();
    });

    it('requires an ASTM grade and removes it when the standard changes to EN', () => {
        renderValidOffer();
        choose(copy.form.standard, copy.form.standardOptions.ASTM_D6751);
        fill(copy.form.standardEdition, '2024');

        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.astmGrade');
        choose(copy.declaration.astmGrade, '1-B S15 LM');
        expect(readOffer().fuel_terms.astm_grade).toBe('1-B S15 LM');
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();

        choose(copy.form.standard, copy.form.standardOptions.EN_14214);
        fill(copy.form.standardEdition, '2012+A2:2019');
        expect(readOffer().fuel_terms.astm_grade).toBeNull();
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();
    });

    it('requires traceable available quality evidence and valid sample and test dates', () => {
        renderValidOffer();
        fill(copy.form.batchReference, 'BATCH-A');
        fireEvent.click(screen.getByText(copy.declaration.qualityEvidence));
        choose(copy.declaration.qualityStatus, copy.form.evidenceStatusOptions.AVAILABLE);
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.qualityEvidence');

        fill(copy.declaration.coaReference, 'COA-001');
        fill(copy.declaration.coaBatch, 'BATCH-B');
        fill(copy.declaration.laboratory, 'Independent Laboratory');
        fill(copy.declaration.sampledOn, '2026-09-21');
        fill(copy.declaration.testedOn, '2026-09-20');
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.qualityDates');

        fill(copy.declaration.testedOn, '2026-09-23');
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.qualityFutureDate');
        fill(copy.declaration.testedOn, '2026-09-22');
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.qualityBatch');
        fill(copy.declaration.coaBatch, 'BATCH-A');

        expect(readOffer().fuel_terms.quality_evidence).toEqual(expect.objectContaining({
            status: 'AVAILABLE',
            reference: 'COA-001',
            batch_reference: 'BATCH-A',
            laboratory: 'Independent Laboratory',
            sampled_on: '2026-09-21',
            tested_on: '2026-09-22',
        }));
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();

        // Singapore has reached the next calendar day while UTC is still September 22.
        vi.setSystemTime(new Date('2026-09-22T17:00:00.000Z'));
        fill(copy.declaration.sampledOn, '2026-09-23');
        fill(copy.declaration.testedOn, '2026-09-23');
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: copy.declaration.addResult }));
        choose(copy.declaration.qualityProperty, copy.declaration.properties.WATER_MG_KG);
        fill(copy.declaration.measuredValue, '425');
        fill(copy.declaration.testMethod, 'EN ISO 12937');
        choose(copy.declaration.qualityStatus, copy.notSupplied);
        expect(readOffer().fuel_terms.quality_evidence).toBeNull();
        expect((screen.getByRole('form', { name: 'offer' }) as HTMLFormElement).checkValidity()).toBe(true);

        choose(copy.declaration.qualityStatus, copy.form.evidenceStatusOptions.AVAILABLE);
        expect(readOffer().fuel_terms.quality_evidence).toEqual(expect.objectContaining({
            reference: 'COA-001',
            results: [{ property: 'WATER_MG_KG', value: 425, method: 'EN ISO 12937' }],
        }));
        expect(validateFameSupplierOfferInput(readOffer())).toBeNull();
    });

    it('keeps consignment evidence due aligned with the listing and requires an available document reference', () => {
        renderValidOffer();
        fireEvent.click(screen.getByText(copy.declaration.sustainabilityEvidence));
        choose(copy.declaration.sustainabilityStatus, copy.form.evidenceStatusOptions.AVAILABLE);
        expect(validateFameSupplierOfferInput(readOffer())).toBe('validation.sustainabilityEvidence');

        const dueSelectors = screen.getAllByRole('combobox', { name: copy.form.evidenceDue }) as HTMLButtonElement[];
        const listingDue = dueSelectors.find(selector => !selector.disabled)!;
        const consignmentDue = dueSelectors.find(selector => selector.disabled)!;
        expect(consignmentDue).toBeTruthy();
        fireEvent.click(listingDue);
        fireEvent.click(screen.getByRole('option', { name: copy.form.evidenceDueOptions.BEFORE_DELIVERY }));
        fill(copy.declaration.sustainabilityReference, 'POS-2026-001');

        const offer = readOffer();
        expect(offer.evidence_due).toBe('BEFORE_DELIVERY');
        expect(offer.fuel_terms.sustainability_evidence).toEqual(expect.objectContaining({
            status: 'AVAILABLE',
            reference: 'POS-2026-001',
            due: 'BEFORE_DELIVERY',
        }));
        expect(consignmentDue.textContent).toContain(copy.form.evidenceDueOptions.BEFORE_DELIVERY);
        expect(validateFameSupplierOfferInput(offer)).toBeNull();
    });
});
