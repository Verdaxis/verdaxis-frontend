import React, { useId } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import type { SupplierOffer, SupplierOfferSnapshot } from '../../types/fameSupplierOffer';
import { formatAvailabilityWindow } from '../../utils/availabilityWindow';
import { FameDeclarationDetails } from '../rfq/FameDeclarationDetails';

type CommercialTerms = Pick<SupplierOffer,
    'quantityMt' | 'minFillMt' | 'pricePerMtUsd' | 'availabilityWindow' | 'expiresAt' |
    'deliveryBasis' | 'namedLocation' | 'deliveryStart' | 'deliveryEnd' | 'quantityTolerancePct' |
    'paymentTerms' | 'inspectionTerms' | 'titleRiskTerms' | 'claimsTerms' | 'evidenceDue' | 'notes'>;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="min-w-0">
        <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{children}</dd>
    </div>;
}

function CommercialTermsDetails({ terms }: { terms: CommercialTerms }) {
    const { t, ready } = useNamespace('rfq');
    const { t: trading, ready: tradingReady } = useNamespace('trading');
    const id = useId();
    const locale = i18n.resolvedLanguage || 'en';
    const copy = (key: string) => trading(`marketplace.supplierOffers.detailsFields.${key}`);
    const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(locale, { maximumFractionDigits: 2 }) : t('notSupplied');
    const text = (value: string | null | undefined) => value?.trim() || t('notSupplied');
    const expiry = new Date(terms.expiresAt);

    if (!ready || !tradingReady) return null;

    return <section aria-labelledby={id}>
        <h3 id={id} className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('form.commercial')}</h3>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label={copy('offeredQuantity')}>{number(terms.quantityMt)} MT</Detail>
            <Detail label={t('fields.minFill')}>{number(terms.minFillMt)} MT</Detail>
            <Detail label={copy('indicativePrice')}>{number(terms.pricePerMtUsd)} USD/MT</Detail>
            <Detail label={t('fields.deliveryBasis')}>{t(`basis.${terms.deliveryBasis}`)}</Detail>
            <Detail label={t('fields.namedLocation')}>{text(terms.namedLocation)}</Detail>
            <Detail label={t('fields.deliveryDates')}>{terms.deliveryStart} → {terms.deliveryEnd}</Detail>
            <Detail label={t('form.deliveryWindow')}>{formatAvailabilityWindow(terms.availabilityWindow, locale)}</Detail>
            <Detail label={t('fields.quantityTolerance')}>{number(terms.quantityTolerancePct)}%</Detail>
            <Detail label={copy('listingExpiry')}>{Number.isNaN(expiry.getTime()) ? t('notSupplied') : expiry.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</Detail>
            <Detail label={t('fields.evidenceDue')}>{t(`evidenceDue.${terms.evidenceDue}`)}</Detail>
        </dl>
        <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">{t('commercialTerms')}</summary>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Detail label={t('fields.paymentTerms')}>{text(terms.paymentTerms)}</Detail>
                <Detail label={t('fields.inspectionTerms')}>{text(terms.inspectionTerms)}</Detail>
                <Detail label={t('fields.titleRiskTerms')}>{text(terms.titleRiskTerms)}</Detail>
                <Detail label={t('fields.claimsTerms')}>{text(terms.claimsTerms)}</Detail>
                {terms.notes && <Detail label={t('fields.notes')}>{terms.notes}</Detail>}
            </dl>
        </details>
    </section>;
}

export function SupplierOfferDetails({ offer }: { offer: SupplierOffer }) {
    return <div className="space-y-4 text-left">
        <CommercialTermsDetails terms={offer} />
        <FameDeclarationDetails terms={offer.fuelTerms} />
    </div>;
}

/** A request's terms must come from its frozen snapshot, never the live listing. */
export function SupplierOfferSnapshotDetails({ snapshot }: { snapshot: SupplierOfferSnapshot }) {
    const source = snapshot.listingTerms;
    const commercial: CommercialTerms = {
        quantityMt: snapshot.quantityMt,
        minFillMt: snapshot.minFillMt,
        pricePerMtUsd: snapshot.pricePerMtUsd,
        availabilityWindow: snapshot.availabilityWindow,
        expiresAt: snapshot.expiresAt,
        deliveryBasis: source.delivery_basis,
        namedLocation: source.named_location,
        deliveryStart: source.delivery_start,
        deliveryEnd: source.delivery_end,
        quantityTolerancePct: source.quantity_tolerance_pct,
        paymentTerms: source.payment_terms ?? null,
        inspectionTerms: source.inspection_terms ?? null,
        titleRiskTerms: source.title_risk_terms ?? null,
        claimsTerms: source.claims_terms ?? null,
        evidenceDue: source.evidence_due,
        notes: source.notes ?? null,
    };

    return <div className="space-y-4 text-left">
        <CommercialTermsDetails terms={commercial} />
        <FameDeclarationDetails terms={source.fuel_terms} />
    </div>;
}
