import React, { useState } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import type { FameContractTerms, FameOfferTerms } from '../../types/fameRfq';
import type { SupplierOfferFuelTerms } from '../../types/fameSupplierOffer';
import { ChoiceField, FormSection, TextAreaField, TextField, fieldText, gridClass, optionalNumber, singaporeDate } from './FameFormFields';

export const QUALITY_PROPERTIES = [
    'ESTER_CONTENT_MASS_PCT', 'DENSITY_15C_KG_M3', 'KINEMATIC_VISCOSITY_40C_MM2_S',
    'WATER_MG_KG', 'WATER_AND_SEDIMENT_VOL_PCT', 'ACID_VALUE_MG_KOH_G',
    'OXIDATION_STABILITY_H', 'SULFUR_MG_KG', 'FLASH_POINT_C', 'FREE_GLYCEROL_MASS_PCT',
    'TOTAL_GLYCEROL_MASS_PCT', 'MONOGLYCERIDES_MASS_PCT', 'PHOSPHORUS_MG_KG',
    'SODIUM_POTASSIUM_MG_KG', 'CALCIUM_MAGNESIUM_MG_KG', 'METHANOL_MASS_PCT',
    'TOTAL_CONTAMINATION_MG_KG',
] as const;
export const ASTM_GRADES = ['1-B S15', '1-B S15 LM', '1-B S500', '2-B S15', '2-B S15 LM', '2-B S500'] as const;
type Declaration = Omit<SupplierOfferFuelTerms, 'nomination_status' | 'neat_fame'>;
type QualityResult = NonNullable<Declaration['quality_evidence']>['results'][number];

function qualityBounds(property: string) {
    if (property === 'FLASH_POINT_C') return { min: -100, max: 1000 };
    if (property.endsWith('_PCT')) return { min: 0, max: 100 };
    return { min: 0, max: property.endsWith('_MG_KG') ? 1_000_000 : 10_000 };
}

/** Empty measurements remain unknown; a declared zero must survive submission. */
export function readFameDeclaration(data: FormData): Declaration {
    const results: QualityResult[] = [];
    for (let index = 0; index < QUALITY_PROPERTIES.length; index++) {
        const value = optionalNumber(data, `quality_value_${index}`);
        if (value == null) continue;
        results.push({
            property: fieldText(data, `quality_property_${index}`) as QualityResult['property'],
            value,
            method: fieldText(data, `quality_method_${index}`) || null,
        });
    }
    const qualityStatus = fieldText(data, 'quality_status');
    const sustainabilityStatus = fieldText(data, 'sustainability_status');
    const standard = fieldText(data, 'standard') as Declaration['standard'];
    return {
        schema_version: 1,
        uco_mass_pct: 100,
        standard,
        standard_edition: fieldText(data, 'standard_edition'),
        astm_grade: standard === 'ASTM_D6751' ? fieldText(data, 'astm_grade') as Declaration['astm_grade'] || null : null,
        en_climate_class: standard === 'EN_14214' ? fieldText(data, 'en_climate_class') || null : null,
        batch_reference: fieldText(data, 'batch_reference') || null,
        producing_site: fieldText(data, 'producing_site') || null,
        production_origin: fieldText(data, 'production_origin') || null,
        feedstock_origin: fieldText(data, 'feedstock_origin') || null,
        shipping_location: fieldText(data, 'shipping_location') || null,
        cfpp_c: optionalNumber(data, 'cfpp') ?? null,
        cloud_point_c: optionalNumber(data, 'cloud_point') ?? null,
        ci_gco2e_mj: optionalNumber(data, 'ci') ?? null,
        ci_methodology: fieldText(data, 'ci_methodology') || null,
        ci_boundary: fieldText(data, 'ci_boundary') || null,
        ci_basis: fieldText(data, 'ci_basis') as Declaration['ci_basis'] || null,
        lhv_mj_kg: optionalNumber(data, 'lhv') ?? null,
        sustainability_scheme: fieldText(data, 'scheme') as Declaration['sustainability_scheme'],
        certificate_reference: fieldText(data, 'certificate_reference'),
        certificate_holder: fieldText(data, 'certificate_holder'),
        certificate_valid_until: fieldText(data, 'certificate_valid_until'),
        certificate_scope: fieldText(data, 'certificate_scope') || null,
        evidence_status: fieldText(data, 'evidence_status') as Declaration['evidence_status'],
        document_references: fieldText(data, 'documents').split('\n').map(value => value.trim()).filter(Boolean),
        quality_evidence: qualityStatus ? {
            status: qualityStatus as 'PENDING' | 'AVAILABLE',
            reference: fieldText(data, 'quality_reference') || null,
            batch_reference: fieldText(data, 'quality_batch') || null,
            laboratory: fieldText(data, 'quality_laboratory') || null,
            sampled_on: fieldText(data, 'quality_sampled') || null,
            tested_on: fieldText(data, 'quality_tested') || null,
            results,
        } : null,
        sustainability_evidence: sustainabilityStatus ? {
            status: sustainabilityStatus as 'PENDING' | 'AVAILABLE',
            document_type: fieldText(data, 'sustainability_type') as 'POS' | 'SD' | 'POC',
            reference: fieldText(data, 'sustainability_reference') || null,
            issuer: fieldText(data, 'sustainability_issuer') || null,
            quantity_mt: optionalNumber(data, 'sustainability_quantity') ?? null,
            supply_date: fieldText(data, 'sustainability_date') || null,
            due: fieldText(data, 'sustainability_due') as 'BEFORE_LOADING' | 'BEFORE_DELIVERY',
        } : null,
    };
}

export function validateFameDeclaration(terms: Declaration, deliveryEnd: string, identified: boolean): string | null {
    if (!terms.standard_edition || !terms.certificate_reference || !terms.certificate_holder || !terms.certificate_valid_until) return 'validation.requiredFields';
    if (terms.standard === 'ASTM_D6751' && !terms.astm_grade) return 'validation.astmGrade';
    if (identified && ![terms.batch_reference, terms.producing_site, terms.production_origin, terms.feedstock_origin, terms.shipping_location].every(value => value?.trim())) return 'validation.nomination';
    if (terms.ci_gco2e_mj != null && !terms.ci_methodology?.trim()) return 'validation.ciMethodology';
    if (terms.certificate_valid_until < deliveryEnd) return 'validation.certificateDate';
    if (terms.evidence_status === 'AVAILABLE' && !terms.document_references.length) return 'validation.evidenceReferences';
    if (terms.document_references.length > 20 || terms.document_references.some(value => value.length > 200)) return 'validation.referenceLength';
    const quality = terms.quality_evidence;
    if (quality?.status === 'AVAILABLE' && ![quality.reference, quality.batch_reference, quality.laboratory, quality.tested_on].every(Boolean)) return 'validation.qualityEvidence';
    if (quality?.sampled_on && quality.tested_on && quality.sampled_on > quality.tested_on) return 'validation.qualityDates';
    const today = singaporeDate();
    if ((quality?.sampled_on && quality.sampled_on > today) || (quality?.tested_on && quality.tested_on > today)) return 'validation.qualityFutureDate';
    if (quality?.status === 'AVAILABLE' && terms.batch_reference && quality.batch_reference !== terms.batch_reference) return 'validation.qualityBatch';
    const results = quality?.results ?? [];
    if (new Set(results.map(result => result.property)).size !== results.length) return 'validation.qualityDuplicate';
    if (results.some(result => {
        const bounds = qualityBounds(result.property);
        return !Number.isFinite(result.value) || result.value < bounds.min || result.value > bounds.max;
    })) return 'validation.qualityRange';
    if (terms.sustainability_evidence?.status === 'AVAILABLE' && !terms.sustainability_evidence.reference?.trim()) return 'validation.sustainabilityEvidence';
    return null;
}

interface FameDeclarationFieldsProps {
    initial?: Partial<SupplierOfferFuelTerms> | FameOfferTerms | null;
    contract?: FameContractTerms;
    deliveryEnd?: string;
    evidenceDue?: FameContractTerms['evidence_due'];
    listing?: boolean;
    pending?: boolean;
}

export function FameDeclarationFields({ initial, contract, deliveryEnd = '', evidenceDue, listing = false, pending = false }: FameDeclarationFieldsProps) {
    const { t } = useNamespace('rfq');
    const [standard, setStandard] = useState(contract?.standard ?? initial?.standard ?? 'EN_14214');
    const [scheme, setScheme] = useState(contract?.sustainability_scheme ?? initial?.sustainability_scheme ?? 'ISCC_EU');
    const [grade, setGrade] = useState(contract?.astm_grade ?? initial?.astm_grade ?? '');
    const [nomination, setNomination] = useState(listing && initial && 'nomination_status' in initial ? initial.nomination_status ?? 'PENDING' : listing ? 'PENDING' : 'IDENTIFIED');
    const [ciProvided, setCiProvided] = useState(initial?.ci_gco2e_mj != null);
    const [ciBasis, setCiBasis] = useState(initial?.ci_basis ?? '');
    const [evidenceStatus, setEvidenceStatus] = useState(initial?.evidence_status ?? 'DECLARED');
    const [qualityStatus, setQualityStatus] = useState(initial?.quality_evidence?.status ?? '');
    const [sustainabilityStatus, setSustainabilityStatus] = useState(initial?.sustainability_evidence?.status ?? '');
    const [documentType, setDocumentType] = useState(initial?.sustainability_evidence?.document_type ?? 'POS');
    const [documentDue, setDocumentDue] = useState(initial?.sustainability_evidence?.due ?? contract?.evidence_due ?? 'BEFORE_LOADING');
    const [results, setResults] = useState<Array<QualityResult & { rowId: number; value: number }>>(() => (initial?.quality_evidence?.results ?? []).map((result, index) => ({ ...result, rowId: index })));
    const [nextRowId, setNextRowId] = useState(results.length);
    const identified = !listing || nomination === 'IDENTIFIED';
    const effectiveDocumentDue = contract?.evidence_due ?? evidenceDue ?? documentDue;
    const evidenceOptions = ['', 'PENDING', 'AVAILABLE'].map(value => ({ value, label: value ? t(`form.evidenceStatusOptions.${value}`) : t('notSupplied') }));

    return <div className="space-y-5">
        <FormSection title={t('form.specification')}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('declaration.composition')}</p>
            <div className={gridClass}>
                <ChoiceField name="standard" label={t('form.standard')} value={standard} onChange={value => { setStandard(value as typeof standard); setGrade(''); }} disabled={pending || Boolean(contract)} options={['EN_14214', 'ASTM_D6751'].map(value => ({ value, label: t(`form.standardOptions.${value}`) }))} />
                <TextField name="standard_edition" label={t('form.standardEdition')} defaultValue={contract?.standard_edition ?? initial?.standard_edition ?? ''} readOnly={Boolean(contract)} maxLength={200} required />
                {standard === 'ASTM_D6751' ? <ChoiceField name="astm_grade" label={t('declaration.astmGrade')} value={grade} onChange={setGrade} disabled={pending || Boolean(contract?.astm_grade)} options={[{ value: '', label: t('declaration.selectGrade') }, ...ASTM_GRADES.map(value => ({ value, label: value }))]} /> : <TextField name="en_climate_class" label={t('declaration.enClimateClass')} defaultValue={contract?.en_climate_class ?? initial?.en_climate_class ?? ''} readOnly={Boolean(contract?.en_climate_class)} maxLength={200} />}
                <TextField name="cfpp" label={t('form.cfpp')} type="number" min={-80} max={contract?.max_cfpp_c ?? 50} step="any" defaultValue={initial?.cfpp_c ?? ''} required={contract?.max_cfpp_c != null} />
                <TextField name="cloud_point" label={t('declaration.cloudPoint')} type="number" min={-80} max={80} step="any" defaultValue={initial?.cloud_point_c ?? ''} />
                <TextField name="ci" label={t('form.ci')} type="number" min={0} max={contract?.max_ci_gco2e_mj ?? 200} step="any" defaultValue={initial?.ci_gco2e_mj ?? ''} required={contract?.max_ci_gco2e_mj != null} onChange={event => setCiProvided(event.target.value !== '')} />
                <TextField name="ci_methodology" label={t('form.ciMethodology')} defaultValue={initial?.ci_methodology ?? ''} maxLength={200} required={ciProvided || contract?.max_ci_gco2e_mj != null} hint={t('form.ciMethodologyHint')} />
                <ChoiceField name="ci_basis" label={t('declaration.ciBasis')} value={ciBasis} onChange={setCiBasis} disabled={pending} options={['', 'ACTUAL', 'DEFAULT'].map(value => ({ value, label: value ? t(`declaration.ciBasisOptions.${value}`) : t('notSupplied') }))} />
                <TextField name="ci_boundary" label={t('declaration.ciBoundary')} defaultValue={initial?.ci_boundary ?? ''} maxLength={200} required={listing && ciProvided} />
                <TextField name="lhv" label={t('form.lhv')} type="number" min="0.01" max={50} step="any" defaultValue={initial?.lhv_mj_kg ?? ''} />
            </div>
        </FormSection>
        <FormSection title={t('declaration.traceability')}>
            {listing && <ChoiceField name="nomination_status" label={t('declaration.nomination')} value={nomination} onChange={value => setNomination(value as typeof nomination)} disabled={pending} options={['PENDING', 'IDENTIFIED'].map(value => ({ value, label: t(`declaration.nominationOptions.${value}`) }))} />}
            {listing && <p className="text-xs text-slate-500 dark:text-slate-400">{t('declaration.nominationHint')}</p>}
            <div className={gridClass}>
                <TextField name="batch_reference" label={t('form.batchReference')} defaultValue={initial?.batch_reference ?? ''} maxLength={200} required={identified} />
                <TextField name="producing_site" label={t('form.producingSite')} defaultValue={initial?.producing_site ?? ''} maxLength={200} required={identified} />
                <TextField name="production_origin" label={t('form.productionOrigin')} defaultValue={initial?.production_origin ?? ''} maxLength={200} required={identified} />
                <TextField name="feedstock_origin" label={t('form.feedstockOrigin')} defaultValue={initial?.feedstock_origin ?? ''} maxLength={200} required={identified} />
                <TextField name="shipping_location" label={t('form.shippingLocation')} defaultValue={initial?.shipping_location ?? ''} maxLength={200} required={identified} />
            </div>
        </FormSection>
        <FormSection title={t('declaration.operatorCertificate')}>
            <div className={gridClass}>
                <ChoiceField name="scheme" label={t('form.scheme')} value={scheme} onChange={value => setScheme(value as typeof scheme)} disabled={pending || Boolean(contract)} options={['ISCC_EU', 'REDCERT_EU'].map(value => ({ value, label: t(`form.schemeOptions.${value}`) }))} />
                <TextField name="certificate_reference" label={t('form.certificateReference')} defaultValue={initial?.certificate_reference ?? ''} maxLength={200} required />
                <TextField name="certificate_holder" label={t('form.certificateHolder')} defaultValue={initial?.certificate_holder ?? ''} maxLength={200} required />
                <TextField name="certificate_scope" label={t('declaration.certificateScope')} defaultValue={initial?.certificate_scope ?? ''} maxLength={200} />
                <TextField name="certificate_valid_until" label={t('form.certificateValidUntil')} type="date" min={deliveryEnd || undefined} defaultValue={initial?.certificate_valid_until ?? ''} required hint={t('form.certificateValidityHint')} />
                <ChoiceField name="evidence_status" label={t('form.evidenceStatus')} value={evidenceStatus} onChange={value => setEvidenceStatus(value as typeof evidenceStatus)} disabled={pending} options={['DECLARED', 'PENDING', 'AVAILABLE'].map(value => ({ value, label: t(`form.evidenceStatusOptions.${value}`) }))} />
            </div>
            <TextAreaField name="documents" label={t('form.documentReferences')} defaultValue={initial?.document_references?.join('\n') ?? ''} maxLength={4019} required={evidenceStatus === 'AVAILABLE'} hint={t('form.documentReferencesHint')} />
        </FormSection>
        <details open={Boolean(initial?.quality_evidence)} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold">{t('declaration.qualityEvidence')}</summary>
            <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('declaration.qualityHint')}</p>
                <ChoiceField name="quality_status" label={t('declaration.qualityStatus')} value={qualityStatus} onChange={setQualityStatus} disabled={pending} options={evidenceOptions} />
                <fieldset hidden={!qualityStatus} disabled={pending || !qualityStatus} className={qualityStatus ? 'space-y-4' : 'hidden'}>
                    <div className={gridClass}>
                        <TextField name="quality_reference" label={t('declaration.coaReference')} defaultValue={initial?.quality_evidence?.reference ?? ''} maxLength={200} required={qualityStatus === 'AVAILABLE'} />
                        <TextField name="quality_batch" label={t('declaration.coaBatch')} defaultValue={initial?.quality_evidence?.batch_reference ?? ''} maxLength={200} required={qualityStatus === 'AVAILABLE'} />
                        <TextField name="quality_laboratory" label={t('declaration.laboratory')} defaultValue={initial?.quality_evidence?.laboratory ?? ''} maxLength={200} required={qualityStatus === 'AVAILABLE'} />
                        <TextField name="quality_sampled" label={t('declaration.sampledOn')} type="date" defaultValue={initial?.quality_evidence?.sampled_on ?? ''} />
                        <TextField name="quality_tested" label={t('declaration.testedOn')} type="date" defaultValue={initial?.quality_evidence?.tested_on ?? ''} required={qualityStatus === 'AVAILABLE'} />
                    </div>
                    {results.map((result, index) => <div key={result.rowId} className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <ChoiceField name={`quality_property_${index}`} label={t('declaration.qualityProperty')} value={result.property} onChange={value => setResults(current => current.map(row => row.rowId === result.rowId ? { ...row, property: value as QualityResult['property'] } : row))} disabled={pending} options={QUALITY_PROPERTIES.map(value => ({ value, label: t(`declaration.properties.${value}`) }))} />
                        <div className={gridClass}>
                            <TextField name={`quality_value_${index}`} label={t('declaration.measuredValue')} type="number" {...qualityBounds(result.property)} step="any" defaultValue={Number.isFinite(result.value) ? result.value : ''} required />
                            <TextField name={`quality_method_${index}`} label={t('declaration.testMethod')} defaultValue={result.method ?? ''} maxLength={200} />
                        </div>
                        <button type="button" disabled={pending} onClick={() => setResults(current => current.filter(row => row.rowId !== result.rowId))} className="text-xs text-red-600 underline dark:text-red-400">{t('declaration.removeResult')}</button>
                    </div>)}
                    <button type="button" disabled={pending || results.length >= QUALITY_PROPERTIES.length} onClick={() => {
                        const property = QUALITY_PROPERTIES.find(value => !results.some(result => result.property === value));
                        if (!property) return;
                        setResults(current => [...current, { rowId: nextRowId, property, value: Number.NaN }]);
                        setNextRowId(value => value + 1);
                    }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">{t('declaration.addResult')}</button>
                </fieldset>
            </div>
        </details>
        <details open={Boolean(initial?.sustainability_evidence)} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold">{t('declaration.sustainabilityEvidence')}</summary>
            <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('declaration.sustainabilityHint')}</p>
                <ChoiceField name="sustainability_status" label={t('declaration.sustainabilityStatus')} value={sustainabilityStatus} onChange={setSustainabilityStatus} disabled={pending} options={evidenceOptions} />
                <fieldset hidden={!sustainabilityStatus} disabled={pending || !sustainabilityStatus} className={sustainabilityStatus ? gridClass : 'hidden'}>
                    <ChoiceField name="sustainability_type" label={t('declaration.documentType')} value={documentType} onChange={value => setDocumentType(value as typeof documentType)} disabled={pending} options={['POS', 'SD', 'POC'].map(value => ({ value, label: t(`declaration.documentTypes.${value}`) }))} />
                    <TextField name="sustainability_reference" label={t('declaration.sustainabilityReference')} defaultValue={initial?.sustainability_evidence?.reference ?? ''} maxLength={200} required={sustainabilityStatus === 'AVAILABLE'} />
                    <TextField name="sustainability_issuer" label={t('declaration.issuer')} defaultValue={initial?.sustainability_evidence?.issuer ?? ''} maxLength={200} />
                    <TextField name="sustainability_quantity" label={t('declaration.documentQuantity')} type="number" min="0.01" max={100_000} step="0.01" defaultValue={initial?.sustainability_evidence?.quantity_mt ?? ''} />
                    <TextField name="sustainability_date" label={t('declaration.supplyDate')} type="date" defaultValue={initial?.sustainability_evidence?.supply_date ?? ''} />
                    <ChoiceField name="sustainability_due" label={t('form.evidenceDue')} value={effectiveDocumentDue} onChange={value => setDocumentDue(value as typeof documentDue)} disabled={pending || Boolean(contract || evidenceDue)} options={['BEFORE_LOADING', 'BEFORE_DELIVERY'].map(value => ({ value, label: t(`form.evidenceDueOptions.${value}`) }))} />
                </fieldset>
            </div>
        </details>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('form.declarationNotice')}</p>
    </div>;
}
