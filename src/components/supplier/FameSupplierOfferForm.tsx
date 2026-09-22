import React, { useState } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import type { SupplierOffer, SupplierOfferCreateInput } from '../../types/fameSupplierOffer';
import { FameDeclarationFields, readFameDeclaration, validateFameDeclaration } from '../fame/FameDeclarationFields';
import { ChoiceField, FormSection, TextAreaField, TextField, fieldText, gridClass, localDateTime, singaporeDate } from '../fame/FameFormFields';

type CoreFields = Pick<SupplierOfferCreateInput, 'product_id' | 'delivery_point_id' | 'quantity_mt' | 'price_per_mt_usd' | 'availability_window'>;

export function buildFameSupplierOfferInput(data: FormData, core: CoreFields): SupplierOfferCreateInput {
    const expiry = new Date(fieldText(data, 'offer_expires_at'));
    return {
        ...core,
        min_fill_mt: Number(fieldText(data, 'offer_min_fill')),
        delivery_basis: fieldText(data, 'offer_delivery_basis') as SupplierOfferCreateInput['delivery_basis'],
        named_location: fieldText(data, 'offer_named_location'),
        delivery_start: fieldText(data, 'offer_delivery_start'),
        delivery_end: fieldText(data, 'offer_delivery_end'),
        quantity_tolerance_pct: Number(fieldText(data, 'offer_tolerance')),
        payment_terms: fieldText(data, 'offer_payment_terms') || null,
        inspection_terms: fieldText(data, 'offer_inspection_terms') || null,
        title_risk_terms: fieldText(data, 'offer_title_risk_terms') || null,
        claims_terms: fieldText(data, 'offer_claims_terms') || null,
        evidence_due: fieldText(data, 'offer_evidence_due') as SupplierOfferCreateInput['evidence_due'],
        expires_at: Number.isFinite(expiry.getTime()) ? expiry.toISOString() : '',
        notes: fieldText(data, 'offer_notes') || undefined,
        fuel_terms: {
            ...readFameDeclaration(data),
            neat_fame: (data.get('offer_declaration') === 'on') as true,
            nomination_status: fieldText(data, 'nomination_status') as 'PENDING' | 'IDENTIFIED',
        },
    };
}

export function validateFameSupplierOfferInput(input: SupplierOfferCreateInput): string | null {
    if (!input.named_location || !input.delivery_start || !input.delivery_end) return 'validation.requiredFields';
    if (!Number.isFinite(input.quantity_mt) || input.quantity_mt < 1 || input.quantity_mt > 100_000 || !Number.isFinite(input.price_per_mt_usd) || input.price_per_mt_usd <= 0 || input.price_per_mt_usd > 1_000_000) return 'validation.offerQuantityPrice';
    if (!Number.isFinite(input.min_fill_mt) || input.min_fill_mt < 1 || input.min_fill_mt > input.quantity_mt) return 'validation.offerMinimumFill';
    if (input.delivery_start < singaporeDate() || input.delivery_end < input.delivery_start) return 'validation.deliveryDates';
    const expiry = Date.parse(input.expires_at);
    if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.parse(`${input.delivery_end}T23:59:59+08:00`)) return 'validation.offerExpiry';
    const declaration = input.fuel_terms;
    const declarationError = validateFameDeclaration(declaration, input.delivery_end, declaration.nomination_status === 'IDENTIFIED');
    if (declarationError) return declarationError;
    if (declaration.ci_gco2e_mj != null && (!declaration.ci_boundary?.trim() || !declaration.ci_basis)) return 'validation.ciContext';
    if (!declaration.neat_fame) return 'validation.confirmOffer';
    return null;
}

/** Fields inside OrderPlaceModal's existing form; the dialog owns its core fields and submit action. */
export function FameSupplierOfferForm({ offer, quantityMt, pending }: { offer?: SupplierOffer; quantityMt: number; pending: boolean }) {
    const { t } = useNamespace('rfq');
    const [deliveryBasis, setDeliveryBasis] = useState(offer?.deliveryBasis ?? 'EX_TANK');
    const [evidenceDue, setEvidenceDue] = useState(offer?.evidenceDue ?? 'BEFORE_LOADING');
    const [deliveryEnd, setDeliveryEnd] = useState(offer?.deliveryEnd ?? '');
    return <fieldset disabled={pending} className="space-y-5">
        <FormSection title={t('form.commercial')}>
            <div className={gridClass}>
                <TextField name="offer_min_fill" label={t('form.minimumFill')} type="number" min={1} max={quantityMt || 100_000} step="0.01" defaultValue={offer?.minFillMt ?? 1} required />
                <TextField name="offer_tolerance" label={t('form.tolerance')} type="number" min={0} max={10} step="0.01" defaultValue={offer?.quantityTolerancePct ?? 0} required />
                <ChoiceField name="offer_delivery_basis" label={t('form.deliveryBasis')} value={deliveryBasis} onChange={value => setDeliveryBasis(value as typeof deliveryBasis)} disabled={pending} options={['EX_TANK', 'FOB', 'FCA', 'CIF'].map(value => ({ value, label: t(`form.deliveryBasisOptions.${value}`) }))} />
                <TextField name="offer_named_location" label={t('form.namedLocation')} defaultValue={offer?.namedLocation ?? ''} maxLength={200} required />
                <TextField name="offer_delivery_start" label={t('form.deliveryStart')} type="date" min={singaporeDate()} defaultValue={offer?.deliveryStart ?? ''} required />
                <TextField name="offer_delivery_end" label={t('form.deliveryEnd')} type="date" min={singaporeDate()} value={deliveryEnd} onChange={event => setDeliveryEnd(event.target.value)} required />
                <TextField name="offer_expires_at" label={t('offerForm.expiry')} type="datetime-local" min={localDateTime(new Date())} defaultValue={offer?.expiresAt ? localDateTime(new Date(offer.expiresAt)) : ''} required hint={t('offerForm.expiryHint')} />
                <ChoiceField name="offer_evidence_due" label={t('form.evidenceDue')} value={evidenceDue} onChange={value => setEvidenceDue(value as typeof evidenceDue)} disabled={pending} options={['BEFORE_LOADING', 'BEFORE_DELIVERY'].map(value => ({ value, label: t(`form.evidenceDueOptions.${value}`) }))} />
            </div>
            <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <summary className="cursor-pointer text-sm font-medium">{t('offerForm.optionalTerms')}</summary>
                <div className={`${gridClass} mt-4`}>
                    <TextAreaField name="offer_payment_terms" label={t('form.paymentTerms')} defaultValue={offer?.paymentTerms ?? ''} maxLength={1000} />
                    <TextAreaField name="offer_inspection_terms" label={t('form.inspectionTerms')} defaultValue={offer?.inspectionTerms ?? ''} maxLength={1000} />
                    <TextAreaField name="offer_title_risk_terms" label={t('form.titleRiskTerms')} defaultValue={offer?.titleRiskTerms ?? ''} maxLength={1000} />
                    <TextAreaField name="offer_claims_terms" label={t('form.claimsTerms')} defaultValue={offer?.claimsTerms ?? ''} maxLength={1000} />
                </div>
            </details>
        </FormSection>
        <FameDeclarationFields initial={offer?.fuelTerms} deliveryEnd={deliveryEnd} evidenceDue={evidenceDue} listing pending={pending} />
        <TextAreaField name="offer_notes" label={t('form.notes')} defaultValue={offer?.notes ?? ''} maxLength={500} />
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900">
            <input name="offer_declaration" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-sky-600" />
            <span>{t('offerForm.declaration')}</span>
        </label>
    </fieldset>;
}
