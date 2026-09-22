import React, { useRef, useState } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import type {
    FameContractTerms,
    FameQuote,
    FameQuoteInput,
    FameRfq,
    FameRfqCreateInput,
    FameScheme,
    FameStandard,
} from '../../types/fameRfq';
import type { SupplierOffer } from '../../types/fameSupplierOffer';
import { ASTM_GRADES, FameDeclarationFields, readFameDeclaration, validateFameDeclaration } from '../fame/FameDeclarationFields';
import { ChoiceField, FormSection, TextAreaField, TextField, fieldText, gridClass, localDateTime, optionalNumber, singaporeDate } from '../fame/FameFormFields';

const MAX_RFQ_HOURS = 168;

interface FormActionsProps {
    onCancel: () => void;
    pending: boolean;
    submitLabel: string;
}

function FormActions({ onCancel, pending, submitLabel }: FormActionsProps) {
    const { t } = useNamespace('rfq');
    return (
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
            <button type="button" onClick={onCancel} disabled={pending} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">{t('form.cancel')}</button>
            <button type="submit" disabled={pending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50 dark:bg-sky-400 dark:text-slate-950">{pending ? t('form.saving') : submitLabel}</button>
        </div>
    );
}

interface FameRequestFormProps {
    sourceOffer?: SupplierOffer;
    productId: string;
    deliveryPointId: string;
    onSubmit: (input: FameRfqCreateInput) => Promise<void>;
    onCancel: () => void;
    pending: boolean;
}

export function FameRequestForm({ productId, deliveryPointId, sourceOffer, onSubmit, onCancel, pending }: FameRequestFormProps) {
    const { t } = useNamespace('rfq');
    const [standard, setStandard] = useState<FameStandard>(sourceOffer?.fuelTerms.standard ?? 'EN_14214');
    const [scheme, setScheme] = useState<FameScheme>(sourceOffer?.fuelTerms.sustainability_scheme ?? 'ISCC_EU');
    const [astmGrade, setAstmGrade] = useState<string>(sourceOffer?.fuelTerms.astm_grade ?? '');
    const [deliveryBasis, setDeliveryBasis] = useState<FameContractTerms['delivery_basis']>(sourceOffer?.deliveryBasis ?? 'EX_TANK');
    const [evidenceDue, setEvidenceDue] = useState<FameContractTerms['evidence_due']>(sourceOffer?.evidenceDue ?? 'BEFORE_LOADING');
    const [error, setError] = useState('');
    const submitting = useRef(false);
    const today = singaporeDate();

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending || submitting.current) return;
        setError('');
        const data = new FormData(event.currentTarget);
        const quantity = Number(fieldText(data, 'quantity'));
        const minFill = Number(fieldText(data, 'min_fill'));
        const deliveryStart = fieldText(data, 'delivery_start');
        const deliveryEnd = fieldText(data, 'delivery_end');
        const expiryHours = Number(fieldText(data, 'expires_in_hours'));
        if (sourceOffer && (sourceOffer.status !== 'OPEN' || Date.parse(sourceOffer.expiresAt) <= Date.now())) {
            setError(t('sourceOfferConflict'));
            return;
        }
        const requiredText = ['standard_edition', 'named_location', 'payment_terms', 'inspection_terms', 'title_risk_terms', 'claims_terms'];
        if (requiredText.some(name => !fieldText(data, name))) {
            setError(t('validation.requiredFields'));
            return;
        }
        if (deliveryStart < singaporeDate() || deliveryEnd < deliveryStart) {
            setError(t('validation.deliveryDates'));
            return;
        }
        const deliveryDeadline = Date.parse(`${deliveryEnd}T23:59:59+08:00`);
        if (Date.now() + expiryHours * 60 * 60 * 1000 > deliveryDeadline) {
            setError(t('validation.requestExpiry'));
            return;
        }
        if (minFill > quantity) {
            setError(t('validation.minimumFill'));
            return;
        }
        if (sourceOffer && (quantity < sourceOffer.minFillMt || quantity > sourceOffer.quantityMt)) {
            setError(t('validation.sourceQuantity'));
            return;
        }
        if (standard === 'ASTM_D6751' && !ASTM_GRADES.some(grade => grade === astmGrade)) {
            setError(t('validation.astmGrade'));
            return;
        }
        const contractTerms: FameContractTerms = {
            schema_version: 1,
            neat_fame: true,
            standard,
            standard_edition: fieldText(data, 'standard_edition'),
            astm_grade: standard === 'ASTM_D6751' ? astmGrade as FameContractTerms['astm_grade'] : null,
            en_climate_class: standard === 'EN_14214' ? fieldText(data, 'request_en_climate_class') || null : null,
            max_cfpp_c: optionalNumber(data, 'max_cfpp'),
            max_ci_gco2e_mj: optionalNumber(data, 'max_ci'),
            delivery_basis: deliveryBasis,
            named_location: fieldText(data, 'named_location'),
            delivery_start: deliveryStart,
            delivery_end: deliveryEnd,
            quantity_tolerance_pct: Number(fieldText(data, 'tolerance')),
            min_fill_mt: minFill,
            payment_terms: fieldText(data, 'payment_terms'),
            inspection_terms: fieldText(data, 'inspection_terms'),
            title_risk_terms: fieldText(data, 'title_risk_terms'),
            claims_terms: fieldText(data, 'claims_terms'),
            sustainability_scheme: scheme,
            evidence_due: evidenceDue,
        };
        submitting.current = true;
        try {
            await onSubmit({
                product_id: sourceOffer?.productId ?? productId,
                delivery_point_id: sourceOffer?.deliveryPointId ?? deliveryPointId,
                ...(sourceOffer ? { source_offer_id: sourceOffer.id, expected_source_offer_revision: sourceOffer.revision } : {}),
                quantity_mt: quantity,
                target_price_per_mt: optionalNumber(data, 'target_price'),
                availability_window: sourceOffer?.availabilityWindow ?? 'SPOT',
                notes: fieldText(data, 'notes') || undefined,
                is_anonymous: true,
                expires_in_hours: expiryHours,
                contract_terms: contractTerms,
            });
        } finally {
            submitting.current = false;
        }
    }

    return (
        <form onSubmit={submit} className="space-y-6" aria-label={t('form.requestTitle')}>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('form.requestIntro')}</p>
            <fieldset disabled={pending} className="space-y-6">
                <FormSection title={t('form.commercial')}>
                    <div className={gridClass}>
                        <TextField label={t('form.quantity')} name="quantity" type="number" min={sourceOffer?.minFillMt ?? 1} max={sourceOffer?.quantityMt ?? 100_000} step="0.01" defaultValue={sourceOffer?.quantityMt ?? 1000} required />
                        <TextField label={t('form.targetPrice')} name="target_price" type="number" min="0.01" max={1_000_000} step="0.01" defaultValue={sourceOffer?.pricePerMtUsd} />
                        <TextField label={t('form.minimumFill')} name="min_fill" type="number" min={1} max={100_000} step="0.01" defaultValue={sourceOffer?.minFillMt ?? 1000} required hint={t('form.minimumFillHint')} />
                        <TextField label={t('form.tolerance')} name="tolerance" type="number" min={0} max={10} step="0.01" defaultValue={sourceOffer?.quantityTolerancePct ?? 0} required />
                        <ChoiceField label={t('form.deliveryBasis')} value={deliveryBasis} onChange={value => setDeliveryBasis(value as FameContractTerms['delivery_basis'])} disabled={pending} options={['EX_TANK', 'FOB', 'FCA', 'CIF'].map(value => ({ value, label: t(`form.deliveryBasisOptions.${value}`) }))} />
                        <TextField label={t('form.namedLocation')} name="named_location" defaultValue={sourceOffer?.namedLocation ?? ''} maxLength={200} required />
                        <TextField label={t('form.deliveryStart')} name="delivery_start" defaultValue={sourceOffer?.deliveryStart ?? ''} type="date" min={today} required />
                        <TextField label={t('form.deliveryEnd')} name="delivery_end" defaultValue={sourceOffer?.deliveryEnd ?? ''} type="date" min={today} required />
                        <TextField label={t('form.requestExpiry')} name="expires_in_hours" type="number" min={1} max={MAX_RFQ_HOURS} step={1} defaultValue={48} required />
                    </div>
                    <div className={gridClass}>
                        <TextAreaField label={t('form.paymentTerms')} name="payment_terms" defaultValue={sourceOffer?.paymentTerms ?? ''} maxLength={1000} required />
                        <TextAreaField label={t('form.inspectionTerms')} name="inspection_terms" defaultValue={sourceOffer?.inspectionTerms ?? ''} maxLength={1000} required />
                        <TextAreaField label={t('form.titleRiskTerms')} name="title_risk_terms" defaultValue={sourceOffer?.titleRiskTerms ?? ''} maxLength={1000} required />
                        <TextAreaField label={t('form.claimsTerms')} name="claims_terms" defaultValue={sourceOffer?.claimsTerms ?? ''} maxLength={1000} required />
                    </div>
                </FormSection>
                <FormSection title={t('form.specification')}>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('form.neatFameScope')}</p>
                    <div className={gridClass}>
                        <ChoiceField label={t('form.standard')} value={standard} onChange={value => setStandard(value as FameStandard)} disabled={pending || Boolean(sourceOffer)} options={['EN_14214', 'ASTM_D6751'].map(value => ({ value, label: t(`form.standardOptions.${value}`) }))} />
                        <TextField label={t('form.standardEdition')} name="standard_edition" defaultValue={sourceOffer?.fuelTerms.standard_edition ?? ''} readOnly={Boolean(sourceOffer)} maxLength={200} required hint={t('form.editionHint')} />
                        {standard === 'ASTM_D6751' ? <ChoiceField label={t('declaration.astmGrade')} value={astmGrade} onChange={setAstmGrade} disabled={pending || Boolean(sourceOffer)} options={[{ value: '', label: t('declaration.selectGrade') }, ...ASTM_GRADES.map(value => ({ value, label: value }))]} /> : <TextField label={t('declaration.enClimateClass')} name="request_en_climate_class" defaultValue={sourceOffer?.fuelTerms.en_climate_class ?? ''} readOnly={Boolean(sourceOffer)} maxLength={200} />}
                        <TextField label={t('form.maxCfpp')} name="max_cfpp" defaultValue={sourceOffer?.fuelTerms.cfpp_c ?? ''} type="number" min={-80} max={50} step="any" />
                        <TextField label={t('form.maxCi')} name="max_ci" defaultValue={sourceOffer?.fuelTerms.ci_gco2e_mj ?? ''} type="number" min={0} max={200} step="any" />
                    </div>
                </FormSection>
                <FormSection title={t('form.evidence')}>
                    <div className={gridClass}>
                        <ChoiceField label={t('form.scheme')} value={scheme} onChange={value => setScheme(value as FameScheme)} disabled={pending || Boolean(sourceOffer)} options={['ISCC_EU', 'REDCERT_EU'].map(value => ({ value, label: t(`form.schemeOptions.${value}`) }))} />
                        <ChoiceField label={t('form.evidenceDue')} value={evidenceDue} onChange={value => setEvidenceDue(value as FameContractTerms['evidence_due'])} disabled={pending} options={['BEFORE_LOADING', 'BEFORE_DELIVERY'].map(value => ({ value, label: t(`form.evidenceDueOptions.${value}`) }))} />
                    </div>
                    <TextAreaField label={t('form.notes')} name="notes" defaultValue={sourceOffer?.notes ?? ''} maxLength={500} />
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('form.declarationNotice')}</p>
                </FormSection>
            </fieldset>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            <FormActions onCancel={onCancel} pending={pending} submitLabel={t('form.createRequest')} />
        </form>
    );
}

interface FameQuoteFormProps {
    rfq: FameRfq;
    quote?: FameQuote;
    onSubmit: (input: FameQuoteInput) => Promise<void>;
    onCancel: () => void;
    pending: boolean;
}

export function FameQuoteForm({ rfq, quote, onSubmit, onCancel, pending }: FameQuoteFormProps) {
    const { t } = useNamespace('rfq');
    const contract = rfq.contractTerms;
    const offer = quote?.offerTerms;
    const [error, setError] = useState('');
    const submitting = useRef(false);

    if (!contract) {
        return <div className="space-y-4"><p role="alert">{t('validation.missingContract')}</p><button type="button" onClick={onCancel} className="text-sm underline">{t('form.cancel')}</button></div>;
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!contract || pending || submitting.current) return;
        setError('');
        const data = new FormData(event.currentTarget);
        const expiresAt = new Date(fieldText(data, 'expires_at'));
        const declaration = readFameDeclaration(data);
        if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() || expiresAt.getTime() > new Date(rfq.expiresAt).getTime()) {
            setError(t('validation.quoteExpiry'));
            return;
        }
        if (Number(fieldText(data, 'available_quantity')) < rfq.quantityMt) {
            setError(t('validation.availableQuantity'));
            return;
        }
        if (contract.max_cfpp_c != null && (declaration.cfpp_c == null || declaration.cfpp_c > contract.max_cfpp_c)) {
            setError(t('validation.cfppLimit'));
            return;
        }
        if (contract.max_ci_gco2e_mj != null && (declaration.ci_gco2e_mj == null || declaration.ci_gco2e_mj > contract.max_ci_gco2e_mj)) {
            setError(t('validation.ciLimit'));
            return;
        }
        const declarationError = validateFameDeclaration(declaration, contract.delivery_end, true);
        if (declarationError) {
            setError(t(declarationError));
            return;
        }
        if (data.get('matches_contract') !== 'on') {
            setError(t('validation.confirmTerms'));
            return;
        }
        submitting.current = true;
        try {
            await onSubmit({
                price_per_mt_usd: Number(fieldText(data, 'price')),
                expires_at: expiresAt.toISOString(),
                notes: fieldText(data, 'notes') || undefined,
                offer_terms: {
                    ...declaration,
                    matches_contract_terms: true,
                    batch_reference: declaration.batch_reference!,
                    producing_site: declaration.producing_site!,
                    production_origin: declaration.production_origin!,
                    feedstock_origin: declaration.feedstock_origin!,
                    shipping_location: declaration.shipping_location!,
                    available_quantity_mt: Number(fieldText(data, 'available_quantity')),
                },
            });
        } finally {
            submitting.current = false;
        }
    }

    return (
        <form onSubmit={submit} className="space-y-6" aria-label={t('form.quoteTitle')}>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('form.quoteIntro')}</p>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('form.requestedTerms')}</p>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.standard')}</dt><dd>{t(`form.standardOptions.${contract.standard}`)} · {contract.standard_edition}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.scheme')}</dt><dd>{t(`form.schemeOptions.${contract.sustainability_scheme}`)}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.quantity')}</dt><dd>{rfq.quantityMt.toLocaleString()} MT</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.tolerance')}</dt><dd>{contract.quantity_tolerance_pct}%</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.minimumFill')}</dt><dd>{contract.min_fill_mt.toLocaleString()} MT</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.deliveryBasis')}</dt><dd>{t(`form.deliveryBasisOptions.${contract.delivery_basis}`)} · {contract.named_location}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.deliveryWindow')}</dt><dd>{contract.delivery_start} — {contract.delivery_end}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.evidenceDue')}</dt><dd>{t(`form.evidenceDueOptions.${contract.evidence_due}`)}</dd></div>
                    {contract.max_cfpp_c != null && <div><dt className="text-slate-500 dark:text-slate-400">{t('form.maxCfpp')}</dt><dd>{contract.max_cfpp_c} °C</dd></div>}
                    {contract.max_ci_gco2e_mj != null && <div><dt className="text-slate-500 dark:text-slate-400">{t('form.maxCi')}</dt><dd>{contract.max_ci_gco2e_mj} gCO₂e/MJ</dd></div>}
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.paymentTerms')}</dt><dd className="whitespace-pre-wrap break-words">{contract.payment_terms}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.inspectionTerms')}</dt><dd className="whitespace-pre-wrap break-words">{contract.inspection_terms}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.titleRiskTerms')}</dt><dd className="whitespace-pre-wrap break-words">{contract.title_risk_terms}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">{t('form.claimsTerms')}</dt><dd className="whitespace-pre-wrap break-words">{contract.claims_terms}</dd></div>
                </dl>
            </div>
            <fieldset disabled={pending} className="space-y-6">
                <FormSection title={t('form.commercial')}>
                    <div className={gridClass}>
                        <TextField label={t('form.quotePrice')} name="price" type="number" min="0.01" max={1_000_000} step="0.01" defaultValue={quote?.pricePerMtUsd} required />
                        <TextField label={t('form.availableQuantity')} name="available_quantity" type="number" min={rfq.quantityMt} max={100_000} step="0.01" defaultValue={offer?.available_quantity_mt ?? rfq.quantityMt} required />
                        <TextField label={t('form.quoteExpiry')} name="expires_at" type="datetime-local" min={localDateTime(new Date())} max={localDateTime(new Date(rfq.expiresAt))} defaultValue={localDateTime(new Date(quote?.expiresAt ?? rfq.expiresAt))} required hint={t('form.localTimeHint')} />
                    </div>
                </FormSection>
                <FameDeclarationFields initial={offer} contract={contract} deliveryEnd={contract.delivery_end} pending={pending} />
                <div className="space-y-4">
                    <TextAreaField label={t('form.notes')} name="notes" defaultValue={quote?.notes ?? ''} maxLength={500} />
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        <input name="matches_contract" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-sky-600" />
                        <span>{t('form.confirmTerms')}</span>
                    </label>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('form.declarationNotice')}</p>
                </div>
            </fieldset>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            <FormActions onCancel={onCancel} pending={pending} submitLabel={quote ? t('form.reviseQuote') : t('form.submitQuote')} />
        </form>
    );
}
