import React from 'react';
import { RefreshCw, Plus, Star } from 'lucide-react';
import { MarketProduct } from '../../../types';


import type { TFunction } from 'i18next';
import type { MarketplaceRolePresentation } from './Marketplace';

interface MarketplaceHeaderProps {
    isHistorySelected: boolean;
    t: TFunction;
    configBase: MarketplaceRolePresentation;
    setOrderModalSide: (side: 'ASK' | 'BID') => void;
    marketProduct: 'All' | MarketProduct;
    setMarketTab: (tab: 'history_offers') => void;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    loadCatalogProducts: (force?: boolean) => Promise<void>;
    fetchProductCounts: (force?: boolean) => Promise<void>;
    fetchListings: (silent?: boolean, skip?: number, force?: boolean) => Promise<void>;
    currentSkip: number;
    refreshing: boolean;
    isMarketSupportActive: boolean;
    currentSliceTarget: { marketProductCode: MarketProduct; deliveryPointId: string; availabilityWindowCode: string } | null;
    toggleSlice: (slice: { marketProductCode: MarketProduct; deliveryPointId: string; availabilityWindowCode: string }) => Promise<unknown>;
    isCurrentSliceTracked: boolean;
    children: React.ReactNode;
}

export function MarketplaceHeader({ isHistorySelected, t, configBase, setOrderModalSide, marketProduct, setMarketTab, marketTab, loadCatalogProducts, fetchProductCounts, fetchListings, currentSkip, refreshing, isMarketSupportActive, currentSliceTarget, toggleSlice, isCurrentSliceTracked, children }: MarketplaceHeaderProps) {
    return <>
            {/* Header */}
            <div className={`flex-none px-4 lg:px-10 pt-3 lg:pt-4 pb-0 relative z-[80] ${isHistorySelected ? '' : 'max-h-[50%] overflow-y-auto overscroll-contain'}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div>
                            <h1 className="text-2xl lg:text-3xl v-heading">{t('marketplace.title')}</h1>
                            <p className="text-slate-500 mt-1 text-sm">{t(isHistorySelected ? 'marketplace.b100.historyDescription' : configBase.subtitleKey)}</p>
                        </div>
                        {!isHistorySelected && <div className="flex items-center gap-3">
                            <button
                                type="button"
                                data-tour="marketplace-primary-action"
                                onClick={() => setOrderModalSide(configBase.primaryAction.side)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-lg transition-colors shadow-sm hover:shadow"
                            >
                                <Plus size={16} />
                                <span>{t(configBase.primaryAction.labelKey)}</span>
                            </button>
                            {marketProduct === 'UCOME_B100' && <button type="button" onClick={() => setMarketTab('history_offers')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300">{t('marketplace.b100.history')}</button>}
                            {marketTab !== 'orderbook' && <button
                                type="button"
                                onClick={() => {
                                    void loadCatalogProducts(true);
                                    void fetchProductCounts(true);
                                    if (marketTab === 'market') void fetchListings(true, currentSkip, true);
                                }}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{t('marketplace.btn.refresh')}</span>
                            </button>}
                            {!isMarketSupportActive && <button
                                type="button"
                                onClick={async () => {
                                    if (!currentSliceTarget) return;
                                    await toggleSlice(currentSliceTarget);
                                }}
                                disabled={!currentSliceTarget}
                                aria-pressed={isCurrentSliceTracked}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${currentSliceTarget ? (isCurrentSliceTracked ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-200') : 'cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-600'}`}
                            >
                                <Star size={15} fill={isCurrentSliceTracked ? 'currentColor' : 'none'} />
                                <span>{isCurrentSliceTracked ? t('marketplace.btn.watchingMarket') : t('marketplace.btn.watchMarket')}</span>
                            </button>}
                        </div>}
                    </div>
                    {children}

                </div>
            </div>


    </>;
}
