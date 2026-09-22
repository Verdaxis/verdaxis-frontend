import React, { useState } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import type { FameOrderBidTerms, FameOrderTerms } from '../../types/fameOrder';
import { ASTM_GRADES, FameDeclarationFields, readFameDeclaration, validateFameDeclaration } from './FameDeclarationFields';
import { ChoiceField, FormSection, TextField, fieldText, gridClass, optionalNumber, singaporeDate } from './FameFormFields';

export interface FameOrderAcknowledgements {
    certification_declared: boolean;
    msds_available: boolean;
}

export function readFameOrderAcknowledgements(data: FormData): FameOrderAcknowledgements {
    return {
        certification_declared: data.get('fame_certification_declared') === 'on',
        msds_available: data.get('fame_msds_available') === 'on',
    };
}

/** Shared by order placement and the opposite side's declaration when taking an order. */
export function readFameOrderTerms(data: FormData, side: 'BID' | 'ASK'): FameOrderTerms {
    if (side === 'ASK') return {
        ...readFameDeclaration(data),
        side,
        neat_fame: (data.get('fame_neat_declaration') === 'on') as true,
        nomination_status: fieldText(data, 'nomination_status') as 'PENDING' | 'IDENTIFIED',
        evidence_due: fieldText(data, 'evidence_due') as 'BEFORE_LOADING' | 'BEFORE_DELIVERY',
    };
    const standard = fieldText(data, 'standard') as FameOrderBidTerms['standard'];
    return {
        side,
        schema_version: 1,
        neat_fame: true,
        standard,
        standard_edition: fieldText(data, 'standard_edition'),
        astm_grade: standard === 'ASTM_D6751' ? fieldText(data, 'astm_grade') as FameOrderBidTerms['astm_grade'] || null : null,
        en_climate_class: standard === 'EN_14214' ? fieldText(data, 'en_climate_class') || null : null,
        max_cfpp_c: optionalNumber(data, 'max_cfpp') ?? null,
        max_cloud_point_c: optionalNumber(data, 'max_cloud_point') ?? null,
        max_ci_gco2e_mj: optionalNumber(data, 'max_ci') ?? null,
        ci_methodology: fieldText(data, 'ci_methodology') || null,
        ci_boundary: fieldText(data, 'ci_boundary') || null,
        ci_basis: fieldText(data, 'ci_basis') as FameOrderBidTerms['ci_basis'] || null,
        sustainability_scheme: fieldText(data, 'scheme') as FameOrderBidTerms['sustainability_scheme'],
        require_quality_evidence: data.get('require_quality_evidence') === 'on',
        require_sustainability_evidence: data.get('require_sustainability_evidence') === 'on',
        evidence_due: fieldText(data, 'evidence_due') as FameOrderBidTerms['evidence_due'],
    };
}

function outsideRange(value: number | null | undefined, minimum: number, maximum: number): boolean {
    return value != null && (!Number.isFinite(value) || value < minimum || value > maximum);
}

export function validateFameOrderTerms(terms: FameOrderTerms): string | null {
    if (!terms.standard_edition.trim() || !['EN_14214', 'ASTM_D6751'].includes(terms.standard)
        || !['ISCC_EU', 'REDCERT_EU'].includes(terms.sustainability_scheme)) return 'validation.requiredFields';
    if (terms.standard === 'ASTM_D6751' && !terms.astm_grade) return 'validation.astmGrade';
    if (!['BEFORE_LOADING', 'BEFORE_DELIVERY'].includes(terms.evidence_due)) return 'validation.requiredFields';
    if (terms.side === 'ASK') {
        if (terms.sustainability_evidence && terms.sustainability_evidence.due !== terms.evidence_due) return 'validation.orderEvidenceDue';
        if (!terms.neat_fame) return 'validation.orderNeatDeclaration';
        const declarationError = validateFameDeclaration(terms, '', terms.nomination_status === 'IDENTIFIED');
        if (declarationError) return declarationError;
        if (terms.certificate_valid_until < singaporeDate()) return 'validation.orderCertificateCurrent';
        if (terms.ci_gco2e_mj != null && (!terms.ci_boundary?.trim() || !terms.ci_basis)) return 'validation.ciContext';
        if (outsideRange(terms.cfpp_c, -80, 50) || outsideRange(terms.cloud_point_c, -80, 80)
            || outsideRange(terms.ci_gco2e_mj, 0, 200) || outsideRange(terms.lhv_mj_kg, 0.01, 50)) return 'validation.orderMeasurementRange';
    } else {
        if (terms.max_ci_gco2e_mj != null && (!terms.ci_methodology?.trim() || !terms.ci_boundary?.trim() || !terms.ci_basis)) return 'validation.ciContext';
        if (outsideRange(terms.max_cfpp_c, -80, 50) || outsideRange(terms.max_cloud_point_c, -80, 80)
            || outsideRange(terms.max_ci_gco2e_mj, 0, 200)) return 'validation.orderMeasurementRange';
    }
    return null;
}

function CheckField({ name, children, required = false, defaultChecked = false }: {
    name: string; children: React.ReactNode; required?: boolean; defaultChecked?: boolean;
}) {
    return <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <input type="checkbox" name={name} required={required} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]" />
        <span>{children}</span>
    </label>;
}

function FameBidFields({ initial, pending }: { initial?: FameOrderBidTerms | null; pending: boolean }) {
    const { t } = useNamespace('rfq');
    const [standard, setStandard] = useState(initial?.standard ?? 'EN_14214');
    const [grade, setGrade] = useState(initial?.astm_grade ?? '');
    const [scheme, setScheme] = useState(initial?.sustainability_scheme ?? 'ISCC_EU');
    const [ciProvided, setCiProvided] = useState(initial?.max_ci_gco2e_mj != null);
    const [ciBasis, setCiBasis] = useState(initial?.ci_basis ?? '');
    const [evidenceDue, setEvidenceDue] = useState(initial?.evidence_due ?? 'BEFORE_LOADING');
    return <>
        <FormSection title={t('orderFields.requirements')}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('orderFields.requirementsHint')}</p>
            <div className={gridClass}>
                <ChoiceField name="standard" label={t('form.standard')} value={standard} onChange={value => { setStandard(value as typeof standard); setGrade(''); }} disabled={pending} options={['EN_14214', 'ASTM_D6751'].map(value => ({ value, label: t(`form.standardOptions.${value}`) }))} />
                <TextField name="standard_edition" label={t('form.standardEdition')} defaultValue={initial?.standard_edition ?? ''} maxLength={200} required />
                {standard === 'ASTM_D6751'
                    ? <ChoiceField name="astm_grade" label={t('declaration.astmGrade')} value={grade} onChange={setGrade} disabled={pending} options={[{ value: '', label: t('declaration.selectGrade') }, ...ASTM_GRADES.map(value => ({ value, label: value }))]} />
                    : <TextField name="en_climate_class" label={t('declaration.enClimateClass')} defaultValue={initial?.en_climate_class ?? ''} maxLength={200} />}
                <TextField name="max_cfpp" label={t('form.maxCfpp')} type="number" min={-80} max={50} step="any" defaultValue={initial?.max_cfpp_c ?? ''} />
                <TextField name="max_cloud_point" label={t('orderFields.maxCloudPoint')} type="number" min={-80} max={80} step="any" defaultValue={initial?.max_cloud_point_c ?? ''} />
                <TextField name="max_ci" label={t('form.maxCi')} type="number" min={0} max={200} step="any" defaultValue={initial?.max_ci_gco2e_mj ?? ''} onChange={event => setCiProvided(event.target.value !== '')} />
                <TextField name="ci_methodology" label={t('form.ciMethodology')} defaultValue={initial?.ci_methodology ?? ''} maxLength={200} required={ciProvided} />
                <TextField name="ci_boundary" label={t('declaration.ciBoundary')} defaultValue={initial?.ci_boundary ?? ''} maxLength={200} required={ciProvided} />
                <ChoiceField name="ci_basis" label={t('declaration.ciBasis')} value={ciBasis} onChange={setCiBasis} disabled={pending} options={['', 'ACTUAL', 'DEFAULT'].map(value => ({ value, label: value ? t(`declaration.ciBasisOptions.${value}`) : t('notSupplied') }))} />
                <ChoiceField name="scheme" label={t('form.scheme')} value={scheme} onChange={value => setScheme(value as typeof scheme)} disabled={pending} options={['ISCC_EU', 'REDCERT_EU'].map(value => ({ value, label: t(`form.schemeOptions.${value}`) }))} />
            </div>
        </FormSection>
        <FormSection title={t('orderFields.evidenceRequirements')}>
            <CheckField name="require_quality_evidence" defaultChecked={initial?.require_quality_evidence}>{t('orderFields.requireQualityEvidence')}</CheckField>
            <CheckField name="require_sustainability_evidence" defaultChecked={initial?.require_sustainability_evidence}>{t('orderFields.requireSustainabilityEvidence')}</CheckField>
            <ChoiceField name="evidence_due" label={t('form.evidenceDue')} value={evidenceDue} onChange={value => setEvidenceDue(value as typeof evidenceDue)} disabled={pending} options={['BEFORE_LOADING', 'BEFORE_DELIVERY'].map(value => ({ value, label: t(`form.evidenceDueOptions.${value}`) }))} />
        </FormSection>
    </>;
}

export function FameOrderFields({ side, initial, pending = false, acknowledgements }: {
    side: 'BID' | 'ASK';
    initial?: FameOrderTerms | null;
    pending?: boolean;
    acknowledgements?: FameOrderAcknowledgements;
}) {
    const { t } = useNamespace('rfq');
    const ask = initial?.side === 'ASK' ? initial : undefined;
    const [evidenceDue, setEvidenceDue] = useState(ask?.evidence_due ?? 'BEFORE_LOADING');
    return <fieldset disabled={pending} className="space-y-5">
        {side === 'ASK' ? <>
            <ChoiceField name="evidence_due" label={t('form.evidenceDue')} value={evidenceDue} onChange={value => setEvidenceDue(value as typeof evidenceDue)} disabled={pending} options={['BEFORE_LOADING', 'BEFORE_DELIVERY'].map(value => ({ value, label: t(`form.evidenceDueOptions.${value}`) }))} />
            <FameDeclarationFields initial={ask} listing pending={pending} deliveryEnd={singaporeDate()} certificateValidityHint={t('orderFields.certificateValidityHint')} evidenceDue={evidenceDue} />
            <FormSection title={t('orderFields.supplierDeclaration')}>
                <CheckField name="fame_neat_declaration" required defaultChecked={ask?.neat_fame}>{t('orderFields.neatDeclaration')}</CheckField>
                <CheckField name="fame_certification_declared" required defaultChecked={acknowledgements?.certification_declared}>{t('orderFields.certificationDeclared')}</CheckField>
                <CheckField name="fame_msds_available" required defaultChecked={acknowledgements?.msds_available}>{t('orderFields.msdsAvailable')}</CheckField>
            </FormSection>
        </> : <FameBidFields initial={initial?.side === 'BID' ? initial : undefined} pending={pending} />}
    </fieldset>;
}
