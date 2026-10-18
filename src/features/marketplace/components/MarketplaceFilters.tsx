import React from 'react';
import { ChevronDown } from 'lucide-react';
import { MarketProduct, ORDERBOOK_MARKET_PRODUCTS } from '../../../types';
import { SPOT_WINDOW } from '../../../utils/availabilityWindow';
import { formatMarketProduct } from '../../../utils/marketProduct';
import { VerdaxisSelect } from '../../../components/ui/VerdaxisSelect';


import type { TFunction } from 'i18next';
import type { ComponentProps } from 'react';
const ALL_MARKET_PRODUCTS = 'All';
const MARKET_PRODUCT_FILTERS: Array<'All' | MarketProduct> = ['All', ...ORDERBOOK_MARKET_PRODUCTS];

interface MarketplaceFiltersProps {
    t: TFunction;
    isHistorySelected: boolean;
    marketProduct: 'All' | MarketProduct;
    marketProductCounts: Record<string, number>;
    handleProductChipClick: (product: 'All' | MarketProduct) => void;
    filtersExpanded: boolean;
    setFiltersExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    portInput: string;
    handlePortChange: (value: string) => void;
    portOptions: ComponentProps<typeof VerdaxisSelect>['options'];
    availability: string;
    setAvailability: (value: string) => void;
    availabilityOptions: { value: string; label: string }[];
    sortBy: string;
    handleSortChange: (value: string) => void;
    currentSliceCount: number;
    sliceSummary: string;
}

export function MarketplaceFilters({ t, isHistorySelected, marketProduct, marketProductCounts, handleProductChipClick, filtersExpanded, setFiltersExpanded, portInput, handlePortChange, portOptions, availability, setAvailability, availabilityOptions, sortBy, handleSortChange, currentSliceCount, sliceSummary }: MarketplaceFiltersProps) {
    return <>
                    {/* Unified filter rail */}
                    <div className="v-glass p-3 mb-3 relative z-[90]">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('marketplace.ucomeRfq.products')}</span>
                                        <span className="text-xs text-slate-400">{t('marketplace.b100.productsHint')}</span>
                                    </div>
                                    <div className="flex flex-1 flex-wrap gap-2" data-tour="marketplace-product-filters">
                                        {MARKET_PRODUCT_FILTERS.map((productCode) => {
                                            const isActive = isHistorySelected ? productCode === 'UCOME_B100' : marketProduct === productCode;
                                            const count = productCode === ALL_MARKET_PRODUCTS ? 0 : (marketProductCounts[productCode] || 0);
                                            const label = productCode === ALL_MARKET_PRODUCTS ? t('marketplace.filter.allProducts') : formatMarketProduct(productCode);
                                            return (
                                                <button
                                                    type="button"
                                                    key={productCode}
                                                    data-tour={productCode === ORDERBOOK_MARKET_PRODUCTS[0] ? 'marketplace-product-sample' : undefined}
                                                    data-market-product={productCode}
                                                    aria-pressed={isActive}
                                                    onClick={() => handleProductChipClick(productCode)}
                                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
                                                        isActive
                                                            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                                                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {label}{!isHistorySelected && count > 0 ? ` (${count})` : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {!isHistorySelected && <button
                                    type="button"
                                    data-tour="marketplace-filter-toggle"
                                    aria-expanded={filtersExpanded}
                                    aria-controls="marketplace-advanced-filters"
                                    onClick={() => setFiltersExpanded((expanded) => !expanded)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                                >
                                    <span>{filtersExpanded ? t('marketplace.filter.hide') : t('marketplace.filter.more')}</span>
                                    <ChevronDown size={14} className={`transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                                </button>}
                            </div>

                            {!isHistorySelected && filtersExpanded && (
                                <>
                                    <div id="marketplace-advanced-filters" data-tour="marketplace-advanced-filters" className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.9fr)_minmax(200px,0.9fr)_minmax(170px,0.8fr)]">
                                        <div>
                                            <label className="v-label">{t('marketplace.filter.port')}</label>
                                            <VerdaxisSelect
                                                ariaLabel={t('marketplace.filter.port')}
                                                value={portInput}
                                                onChange={handlePortChange}
                                                options={portOptions}
                                                triggerTourId="marketplace-port-select"
                                                triggerClassName="v-input min-h-[42px] py-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="v-label">{t('marketplace.filter.window')}</label>
                                            <VerdaxisSelect
                                                ariaLabel={t('marketplace.filter.window')}
                                                value={availability}
                                                onChange={(value) => setAvailability(value)}
                                                options={[
                                                    { value: '', label: t('marketplace.filter.anyWindow') },
                                                    ...availabilityOptions.map(option => ({
                                                        value: option.value,
                                                        label: option.label,
                                                        tourId: option.value === SPOT_WINDOW ? 'marketplace-window-option-spot' : undefined,
                                                    })),
                                                ]}
                                                triggerTourId="marketplace-window-select"
                                                triggerClassName="v-input min-h-[42px] py-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="v-label">{t('marketplace.filter.sortBy')}</label>
                                            <VerdaxisSelect
                                                ariaLabel={t('marketplace.filter.sortBy')}
                                                value={sortBy}
                                                onChange={handleSortChange}
                                                options={[
                                                    { value: 'price_asc', label: t('marketplace.sort.priceAsc') },
                                                    { value: 'price_desc', label: t('marketplace.sort.priceDesc') },
                                                    { value: 'quantity_desc', label: t('marketplace.sort.largestQty') },
                                                    { value: 'newest', label: t('marketplace.sort.newest') },
                                                ]}
                                                triggerClassName="v-input min-h-[42px] py-2.5"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('marketplace.metrics.currentSlice')}</div>
                                            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {currentSliceCount.toLocaleString()} {t(currentSliceCount === 1 ? 'marketplace.metrics.currentSliceCountOne' : 'marketplace.metrics.currentSliceCountOther')}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-400">{sliceSummary}</div>
                                            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                {t('marketplace.metrics.currentSliceHint')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                {sliceSummary}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                                            <span className="font-bold uppercase tracking-[0.14em]">{t('marketplace.legend.title')}</span>
                                            <span className="ml-2">{t('marketplace.legend.body')}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>


    </>;
}
