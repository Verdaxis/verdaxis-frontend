import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import i18n, { loadNamespace } from '../../../i18n';
import { renderWithProviders } from '../../../tests/test-utils';
import type { FameOrderBidTerms, FameOrderPublicAskTerms } from '../../../types/fameOrder';
import { FameOrderTermsDetails } from '../FameOrderTermsDetails';

const bid: FameOrderBidTerms = {
    side: 'BID', schema_version: 1, neat_fame: true, standard: 'ASTM_D6751', standard_edition: 'D6751-24', astm_grade: '1-B S15 LM',
    max_cfpp_c: -5, max_cloud_point_c: 3, max_ci_gco2e_mj: 0, ci_methodology: 'Buyer methodology', ci_boundary: 'Well to tank', ci_basis: 'ACTUAL',
    sustainability_scheme: 'ISCC_EU', require_quality_evidence: true, require_sustainability_evidence: false, evidence_due: 'BEFORE_LOADING',
};

const field = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

beforeAll(async () => {
    await i18n.changeLanguage('en');
    await Promise.all([loadNamespace('rfq'), loadNamespace('trading')]);
});
afterEach(cleanup);

describe('B100 order terms readback', () => {
    it('shows buyer limits and evidence requirements with zero CI preserved', () => {
        const view = renderWithProviders(<FameOrderTermsDetails terms={bid} />);
        expect(screen.getByRole('heading', { name: 'Buyer fuel requirements' })).toBeTruthy();
        expect(field('ASTM D6751 grade')).toBe('1-B S15 LM');
        expect(field('Maximum CFPP')).toBe('-5 °C');
        expect(field('Maximum cloud point')).toBe('3 °C');
        expect(field('Maximum CI')).toBe('0 gCO₂e/MJ');
        expect(field('CI methodology')).toBe('Buyer methodology');
        expect(field('Batch quality evidence')).toBe('Required');
        expect(field('Consignment sustainability evidence')).toBe('Not required');
        expect(field('Evidence deadline')).toBe('Before loading');
        view.rerender(<FameOrderTermsDetails terms={{ ...bid, standard: 'EN_14214', standard_edition: '2019', astm_grade: null, en_climate_class: 'Class B', max_ci_gco2e_mj: null }} />);
        expect(field('Maximum CI')).toBe('Not supplied');
        expect(field('EN national or climate designation')).toBe('Class B');
        expect(screen.queryByText('ASTM D6751 grade')).toBeNull();
    });

    it('reuses supplier declarations with public certificate redactions for ASK terms', () => {
        const ask: FameOrderPublicAskTerms = {
            side: 'ASK', schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100,
            standard: 'EN_14214', standard_edition: '2019', sustainability_scheme: 'ISCC_EU',
            certificate_valid_until: '2027-12-31', evidence_status: 'DECLARED', ci_gco2e_mj: null, evidence_due: 'BEFORE_LOADING',
        };
        renderWithProviders(<FameOrderTermsDetails terms={ask} />);
        expect(screen.getByRole('heading', { name: 'Operator certification' })).toBeTruthy();
        expect(field('Certificate reference')).toBe('Private');
        expect(field('Declared carbon intensity')).toBe('Not supplied');
        expect(field('Evidence deadline')).toBe('Before loading');
        expect(screen.queryByRole('heading', { name: 'Buyer fuel requirements' })).toBeNull();
    });
});
