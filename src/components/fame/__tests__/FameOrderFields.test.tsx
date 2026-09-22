import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/rfq.json';
import { FameOrderFields, readFameOrderAcknowledgements, readFameOrderTerms, validateFameOrderTerms } from '../FameOrderFields';

function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function choose(label: string, option: string) {
    fireEvent.click(screen.getByRole('combobox', { name: label }));
    fireEvent.click(screen.getByRole('option', { name: option }));
}
function data() { return new FormData(screen.getByRole('form') as HTMLFormElement); }
function terms(side: 'BID' | 'ASK') { return readFameOrderTerms(data(), side); }
function validAsk() {
    render(<form aria-label="order"><FameOrderFields side="ASK" /></form>);
    fill(copy.form.standardEdition, '2012+A2:2019');
    fill(copy.form.certificateReference, 'ISCC-001');
    fill(copy.form.certificateHolder, 'Supplier A');
    fill(copy.form.certificateValidUntil, '2026-09-22');
    fireEvent.click(screen.getByRole('checkbox', { name: copy.orderFields.neatDeclaration }));
}

beforeAll(async () => { await loadNamespace('rfq'); await i18n.changeLanguage('en'); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-22T04:00:00Z')); });
afterEach(() => vi.useRealTimers());

describe('FameOrderFields', () => {
    it('reads buyer requirements without supplier declarations or independent delivery clauses', () => {
        render(<form aria-label="order"><FameOrderFields side="BID" /></form>);
        fill(copy.form.standardEdition, '2012+A2:2019');
        const bid = terms('BID');
        expect(bid).toEqual({
            side: 'BID', schema_version: 1, neat_fame: true, standard: 'EN_14214', standard_edition: '2012+A2:2019',
            astm_grade: null, en_climate_class: null, max_cfpp_c: null, max_cloud_point_c: null, max_ci_gco2e_mj: null,
            ci_methodology: null, ci_boundary: null, ci_basis: null, sustainability_scheme: 'ISCC_EU',
            require_quality_evidence: false, require_sustainability_evidence: false, evidence_due: 'BEFORE_LOADING',
        });
        expect(validateFameOrderTerms(bid)).toBeNull();
        expect(screen.queryByLabelText(copy.form.deliveryStart)).toBeNull();
        expect(screen.queryByLabelText(copy.form.certificateReference)).toBeNull();
    });

    it('preserves zero buyer limits and requires the full CI context', () => {
        render(<form aria-label="order"><FameOrderFields side="BID" /></form>);
        fill(copy.form.standardEdition, '2012+A2:2019');
        fill(copy.form.maxCfpp, '0');
        fill(copy.orderFields.maxCloudPoint, '0');
        fill(copy.form.maxCi, '0');
        expect(terms('BID')).toEqual(expect.objectContaining({ max_cfpp_c: 0, max_cloud_point_c: 0, max_ci_gco2e_mj: 0 }));
        expect(validateFameOrderTerms(terms('BID'))).toBe('validation.ciContext');
        fill(copy.form.ciMethodology, 'RED lifecycle calculation');
        fill(copy.declaration.ciBoundary, 'Well-to-wake');
        expect(validateFameOrderTerms(terms('BID'))).toBe('validation.ciContext');
        choose(copy.declaration.ciBasis, copy.declaration.ciBasisOptions.ACTUAL);
        expect(validateFameOrderTerms(terms('BID'))).toBeNull();
    });

    it('requires the ASTM grade and carries evidence requirements and milestone', () => {
        render(<form aria-label="order"><FameOrderFields side="BID" /></form>);
        fill(copy.form.standardEdition, '2024');
        choose(copy.form.standard, copy.form.standardOptions.ASTM_D6751);
        expect(validateFameOrderTerms(terms('BID'))).toBe('validation.astmGrade');
        choose(copy.declaration.astmGrade, '1-B S15 LM');
        fireEvent.click(screen.getByRole('checkbox', { name: copy.orderFields.requireQualityEvidence }));
        fireEvent.click(screen.getByRole('checkbox', { name: copy.orderFields.requireSustainabilityEvidence }));
        choose(copy.form.evidenceDue, copy.form.evidenceDueOptions.BEFORE_DELIVERY);
        expect(terms('BID')).toEqual(expect.objectContaining({ astm_grade: '1-B S15 LM', require_quality_evidence: true, require_sustainability_evidence: true, evidence_due: 'BEFORE_DELIVERY' }));
        expect(validateFameOrderTerms(terms('BID'))).toBeNull();
        choose(copy.form.standard, copy.form.standardOptions.EN_14214);
        expect(terms('BID')).toEqual(expect.objectContaining({ astm_grade: null }));
    });

    it('retains unknown pending supplier values and requires explicit outer acknowledgements', () => {
        validAsk();
        expect(terms('ASK')).toEqual(expect.objectContaining({ side: 'ASK', neat_fame: true, nomination_status: 'PENDING',
            batch_reference: null, producing_site: null, ci_gco2e_mj: null, cfpp_c: null, cloud_point_c: null,
            evidence_due: 'BEFORE_LOADING' }));
        expect(validateFameOrderTerms(terms('ASK'))).toBeNull();
        expect(readFameOrderAcknowledgements(data())).toEqual({ certification_declared: false, msds_available: false });
        fireEvent.click(screen.getByRole('checkbox', { name: copy.orderFields.certificationDeclared }));
        fireEvent.click(screen.getByRole('checkbox', { name: copy.orderFields.msdsAvailable }));
        expect(readFameOrderAcknowledgements(data())).toEqual({ certification_declared: true, msds_available: true });
        expect((screen.getByRole('form') as HTMLFormElement).checkValidity()).toBe(true);
    });

    it('preserves zero supplier CI with methodology, boundary and basis', () => {
        validAsk();
        fill(copy.form.ci, '0');
        expect(terms('ASK')).toEqual(expect.objectContaining({ ci_gco2e_mj: 0 }));
        expect(validateFameOrderTerms(terms('ASK'))).toBe('validation.ciMethodology');
        fill(copy.form.ciMethodology, 'RED lifecycle calculation');
        expect(validateFameOrderTerms(terms('ASK'))).toBe('validation.ciContext');
        fill(copy.declaration.ciBoundary, 'Well-to-wake');
        choose(copy.declaration.ciBasis, copy.declaration.ciBasisOptions.ACTUAL);
        expect(validateFameOrderTerms(terms('ASK'))).toBeNull();
    });

    it('uses Singapore today for certificate validity without inventing a delivery schedule', () => {
        validAsk();
        expect(validateFameOrderTerms(terms('ASK'))).toBeNull();
        vi.setSystemTime(new Date('2026-09-22T17:00:00Z'));
        expect(validateFameOrderTerms(terms('ASK'))).toBe('validation.orderCertificateCurrent');
        fill(copy.form.certificateValidUntil, '2026-09-23');
        expect(validateFameOrderTerms(terms('ASK'))).toBeNull();
    });

    it('synchronizes the ASK commitment with its optional consignment evidence', () => {
        validAsk();
        choose(copy.form.evidenceDue, copy.form.evidenceDueOptions.BEFORE_DELIVERY);
        fireEvent.click(screen.getByText(copy.declaration.sustainabilityEvidence));
        choose(copy.declaration.sustainabilityStatus, copy.form.evidenceStatusOptions.PENDING);
        const ask = terms('ASK');
        expect(ask).toEqual(expect.objectContaining({ evidence_due: 'BEFORE_DELIVERY', sustainability_evidence: expect.objectContaining({ status: 'PENDING', due: 'BEFORE_DELIVERY' }) }));
        expect(validateFameOrderTerms(ask)).toBeNull();
    });
});
