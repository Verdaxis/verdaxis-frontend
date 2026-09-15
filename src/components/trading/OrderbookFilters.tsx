import React from 'react';
import i18n from '../../i18n';
import { useNamespace } from '../../hooks/useNamespace';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../../utils/marketProducts';
import { VerdaxisSelect, type VerdaxisSelectOption } from '../ui/VerdaxisSelect';

export interface BookProductOption {
    value: string;
    label: string;
    family: string;
    pathway: 'bio' | 'e' | 'rcf';
}

export const LIVE_BOOK_PRODUCTS: BookProductOption[] = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(product => ({
    value: product.value,
    label: product.label,
    family: product.fuelType!,
    pathway: product.value.startsWith('BIO_') ? 'bio' : 'e',
}));

interface OrderbookFiltersProps {
    products: readonly BookProductOption[];
    product: string;
    onProductChange: (value: string) => void;
    location: string;
    locations: VerdaxisSelectOption[];
    onLocationChange: (value: string) => void;
    period: string;
    periods: VerdaxisSelectOption[];
    onPeriodChange: (value: string) => void;
    counts?: Readonly<Record<string, number>>;
}

export function OrderbookFilters(props: OrderbookFiltersProps) {
    const { t } = useNamespace('trading');
    const selected = props.products.find(product => product.value === props.product);
    const families = [...new Set(props.products.map(product => product.family))];
    const pathways = props.products.filter(product => product.family === selected?.family);
    const buttonClass = (active: boolean) => `min-h-11 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${active
        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`;

    return (
        <div className="space-y-4" data-testid="focused-book-filters">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <fieldset className="col-span-2 min-w-0 xl:col-span-1">
                    <legend className="v-label">{t('orderBook.focused.family')}</legend>
                    <div className="flex flex-wrap gap-1">
                        {families.map(family => (
                            <button key={family} type="button" aria-pressed={family === selected?.family}
                                className={buttonClass(family === selected?.family)}
                                onClick={() => {
                                    const next = props.products.find(product => product.family === family && product.pathway === selected?.pathway)
                                        ?? props.products.find(product => product.family === family);
                                    if (next) props.onProductChange(next.value);
                                }}>
                                {t(`orderBook.focused.family.${family}`)}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <div className="min-w-0">
                    <div className="v-label">{t('marketplace.filter.port')}</div>
                    <VerdaxisSelect ariaLabel={t('marketplace.filter.port')} value={props.location}
                        options={props.locations} onChange={props.onLocationChange} triggerClassName="min-h-11" />
                </div>
                <div className="min-w-0">
                    <div className="v-label">{t('marketplace.filter.window')}</div>
                    <VerdaxisSelect ariaLabel={t('marketplace.filter.window')} value={props.period}
                        options={props.periods} onChange={props.onPeriodChange} triggerClassName="min-h-11" />
                </div>
            </div>
            {pathways.length > 0 && (
                <fieldset className="flex flex-wrap items-center gap-2">
                    <legend className="sr-only">{t('orderBook.focused.pathway')}</legend>
                    {pathways.map(product => (
                        <button key={product.value} type="button"
                            aria-label={i18n.language.startsWith('zh')
                                ? `${t(`orderBook.focused.pathway.${product.pathway}`)} ${t(`orderBook.focused.family.${product.family}`)}`
                                : product.label}
                            aria-pressed={product.value === props.product}
                            className={buttonClass(product.value === props.product)}
                            onClick={() => props.onProductChange(product.value)}>
                            {t(`orderBook.focused.pathway.${product.pathway}`)}
                            {props.counts && <span className="ml-2 font-normal tabular-nums">({props.counts[product.value] ?? 0})</span>}
                        </button>
                    ))}
                </fieldset>
            )}
        </div>
    );
}
