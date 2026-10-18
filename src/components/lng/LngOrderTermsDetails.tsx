import React, { useId } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import { lngAskRecognition, type LngOrderTermsView } from '../../types/lngOrder';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="min-w-0">
        <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{children}</dd>
    </div>;
}

/**
 * Bio-LNG terms readback. The public ask view withholds the seller's identity;
 * a confirmed trade snapshot carries the full ask, so those fields appear only
 * when the API supplied them.
 */
export function LngOrderTermsDetails({ terms }: { terms: LngOrderTermsView }) {
    const { t, ready } = useNamespace('trading');
    const headingId = useId();
    const locale = i18n.resolvedLanguage || 'en';
    const unknown = t('lngTerms.notSupplied');
    const text = (value: string | null | undefined) => value?.trim() || unknown;
    const number = (value: number | null | undefined, unit: string) => value == null || !Number.isFinite(value)
        ? unknown : `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${unit}`.trim();

    if (!ready) return null;
    if (terms.side === 'BID') return <section className="text-left" aria-labelledby={headingId}>
        <h3 id={headingId} className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('lngTerms.bid.title')}</h3>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label={t('lngTerms.field.scheme')}>{terms.accepted_schemes.map(scheme => t(`lngTerms.scheme.${scheme}`)).join(', ')}</Detail>
            <Detail label={t('lngTerms.field.custody')}>{terms.accepted_custody.map(value => t(`lngTerms.custody.${value}`)).join(', ')}</Detail>
            <Detail label={t('lngTerms.field.deliveryMethod')}>{terms.accepted_delivery_methods.map(value => t(`lngTerms.deliveryMethod.${value}`)).join(', ')}</Detail>
            <Detail label={t('lngTerms.field.unionDatabase')}>{t(terms.require_union_database ? 'lngTerms.unionDatabase.required' : 'lngTerms.unionDatabase.optional')}</Detail>
            <Detail label={t('lngTerms.field.minBioShare')}>{number(terms.min_bio_share_pct, '%')}</Detail>
            <Detail label={t('lngTerms.field.maxWtt')}>{number(terms.max_wtt_ghg_gco2e_mj, 'gCO₂e/MJ')}</Detail>
            <Detail label={t('lngTerms.field.methaneNumber')}>{number(terms.min_methane_number, '')}</Detail>
            <Detail label={t('lngTerms.field.resellers')}>{t(terms.accept_resellers ? 'lngTerms.resellersAccepted' : 'lngTerms.physicalSuppliersOnly')}</Detail>
        </dl>
    </section>;

    const { reseller, fueleu_recognition } = lngAskRecognition(terms);
    const identity = 'physical_supplier_name' in terms ? terms : null;
    return <section className="text-left" aria-labelledby={headingId}>
        <h3 id={headingId} className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('lngTerms.ask.title')}</h3>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label={t('lngTerms.field.scheme')}>{t(`lngTerms.scheme.${terms.sustainability_scheme}`)}</Detail>
            <Detail label={t('lngTerms.field.custody')}>{t(`lngTerms.custody.${terms.chain_of_custody}`)}</Detail>
            <Detail label={t('lngTerms.field.unionDatabase')}>{t(fueleu_recognition === 'UNION_DATABASE' ? 'lngTerms.unionDatabase.registered' : 'lngTerms.unionDatabase.notRegistered')}</Detail>
            <Detail label={t('lngTerms.field.bioShare')}>{number(terms.bio_share_pct, '%')}</Detail>
            <Detail label={t('lngTerms.field.feedstock')}>{t(`lngTerms.feedstock.${terms.feedstock}`)}{terms.feedstock_detail ? ` · ${terms.feedstock_detail}` : ''}</Detail>
            <Detail label={t('lngTerms.field.productionCountry')}>{text(terms.production_country)}</Detail>
            <Detail label={t('lngTerms.field.wtt')}>
                {number(terms.wtt_ghg_gco2e_mj, 'gCO₂e/MJ')}
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{t('lngTerms.wttNote')}</span>
            </Detail>
            <Detail label={t('lngTerms.field.methaneNumber')}>{number(terms.min_methane_number, '')}</Detail>
            <Detail label={t('lngTerms.field.deliveryMethod')}>{t(`lngTerms.deliveryMethod.${terms.delivery_method}`)}</Detail>
            <Detail label={t('lngTerms.field.posTiming')}>{t(`lngTerms.posTiming.${terms.pos_timing}`)}</Detail>
            <Detail label={t('lngTerms.field.reseller')}>{t(reseller ? 'lngTerms.reseller.yes' : 'lngTerms.reseller.no')}</Detail>
            {identity && <Detail label={t('lngTerms.field.certificateNumber')}>{text(identity.scheme_certificate_number)}</Detail>}
            {identity && <Detail label={t('lngTerms.field.physicalSupplierName')}>{text(identity.physical_supplier_name)}</Detail>}
        </dl>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('lngTerms.ask.standardNotice', { standard: terms.specification_standard })}</p>
    </section>;
}

/** One-line public ask summary for compact surfaces such as the order book. */
export function lngAskSummary(terms: LngOrderTermsView, t: (key: string, options?: Record<string, unknown>) => string): string | null {
    if (terms.side !== 'ASK') return null;
    const { reseller, fueleu_recognition } = lngAskRecognition(terms);
    return [
        t(`lngTerms.scheme.${terms.sustainability_scheme}`),
        t(`lngTerms.custody.${terms.chain_of_custody}`),
        t(fueleu_recognition === 'UNION_DATABASE' ? 'lngTerms.unionDatabase.registered' : 'lngTerms.unionDatabase.notRegistered'),
        // The terms boundary converts these decimals; a missing declaration
        // still reads 0, as the `Number(null)` coercion here used to.
        t('lngTerms.summary.bioShare', { value: (terms.bio_share_pct ?? 0).toLocaleString(i18n.resolvedLanguage || 'en', { maximumFractionDigits: 2 }) }),
        // The methane-slip exclusion travels with the WTT value wherever it appears.
        `${t('lngTerms.summary.wtt', { value: (terms.wtt_ghg_gco2e_mj ?? 0).toLocaleString(i18n.resolvedLanguage || 'en', { maximumFractionDigits: 2 }) })} · ${t('lngTerms.wttNote')}`,
        t(`lngTerms.feedstock.${terms.feedstock}`),
        t(`lngTerms.deliveryMethod.${terms.delivery_method}`),
        reseller ? t('lngTerms.reseller.yes') : t('lngTerms.reseller.no'),
    ].join(' · ');
}
