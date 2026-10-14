import React from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import {
    isLngAskTerms,
    isLngBidTerms,
    isLngPublicAskTerms,
    toLngDecimal,
    toPublicLngAskTerms,
} from '../../utils/bioLngSpecification';
import type { LngVisibleTerms } from '../../types/lngOrder';

interface TermsRow {
    label: string;
    value: string;
    /** Secondary line, for example the well-to-tank scope caveat. */
    note?: string;
}

interface BioLngTermsPanelProps {
    terms: LngVisibleTerms | null | undefined;
    className?: string;
}

/**
 * Renders the bio-LNG terms of an order or a trade.
 *
 * The server decides how much detail a client may see: an ask that still
 * carries its certificate number and physical supplier is a confirmed-trade
 * snapshot, while the order book projection omits them. This panel shows the
 * identity rows only when the payload supplies them.
 */
export const BioLngTermsPanel: React.FC<BioLngTermsPanelProps> = ({ terms, className = '' }) => {
    const { t } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

    if (!terms) return null;

    const decimal = (value: number | string | null | undefined): string => {
        const parsed = toLngDecimal(value);
        return parsed === null
            ? t('bioLng.display.notDeclared')
            : parsed.toLocaleString(locale, { maximumFractionDigits: 2 });
    };
    const option = (group: string, code: string): string => t(`bioLng.option.${group}.${code}`);

    let title: string;
    let rows: TermsRow[];

    if (isLngAskTerms(terms) || isLngPublicAskTerms(terms)) {
        // The derived public fields exist on both shapes, so project the full
        // ask as well and read them from one place.
        const view = isLngAskTerms(terms) ? toPublicLngAskTerms(terms) : terms;
        title = t('bioLng.display.title');
        rows = [
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
    } else if (isLngBidTerms(terms)) {
        const yesNo = (value: boolean) => t(value ? 'bioLng.display.yes' : 'bioLng.display.no');
        title = t('bioLng.display.bid.title');
        rows = [
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
                value: yesNo(terms.require_union_database),
            },
            {
                label: t('bioLng.display.bid.minBioSharePct'),
                value: terms.min_bio_share_pct == null ? t('bioLng.helper.optionalAny') : `${decimal(terms.min_bio_share_pct)}%`,
            },
            {
                label: t('bioLng.display.bid.maxWttGhg'),
                value: terms.max_wtt_ghg_gco2e_mj == null
                    ? t('bioLng.helper.optionalAny')
                    : `${decimal(terms.max_wtt_ghg_gco2e_mj)} gCO2e/MJ`,
            },
            {
                label: t('bioLng.display.bid.acceptedDeliveryMethods'),
                value: terms.accepted_delivery_methods.map((method) => option('delivery', method)).join(', '),
            },
            {
                label: t('bioLng.display.bid.minMethaneNumber'),
                value: terms.min_methane_number == null
                    ? t('bioLng.helper.optionalAny')
                    : decimal(terms.min_methane_number),
            },
            {
                label: t('bioLng.display.bid.acceptResellers'),
                value: terms.accept_resellers
                    ? t('bioLng.display.resellerPolicy.accepted')
                    : t('bioLng.display.resellerPolicy.physicalOnly'),
            },
        ];
    } else {
        return null;
    }

    return (
        <div className={className} data-testid="bio-lng-terms">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-2">
                {rows.map(({ label, value, note }) => (
                    <div key={label}>
                        <dt className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
                        <dd className="text-slate-600 dark:text-slate-300">{value}</dd>
                        {note && <dd className="mt-0.5 text-slate-500 dark:text-slate-400">{note}</dd>}
                    </div>
                ))}
            </dl>
        </div>
    );
};
