/**
 * Turns bio-LNG terms into label/value rows for the order book, the trade modal
 * and the order review, so every surface describes the same contract.
 */
import { isLngAskTerms, isLngPublicAskTerms, isLngBidTerms, toLngDecimal, toPublicLngAskTerms } from './bioLngSpecification';
import type { LngVisibleTerms } from '../types/lngOrder';

export interface BioLngTermsRow {
    label: string;
    value: string;
    /** Secondary line, for example the well-to-tank scope caveat. */
    note?: string;
}

export interface BioLngTermsRows {
    title: string;
    rows: BioLngTermsRow[];
}

export interface BioLngWttSummary {
    /** The value with its unit, for example "-38.25 gCO2e/MJ". */
    value: string;
    /** The localized methane-slip caveat that qualifies every WTT display. */
    note: string;
}

/**
 * The compact order book summary of a bio-LNG well-to-tank value, with the
 * localized methane-slip caveat that qualifies it everywhere it appears.
 */
export const bioLngWttSummary = (
    terms: LngVisibleTerms | null | undefined,
    t: Translate,
    locale: string,
): BioLngWttSummary | null => {
    if (!terms || terms.side !== 'ASK') return null;
    const wtt = toLngDecimal(terms.wtt_ghg_gco2e_mj);
    if (wtt === null) return null;
    return {
        value: `${wtt.toLocaleString(locale, { maximumFractionDigits: 2 })} gCO2e/MJ`,
        note: t('bioLng.display.wttNote'),
    };
};

type Translate = (key: string) => string;

export function bioLngTermsRows(
    terms: LngVisibleTerms | null | undefined,
    t: Translate,
    locale: string,
): BioLngTermsRows | null {
    if (!terms) return null;

    const decimal = (value: number | string | null | undefined): string => {
        const parsed = toLngDecimal(value);
        return parsed === null
            ? t('bioLng.display.notDeclared')
            : parsed.toLocaleString(locale, { maximumFractionDigits: 2 });
    };
    const option = (group: string, code: string): string => t(`bioLng.option.${group}.${code}`);

    if (isLngAskTerms(terms) || isLngPublicAskTerms(terms)) {
        // The derived public fields exist on both shapes, so project the full
        // ask as well and read them from one place.
        const view = isLngAskTerms(terms) ? toPublicLngAskTerms(terms) : terms;
        const rows: BioLngTermsRow[] = [
            { label: t('bioLng.display.scheme'), value: option('scheme', view.sustainability_scheme) },
        ];
        if (isLngAskTerms(terms)) {
            rows.push({ label: t('bioLng.display.certificateNumber'), value: terms.scheme_certificate_number });
        }
        rows.push(
            { label: t('bioLng.display.custody'), value: option('custody', view.chain_of_custody) },
            { label: t('bioLng.display.unionDatabase'), value: t(`bioLng.display.fueleu.${view.fueleu_recognition}`) },
            { label: t('bioLng.display.bioShare'), value: `${decimal(view.bio_share_pct)}%` },
            {
                label: t('bioLng.display.feedstock'),
                value: option('feedstock', view.feedstock),
                ...(view.feedstock_detail ? { note: view.feedstock_detail } : {}),
            },
            {
                label: t('bioLng.display.wtt'),
                value: `${decimal(view.wtt_ghg_gco2e_mj)} gCO2e/MJ`,
                note: t('bioLng.display.wttNote'),
            },
        );
        if (view.min_methane_number != null) {
            rows.push({ label: t('bioLng.display.methaneNumber'), value: decimal(view.min_methane_number) });
        }
        rows.push(
            { label: t('bioLng.display.deliveryMethod'), value: option('delivery', view.delivery_method) },
            {
                label: t('bioLng.display.resellerPolicy'),
                value: view.reseller
                    ? t('bioLng.display.resellerPolicy.accepted')
                    : t('bioLng.display.resellerPolicy.physicalOnly'),
            },
        );
        if (isLngAskTerms(terms)) {
            rows.push(
                { label: t('bioLng.display.physicalSupplier'), value: terms.physical_supplier_name },
                { label: t('bioLng.display.posTiming'), value: option('pos', terms.pos_timing) },
            );
        }
        return { title: t('bioLng.display.title'), rows };
    }

    if (!isLngBidTerms(terms)) return null;

    const any = t('bioLng.helper.optionalAny');
    return {
        title: t('bioLng.display.bid.title'),
        rows: [
            {
                label: t('bioLng.display.bid.acceptedSchemes'),
                value: terms.accepted_schemes.map((scheme) => option('scheme', scheme)).join(', '),
            },
            {
                label: t('bioLng.display.bid.acceptedCustody'),
                value: terms.accepted_custody.map((custody) => option('custody', custody)).join(', '),
            },
            {
                label: t('bioLng.display.bid.requireUnionDatabase'),
                value: t(terms.require_union_database ? 'bioLng.display.yes' : 'bioLng.display.no'),
            },
            {
                label: t('bioLng.display.bid.minBioSharePct'),
                value: terms.min_bio_share_pct == null ? any : `${decimal(terms.min_bio_share_pct)}%`,
            },
            {
                label: t('bioLng.display.bid.maxWttGhg'),
                value: terms.max_wtt_ghg_gco2e_mj == null ? any : `${decimal(terms.max_wtt_ghg_gco2e_mj)} gCO2e/MJ`,
            },
            {
                label: t('bioLng.display.bid.acceptedDeliveryMethods'),
                value: terms.accepted_delivery_methods.map((method) => option('delivery', method)).join(', '),
            },
            {
                label: t('bioLng.display.bid.minMethaneNumber'),
                value: terms.min_methane_number == null ? any : decimal(terms.min_methane_number),
            },
            {
                label: t('bioLng.display.bid.acceptResellers'),
                value: terms.accept_resellers
                    ? t('bioLng.display.resellerPolicy.accepted')
                    : t('bioLng.display.resellerPolicy.physicalOnly'),
            },
        ],
    };
}
