import React, { useState } from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import {
    LNG_SPECIFICATION_STANDARD,
    type LngAskTerms,
    type LngBidTerms,
    type LngChainOfCustody,
    type LngDeliveryMethod,
    type LngFeedstock,
    type LngOrderTerms,
    type LngOrderTermsView,
    type LngPosTiming,
    type LngSustainabilityScheme,
    lngAskRecognition,
} from '../../types/lngOrder';
// Generic, product-neutral form primitives. They live beside the FAME fields but
// carry no FAME-specific behavior.
import { ChoiceField, FormSection, TextField, fieldText, gridClass, optionalNumber } from '../fame/FameFormFields';

export const LNG_SCHEMES: LngSustainabilityScheme[] = ['ISCC_EU', 'REDCERT_EU'];
export const LNG_CUSTODY: LngChainOfCustody[] = ['MASS_BALANCE', 'PHYSICAL_SEGREGATION'];
export const LNG_DELIVERY_METHODS: LngDeliveryMethod[] = ['SHIP_TO_SHIP', 'TRUCK_TO_SHIP', 'TERMINAL_TO_SHIP'];
export const LNG_FEEDSTOCKS: LngFeedstock[] = [
    'MANURE',
    'FOOD_WASTE',
    'SEWAGE_SLUDGE',
    'LANDFILL_GAS',
    'AGRICULTURAL_RESIDUES',
    'OTHER_WASTES_AND_RESIDUES',
    'ENERGY_CROPS',
];
export const LNG_POS_TIMINGS: LngPosTiming[] = ['WITH_DELIVERY', 'AFTER_DELIVERY'];

const CERTIFICATE_NUMBER_MIN = 3;
const CERTIFICATE_NUMBER_MAX = 64;
const SUPPLIER_NAME_MIN = 2;
const SUPPLIER_NAME_MAX = 120;
const FEEDSTOCK_DETAIL_MAX = 200;
/** The PoS well-to-tank range: negative values are possible (for example manure). */
const WTT_MIN = -150;
const WTT_MAX = 100;
const BIO_SHARE_MIN = 1;
const BIO_SHARE_MAX = 100;
const METHANE_NUMBER_MIN = 0;
const METHANE_NUMBER_MAX = 100;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

function CheckField({ name, children, required = false, defaultChecked = false, disabled = false }: {
    name: string;
    children: React.ReactNode;
    required?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
}) {
    return <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <input type="checkbox" name={name} required={required} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]" />
        <span>{children}</span>
    </label>;
}

/** A checkbox group whose submitted values must stay non-empty and unique. */
function CheckboxGroup<T extends string>({ name, label, values, options, selected, onChange, disabled = false }: {
    name: string;
    label: string;
    values: readonly T[];
    options: (value: T) => string;
    selected: T[];
    onChange: (value: T) => void;
    disabled?: boolean;
}) {
    return <fieldset className="space-y-2">
        <legend className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-4">{label}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
            {values.map(value => <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <input
                    type="checkbox"
                    name={name}
                    value={value}
                    checked={selected.includes(value)}
                    onChange={() => onChange(value)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                />
                <span>{options(value)}</span>
            </label>)}
        </div>
    </fieldset>;
}

function toggle<T>(values: T[], value: T): T[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function outsideRange(value: number | null | undefined, minimum: number, maximum: number): boolean {
    return value != null && (!Number.isFinite(value) || value < minimum || value > maximum);
}

function tooManyDecimals(value: number | null | undefined): boolean {
    return value != null && Math.abs(value * 100 - Math.round(value * 100)) > 1e-8;
}

/** Read the submitted terms. Empty optional measurements stay unknown. */
export function readLngOrderTerms(data: FormData, side: 'BID' | 'ASK'): LngOrderTerms {
    if (side === 'ASK') {
        return {
            side,
            sustainability_scheme: fieldText(data, 'lng_scheme') as LngSustainabilityScheme,
            scheme_certificate_number: fieldText(data, 'lng_certificate_number'),
            chain_of_custody: fieldText(data, 'lng_custody') as LngChainOfCustody,
            union_database_registered: data.get('lng_union_database') === 'on',
            bio_share_pct: optionalNumber(data, 'lng_bio_share') ?? Number.NaN,
            feedstock: fieldText(data, 'lng_feedstock') as LngFeedstock,
            feedstock_detail: fieldText(data, 'lng_feedstock_detail') || null,
            production_country: fieldText(data, 'lng_production_country').toUpperCase(),
            wtt_ghg_gco2e_mj: optionalNumber(data, 'lng_wtt') ?? Number.NaN,
            specification_standard: LNG_SPECIFICATION_STANDARD,
            min_methane_number: optionalNumber(data, 'lng_min_methane') ?? null,
            delivery_method: fieldText(data, 'lng_delivery_method') as LngDeliveryMethod,
            seller_is_physical_supplier: data.get('lng_physical_supplier') === 'on',
            physical_supplier_name: fieldText(data, 'lng_supplier_name'),
            pos_timing: fieldText(data, 'lng_pos_timing') as LngPosTiming,
        };
    }
    return {
        side,
        accepted_schemes: data.getAll('lng_accepted_schemes') as LngSustainabilityScheme[],
        accepted_custody: data.getAll('lng_accepted_custody') as LngChainOfCustody[],
        require_union_database: data.get('lng_require_union_database') === 'on',
        min_bio_share_pct: optionalNumber(data, 'lng_min_bio_share') ?? null,
        max_wtt_ghg_gco2e_mj: optionalNumber(data, 'lng_max_wtt') ?? null,
        accepted_delivery_methods: data.getAll('lng_accepted_delivery_methods') as LngDeliveryMethod[],
        min_methane_number: optionalNumber(data, 'lng_bid_min_methane') ?? null,
        accept_resellers: data.get('lng_accept_resellers') === 'on',
    };
}

/** Client mirror of the server rules; the server stays authoritative. */
export function validateLngOrderTerms(terms: LngOrderTerms): string | null {
    if (terms.side === 'ASK') {
        if (!LNG_SCHEMES.includes(terms.sustainability_scheme)
            || !LNG_CUSTODY.includes(terms.chain_of_custody)
            || !LNG_FEEDSTOCKS.includes(terms.feedstock)
            || !LNG_DELIVERY_METHODS.includes(terms.delivery_method)
            || !LNG_POS_TIMINGS.includes(terms.pos_timing)) return 'lngTerms.validation.requiredFields';
        const certificate = terms.scheme_certificate_number.trim();
        if (certificate.length < CERTIFICATE_NUMBER_MIN || certificate.length > CERTIFICATE_NUMBER_MAX) return 'lngTerms.validation.certificateNumber';
        if (!COUNTRY_CODE_PATTERN.test(terms.production_country)) return 'lngTerms.validation.productionCountry';
        if ((terms.feedstock_detail?.trim().length ?? 0) > FEEDSTOCK_DETAIL_MAX) return 'lngTerms.validation.feedstockDetail';
        if (outsideRange(terms.bio_share_pct, BIO_SHARE_MIN, BIO_SHARE_MAX) || tooManyDecimals(terms.bio_share_pct)) return 'lngTerms.validation.bioShare';
        if (outsideRange(terms.wtt_ghg_gco2e_mj, WTT_MIN, WTT_MAX) || tooManyDecimals(terms.wtt_ghg_gco2e_mj)) return 'lngTerms.validation.wtt';
        if (outsideRange(terms.min_methane_number, METHANE_NUMBER_MIN, METHANE_NUMBER_MAX)) return 'lngTerms.validation.methaneNumber';
        const supplierName = terms.physical_supplier_name.trim();
        if (supplierName.length < SUPPLIER_NAME_MIN || supplierName.length > SUPPLIER_NAME_MAX) return 'lngTerms.validation.supplierName';
        return null;
    }
    if (terms.accepted_schemes.length === 0 || new Set(terms.accepted_schemes).size !== terms.accepted_schemes.length) return 'lngTerms.validation.acceptedSchemes';
    if (terms.accepted_custody.length === 0 || new Set(terms.accepted_custody).size !== terms.accepted_custody.length) return 'lngTerms.validation.acceptedCustody';
    if (terms.accepted_delivery_methods.length === 0 || new Set(terms.accepted_delivery_methods).size !== terms.accepted_delivery_methods.length) return 'lngTerms.validation.acceptedDeliveryMethods';
    if (outsideRange(terms.min_bio_share_pct, BIO_SHARE_MIN, BIO_SHARE_MAX)) return 'lngTerms.validation.bioShare';
    if (outsideRange(terms.max_wtt_ghg_gco2e_mj, WTT_MIN, WTT_MAX)) return 'lngTerms.validation.wtt';
    if (outsideRange(terms.min_methane_number, METHANE_NUMBER_MIN, METHANE_NUMBER_MAX)) return 'lngTerms.validation.methaneNumber';
    return null;
}

function LngAskFields({ initial, pending }: { initial?: LngAskTerms | null; pending: boolean }) {
    const { t } = useNamespace('trading');
    const [scheme, setScheme] = useState(initial?.sustainability_scheme ?? 'ISCC_EU');
    const [custody, setCustody] = useState(initial?.chain_of_custody ?? 'MASS_BALANCE');
    const [feedstock, setFeedstock] = useState(initial?.feedstock ?? 'MANURE');
    const [deliveryMethod, setDeliveryMethod] = useState(initial?.delivery_method ?? 'SHIP_TO_SHIP');
    const [posTiming, setPosTiming] = useState(initial?.pos_timing ?? 'WITH_DELIVERY');
    const [physicalSupplier, setPhysicalSupplier] = useState(initial?.seller_is_physical_supplier ?? true);
    return <>
        <FormSection title={t('lngTerms.ask.sustainability')}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lngTerms.ask.sustainabilityHint')}</p>
            <div className={gridClass}>
                <ChoiceField name="lng_scheme" label={t('lngTerms.field.scheme')} value={scheme} onChange={value => setScheme(value as LngSustainabilityScheme)} disabled={pending} options={LNG_SCHEMES.map(value => ({ value, label: t(`lngTerms.scheme.${value}`) }))} />
                <TextField name="lng_certificate_number" label={t('lngTerms.field.certificateNumber')} defaultValue={initial?.scheme_certificate_number ?? ''} minLength={CERTIFICATE_NUMBER_MIN} maxLength={CERTIFICATE_NUMBER_MAX} required hint={t('lngTerms.ask.certificateNumberHint')} />
                <ChoiceField name="lng_custody" label={t('lngTerms.field.custody')} value={custody} onChange={value => setCustody(value as LngChainOfCustody)} disabled={pending} options={LNG_CUSTODY.map(value => ({ value, label: t(`lngTerms.custody.${value}`) }))} />
                <ChoiceField name="lng_feedstock" label={t('lngTerms.field.feedstock')} value={feedstock} onChange={value => setFeedstock(value as LngFeedstock)} disabled={pending} options={LNG_FEEDSTOCKS.map(value => ({ value, label: t(`lngTerms.feedstock.${value}`) }))} />
                <TextField name="lng_feedstock_detail" label={t('lngTerms.field.feedstockDetail')} defaultValue={initial?.feedstock_detail ?? ''} maxLength={FEEDSTOCK_DETAIL_MAX} />
                <TextField name="lng_production_country" label={t('lngTerms.field.productionCountry')} defaultValue={initial?.production_country ?? ''} minLength={2} maxLength={2} required hint={t('lngTerms.ask.productionCountryHint')} />
                <TextField name="lng_bio_share" label={t('lngTerms.field.bioShare')} type="number" min={BIO_SHARE_MIN} max={BIO_SHARE_MAX} step="any" defaultValue={initial?.bio_share_pct ?? ''} required />
                <TextField name="lng_wtt" label={t('lngTerms.field.wtt')} type="number" min={WTT_MIN} max={WTT_MAX} step="any" defaultValue={initial?.wtt_ghg_gco2e_mj ?? ''} required hint={t('lngTerms.ask.wttHint')} />
                <TextField name="lng_min_methane" label={t('lngTerms.field.methaneNumber')} type="number" min={METHANE_NUMBER_MIN} max={METHANE_NUMBER_MAX} step="any" defaultValue={initial?.min_methane_number ?? ''} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lngTerms.ask.standardNotice', { standard: LNG_SPECIFICATION_STANDARD })}</p>
            <CheckField name="lng_union_database" defaultChecked={initial?.union_database_registered} disabled={pending}>{t('lngTerms.ask.unionDatabase')}</CheckField>
        </FormSection>
        <FormSection title={t('lngTerms.ask.logistics')}>
            <div className={gridClass}>
                <ChoiceField name="lng_delivery_method" label={t('lngTerms.field.deliveryMethod')} value={deliveryMethod} onChange={value => setDeliveryMethod(value as LngDeliveryMethod)} disabled={pending} options={LNG_DELIVERY_METHODS.map(value => ({ value, label: t(`lngTerms.deliveryMethod.${value}`) }))} />
                <ChoiceField name="lng_pos_timing" label={t('lngTerms.field.posTiming')} value={posTiming} onChange={value => setPosTiming(value as LngPosTiming)} disabled={pending} options={LNG_POS_TIMINGS.map(value => ({ value, label: t(`lngTerms.posTiming.${value}`) }))} />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                    type="checkbox"
                    name="lng_physical_supplier"
                    checked={physicalSupplier}
                    onChange={event => setPhysicalSupplier(event.target.checked)}
                    disabled={pending}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                />
                <span>{t('lngTerms.ask.physicalSupplier')}</span>
            </label>
            <TextField
                name="lng_supplier_name"
                label={t(physicalSupplier ? 'lngTerms.field.supplierName' : 'lngTerms.field.physicalSupplierName')}
                defaultValue={initial?.physical_supplier_name ?? ''}
                minLength={SUPPLIER_NAME_MIN}
                maxLength={SUPPLIER_NAME_MAX}
                required
                hint={t(physicalSupplier ? 'lngTerms.ask.supplierNameHint' : 'lngTerms.ask.physicalSupplierNameHint')}
            />
        </FormSection>
    </>;
}

function LngBidFields({ initial, pending }: { initial?: LngBidTerms | null; pending: boolean }) {
    const { t } = useNamespace('trading');
    const [schemes, setSchemes] = useState<LngSustainabilityScheme[]>(initial?.accepted_schemes ?? ['ISCC_EU', 'REDCERT_EU']);
    const [custody, setCustody] = useState<LngChainOfCustody[]>(initial?.accepted_custody ?? [...LNG_CUSTODY]);
    const [deliveryMethods, setDeliveryMethods] = useState<LngDeliveryMethod[]>(initial?.accepted_delivery_methods ?? [...LNG_DELIVERY_METHODS]);
    const [physicalOnly, setPhysicalOnly] = useState(initial ? !initial.accept_resellers : false);
    return <FormSection title={t('lngTerms.bid.requirements')}>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('lngTerms.bid.requirementsHint')}</p>
        <CheckboxGroup name="lng_accepted_schemes" label={t('lngTerms.field.scheme')} values={LNG_SCHEMES} options={value => t(`lngTerms.scheme.${value}`)} selected={schemes} onChange={value => setSchemes(current => toggle(current, value))} disabled={pending} />
        <CheckboxGroup name="lng_accepted_custody" label={t('lngTerms.field.custody')} values={LNG_CUSTODY} options={value => t(`lngTerms.custody.${value}`)} selected={custody} onChange={value => setCustody(current => toggle(current, value))} disabled={pending} />
        <CheckboxGroup name="lng_accepted_delivery_methods" label={t('lngTerms.field.deliveryMethod')} values={LNG_DELIVERY_METHODS} options={value => t(`lngTerms.deliveryMethod.${value}`)} selected={deliveryMethods} onChange={value => setDeliveryMethods(current => toggle(current, value))} disabled={pending} />
        <div className={gridClass}>
            <TextField name="lng_min_bio_share" label={t('lngTerms.field.minBioShare')} type="number" min={BIO_SHARE_MIN} max={BIO_SHARE_MAX} step="any" defaultValue={initial?.min_bio_share_pct ?? ''} />
            <TextField name="lng_max_wtt" label={t('lngTerms.field.maxWtt')} type="number" min={WTT_MIN} max={WTT_MAX} step="any" defaultValue={initial?.max_wtt_ghg_gco2e_mj ?? ''} />
            <TextField name="lng_bid_min_methane" label={t('lngTerms.field.methaneNumber')} type="number" min={METHANE_NUMBER_MIN} max={METHANE_NUMBER_MAX} step="any" defaultValue={initial?.min_methane_number ?? ''} />
        </div>
        <CheckField name="lng_require_union_database" defaultChecked={initial?.require_union_database ?? true} disabled={pending}>{t('lngTerms.bid.requireUnionDatabase')}</CheckField>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
                type="checkbox"
                checked={physicalOnly}
                onChange={event => setPhysicalOnly(event.target.checked)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
            />
            <span>{t('lngTerms.bid.physicalSuppliersOnly')}</span>
        </label>
        {/* Submits the stored flag; the switch above is its inverse. */}
        <input type="hidden" name="lng_accept_resellers" value={physicalOnly ? 'off' : 'on'} />
    </FormSection>;
}

export function LngOrderFields({ side, initial, pending = false }: {
    side: 'BID' | 'ASK';
    initial?: LngOrderTerms | null;
    pending?: boolean;
}) {
    return <fieldset disabled={pending} className="space-y-5">
        {side === 'ASK'
            ? <LngAskFields initial={initial?.side === 'ASK' ? initial : undefined} pending={pending} />
            : <LngBidFields initial={initial?.side === 'BID' ? initial : undefined} pending={pending} />}
    </fieldset>;
}

/** The taker must declare the opposite side; prefill what the order already fixes. */
export function initialLngTakerTerms(order: LngOrderTermsView): LngOrderTerms {
    if (order.side === 'ASK') {
        const { fueleu_recognition } = lngAskRecognition(order);
        return {
            side: 'BID',
            accepted_schemes: [order.sustainability_scheme],
            accepted_custody: [order.chain_of_custody],
            require_union_database: fueleu_recognition === 'UNION_DATABASE',
            min_bio_share_pct: null,
            max_wtt_ghg_gco2e_mj: null,
            accepted_delivery_methods: [order.delivery_method],
            min_methane_number: null,
            accept_resellers: true,
        };
    }
    return {
        side: 'ASK',
        sustainability_scheme: order.accepted_schemes[0] ?? 'ISCC_EU',
        scheme_certificate_number: '',
        chain_of_custody: order.accepted_custody[0] ?? 'MASS_BALANCE',
        union_database_registered: order.require_union_database,
        bio_share_pct: Number.NaN,
        feedstock: 'MANURE',
        feedstock_detail: null,
        production_country: '',
        wtt_ghg_gco2e_mj: Number.NaN,
        specification_standard: LNG_SPECIFICATION_STANDARD,
        min_methane_number: null,
        delivery_method: order.accepted_delivery_methods[0] ?? 'SHIP_TO_SHIP',
        seller_is_physical_supplier: true,
        physical_supplier_name: '',
        pos_timing: 'WITH_DELIVERY',
    };
}
