import React, { useId } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import type { FameOrderPublicTerms } from '../../types/fameOrder';
import { FameDeclarationDetails } from '../rfq/FameDeclarationDetails';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="min-w-0">
        <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{children}</dd>
    </div>;
}

/** Buyer limits and supplier declarations retain their distinct meaning in an order. */
export function FameOrderTermsDetails({ terms }: { terms: FameOrderPublicTerms }) {
    const { t, ready } = useNamespace('rfq');
    const { t: trading, ready: tradingReady } = useNamespace('trading');
    const headingId = useId();
    const locale = i18n.resolvedLanguage || 'en';
    const unknown = t('notSupplied');
    const text = (value: string | null | undefined) => value?.trim() || unknown;
    const number = (value: number | null | undefined, unit: string) => value == null || !Number.isFinite(value)
        ? unknown : `${value.toLocaleString(locale, { maximumFractionDigits: 8 })} ${unit}`;
    const requirement = (value: boolean | null | undefined) => value == null
        ? unknown : t(value ? 'orderTerms.required' : 'orderTerms.notRequired');

    if (!ready || !tradingReady) return null;
    if (terms.side === 'ASK') return <div className="space-y-4">
        <dl><Detail label={t('fields.evidenceDue')}>{t(`evidenceDue.${terms.evidence_due}`)}</Detail></dl>
        <FameDeclarationDetails terms={terms} />
    </div>;

    return <section className="text-left" aria-labelledby={headingId}>
        <h3 id={headingId} className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('orderTerms.title')}</h3>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label={t('fields.standard')}>{t(`standard.${terms.standard}`)} · {text(terms.standard_edition)}</Detail>
            {terms.standard === 'ASTM_D6751'
                ? <Detail label={t('declaration.astmGrade')}>{text(terms.astm_grade)}</Detail>
                : <Detail label={trading('marketplace.supplierOffers.detailsFields.enClimateClass')}>{text(terms.en_climate_class)}</Detail>}
            <Detail label={t('fields.maxCfpp')}>{number(terms.max_cfpp_c, '°C')}</Detail>
            <Detail label={t('orderTerms.maxCloudPoint')}>{number(terms.max_cloud_point_c, '°C')}</Detail>
            <Detail label={t('fields.maxCi')}>{number(terms.max_ci_gco2e_mj, 'gCO₂e/MJ')}</Detail>
            <Detail label={t('fields.ciMethodology')}>{text(terms.ci_methodology)}</Detail>
            <Detail label={t('declaration.ciBoundary')}>{text(terms.ci_boundary)}</Detail>
            <Detail label={t('declaration.ciBasis')}>{terms.ci_basis ? t(`declaration.ciBasisOptions.${terms.ci_basis}`) : unknown}</Detail>
            <Detail label={t('fields.scheme')}>{t(`scheme.${terms.sustainability_scheme}`)}</Detail>
            <Detail label={t('orderTerms.requireQuality')}>{requirement(terms.require_quality_evidence)}</Detail>
            <Detail label={t('orderTerms.requireSustainability')}>{requirement(terms.require_sustainability_evidence)}</Detail>
            <Detail label={t('fields.evidenceDue')}>{t(`evidenceDue.${terms.evidence_due}`)}</Detail>
        </dl>
    </section>;
}
