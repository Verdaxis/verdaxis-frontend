import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/test-utils';
import i18n, { loadNamespace } from '../../../i18n';
import type { FameOfferTerms } from '../../../types/fameRfq';
import type { SupplierOffer, SupplierOfferFuelTerms, SupplierOfferSnapshot } from '../../../types/fameSupplierOffer';
import { FameDeclarationDetails } from '../../rfq/FameDeclarationDetails';
import { SupplierOfferDetails, SupplierOfferSnapshotDetails } from '../SupplierOfferDetails';

const fuel: SupplierOfferFuelTerms = {
    schema_version: 1,
    neat_fame: true,
    nomination_status: 'IDENTIFIED',
    uco_mass_pct: 100,
    standard: 'ASTM_D6751',
    standard_edition: 'D6751-24',
    astm_grade: '2-B S15 LM',
    batch_reference: 'BATCH-01',
    producing_site: 'Declared refinery',
    production_origin: 'Malaysia',
    feedstock_origin: 'Malaysia',
    shipping_location: 'Singapore terminal',
    cfpp_c: -5,
    cloud_point_c: 3,
    ci_gco2e_mj: 0,
    ci_methodology: 'Declared calculation',
    ci_boundary: 'Well to tank',
    ci_basis: 'ACTUAL',
    lhv_mj_kg: null,
    sustainability_scheme: 'ISCC_EU',
    certificate_reference: 'OPERATOR-01',
    certificate_holder: 'Declared operator',
    certificate_valid_until: '2027-12-31',
    certificate_scope: 'Processing unit',
    evidence_status: 'AVAILABLE',
    document_references: ['https://example.test/operator-evidence'],
    quality_evidence: {
        status: 'AVAILABLE',
        reference: 'COA-01',
        batch_reference: 'BATCH-01',
        laboratory: 'Declared laboratory',
        sampled_on: '2026-12-01',
        tested_on: '2026-12-02',
        results: [
            { property: 'SULFUR_MG_KG', value: 0, method: 'Declared method' },
            { property: 'FREE_GLYCEROL_MASS_PCT', value: 0.00012, method: null },
        ],
    },
    sustainability_evidence: {
        status: 'AVAILABLE',
        document_type: 'POS',
        reference: 'POS-01',
        issuer: 'Declared issuer',
        quantity_mt: 450,
        supply_date: '2026-12-03',
        due: 'BEFORE_LOADING',
    },
};

const offer: SupplierOffer = {
    id: 'offer-1', productId: 'ucome', productName: 'UCOME B100', deliveryPointId: 'singapore', deliveryPointName: 'Singapore',
    quantityMt: 1000, minFillMt: 100, pricePerMtUsd: 1125.5, availabilityWindow: '2026-12',
    deliveryBasis: 'EX_TANK', namedLocation: 'Singapore terminal', deliveryStart: '2026-12-03', deliveryEnd: '2026-12-06',
    quantityTolerancePct: 0, paymentTerms: null, inspectionTerms: 'Independent inspector', titleRiskTerms: null, claimsTerms: null,
    evidenceDue: 'BEFORE_LOADING', expiresAt: '2026-12-02T15:00:00Z', notes: null, fuelTerms: fuel,
    status: 'OPEN', revision: 3, createdAt: '2026-11-28T00:00:00Z', updatedAt: '2026-11-29T00:00:00Z',
    executionEnabled: false, listingKind: 'SUPPLIER_OFFER', canEdit: true, canWithdraw: true, canRequestQuote: false,
    supplierOrgId: 'private-supplier-org', supplierUserId: 'private-supplier-user',
};

function valueFor(label: string): string | null | undefined {
    return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;
}

beforeAll(async () => {
    await i18n.changeLanguage('en');
    await Promise.all([loadNamespace('rfq'), loadNamespace('trading')]);
});
afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('en');
});

describe('supplier offer declaration readback', () => {
    it('keeps zero CI, CFPP and cloud point distinct, with conditional grade and unknown LHV', () => {
        const view = renderWithProviders(<SupplierOfferDetails offer={offer} />);
        expect(valueFor('Declared carbon intensity')).toBe('0 gCO₂e/MJ');
        expect(valueFor('Declared CFPP')).toBe('-5 °C');
        expect(valueFor('Declared cloud point')).toBe('3 °C');
        expect(valueFor('Declared lower heating value')).toBe('Not supplied');
        expect(valueFor('ASTM D6751 grade')).toBe('2-B S15 LM');
        expect(screen.queryByText('EN national or climate designation')).toBeNull();
        expect(valueFor('Payment terms')).toBe('Not supplied');
        expect(valueFor('Quantity tolerance')).toBe('0%');

        view.rerender(<SupplierOfferDetails offer={{ ...offer, fuelTerms: { ...fuel, standard: 'EN_14214', astm_grade: null, en_climate_class: 'Declared local class', ci_gco2e_mj: null } }} />);
        expect(valueFor('Declared carbon intensity')).toBe('Not supplied');
        expect(valueFor('EN national or climate designation')).toBe('Declared local class');
        expect(screen.queryByText('ASTM D6751 grade')).toBeNull();
    });

    it('marks withheld fields private without inventing batch values or exposing seller IDs', () => {
        const publicFuel = { ...fuel };
        delete publicFuel.batch_reference;
        delete publicFuel.producing_site;
        delete publicFuel.certificate_scope;
        const { certificate_reference, certificate_holder, document_references, ...summary } = publicFuel;
        renderWithProviders(<SupplierOfferDetails offer={{
            ...offer,
            canEdit: false,
            canWithdraw: false,
            canRequestQuote: true,
            fuelTerms: {
                ...summary,
                nomination_status: 'PENDING',
                production_origin: null,
                quality_evidence: { status: 'AVAILABLE', results: fuel.quality_evidence!.results },
                sustainability_evidence: { status: 'PENDING', document_type: 'SD', due: 'BEFORE_LOADING' },
            },
        }} />);
        const traceability = screen.getByRole('region', { name: 'Batch and traceability' });
        expect(within(traceability).getByText('Batch or parcel reference').nextElementSibling?.textContent).toBe('Private');
        expect(valueFor('Producing site')).toBe('Private');
        expect(valueFor('Certificate reference')).toBe('Private');
        expect(valueFor('Document references')).toBe('Private');
        expect(valueFor('Country of production')).toBe('Not supplied');
        expect(valueFor('Batch nomination')).toBe('Batch to be nominated');
        expect(valueFor('Laboratory')).toBe('Private');
        expect(screen.queryByText('private-supplier-org')).toBeNull();
        expect(screen.queryByText('private-supplier-user')).toBeNull();
        expect(screen.queryByText('BATCH-01')).toBeNull();
    });

    it('separates operator, quality and consignment evidence and preserves small measurements', () => {
        renderWithProviders(<SupplierOfferDetails offer={offer} />);
        const operator = screen.getByRole('region', { name: 'Operator certification' });
        expect(within(operator).getByText('OPERATOR-01')).toBeTruthy();
        expect(within(operator).queryByText('COA-01')).toBeNull();
        expect(within(operator).queryByText('POS-01')).toBeNull();
        const quality = screen.getByText('Batch quality and laboratory results · Available').closest('details')!;
        expect(within(quality).getByText('COA-01')).toBeTruthy();
        expect(within(quality).getByText('0 mg/kg')).toBeTruthy();
        expect(within(quality).getByText('0.00012 % m/m')).toBeTruthy();
        expect(within(quality).getByText('Declared method')).toBeTruthy();
        expect(within(quality).getByText(/Values do not confirm compliance/)).toBeTruthy();
        const consignment = screen.getByText('Consignment sustainability evidence · Available').closest('details')!;
        expect(within(consignment).getByText('POS-01')).toBeTruthy();
        expect(within(consignment).getByText('Proof of Sustainability (PoS)')).toBeTruthy();
        expect(within(consignment).getByText('450 MT')).toBeTruthy();
        expect(screen.getByText(/A document reference does not upload or verify a document/)).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('renders RFQ quote declarations without adding an independent listing nomination', () => {
        const { nomination_status, neat_fame, ...declaration } = fuel;
        const quoteTerms: FameOfferTerms = {
            ...declaration,
            batch_reference: 'QUOTE-BATCH', producing_site: 'Quoted refinery', production_origin: 'Malaysia',
            feedstock_origin: 'Malaysia', shipping_location: 'Singapore terminal', matches_contract_terms: true, available_quantity_mt: 1200,
        };
        renderWithProviders(<FameDeclarationDetails terms={quoteTerms} />);
        expect(valueFor('Declared available quantity')).toBe('1,200 MT');
        expect(screen.getByText('QUOTE-BATCH')).toBeTruthy();
        expect(screen.queryByText('Batch nomination')).toBeNull();
    });

    it('renders commercial and fuel terms directly from the frozen source snapshot', () => {
        const snapshot: SupplierOfferSnapshot = {
            offerId: 'offer-old', revision: 1, supplierOrgId: 'never-display-this-org', productId: 'ucome', deliveryPointId: 'singapore',
            quantityMt: 400, minFillMt: 50, pricePerMtUsd: 1090, availabilityWindow: '2026-Q4', expiresAt: '2026-12-01T15:00:00Z',
            listingTerms: {
                delivery_basis: 'FOB', named_location: 'Original terminal', delivery_start: '2026-12-02', delivery_end: '2026-12-03',
                quantity_tolerance_pct: 5, evidence_due: 'BEFORE_LOADING', payment_terms: 'Original payment terms',
                fuel_terms: { ...fuel, certificate_reference: 'ORIGINAL-CERTIFICATE', ci_gco2e_mj: 25.3 },
            },
        };
        renderWithProviders(<SupplierOfferSnapshotDetails snapshot={snapshot} />);
        expect(valueFor('Indicative price')).toBe('1,090 USD/MT');
        expect(valueFor('Offered quantity')).toBe('400 MT');
        expect(valueFor('Minimum fill')).toBe('50 MT');
        expect(valueFor('Named delivery location')).toBe('Original terminal');
        expect(valueFor('Delivery window')).toBe('Q4 2026');
        expect(valueFor('Payment terms')).toBe('Original payment terms');
        expect(valueFor('Inspection terms')).toBe('Not supplied');
        expect(valueFor('Certificate reference')).toBe('ORIGINAL-CERTIFICATE');
        expect(valueFor('Declared carbon intensity')).toBe('25.3 gCO₂e/MJ');
        expect(screen.queryByText('never-display-this-org')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('localizes the declaration and privacy labels in Chinese', async () => {
        await i18n.changeLanguage('zh');
        const { certificate_reference, certificate_holder, document_references, ...summary } = fuel;
        const view = renderWithProviders(<FameDeclarationDetails terms={{ ...summary, batch_reference: null, ci_gco2e_mj: null }} />);
        expect(screen.getByText('声明碳强度')).toBeTruthy();
        expect(screen.getAllByText('不公开').length).toBeGreaterThan(0);
        expect(view.container.textContent).not.toContain('marketplace.supplierOffers.');
        expect(view.container.textContent).not.toContain('declaration.');
        expect(view.container.textContent).not.toContain('Private');
    });
});
