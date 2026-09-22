import React, { useId } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import type { FameOfferTerms, FameQualityProperty } from '../../types/fameRfq';
import type { SupplierOfferPublicFuelTerms } from '../../types/fameSupplierOffer';

const gridClass = 'grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3';
const sectionClass = 'border-t border-slate-200 pt-4 dark:border-slate-700';
const headingClass = 'mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100';

// The property determines its unit. These values do not establish a pass or fail.
const qualityUnits: Record<FameQualityProperty, string> = {
    ESTER_CONTENT_MASS_PCT: '% m/m',
    DENSITY_15C_KG_M3: 'kg/m³',
    KINEMATIC_VISCOSITY_40C_MM2_S: 'mm²/s',
    WATER_MG_KG: 'mg/kg',
    WATER_AND_SEDIMENT_VOL_PCT: '% v/v',
    ACID_VALUE_MG_KOH_G: 'mg KOH/g',
    OXIDATION_STABILITY_H: 'h',
    SULFUR_MG_KG: 'mg/kg',
    FLASH_POINT_C: '°C',
    FREE_GLYCEROL_MASS_PCT: '% m/m',
    TOTAL_GLYCEROL_MASS_PCT: '% m/m',
    MONOGLYCERIDES_MASS_PCT: '% m/m',
    PHOSPHORUS_MG_KG: 'mg/kg',
    SODIUM_POTASSIUM_MG_KG: 'mg/kg',
    CALCIUM_MAGNESIUM_MG_KG: 'mg/kg',
    METHANOL_MASS_PCT: '% m/m',
    TOTAL_CONTAMINATION_MG_KG: 'mg/kg',
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="min-w-0">
        <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{children}</dd>
    </div>;
}

/** Render only the declaration returned by the server, including its redactions. */
export function FameDeclarationDetails({ terms }: { terms: SupplierOfferPublicFuelTerms | FameOfferTerms }) {
    const { t, ready } = useNamespace('rfq');
    const { t: trading, ready: tradingReady } = useNamespace('trading');
    const id = useId();
    const copy = (key: string) => trading(`marketplace.supplierOffers.detailsFields.${key}`);
    const locale = i18n.resolvedLanguage || 'en';
    const unknown = t('notSupplied');
    const text = (value: string | null | undefined) => value?.trim() || unknown;
    const number = (value: number | null | undefined, unit = '') => value == null || !Number.isFinite(value)
        ? unknown : `${value.toLocaleString(locale, { maximumFractionDigits: 8 })}${unit ? ` ${unit}` : ''}`;
    const isPublicSummary = 'nomination_status' in terms && !('certificate_reference' in terms);
    const privateText = (record: object, key: string, value: string | null | undefined) =>
        isPublicSummary && !(key in record) ? copy('private') : text(value);
    const quality = terms.quality_evidence;
    const sustainability = terms.sustainability_evidence;

    if (!ready || !tradingReady) return null;

    return <div className="space-y-4 text-left">
        <section className={sectionClass} aria-labelledby={`${id}-specification`}>
            <h3 id={`${id}-specification`} className={headingClass}>{t('form.specification')}</h3>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('declaration.composition')}</p>
            <dl className={gridClass}>
                <Detail label={t('fields.standard')}>{t(`standard.${terms.standard}`)} · {text(terms.standard_edition)}</Detail>
                {terms.standard === 'ASTM_D6751'
                    ? <Detail label={t('declaration.astmGrade')}>{text(terms.astm_grade)}</Detail>
                    : <Detail label={copy('enClimateClass')}>{text(terms.en_climate_class)}</Detail>}
                <Detail label={t('fields.ucoMass')}>{number(terms.uco_mass_pct, '%')}</Detail>
                <Detail label={t('fields.cfpp')}>{number(terms.cfpp_c, '°C')}</Detail>
                <Detail label={copy('cloudPoint')}>{number(terms.cloud_point_c, '°C')}</Detail>
                <Detail label={t('fields.lhv')}>{number(terms.lhv_mj_kg, 'MJ/kg')}</Detail>
                <Detail label={copy('ci')}>{number(terms.ci_gco2e_mj, 'gCO₂e/MJ')}</Detail>
                <Detail label={t('fields.ciMethodology')}>{text(terms.ci_methodology)}</Detail>
                <Detail label={t('declaration.ciBoundary')}>{text(terms.ci_boundary)}</Detail>
                <Detail label={t('declaration.ciBasis')}>{terms.ci_basis ? t(`declaration.ciBasisOptions.${terms.ci_basis}`) : unknown}</Detail>
                {'available_quantity_mt' in terms && <Detail label={t('fields.availableQuantity')}>{number(terms.available_quantity_mt, 'MT')}</Detail>}
            </dl>
        </section>

        <section className={sectionClass} aria-labelledby={`${id}-traceability`}>
            <h3 id={`${id}-traceability`} className={headingClass}>{t('declaration.traceability')}</h3>
            <dl className={gridClass}>
                {'nomination_status' in terms && <Detail label={t('declaration.nomination')}>{t(`declaration.nominationOptions.${terms.nomination_status}`)}</Detail>}
                <Detail label={t('fields.batchReference')}>{privateText(terms, 'batch_reference', terms.batch_reference)}</Detail>
                <Detail label={t('fields.producingSite')}>{privateText(terms, 'producing_site', terms.producing_site)}</Detail>
                <Detail label={t('fields.productionOrigin')}>{text(terms.production_origin)}</Detail>
                <Detail label={t('fields.feedstockOrigin')}>{text(terms.feedstock_origin)}</Detail>
                <Detail label={t('fields.shippingLocation')}>{text(terms.shipping_location)}</Detail>
            </dl>
        </section>

        <section className={sectionClass} aria-labelledby={`${id}-operator`}>
            <h3 id={`${id}-operator`} className={headingClass}>{t('declaration.operatorCertificate')}</h3>
            <dl className={gridClass}>
                <Detail label={t('fields.scheme')}>{t(`scheme.${terms.sustainability_scheme}`)}</Detail>
                <Detail label={t('fields.certificateReference')}>{privateText(terms, 'certificate_reference', terms.certificate_reference)}</Detail>
                <Detail label={t('fields.certificateHolder')}>{privateText(terms, 'certificate_holder', terms.certificate_holder)}</Detail>
                <Detail label={t('fields.certificateValidUntil')}>{text(terms.certificate_valid_until)}</Detail>
                <Detail label={copy('certificateScope')}>{privateText(terms, 'certificate_scope', terms.certificate_scope)}</Detail>
                <Detail label={t('form.evidenceStatus')}>{t(`evidence.${terms.evidence_status}`)}</Detail>
                <Detail label={t('fields.documentReferences')}>{isPublicSummary && !('document_references' in terms)
                    ? copy('private') : text(terms.document_references?.join('\n'))}</Detail>
            </dl>
        </section>

        <details className={sectionClass}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">{copy('qualityEvidence')} · {quality ? t(`evidence.${quality.status}`) : unknown}</summary>
            {quality ? <div className="mt-3 space-y-3">
                <dl className={gridClass}>
                    <Detail label={t('declaration.coaReference')}>{privateText(quality, 'reference', quality.reference)}</Detail>
                    <Detail label={t('fields.batchReference')}>{privateText(quality, 'batch_reference', quality.batch_reference)}</Detail>
                    <Detail label={t('declaration.laboratory')}>{privateText(quality, 'laboratory', quality.laboratory)}</Detail>
                    <Detail label={copy('sampledOn')}>{privateText(quality, 'sampled_on', quality.sampled_on)}</Detail>
                    <Detail label={t('declaration.testedOn')}>{privateText(quality, 'tested_on', quality.tested_on)}</Detail>
                </dl>
                {quality.results.length > 0 ? <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-xs">
                        <caption className="mb-2 text-left text-xs text-slate-500 dark:text-slate-400">{copy('resultsNotice')}</caption>
                        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr>
                            <th scope="col" className="py-2 pr-4 font-medium">{t('declaration.qualityProperty')}</th>
                            <th scope="col" className="py-2 pr-4 font-medium">{t('declaration.measuredValue')}</th>
                            <th scope="col" className="py-2 font-medium">{copy('method')}</th>
                        </tr></thead>
                        <tbody>{quality.results.map(result => <tr key={result.property} className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                            <th scope="row" className="py-2 pr-4 font-normal">{t(`declaration.properties.${result.property}`)}</th>
                            <td className="py-2 pr-4 tabular-nums">{number(result.value, qualityUnits[result.property])}</td>
                            <td className="break-words py-2">{text(result.method)}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <p className="text-xs text-slate-500 dark:text-slate-400">{copy('noResults')}</p>}
            </div> : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{unknown}</p>}
        </details>

        <details className={sectionClass}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">{copy('sustainabilityEvidence')} · {sustainability ? t(`evidence.${sustainability.status}`) : unknown}</summary>
            {sustainability ? <dl className={`mt-3 ${gridClass}`}>
                <Detail label={t('declaration.documentType')}>{t(`declaration.documentTypes.${sustainability.document_type}`)}</Detail>
                <Detail label={t('declaration.sustainabilityReference')}>{privateText(sustainability, 'reference', sustainability.reference)}</Detail>
                <Detail label={copy('issuer')}>{privateText(sustainability, 'issuer', sustainability.issuer)}</Detail>
                <Detail label={copy('documentQuantity')}>{isPublicSummary && !('quantity_mt' in sustainability) ? copy('private') : number(sustainability.quantity_mt, 'MT')}</Detail>
                <Detail label={copy('supplyDate')}>{privateText(sustainability, 'supply_date', sustainability.supply_date)}</Detail>
                <Detail label={t('fields.evidenceDue')}>{t(`evidenceDue.${sustainability.due}`)}</Detail>
            </dl> : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{unknown}</p>}
        </details>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('evidenceNotice')}</p>
    </div>;
}
