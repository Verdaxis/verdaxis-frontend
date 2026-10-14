import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/trading.json';
import type { LngAskTerms, LngBidTerms, LngPublicAskTerms } from '../../../types/lngOrder';
import { LngOrderTermsDetails } from '../LngOrderTermsDetails';
import { renderWithProviders } from '../../../tests/test-utils';

const text = (key: string) => copy[key as keyof typeof copy] as string;

const publicAsk: LngPublicAskTerms = {
    side: 'ASK',
    sustainability_scheme: 'ISCC_EU',
    chain_of_custody: 'MASS_BALANCE',
    union_database_registered: false,
    bio_share_pct: 95,
    feedstock: 'MANURE',
    feedstock_detail: 'Dairy farm cluster',
    production_country: 'NL',
    wtt_ghg_gco2e_mj: -120.5,
    specification_standard: 'ISO 23306:2020',
    min_methane_number: 80,
    delivery_method: 'SHIP_TO_SHIP',
    seller_is_physical_supplier: false,
    pos_timing: 'WITH_DELIVERY',
    reseller: true,
    fueleu_recognition: 'NOT_REGISTERED',
};

const fullAsk: LngAskTerms = {
    ...publicAsk,
    scheme_certificate_number: 'ISCC-EU-001',
    physical_supplier_name: 'Licensed Bunker Co',
};

const bid: LngBidTerms = {
    side: 'BID',
    accepted_schemes: ['ISCC_EU'],
    accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
    require_union_database: true,
    min_bio_share_pct: 90,
    max_wtt_ghg_gco2e_mj: -50,
    accepted_delivery_methods: ['SHIP_TO_SHIP'],
    min_methane_number: 70,
    accept_resellers: false,
};

beforeAll(async () => { await loadNamespace('trading'); await i18n.changeLanguage('en'); });

describe('LngOrderTermsDetails', () => {
    it('shows the public ask terms with the WTT note and without seller identity', () => {
        renderWithProviders(<LngOrderTermsDetails terms={publicAsk} />);
        const view = screen.getByRole('heading', { name: text('lngTerms.ask.title') }).closest('section')!;
        expect(within(view).getByText(text('lngTerms.scheme.ISCC_EU'))).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.custody.MASS_BALANCE'))).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.unionDatabase.notRegistered'))).toBeTruthy();
        expect(within(view).getByText('95 %')).toBeTruthy();
        expect(within(view).getByText(/-120\.5 gCO₂e\/MJ/)).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.wttNote'))).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.reseller.yes'))).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.deliveryMethod.SHIP_TO_SHIP'))).toBeTruthy();
        // A public ask must not reveal the certificate number or supplier name.
        expect(screen.queryByText(text('lngTerms.field.certificateNumber'))).toBeNull();
        expect(screen.queryByText(text('lngTerms.field.physicalSupplierName'))).toBeNull();
        expect(screen.queryByText('ISCC-EU-001')).toBeNull();
        expect(screen.queryByText('Licensed Bunker Co')).toBeNull();
    });

    it('adds the seller identity to a confirmed-trade snapshot', () => {
        renderWithProviders(<LngOrderTermsDetails terms={fullAsk} />);
        expect(screen.getByText('ISCC-EU-001')).toBeTruthy();
        expect(screen.getByText('Licensed Bunker Co')).toBeTruthy();
        expect(screen.getByText(text('lngTerms.ask.standardNotice').replace('{{standard}}', 'ISO 23306:2020'))).toBeTruthy();
    });

    it('renders buyer requirements with required versus optional flags', () => {
        renderWithProviders(<LngOrderTermsDetails terms={bid} />);
        const view = screen.getByRole('heading', { name: text('lngTerms.bid.title') }).closest('section')!;
        expect(within(view).getByText(text('lngTerms.scheme.ISCC_EU'))).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.unionDatabase.required'))).toBeTruthy();
        expect(within(view).getByText('90 %')).toBeTruthy();
        expect(within(view).getByText('-50 gCO₂e/MJ')).toBeTruthy();
        expect(within(view).getByText(text('lngTerms.physicalSuppliersOnly'))).toBeTruthy();
    });

    it('labels missing optional measurements instead of inventing zero', () => {
        const { rerender } = render(<LngOrderTermsDetails terms={{ ...publicAsk, bio_share_pct: Number.NaN, min_methane_number: null }} />);
        rerender(<LngOrderTermsDetails terms={{ ...publicAsk, bio_share_pct: Number.NaN, min_methane_number: null }} />);
        expect(screen.getAllByText(text('lngTerms.notSupplied')).length).toBeGreaterThanOrEqual(2);
    });
});
