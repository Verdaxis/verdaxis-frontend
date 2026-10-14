import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from './test-utils';
import { BioLngTermsPanel } from '../components/trading/BioLngTermsPanel';
import i18n, { loadNamespace } from '../i18n';
import { buildLngAskTerms, buildLngBidTerms, toPublicLngAskTerms, type LngAskTermsForm, type LngBidTermsForm } from '../utils/bioLngSpecification';

const askForm = (overrides: Partial<LngAskTermsForm> = {}): LngAskTermsForm => ({
    sustainability_scheme: 'REDCERT_EU',
    scheme_certificate_number: 'DE-NL-2026-000123',
    chain_of_custody: 'MASS_BALANCE',
    union_database_registered: true,
    bio_share_pct: '97.5',
    feedstock: 'FOOD_WASTE',
    feedstock_detail: 'Municipal food waste',
    production_country: 'NL',
    wtt_ghg_gco2e_mj: '-38.25',
    min_methane_number: '84',
    delivery_method: 'TRUCK_TO_SHIP',
    seller_is_physical_supplier: false,
    physical_supplier_name: 'Rotterdam Bio Supplier BV',
    pos_timing: 'AFTER_DELIVERY',
    ...overrides,
});

const bidForm = (overrides: Partial<LngBidTermsForm> = {}): LngBidTermsForm => ({
    accepted_schemes: ['ISCC_EU'],
    accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
    require_union_database: true,
    min_bio_share_pct: '90',
    max_wtt_ghg_gco2e_mj: '',
    accepted_delivery_methods: ['SHIP_TO_SHIP'],
    min_methane_number: '',
    accept_resellers: false,
    ...overrides,
});

const askTerms = () => {
    const { terms } = buildLngAskTerms(askForm());
    if (!terms) throw new Error('test fixture did not build');
    return terms;
};

describe('BioLngTermsPanel', () => {
    beforeEach(async () => {
        await loadNamespace('trading');
        await i18n.changeLanguage('en');
    });

    it('shows the public ask terms and hides seller identity', () => {
        renderWithProviders(<BioLngTermsPanel terms={toPublicLngAskTerms(askTerms())} />);

        expect(screen.getByText('Bio-LNG terms')).toBeTruthy();
        expect(screen.getByText('REDcert-EU')).toBeTruthy();
        expect(screen.getByText('Mass balance')).toBeTruthy();
        expect(screen.getByText('Registered')).toBeTruthy();
        expect(screen.getByText('97.5%')).toBeTruthy();
        expect(screen.getByText('Food waste')).toBeTruthy();
        expect(screen.getByText('Municipal food waste')).toBeTruthy();
        expect(screen.getByText('-38.25 gCO2e/MJ')).toBeTruthy();
        expect(screen.getByText('Excludes engine methane slip, which depends on the buyer\'s engine.')).toBeTruthy();
        expect(screen.getByText('84')).toBeTruthy();
        expect(screen.getByText('Truck to ship')).toBeTruthy();
        expect(screen.getByText('Resellers accepted')).toBeTruthy();

        expect(screen.queryByText('DE-NL-2026-000123')).toBeNull();
        expect(screen.queryByText('Rotterdam Bio Supplier BV')).toBeNull();
        expect(screen.queryByText('Certificate')).toBeNull();
    });

    it('shows the seller identity on a confirmed trade snapshot', () => {
        renderWithProviders(<BioLngTermsPanel terms={askTerms()} />);

        expect(screen.getByText('Certificate')).toBeTruthy();
        expect(screen.getByText('DE-NL-2026-000123')).toBeTruthy();
        expect(screen.getByText('Rotterdam Bio Supplier BV')).toBeTruthy();
        expect(screen.getByText('After delivery')).toBeTruthy();
        expect(screen.queryByText('Physical suppliers only')).toBeNull();
    });

    it('renders bid requirements including the physical-suppliers-only policy', () => {
        renderWithProviders(<BioLngTermsPanel terms={buildLngBidTerms(bidForm()).terms} />);

        expect(screen.getByText('Bio-LNG requirements')).toBeTruthy();
        expect(screen.getByText('ISCC EU')).toBeTruthy();
        expect(screen.getByText('Mass balance, Physical segregation')).toBeTruthy();
        expect(screen.getByText('Yes')).toBeTruthy();
        expect(screen.getByText('90%')).toBeTruthy();
        expect(screen.getByText('Ship to ship')).toBeTruthy();
        expect(screen.getByText('Physical suppliers only')).toBeTruthy();
        // Unset optional requirements accept any value.
        expect(screen.getAllByText('Leave blank to accept any value.').length).toBe(2);
    });

    it('renders nothing without terms', () => {
        const { container } = renderWithProviders(<BioLngTermsPanel terms={null} />);
        expect(container.firstChild).toBeNull();
    });
});
