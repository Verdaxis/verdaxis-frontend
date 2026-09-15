import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNamespace } from '../../hooks/useNamespace';
import { formatAvailabilityWindow } from '../../utils/availabilityWindow';
import i18n from '../../i18n';
import { ConfirmModal } from '../ui/ConfirmModal';
import { LIVE_BOOK_PRODUCTS, OrderbookFilters, type BookProductOption } from './OrderbookFilters';

interface SupplyPreviewOffer {
    id: string;
    product: string;
    quantityMt: number;
    period: string;
    locations: readonly string[];
    referenceKey: 'biodiesel' | 'ethanol' | 'methanol';
    advanced?: boolean;
}

// Email of 10 September 2026. These are offer indications, not confirmed contracts.
// Deliberately no price field, organization identity, certification claim or order ID.
export const SUPPLY_PREVIEW_OFFERS: readonly SupplyPreviewOffer[] = [
    { id: 'preview-gasoil', product: 'RCF_GASOIL', quantityMt: 5000, period: '2027-Q1', locations: ['ARA', 'Baltic'], referenceKey: 'biodiesel' },
    { id: 'preview-fuel-oil', product: 'RCF_FUEL_OIL', quantityMt: 10000, period: '2027-Q1', locations: ['ARA', 'Baltic'], referenceKey: 'biodiesel' },
    { id: 'preview-rcf-ethanol', product: 'RCF_ETHANOL', quantityMt: 2000, period: '2027-Q1', locations: ['ARA', 'Baltic'], referenceKey: 'ethanol' },
    { id: 'preview-advanced-ethanol', product: 'BIO_ETHANOL', quantityMt: 2000, period: '2027-Q1', locations: ['ARA', 'Baltic'], referenceKey: 'ethanol', advanced: true },
    { id: 'preview-methanol', product: 'RCF_METHANOL', quantityMt: 100000, period: '2030-Q1', locations: ['ARA'], referenceKey: 'methanol' },
];

const PREVIEW_PRODUCTS: BookProductOption[] = [
    ...LIVE_BOOK_PRODUCTS,
    { value: 'RCF_METHANOL', label: 'RCF Methanol', family: 'Methanol', pathway: 'rcf' },
    { value: 'RCF_ETHANOL', label: 'RCF Ethanol', family: 'Ethanol', pathway: 'rcf' },
    { value: 'RCF_GASOIL', label: 'RCF Gasoil', family: 'Gasoil', pathway: 'rcf' },
    { value: 'RCF_FUEL_OIL', label: 'RCF Fuel Oil', family: 'Fuel Oil', pathway: 'rcf' },
];

export function filterSupplyPreviewOffers(product: string, location: string, period: string) {
    return SUPPLY_PREVIEW_OFFERS.filter(offer => (!product || offer.product === product)
        && (!location || offer.locations.includes(location)) && (!period || offer.period === period));
}

export default function StagingSupplyPreview({ onExit }: { onExit: () => void }) {
    const { t } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const [product, setProduct] = useState('RCF_METHANOL');
    const [location, setLocation] = useState('');
    const [period, setPeriod] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<SupplyPreviewOffer | null>(null);
    const [showAll, setShowAll] = useState(false);
    const visibleOffers = filterSupplyPreviewOffers(showAll ? '' : product, location, period);
    const counts = useMemo(() => Object.fromEntries(PREVIEW_PRODUCTS.map(option => [
        option.value, filterSupplyPreviewOffers(option.value, location, period).length,
    ])), [location, period]);
    const productName = (value: string) => {
        const option = PREVIEW_PRODUCTS.find(product => product.value === value);
        return option ? `${t(`orderBook.focused.pathway.${option.pathway}`)} ${t(`orderBook.focused.family.${option.family}`)}` : value;
    };
    const offerName = (offer: SupplyPreviewOffer) => offer.advanced
        ? t('orderBook.preview.advancedEthanol') : productName(offer.product);
    const locationName = (value: string) => value === 'Baltic' ? t('orderBook.preview.baltic') : value;

    return (
        <section className="space-y-4" aria-label={t('orderBook.preview.title')}>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold">{t('orderBook.preview.title')}</h2>
                    <p className="mt-1 max-w-3xl text-sm">{t('orderBook.preview.notice')}</p>
                </div>
                <button type="button" onClick={onExit} className="min-h-11 rounded-lg border border-amber-300 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-amber-700">
                    {t('orderBook.preview.exit')}
                </button>
            </div>
            <OrderbookFilters products={PREVIEW_PRODUCTS} product={showAll ? '' : product}
                onProductChange={value => { setProduct(value); setShowAll(false); }} counts={counts}
                location={location} onLocationChange={setLocation}
                locations={[
                    { value: '', label: t('orderBook.preview.allLocations') },
                    { value: 'ARA', label: 'ARA' },
                    { value: 'Baltic', label: t('orderBook.preview.baltic') },
                ]}
                period={period} onPeriodChange={setPeriod}
                periods={[
                    { value: '', label: t('orderBook.preview.allPeriods') },
                    ...['2027-Q1', '2030-Q1'].map(value => ({ value, label: formatAvailabilityWindow(value, locale) })),
                ]} />
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{showAll ? t('orderBook.preview.allOffers') : productName(product)}</h3>
                <button type="button" onClick={() => { setShowAll(true); setLocation(''); setPeriod(''); }}
                    className="min-h-11 rounded-lg px-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-sky-300 dark:hover:bg-slate-800">
                    {t('orderBook.preview.showAll')}
                </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('orderBook.preview.noFixed')}</p>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
                {visibleOffers.map(offer => (
                    <article key={offer.id} data-preview-offer={offer.id} className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">{offerName(offer)}</h4>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    <span className="font-mono font-semibold tabular-nums">{offer.quantityMt.toLocaleString(locale)} MT</span>
                                    {' · '}{formatAvailabilityWindow(offer.period, locale)}{' · '}{offer.locations.map(locationName).join(' / ')}
                                </p>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t('orderBook.preview.unverified')}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{t('orderBook.preview.indexLinked')}</p>
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(`orderBook.preview.reference.${offer.referenceKey}`)}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedOffer(offer)}
                                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                                {t('orderBook.preview.enquire')}
                            </button>
                        </div>
                    </article>
                ))}
                {visibleOffers.length === 0 && <p role="status" className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('orderBook.preview.empty')}</p>}
            </div>
            {selectedOffer && createPortal(
                <ConfirmModal isOpen onClose={() => setSelectedOffer(null)} onConfirm={() => setSelectedOffer(null)}
                    title={`${t('orderBook.preview.enquiryTitle')} · ${offerName(selectedOffer)}`}
                    message={t('orderBook.preview.enquiryNotice')} confirmText={t('orderBook.preview.close')} cancelText="" maxWidth="lg" compact>
                    <dl className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                        <div><dt className="font-semibold">{t('orderBook.preview.referenceLabel')}</dt><dd className="mt-1">{t(`orderBook.preview.reference.${selectedOffer.referenceKey}`)}</dd></div>
                        <div><dt className="font-semibold">{t('orderBook.preview.requiredLabel')}</dt><dd className="mt-1">{t('orderBook.preview.requiredTerms')}</dd></div>
                        <div><dt className="font-semibold">{t('orderBook.preview.ghgLabel')}</dt><dd className="mt-1">{t('orderBook.preview.ghgNotice')}</dd></div>
                    </dl>
                </ConfirmModal>, document.body,
            )}
        </section>
    );
}
