import React from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';
import {
    CHAINS_OF_CUSTODY,
    DELIVERY_METHODS,
    FEEDSTOCK_CATEGORIES,
    ISO_COUNTRY_CODE_LENGTH,
    POS_TIMINGS,
    SUSTAINABILITY_SCHEMES,
} from '../../types/lngOrder';
import type { LngAskIssue, LngAskTermsForm, LngBidIssue, LngBidTermsForm } from '../../utils/bioLngSpecification';

/**
 * The bio-LNG order-modal sections. Sellers declare the ask terms, buyers state
 * the requirements a compatible ask must satisfy. Client validation mirrors the
 * server, which stays authoritative.
 */

const inputClass = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-4';
const helperClass = 'mt-1 text-xs text-slate-500 dark:text-slate-400';
const errorClass = 'mt-1 text-xs text-red-600 dark:text-red-400';

interface FieldProps {
    id: string;
    label: string;
    helper?: string;
    error?: string;
    children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ id, label, helper, error, children }) => (
    <div>
        <label htmlFor={id} className={labelClass}>{label}</label>
        {children}
        {error
            ? <p id={`${id}-error`} className={errorClass}>{error}</p>
            : helper && <p className={helperClass}>{helper}</p>}
    </div>
);

interface CheckboxCardProps {
    label: string;
    helper?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const CheckboxCard: React.FC<CheckboxCardProps> = ({ label, helper, checked, onChange }) => (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50 dark:bg-slate-900">
        <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
        />
        <span>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
            {helper && <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</span>}
        </span>
    </label>
);

const SectionHeading: React.FC<{ title: string; helper: string }> = ({ title, helper }) => (
    <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
        <p className={helperClass}>{helper}</p>
    </div>
);

/** The first issue message present for one field, if any. */
const issueMessage = (
    issues: readonly string[],
    fieldIssues: readonly string[],
    t: (key: string) => string,
): string | undefined => {
    const match = fieldIssues.find((issue) => issues.includes(issue));
    return match ? t(`bioLng.issue.${match}`) : undefined;
};

const ASK_FIELD_ISSUES: Record<string, LngAskIssue[]> = {
    scheme: ['ASK_SCHEME_REQUIRED'],
    certificate: ['ASK_CERTIFICATE_LENGTH'],
    custody: ['ASK_CUSTODY_REQUIRED'],
    bioShare: ['ASK_BIO_SHARE_REQUIRED', 'ASK_BIO_SHARE_RANGE', 'ASK_BIO_SHARE_PRECISION'],
    feedstock: ['ASK_FEEDSTOCK_REQUIRED'],
    feedstockDetail: ['ASK_FEEDSTOCK_DETAIL_LENGTH'],
    country: ['ASK_COUNTRY_REQUIRED', 'ASK_COUNTRY_FORMAT'],
    wtt: ['ASK_WTT_REQUIRED', 'ASK_WTT_RANGE', 'ASK_WTT_PRECISION'],
    methane: ['ASK_METHANE_RANGE'],
    deliveryMethod: ['ASK_DELIVERY_METHOD_REQUIRED'],
    supplierName: ['ASK_SUPPLIER_NAME_LENGTH'],
    posTiming: ['ASK_POS_TIMING_REQUIRED'],
};

const BID_FIELD_ISSUES: Record<string, LngBidIssue[]> = {
    schemes: ['BID_SCHEMES_REQUIRED'],
    custody: ['BID_CUSTODY_REQUIRED'],
    deliveryMethods: ['BID_DELIVERY_METHODS_REQUIRED'],
    minBioShare: ['BID_MIN_BIO_SHARE_RANGE', 'BID_MIN_BIO_SHARE_PRECISION'],
    maxWtt: ['BID_MAX_WTT_RANGE', 'BID_MAX_WTT_PRECISION'],
    methane: ['BID_METHANE_RANGE'],
};

interface BaseProps<TForm, TIssue> {
    form: TForm;
    issues: readonly TIssue[];
    /** Issues stay hidden until the reader has changed something. */
    showIssues: boolean;
    onChange: (patch: Partial<TForm>) => void;
}

export const BioLngAskTermsFields: React.FC<BaseProps<LngAskTermsForm, LngAskIssue>> = ({
    form,
    issues,
    showIssues,
    onChange,
}) => {
    const { t } = useNamespace('trading');
    const error = (field: string) => (
        showIssues ? issueMessage(issues, ASK_FIELD_ISSUES[field] ?? [], t) : undefined
    );
    const set = <K extends keyof LngAskTermsForm>(key: K) => (value: LngAskTermsForm[K]) => onChange({ [key]: value } as Partial<LngAskTermsForm>);

    return (
        <div data-tour="order-modal-lng-terms" className="space-y-4">
            <SectionHeading title={t('bioLng.section.askTerms')} helper={t('bioLng.section.askHelper')} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="lng-ask-scheme" label={t('bioLng.label.scheme')} error={error('scheme')}>
                    <VerdaxisSelect
                        ariaLabel={t('bioLng.label.scheme')}
                        value={form.sustainability_scheme}
                        onChange={set('sustainability_scheme')}
                        options={SUSTAINABILITY_SCHEMES.map((scheme) => ({
                            value: scheme,
                            label: t(`bioLng.option.scheme.${scheme}`),
                        }))}
                        placeholder={t('bioLng.label.scheme')}
                    />
                </Field>
                <Field
                    id="lng-ask-certificate-number"
                    label={t('bioLng.label.certificateNumber')}
                    helper={t('bioLng.helper.certificateNumber')}
                    error={error('certificate')}
                >
                    <input
                        id="lng-ask-certificate-number"
                        type="text"
                        value={form.scheme_certificate_number}
                        onChange={(event) => set('scheme_certificate_number')(event.target.value)}
                        maxLength={64}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="lng-ask-custody" label={t('bioLng.label.chainOfCustody')} error={error('custody')}>
                    <VerdaxisSelect
                        ariaLabel={t('bioLng.label.chainOfCustody')}
                        value={form.chain_of_custody}
                        onChange={set('chain_of_custody')}
                        options={CHAINS_OF_CUSTODY.map((custody) => ({
                            value: custody,
                            label: t(`bioLng.option.custody.${custody}`),
                        }))}
                        placeholder={t('bioLng.label.chainOfCustody')}
                    />
                </Field>
                <Field
                    id="lng-ask-bio-share"
                    label={t('bioLng.label.bioSharePct')}
                    helper={t('bioLng.helper.bioSharePct')}
                    error={error('bioShare')}
                >
                    <input
                        id="lng-ask-bio-share"
                        type="number"
                        value={form.bio_share_pct}
                        onChange={(event) => set('bio_share_pct')(event.target.value)}
                        min={1}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="lng-ask-feedstock" label={t('bioLng.label.feedstockCategory')} error={error('feedstock')}>
                    <VerdaxisSelect
                        ariaLabel={t('bioLng.label.feedstockCategory')}
                        value={form.feedstock}
                        onChange={set('feedstock')}
                        options={FEEDSTOCK_CATEGORIES.map((feedstock) => ({
                            value: feedstock,
                            label: t(`bioLng.option.feedstock.${feedstock}`),
                        }))}
                        placeholder={t('bioLng.label.feedstockCategory')}
                    />
                </Field>
                <Field
                    id="lng-ask-feedstock-detail"
                    label={t('bioLng.label.feedstockDetail')}
                    helper={t('bioLng.helper.feedstockDetail')}
                    error={error('feedstockDetail')}
                >
                    <input
                        id="lng-ask-feedstock-detail"
                        type="text"
                        value={form.feedstock_detail}
                        onChange={(event) => set('feedstock_detail')(event.target.value)}
                        maxLength={200}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                    id="lng-ask-production-country"
                    label={t('bioLng.label.productionCountry')}
                    helper={t('bioLng.helper.productionCountry')}
                    error={error('country')}
                >
                    <input
                        id="lng-ask-production-country"
                        type="text"
                        value={form.production_country}
                        onChange={(event) => set('production_country')(event.target.value.toUpperCase())}
                        maxLength={ISO_COUNTRY_CODE_LENGTH}
                        className={inputClass}
                    />
                </Field>
                <Field
                    id="lng-ask-wtt-ghg"
                    label={t('bioLng.label.wttGhg')}
                    helper={t('bioLng.helper.wttGhg')}
                    error={error('wtt')}
                >
                    <input
                        id="lng-ask-wtt-ghg"
                        type="number"
                        value={form.wtt_ghg_gco2e_mj}
                        onChange={(event) => set('wtt_ghg_gco2e_mj')(event.target.value)}
                        min={-150}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                    id="lng-ask-min-methane-number"
                    label={t('bioLng.label.minMethaneNumber')}
                    helper={t('bioLng.helper.minMethaneNumber')}
                    error={error('methane')}
                >
                    <input
                        id="lng-ask-min-methane-number"
                        type="number"
                        value={form.min_methane_number}
                        onChange={(event) => set('min_methane_number')(event.target.value)}
                        min={0}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
                <Field id="lng-ask-delivery-method" label={t('bioLng.label.deliveryMethod')} error={error('deliveryMethod')}>
                    <VerdaxisSelect
                        ariaLabel={t('bioLng.label.deliveryMethod')}
                        value={form.delivery_method}
                        onChange={set('delivery_method')}
                        options={DELIVERY_METHODS.map((method) => ({
                            value: method,
                            label: t(`bioLng.option.delivery.${method}`),
                        }))}
                        placeholder={t('bioLng.label.deliveryMethod')}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="lng-ask-pos-timing" label={t('bioLng.label.posTiming')} helper={t('bioLng.helper.posTiming')} error={error('posTiming')}>
                    <VerdaxisSelect
                        ariaLabel={t('bioLng.label.posTiming')}
                        value={form.pos_timing}
                        onChange={set('pos_timing')}
                        options={POS_TIMINGS.map((timing) => ({
                            value: timing,
                            label: t(`bioLng.option.pos.${timing}`),
                        }))}
                        placeholder={t('bioLng.label.posTiming')}
                    />
                </Field>
                <Field
                    id="lng-ask-physical-supplier-name"
                    label={t('bioLng.label.physicalSupplierName')}
                    helper={t('bioLng.helper.physicalSupplierName')}
                    error={error('supplierName')}
                >
                    <input
                        id="lng-ask-physical-supplier-name"
                        type="text"
                        value={form.physical_supplier_name}
                        onChange={(event) => set('physical_supplier_name')(event.target.value)}
                        maxLength={120}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="space-y-2">
                <CheckboxCard
                    label={t('bioLng.label.sellerIsPhysicalSupplier')}
                    helper={t('bioLng.helper.sellerIsPhysicalSupplier')}
                    checked={form.seller_is_physical_supplier}
                    onChange={set('seller_is_physical_supplier')}
                />
                <CheckboxCard
                    label={t('bioLng.label.unionDatabase')}
                    helper={t('bioLng.helper.unionDatabase')}
                    checked={form.union_database_registered}
                    onChange={set('union_database_registered')}
                />
            </div>
        </div>
    );
};

export const BioLngBidTermsFields: React.FC<BaseProps<LngBidTermsForm, LngBidIssue>> = ({
    form,
    issues,
    showIssues,
    onChange,
}) => {
    const { t } = useNamespace('trading');
    const error = (field: string) => (
        showIssues ? issueMessage(issues, BID_FIELD_ISSUES[field] ?? [], t) : undefined
    );
    const toggleIn = (key: 'accepted_schemes' | 'accepted_custody' | 'accepted_delivery_methods') => (
        value: string,
        checked: boolean,
    ) => {
        const next = checked
            ? [...form[key], value]
            : form[key].filter((entry) => entry !== value);
        onChange({ [key]: next } as Partial<LngBidTermsForm>);
    };

    return (
        <div data-tour="order-modal-lng-terms" className="space-y-4">
            <SectionHeading title={t('bioLng.section.bidTerms')} helper={t('bioLng.section.bidHelper')} />

            <div>
                <span className={labelClass}>{t('bioLng.label.acceptedSchemes')}</span>
                <div className="space-y-2">
                    {SUSTAINABILITY_SCHEMES.map((scheme) => (
                        <CheckboxCard
                            key={scheme}
                            label={t(`bioLng.option.scheme.${scheme}`)}
                            checked={form.accepted_schemes.includes(scheme)}
                            onChange={(checked) => toggleIn('accepted_schemes')(scheme, checked)}
                        />
                    ))}
                </div>
                {error('schemes') && <p className={errorClass}>{error('schemes')}</p>}
            </div>

            <div>
                <span className={labelClass}>{t('bioLng.label.acceptedCustody')}</span>
                <div className="space-y-2">
                    {CHAINS_OF_CUSTODY.map((custody) => (
                        <CheckboxCard
                            key={custody}
                            label={t(`bioLng.option.custody.${custody}`)}
                            checked={form.accepted_custody.includes(custody)}
                            onChange={(checked) => toggleIn('accepted_custody')(custody, checked)}
                        />
                    ))}
                </div>
                {error('custody') && <p className={errorClass}>{error('custody')}</p>}
            </div>

            <div>
                <span className={labelClass}>{t('bioLng.label.acceptedDeliveryMethods')}</span>
                <div className="space-y-2">
                    {DELIVERY_METHODS.map((method) => (
                        <CheckboxCard
                            key={method}
                            label={t(`bioLng.option.delivery.${method}`)}
                            checked={form.accepted_delivery_methods.includes(method)}
                            onChange={(checked) => toggleIn('accepted_delivery_methods')(method, checked)}
                        />
                    ))}
                </div>
                {error('deliveryMethods') && <p className={errorClass}>{error('deliveryMethods')}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                    id="lng-bid-min-bio-share"
                    label={t('bioLng.label.minBioSharePct')}
                    helper={t('bioLng.helper.optionalAny')}
                    error={error('minBioShare')}
                >
                    <input
                        id="lng-bid-min-bio-share"
                        type="number"
                        value={form.min_bio_share_pct}
                        onChange={(event) => onChange({ min_bio_share_pct: event.target.value })}
                        min={1}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
                <Field
                    id="lng-bid-max-wtt-ghg"
                    label={t('bioLng.label.maxWttGhg')}
                    helper={t('bioLng.helper.optionalAny')}
                    error={error('maxWtt')}
                >
                    <input
                        id="lng-bid-max-wtt-ghg"
                        type="number"
                        value={form.max_wtt_ghg_gco2e_mj}
                        onChange={(event) => onChange({ max_wtt_ghg_gco2e_mj: event.target.value })}
                        min={-150}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
                <Field
                    id="lng-bid-min-methane-number"
                    label={t('bioLng.label.minMethaneNumber')}
                    helper={t('bioLng.helper.optionalAny')}
                    error={error('methane')}
                >
                    <input
                        id="lng-bid-min-methane-number"
                        type="number"
                        value={form.min_methane_number}
                        onChange={(event) => onChange({ min_methane_number: event.target.value })}
                        min={0}
                        max={100}
                        step={0.01}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="space-y-2">
                <CheckboxCard
                    label={t('bioLng.label.requireUnionDatabase')}
                    helper={t('bioLng.helper.unionDatabase')}
                    checked={form.require_union_database}
                    onChange={(checked) => onChange({ require_union_database: checked })}
                />
                <CheckboxCard
                    label={t('bioLng.label.acceptResellers')}
                    helper={t('bioLng.helper.acceptResellers')}
                    checked={!form.accept_resellers}
                    onChange={(checked) => onChange({ accept_resellers: !checked })}
                />
            </div>
        </div>
    );
};
