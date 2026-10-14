import { describe, expect, it } from 'vitest';

import {
    buildLngAskTerms,
    buildLngBidTerms,
    getBioLngSpecification,
    isBioLngMarketProduct,
    isLngAskTerms,
    isLngBidTerms,
    isLngPublicAskTerms,
    isLngTermsIncompatibleError,
    lngTermsCompatible,
    toLngDecimal,
    toPublicLngAskTerms,
    type LngAskTermsForm,
    type LngBidTermsForm,
} from '../utils/bioLngSpecification';
import { LNG_SPECIFICATION_STANDARD, LNG_TERMS_INCOMPATIBLE, type LngBidTerms } from '../types/lngOrder';

const validAskForm = (overrides: Partial<LngAskTermsForm> = {}): LngAskTermsForm => ({
    sustainability_scheme: 'ISCC_EU',
    scheme_certificate_number: 'ISCC-EU-CERT-0001',
    chain_of_custody: 'PHYSICAL_SEGREGATION',
    union_database_registered: true,
    bio_share_pct: '100',
    feedstock: 'MANURE',
    feedstock_detail: '',
    production_country: 'NL',
    wtt_ghg_gco2e_mj: '-42.5',
    min_methane_number: '',
    delivery_method: 'SHIP_TO_SHIP',
    seller_is_physical_supplier: true,
    physical_supplier_name: 'Diesol BV',
    pos_timing: 'WITH_DELIVERY',
    ...overrides,
});

const validBidForm = (overrides: Partial<LngBidTermsForm> = {}): LngBidTermsForm => ({
    accepted_schemes: ['ISCC_EU', 'REDCERT_EU'],
    accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
    require_union_database: true,
    min_bio_share_pct: '',
    max_wtt_ghg_gco2e_mj: '',
    accepted_delivery_methods: ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'],
    min_methane_number: '',
    accept_resellers: true,
    ...overrides,
});

describe('bio-LNG product seam', () => {
    it('exposes the ISO 23306:2020 standard only for BIO_LNG', () => {
        expect(getBioLngSpecification('BIO_LNG')).toBe(LNG_SPECIFICATION_STANDARD);
        expect(getBioLngSpecification('B30')).toBeUndefined();
        expect(getBioLngSpecification(null)).toBeUndefined();
        expect(isBioLngMarketProduct('BIO_LNG')).toBe(true);
        expect(isBioLngMarketProduct('B100')).toBe(false);
    });

    it('reads API decimals defensively', () => {
        expect(toLngDecimal('-42.50')).toBe(-42.5);
        expect(toLngDecimal('')).toBeNull();
        expect(toLngDecimal('not a number')).toBeNull();
    });
});

describe('bio-LNG ask terms', () => {
    it('builds the full contract payload from a valid form', () => {
        const { terms, issues } = buildLngAskTerms(validAskForm());
        expect(issues).toEqual([]);
        expect(terms).toEqual({
            side: 'ASK',
            sustainability_scheme: 'ISCC_EU',
            scheme_certificate_number: 'ISCC-EU-CERT-0001',
            chain_of_custody: 'PHYSICAL_SEGREGATION',
            union_database_registered: true,
            bio_share_pct: 100,
            feedstock: 'MANURE',
            production_country: 'NL',
            wtt_ghg_gco2e_mj: -42.5,
            specification_standard: 'ISO 23306:2020',
            delivery_method: 'SHIP_TO_SHIP',
            seller_is_physical_supplier: true,
            physical_supplier_name: 'Diesol BV',
            pos_timing: 'WITH_DELIVERY',
        });
    });

    it('keeps optional fields out of the payload when blank', () => {
        const { terms } = buildLngAskTerms(validAskForm({ feedstock_detail: '  ', min_methane_number: '' }));
        expect(terms).not.toBeNull();
        expect(terms && 'feedstock_detail' in terms).toBe(false);
        expect(terms && 'min_methane_number' in terms).toBe(false);
    });

    it('accepts a declared methane number and trims supplier text', () => {
        const { terms } = buildLngAskTerms(validAskForm({
            min_methane_number: '80',
            feedstock_detail: '  Dairy manure  ',
            physical_supplier_name: '  Diesol BV  ',
        }));
        expect(terms?.min_methane_number).toBe(80);
        expect(terms?.feedstock_detail).toBe('Dairy manure');
        expect(terms?.physical_supplier_name).toBe('Diesol BV');
    });

    it('reports every invalid field instead of sending a partial payload', () => {
        const { terms, issues } = buildLngAskTerms(validAskForm({
            sustainability_scheme: 'UNKNOWN',
            scheme_certificate_number: 'x',
            chain_of_custody: '',
            bio_share_pct: '0',
            feedstock: '',
            production_country: 'netherlands',
            wtt_ghg_gco2e_mj: '-151',
            min_methane_number: '101',
            delivery_method: '',
            physical_supplier_name: 'A',
            pos_timing: '',
        }));
        expect(terms).toBeNull();
        expect(issues).toEqual([
            'ASK_SCHEME_REQUIRED',
            'ASK_CERTIFICATE_LENGTH',
            'ASK_CUSTODY_REQUIRED',
            'ASK_BIO_SHARE_RANGE',
            'ASK_FEEDSTOCK_REQUIRED',
            'ASK_COUNTRY_FORMAT',
            'ASK_WTT_RANGE',
            'ASK_METHANE_RANGE',
            'ASK_DELIVERY_METHOD_REQUIRED',
            'ASK_SUPPLIER_NAME_LENGTH',
            'ASK_POS_TIMING_REQUIRED',
        ]);
    });

    it('enforces two decimal places and a lowercase country code', () => {
        expect(buildLngAskTerms(validAskForm({ bio_share_pct: '99.123' })).issues).toEqual(['ASK_BIO_SHARE_PRECISION']);
        expect(buildLngAskTerms(validAskForm({ wtt_ghg_gco2e_mj: '1.005' })).issues).toEqual(['ASK_WTT_PRECISION']);
        expect(buildLngAskTerms(validAskForm({ production_country: '' })).issues).toEqual(['ASK_COUNTRY_REQUIRED']);
    });
});

describe('bio-LNG bid terms', () => {
    it('builds the full contract payload from a valid form', () => {
        const { terms, issues } = buildLngBidTerms(validBidForm());
        expect(issues).toEqual([]);
        expect(terms).toEqual({
            side: 'BID',
            accepted_schemes: ['ISCC_EU', 'REDCERT_EU'],
            accepted_custody: ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'],
            require_union_database: true,
            accepted_delivery_methods: ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'],
            accept_resellers: true,
        });
    });

    it('carries optional floors only when set', () => {
        const { terms } = buildLngBidTerms(validBidForm({
            min_bio_share_pct: '80',
            max_wtt_ghg_gco2e_mj: '-10',
            min_methane_number: '75',
        }));
        expect(terms?.min_bio_share_pct).toBe(80);
        expect(terms?.max_wtt_ghg_gco2e_mj).toBe(-10);
        expect(terms?.min_methane_number).toBe(75);
    });

    it('requires both acceptance lists and honours physical-suppliers-only', () => {
        expect(buildLngBidTerms(validBidForm({ accepted_schemes: [] })).issues).toEqual(['BID_SCHEMES_REQUIRED']);
        expect(buildLngBidTerms(validBidForm({ accepted_custody: [] })).issues).toEqual(['BID_CUSTODY_REQUIRED']);
        expect(buildLngBidTerms(validBidForm({ accepted_delivery_methods: [] })).issues)
            .toEqual(['BID_DELIVERY_METHODS_REQUIRED']);
        expect(buildLngBidTerms(validBidForm({ accept_resellers: false })).terms?.accept_resellers).toBe(false);
    });

    it('drops unknown list entries and rejects out-of-range optional values', () => {
        const { terms } = buildLngBidTerms(validBidForm({ accepted_schemes: ['ISCC_EU', 'MADE_UP'] }));
        expect(terms?.accepted_schemes).toEqual(['ISCC_EU']);
        expect(buildLngBidTerms(validBidForm({ min_bio_share_pct: '150' })).issues).toEqual(['BID_MIN_BIO_SHARE_RANGE']);
        expect(buildLngBidTerms(validBidForm({ max_wtt_ghg_gco2e_mj: '-200' })).issues).toEqual(['BID_MAX_WTT_RANGE']);
        expect(buildLngBidTerms(validBidForm({ min_methane_number: '120' })).issues).toEqual(['BID_METHANE_RANGE']);
    });
});

describe('bio-LNG compatibility', () => {
    const ask = buildLngAskTerms(validAskForm()).terms!;
    const bid = buildLngBidTerms(validBidForm()).terms!;

    it('matches a fully compatible pair', () => {
        expect(lngTermsCompatible(bid, ask)).toBe(true);
    });

    it.each<[string, Partial<LngBidTerms>]>([
        ['scheme', { accepted_schemes: ['REDCERT_EU'] }],
        ['custody', { accepted_custody: ['MASS_BALANCE'] }],
        ['delivery method', { accepted_delivery_methods: ['TRUCK_TO_SHIP'] }],
    ])('rejects an ask outside the bid %s list', (_label, override) => {
        expect(lngTermsCompatible({ ...bid, ...override }, ask)).toBe(false);
    });

    it('rejects a block-chain-of-custody ask when the bid requires the Union Database', () => {
        expect(lngTermsCompatible(bid, { ...ask, union_database_registered: false })).toBe(false);
        expect(lngTermsCompatible({ ...bid, require_union_database: false }, { ...ask, union_database_registered: false }))
            .toBe(true);
    });

    it('compares the optional bio share and well-to-tank floors', () => {
        expect(lngTermsCompatible({ ...bid, min_bio_share_pct: 100 }, ask)).toBe(true);
        expect(lngTermsCompatible({ ...bid, min_bio_share_pct: 100.01 }, ask)).toBe(false);
        expect(lngTermsCompatible({ ...bid, max_wtt_ghg_gco2e_mj: -42.5 }, ask)).toBe(true);
        expect(lngTermsCompatible({ ...bid, max_wtt_ghg_gco2e_mj: -42.6 }, ask)).toBe(false);
    });

    it('requires a declared ask methane number to satisfy the bid minimum', () => {
        expect(lngTermsCompatible({ ...bid, min_methane_number: 80 }, ask)).toBe(false);
        expect(lngTermsCompatible({ ...bid, min_methane_number: 80 }, { ...ask, min_methane_number: 80 })).toBe(true);
        expect(lngTermsCompatible({ ...bid, min_methane_number: 80 }, { ...ask, min_methane_number: 79 })).toBe(false);
    });

    it('honours physical-suppliers-only bids', () => {
        const resellerAsk = { ...ask, seller_is_physical_supplier: false };
        expect(lngTermsCompatible(bid, resellerAsk)).toBe(true);
        expect(lngTermsCompatible({ ...bid, accept_resellers: false }, resellerAsk)).toBe(false);
        expect(lngTermsCompatible({ ...bid, accept_resellers: false }, ask)).toBe(true);
    });
});

describe('public bio-LNG ask view', () => {
    const ask = buildLngAskTerms(validAskForm({ union_database_registered: false, seller_is_physical_supplier: false })).terms!;

    it('withholds seller identity and derives the public flags', () => {
        const publicTerms = toPublicLngAskTerms(ask);
        expect(publicTerms).not.toHaveProperty('scheme_certificate_number');
        expect(publicTerms).not.toHaveProperty('physical_supplier_name');
        expect(publicTerms.reseller).toBe(true);
        expect(publicTerms.fueleu_recognition).toBe('NOT_REGISTERED');
        expect(publicTerms.sustainability_scheme).toBe('ISCC_EU');
    });

    it('marks a registered physical-supplier ask as recognised', () => {
        const publicTerms = toPublicLngAskTerms(buildLngAskTerms(validAskForm()).terms!);
        expect(publicTerms.reseller).toBe(false);
        expect(publicTerms.fueleu_recognition).toBe('UNION_DATABASE');
    });

    it('discriminates ask, public ask and bid terms', () => {
        const publicTerms = toPublicLngAskTerms(ask);
        expect(isLngAskTerms(ask)).toBe(true);
        expect(isLngPublicAskTerms(ask)).toBe(false);
        expect(isLngPublicAskTerms(publicTerms)).toBe(true);
        expect(isLngBidTerms(buildLngBidTerms(validBidForm()).terms)).toBe(true);
        expect(isLngAskTerms({ side: 'BID' })).toBe(false);
        expect(isLngAskTerms(null)).toBe(false);
    });
});

describe('LNG_TERMS_INCOMPATIBLE handling', () => {
    it('recognises only the stable incompatible-take error code', () => {
        expect(isLngTermsIncompatibleError({ code: LNG_TERMS_INCOMPATIBLE })).toBe(true);
        expect(isLngTermsIncompatibleError({ code: 'SOMETHING_ELSE' })).toBe(false);
        expect(isLngTermsIncompatibleError(new Error('tap'))).toBe(false);
        expect(isLngTermsIncompatibleError(null)).toBe(false);
    });
});
