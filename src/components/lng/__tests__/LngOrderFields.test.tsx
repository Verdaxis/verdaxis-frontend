import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n, { loadNamespace } from '../../../i18n';
import copy from '../../../locales/en/trading.json';
import type { LngPublicAskTerms } from '../../../types/lngOrder';
import { LngOrderFields, initialLngTakerTerms, readLngOrderAcknowledgements, readLngOrderTerms, validateLngOrderTerms } from '../LngOrderFields';

const text = (key: string) => copy[key as keyof typeof copy] as string;

function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function data() { return new FormData(screen.getByRole('form') as HTMLFormElement); }
function terms(side: 'BID' | 'ASK') { return readLngOrderTerms(data(), side); }

function fillValidAsk() {
    fill(text('lngTerms.field.certificateNumber'), 'ISCC-EU-001');
    fill(text('lngTerms.field.productionCountry'), 'NL');
    fill(text('lngTerms.field.bioShare'), '95');
    fill(text('lngTerms.field.wtt'), '12.5');
    fill(text('lngTerms.field.supplierName'), 'Supplier A');
}

beforeAll(async () => { await loadNamespace('trading'); await i18n.changeLanguage('en'); });

describe('LngOrderFields', () => {
    it('reads a complete seller declaration as LngAskTerms', () => {
        render(<form aria-label="order"><LngOrderFields side="ASK" /></form>);
        fillValidAsk();
        fill(text('lngTerms.field.productionCountry'), 'nl');
        expect(terms('ASK')).toEqual({
            side: 'ASK',
            sustainability_scheme: 'ISCC_EU',
            scheme_certificate_number: 'ISCC-EU-001',
            chain_of_custody: 'MASS_BALANCE',
            union_database_registered: false,
            bio_share_pct: 95,
            feedstock: 'MANURE',
            feedstock_detail: null,
            production_country: 'NL',
            wtt_ghg_gco2e_mj: 12.5,
            specification_standard: 'ISO 23306:2020',
            min_methane_number: null,
            delivery_method: 'SHIP_TO_SHIP',
            seller_is_physical_supplier: true,
            physical_supplier_name: 'Supplier A',
            pos_timing: 'WITH_DELIVERY',
        });
        expect(validateLngOrderTerms(terms('ASK'))).toBeNull();
    });

    it('mirrors the server ranges and formats on the ASK side', () => {
        render(<form aria-label="order"><LngOrderFields side="ASK" /></form>);
        fillValidAsk();
        fill(text('lngTerms.field.certificateNumber'), 'ab');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.certificateNumber');
        fill(text('lngTerms.field.certificateNumber'), 'ISCC-EU-001');
        // ZZ is two uppercase letters but not an ISO 3166-1 alpha-2 code.
        fill(text('lngTerms.field.productionCountry'), 'ZZ');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.productionCountry');
        fill(text('lngTerms.field.productionCountry'), 'NLD');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.productionCountry');
        fill(text('lngTerms.field.productionCountry'), 'nl');
        expect(terms('ASK')).toEqual(expect.objectContaining({ production_country: 'NL' }));
        expect(validateLngOrderTerms(terms('ASK'))).toBeNull();
        fill(text('lngTerms.field.bioShare'), '0');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.bioShare');
        fill(text('lngTerms.field.bioShare'), '95.125');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.bioShare');
        fill(text('lngTerms.field.bioShare'), '95');
        // A negative well-to-tank value is valid (manure).
        fill(text('lngTerms.field.wtt'), '-120.5');
        expect(validateLngOrderTerms(terms('ASK'))).toBeNull();
        fill(text('lngTerms.field.wtt'), '100.01');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.wtt');
        fill(text('lngTerms.field.wtt'), '12.5');
        fill(text('lngTerms.field.supplierName'), 'S');
        expect(validateLngOrderTerms(terms('ASK'))).toBe('lngTerms.validation.supplierName');
    });

    it('keeps the named physical supplier when the seller is a reseller', () => {
        render(<form aria-label="order"><LngOrderFields side="ASK" /></form>);
        fillValidAsk();
        fireEvent.click(screen.getByLabelText(text('lngTerms.ask.physicalSupplier')));
        fill(text('lngTerms.field.physicalSupplierName'), 'Licensed Bunker Co');
        const ask = terms('ASK');
        expect(ask).toEqual(expect.objectContaining({
            seller_is_physical_supplier: false,
            physical_supplier_name: 'Licensed Bunker Co',
        }));
        expect(validateLngOrderTerms(ask)).toBeNull();
    });

    it('reads buyer requirements and defaults to accepting everything', () => {
        render(<form aria-label="order"><LngOrderFields side="BID" /></form>);
        expect(terms('BID')).toEqual({
            side: 'BID',
            accepted_schemes: ['ISCC_EU', 'REDCERT_EU'],
            accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
            require_union_database: true,
            min_bio_share_pct: null,
            max_wtt_ghg_gco2e_mj: null,
            accepted_delivery_methods: ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'],
            min_methane_number: null,
            accept_resellers: true,
        });
        expect(validateLngOrderTerms(terms('BID'))).toBeNull();
    });

    it('turns the physical-suppliers-only switch into accept_resellers false', () => {
        render(<form aria-label="order"><LngOrderFields side="BID" /></form>);
        fireEvent.click(screen.getByLabelText(text('lngTerms.bid.physicalSuppliersOnly')));
        expect(terms('BID')).toEqual(expect.objectContaining({ accept_resellers: false }));
        fill(text('lngTerms.field.maxWtt'), '-10');
        expect(terms('BID')).toEqual(expect.objectContaining({ max_wtt_ghg_gco2e_mj: -10 }));
        expect(validateLngOrderTerms(terms('BID'))).toBeNull();
    });

    it('rejects empty or duplicated buyer acceptance lists', () => {
        render(<form aria-label="order"><LngOrderFields side="BID" /></form>);
        fireEvent.click(screen.getByLabelText(text('lngTerms.scheme.REDCERT_EU')));
        fireEvent.click(screen.getByLabelText(text('lngTerms.scheme.ISCC_EU')));
        expect(validateLngOrderTerms(terms('BID'))).toBe('lngTerms.validation.acceptedSchemes');
        // The checkbox group cannot create duplicates, so the guard is checked directly.
        expect(validateLngOrderTerms({
            side: 'BID', accepted_schemes: ['ISCC_EU', 'ISCC_EU'], accepted_custody: ['MASS_BALANCE'],
            require_union_database: true, accepted_delivery_methods: ['SHIP_TO_SHIP'], accept_resellers: true,
        })).toBe('lngTerms.validation.acceptedSchemes');
        expect(validateLngOrderTerms({
            side: 'BID', accepted_schemes: ['ISCC_EU'], accepted_custody: [],
            require_union_database: true, accepted_delivery_methods: ['SHIP_TO_SHIP'], accept_resellers: true,
        })).toBe('lngTerms.validation.acceptedCustody');
        expect(validateLngOrderTerms({
            side: 'BID', accepted_schemes: ['ISCC_EU'], accepted_custody: ['MASS_BALANCE'],
            require_union_database: true, accepted_delivery_methods: [], accept_resellers: true,
        })).toBe('lngTerms.validation.acceptedDeliveryMethods');
    });

    it('reads the MSDS acknowledgement separately from the terms', () => {
        render(<form aria-label="order"><LngOrderFields side="ASK" /></form>);
        const msds = screen.getByLabelText(text('lngTerms.ask.msdsAvailable')) as HTMLInputElement;
        expect(msds.required).toBe(true);
        expect(readLngOrderAcknowledgements(data())).toEqual({ msds_available: false });
        fireEvent.click(msds);
        expect(readLngOrderAcknowledgements(data())).toEqual({ msds_available: true });
        // The acknowledgement is not part of lng_terms.
        expect(terms('ASK')).not.toHaveProperty('msds_available');
    });

    it('prefills the taker side from the listed order', () => {
        const publicAsk: LngPublicAskTerms = {
            side: 'ASK',
            sustainability_scheme: 'REDCERT_EU',
            chain_of_custody: 'PHYSICAL_SEGREGATION',
            union_database_registered: true,
            bio_share_pct: 98,
            feedstock: 'FOOD_WASTE',
            feedstock_detail: null,
            production_country: 'NL',
            wtt_ghg_gco2e_mj: -20,
            specification_standard: 'ISO 23306:2020',
            min_methane_number: 80,
            delivery_method: 'TRUCK_TO_SHIP',
            seller_is_physical_supplier: false,
            pos_timing: 'AFTER_DELIVERY',
            reseller: true,
            fueleu_recognition: 'UNION_DATABASE',
        };
        expect(initialLngTakerTerms(publicAsk)).toEqual(expect.objectContaining({
            side: 'BID',
            accepted_schemes: ['REDCERT_EU'],
            accepted_custody: ['PHYSICAL_SEGREGATION'],
            accepted_delivery_methods: ['TRUCK_TO_SHIP'],
            require_union_database: true,
        }));
        // The opposite direction starts from the buyer's requirements.
        expect(initialLngTakerTerms({
            side: 'BID',
            accepted_schemes: ['ISCC_EU'],
            accepted_custody: ['MASS_BALANCE'],
            require_union_database: false,
            accepted_delivery_methods: ['SHIP_TO_SHIP'],
            accept_resellers: false,
        })).toEqual(expect.objectContaining({
            side: 'ASK',
            sustainability_scheme: 'ISCC_EU',
            chain_of_custody: 'MASS_BALANCE',
            delivery_method: 'SHIP_TO_SHIP',
            specification_standard: 'ISO 23306:2020',
        }));
    });
});
