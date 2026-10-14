/**
 * Bio-LNG order terms: the fixed specification, the client mirror of the
 * server's `lng_terms` validation, and the pure compatibility predicate.
 *
 * The server stays authoritative. Everything here exists so the order modal can
 * refuse an invalid or incompatible order before it is sent, and so the order
 * book can render the public terms.
 */
import {
    CHAINS_OF_CUSTODY,
    DELIVERY_METHODS,
    FEEDSTOCK_CATEGORIES,
    ISO_COUNTRY_CODE_PATTERN,
    LNG_SPECIFICATION_STANDARD,
    LNG_TERMS_INCOMPATIBLE,
    LNG_TERMS_LIMITS,
    POS_TIMINGS,
    SUSTAINABILITY_SCHEMES,
    type ChainOfCustody,
    type DeliveryMethod,
    type FeedstockCategory,
    type LngAskTerms,
    type LngBidTerms,
    type LngPublicAskTerms,
    type PosTiming,
    type SustainabilityScheme,
} from '../types/lngOrder';

const MAX_LNG_DECIMAL_PLACES = 2;

export const isBioLngMarketProduct = (marketProduct: string | null | undefined): boolean => (
    marketProduct === 'BIO_LNG'
);

export function getBioLngSpecification(marketProduct: string | null | undefined): string | undefined {
    return isBioLngMarketProduct(marketProduct) ? LNG_SPECIFICATION_STANDARD : undefined;
}

/** The API returns decimals as strings; never do arithmetic on a raw value. */
export const toLngDecimal = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const hasAtMostTwoDecimalPlaces = (value: number): boolean => (
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
);

const isOneOf = <T extends readonly string[]>(allowed: T, value: string): value is T[number] => (
    (allowed as readonly string[]).includes(value)
);

// ─── Form state and validation ──────────────────────────────────

export interface LngAskTermsForm {
    sustainability_scheme: string;
    scheme_certificate_number: string;
    chain_of_custody: string;
    union_database_registered: boolean;
    bio_share_pct: string;
    feedstock: string;
    feedstock_detail: string;
    production_country: string;
    wtt_ghg_gco2e_mj: string;
    /** Optional. Blank means the ask declares no minimum methane number. */
    min_methane_number: string;
    delivery_method: string;
    seller_is_physical_supplier: boolean;
    physical_supplier_name: string;
    pos_timing: string;
}

export type LngAskIssue =
    | 'ASK_SCHEME_REQUIRED'
    | 'ASK_CERTIFICATE_LENGTH'
    | 'ASK_CUSTODY_REQUIRED'
    | 'ASK_BIO_SHARE_REQUIRED'
    | 'ASK_BIO_SHARE_RANGE'
    | 'ASK_BIO_SHARE_PRECISION'
    | 'ASK_FEEDSTOCK_REQUIRED'
    | 'ASK_FEEDSTOCK_DETAIL_LENGTH'
    | 'ASK_COUNTRY_REQUIRED'
    | 'ASK_COUNTRY_FORMAT'
    | 'ASK_WTT_REQUIRED'
    | 'ASK_WTT_RANGE'
    | 'ASK_WTT_PRECISION'
    | 'ASK_METHANE_RANGE'
    | 'ASK_DELIVERY_METHOD_REQUIRED'
    | 'ASK_SUPPLIER_NAME_LENGTH'
    | 'ASK_POS_TIMING_REQUIRED';

export interface LngAskTermsParseResult {
    /** Null when any issue remains, so a partial form can never be submitted. */
    terms: LngAskTerms | null;
    issues: LngAskIssue[];
}

const parseRequiredDecimal = (raw: string, min: number, max: number) => {
    const value = toLngDecimal(raw.trim());
    if (value === null) return { issue: 'REQUIRED' as const, value: null };
    if (value < min || value > max) return { issue: 'RANGE' as const, value: null };
    if (!hasAtMostTwoDecimalPlaces(value)) return { issue: 'PRECISION' as const, value: null };
    return { issue: null, value };
};

export function buildLngAskTerms(form: LngAskTermsForm): LngAskTermsParseResult {
    const issues: LngAskIssue[] = [];

    if (!isOneOf(SUSTAINABILITY_SCHEMES, form.sustainability_scheme)) issues.push('ASK_SCHEME_REQUIRED');

    const certificateNumber = form.scheme_certificate_number.trim();
    if (certificateNumber.length < LNG_TERMS_LIMITS.certificateNumberMin
        || certificateNumber.length > LNG_TERMS_LIMITS.certificateNumberMax) {
        issues.push('ASK_CERTIFICATE_LENGTH');
    }

    if (!isOneOf(CHAINS_OF_CUSTODY, form.chain_of_custody)) issues.push('ASK_CUSTODY_REQUIRED');

    const bioShare = parseRequiredDecimal(
        form.bio_share_pct,
        LNG_TERMS_LIMITS.bioSharePctMin,
        LNG_TERMS_LIMITS.bioSharePctMax,
    );
    if (bioShare.issue === 'REQUIRED') issues.push('ASK_BIO_SHARE_REQUIRED');
    if (bioShare.issue === 'RANGE') issues.push('ASK_BIO_SHARE_RANGE');
    if (bioShare.issue === 'PRECISION') issues.push('ASK_BIO_SHARE_PRECISION');

    if (!isOneOf(FEEDSTOCK_CATEGORIES, form.feedstock)) issues.push('ASK_FEEDSTOCK_REQUIRED');

    const feedstockDetail = form.feedstock_detail.trim();
    if (feedstockDetail.length > LNG_TERMS_LIMITS.feedstockDetailMax) issues.push('ASK_FEEDSTOCK_DETAIL_LENGTH');

    const productionCountry = form.production_country.trim();
    if (!productionCountry) issues.push('ASK_COUNTRY_REQUIRED');
    else if (!ISO_COUNTRY_CODE_PATTERN.test(productionCountry)) issues.push('ASK_COUNTRY_FORMAT');

    const wttGhg = parseRequiredDecimal(form.wtt_ghg_gco2e_mj, LNG_TERMS_LIMITS.wttGhgMin, LNG_TERMS_LIMITS.wttGhgMax);
    if (wttGhg.issue === 'REQUIRED') issues.push('ASK_WTT_REQUIRED');
    if (wttGhg.issue === 'RANGE') issues.push('ASK_WTT_RANGE');
    if (wttGhg.issue === 'PRECISION') issues.push('ASK_WTT_PRECISION');

    const minMethaneRaw = form.min_methane_number.trim();
    const minMethaneNumber = toLngDecimal(minMethaneRaw);
    if (minMethaneRaw !== '' && (minMethaneNumber === null
        || minMethaneNumber < LNG_TERMS_LIMITS.minMethaneNumberMin
        || minMethaneNumber > LNG_TERMS_LIMITS.minMethaneNumberMax)) {
        issues.push('ASK_METHANE_RANGE');
    }

    if (!isOneOf(DELIVERY_METHODS, form.delivery_method)) issues.push('ASK_DELIVERY_METHOD_REQUIRED');

    const physicalSupplierName = form.physical_supplier_name.trim();
    if (physicalSupplierName.length < LNG_TERMS_LIMITS.physicalSupplierNameMin
        || physicalSupplierName.length > LNG_TERMS_LIMITS.physicalSupplierNameMax) {
        issues.push('ASK_SUPPLIER_NAME_LENGTH');
    }

    if (!isOneOf(POS_TIMINGS, form.pos_timing)) issues.push('ASK_POS_TIMING_REQUIRED');

    if (issues.length > 0) return { terms: null, issues };

    return {
        issues,
        terms: {
            side: 'ASK',
            sustainability_scheme: form.sustainability_scheme as SustainabilityScheme,
            scheme_certificate_number: certificateNumber,
            chain_of_custody: form.chain_of_custody as ChainOfCustody,
            union_database_registered: form.union_database_registered,
            bio_share_pct: bioShare.value as number,
            feedstock: form.feedstock as FeedstockCategory,
            ...(feedstockDetail ? { feedstock_detail: feedstockDetail } : {}),
            production_country: productionCountry,
            wtt_ghg_gco2e_mj: wttGhg.value as number,
            specification_standard: LNG_SPECIFICATION_STANDARD,
            ...(minMethaneRaw !== '' ? { min_methane_number: minMethaneNumber as number } : {}),
            delivery_method: form.delivery_method as DeliveryMethod,
            seller_is_physical_supplier: form.seller_is_physical_supplier,
            physical_supplier_name: physicalSupplierName,
            pos_timing: form.pos_timing as PosTiming,
        },
    };
}

export interface LngBidTermsForm {
    accepted_schemes: string[];
    accepted_custody: string[];
    require_union_database: boolean;
    /** Optional. Blank means any bio share is acceptable. */
    min_bio_share_pct: string;
    /** Optional. Blank means any well-to-tank value is acceptable. */
    max_wtt_ghg_gco2e_mj: string;
    accepted_delivery_methods: string[];
    /** Optional. Blank means any methane number is acceptable. */
    min_methane_number: string;
    /** False is "physical suppliers only". */
    accept_resellers: boolean;
}

export type LngBidIssue =
    | 'BID_SCHEMES_REQUIRED'
    | 'BID_CUSTODY_REQUIRED'
    | 'BID_DELIVERY_METHODS_REQUIRED'
    | 'BID_MIN_BIO_SHARE_RANGE'
    | 'BID_MIN_BIO_SHARE_PRECISION'
    | 'BID_MAX_WTT_RANGE'
    | 'BID_MAX_WTT_PRECISION'
    | 'BID_METHANE_RANGE';

export interface LngBidTermsParseResult {
    terms: LngBidTerms | null;
    issues: LngBidIssue[];
}

const parseOptionalDecimal = (raw: string, min: number, max: number) => {
    const trimmed = raw.trim();
    if (trimmed === '') return { issue: null, value: null };
    const value = toLngDecimal(trimmed);
    if (value === null || value < min || value > max) return { issue: 'RANGE' as const, value: null };
    if (!hasAtMostTwoDecimalPlaces(value)) return { issue: 'PRECISION' as const, value: null };
    return { issue: null, value };
};

export function buildLngBidTerms(form: LngBidTermsForm): LngBidTermsParseResult {
    const issues: LngBidIssue[] = [];

    const acceptedSchemes = SUSTAINABILITY_SCHEMES.filter((scheme) => form.accepted_schemes.includes(scheme));
    if (acceptedSchemes.length === 0) issues.push('BID_SCHEMES_REQUIRED');

    const acceptedCustody = CHAINS_OF_CUSTODY.filter((chain) => form.accepted_custody.includes(chain));
    if (acceptedCustody.length === 0) issues.push('BID_CUSTODY_REQUIRED');

    const acceptedDeliveryMethods = DELIVERY_METHODS.filter((method) => form.accepted_delivery_methods.includes(method));
    if (acceptedDeliveryMethods.length === 0) issues.push('BID_DELIVERY_METHODS_REQUIRED');

    const minBioShare = parseOptionalDecimal(
        form.min_bio_share_pct,
        LNG_TERMS_LIMITS.bioSharePctMin,
        LNG_TERMS_LIMITS.bioSharePctMax,
    );
    if (minBioShare.issue === 'RANGE') issues.push('BID_MIN_BIO_SHARE_RANGE');
    if (minBioShare.issue === 'PRECISION') issues.push('BID_MIN_BIO_SHARE_PRECISION');

    const maxWttGhg = parseOptionalDecimal(
        form.max_wtt_ghg_gco2e_mj,
        LNG_TERMS_LIMITS.wttGhgMin,
        LNG_TERMS_LIMITS.wttGhgMax,
    );
    if (maxWttGhg.issue === 'RANGE') issues.push('BID_MAX_WTT_RANGE');
    if (maxWttGhg.issue === 'PRECISION') issues.push('BID_MAX_WTT_PRECISION');

    const minMethane = parseOptionalDecimal(
        form.min_methane_number,
        LNG_TERMS_LIMITS.minMethaneNumberMin,
        LNG_TERMS_LIMITS.minMethaneNumberMax,
    );
    if (minMethane.issue !== null) issues.push('BID_METHANE_RANGE');

    if (issues.length > 0) return { terms: null, issues };

    return {
        issues,
        terms: {
            side: 'BID',
            accepted_schemes: acceptedSchemes,
            accepted_custody: acceptedCustody,
            require_union_database: form.require_union_database,
            ...(minBioShare.value !== null ? { min_bio_share_pct: minBioShare.value } : {}),
            ...(maxWttGhg.value !== null ? { max_wtt_ghg_gco2e_mj: maxWttGhg.value } : {}),
            accepted_delivery_methods: acceptedDeliveryMethods,
            ...(minMethane.value !== null ? { min_methane_number: minMethane.value } : {}),
            accept_resellers: form.accept_resellers,
        },
    };
}

/**
 * The server's `lng_terms_compatible`, mirrored in one place so the client can
 * warn before a take is rejected with `LNG_TERMS_INCOMPATIBLE`.
 */
export function lngTermsCompatible(bid: LngBidTerms, ask: LngAskTerms): boolean {
    return (
        bid.accepted_schemes.includes(ask.sustainability_scheme)
        && bid.accepted_custody.includes(ask.chain_of_custody)
        && (ask.union_database_registered || !bid.require_union_database)
        && (bid.min_bio_share_pct == null || Number(ask.bio_share_pct) >= Number(bid.min_bio_share_pct))
        && (bid.max_wtt_ghg_gco2e_mj == null || Number(ask.wtt_ghg_gco2e_mj) <= Number(bid.max_wtt_ghg_gco2e_mj))
        && bid.accepted_delivery_methods.includes(ask.delivery_method)
        && (bid.min_methane_number == null
            || (ask.min_methane_number != null && Number(ask.min_methane_number) >= Number(bid.min_methane_number)))
        && (bid.accept_resellers || ask.seller_is_physical_supplier)
    );
}

/** Withhold seller identity for the public order book, as the server does. */
export function toPublicLngAskTerms(ask: LngAskTerms): LngPublicAskTerms {
    const { scheme_certificate_number: _certificate, physical_supplier_name: _supplier, ...publicFields } = ask;
    return {
        ...publicFields,
        reseller: !ask.seller_is_physical_supplier,
        fueleu_recognition: ask.union_database_registered ? 'UNION_DATABASE' : 'NOT_REGISTERED',
    };
}

// ─── Discriminators for rendering ───────────────────────────────

export const isLngAskTerms = (terms: { side?: string } | null | undefined): terms is LngAskTerms => (
    terms?.side === 'ASK' && 'scheme_certificate_number' in terms
);

export const isLngPublicAskTerms = (terms: { side?: string } | null | undefined): terms is LngPublicAskTerms => (
    terms?.side === 'ASK' && 'reseller' in terms
);

export const isLngBidTerms = (terms: { side?: string } | null | undefined): terms is LngBidTerms => (
    terms?.side === 'BID' && 'accepted_schemes' in terms
);

/** True when the API refused a take because the two sides are incompatible. */
export const isLngTermsIncompatibleError = (error: unknown): boolean => (
    typeof error === 'object'
    && error !== null
    && (error as { code?: unknown }).code === LNG_TERMS_INCOMPATIBLE
);
