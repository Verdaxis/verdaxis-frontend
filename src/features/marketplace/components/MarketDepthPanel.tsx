import { Loader2, CheckCircle2, Ship, XCircle } from 'lucide-react';
import { OrderBookOrder, MarketProduct, ViewMode, Product } from '../../../types';
import { OrderBook } from '../../../components/OrderBook';
import { TradeTape } from '../../../components/TradeTape';


import type { TFunction } from 'i18next';

interface MarketDepthPanelProps {
    isHistorySelected: boolean;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    t: TFunction;
    orderbookRequiresExactSlice: boolean;
    marketScopeReadyCopyKey: string;
    orderbookSliceRequirements: { key: string; label: string; value: string; complete: boolean }[];
    isCatalogScopeResolving: boolean;
    marketProduct: 'All' | MarketProduct;
    resolvedDeliveryPointId: string;
    availability: string;
    resolvedPort: string;
    role: ViewMode;
    b100Product: Product | undefined;
    bioLngProduct: Product | undefined;
    handleOrderbookLevelClick: (order: OrderBookOrder) => void;
}

export function MarketDepthPanel({ isHistorySelected, marketTab, t, orderbookRequiresExactSlice, marketScopeReadyCopyKey, orderbookSliceRequirements, isCatalogScopeResolving, marketProduct, resolvedDeliveryPointId, availability, resolvedPort, role, b100Product, bioLngProduct, handleOrderbookLevelClick }: MarketDepthPanelProps) {
    return <>
            {!isHistorySelected && marketTab === 'orderbook' && (
                <div className="flex-1 min-h-0 px-4 lg:px-10 pb-4">
                    <div className="h-full min-h-0 max-w-[1600px] mx-auto flex flex-col">
                        <div
                            data-tour="marketplace-market-scope"
                            className="mb-3 flex-none rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80"
                            aria-label={t('marketScope.title')}
                        >
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        {t('marketScope.title')}
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {orderbookRequiresExactSlice ? t('marketScope.body') : t(marketScopeReadyCopyKey)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[720px]">
                                    {orderbookSliceRequirements.map((requirement) => {
                                        const Icon = requirement.complete ? CheckCircle2 : XCircle;
                                        return (
                                            <div
                                                key={requirement.key}
                                                aria-label={`${requirement.label}: ${requirement.complete ? t('orderBook.requirement.selected') : t('orderBook.requirement.missing')} (${requirement.value})`}
                                                className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 ${
                                                    requirement.complete
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                                                }`}
                                            >
                                                <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
                                                        {requirement.label}
                                                    </div>
                                                    <div className="mt-0.5 truncate text-sm font-bold">
                                                        {requirement.value}
                                                    </div>
                                                </div>
                                                <span className="sr-only">
                                                    {requirement.complete ? t('orderBook.requirement.selected') : t('orderBook.requirement.missing')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-hidden" data-tour="marketplace-orderbook-panel">
                            {isCatalogScopeResolving ? (
                                <div className="v-card p-8 flex h-full min-h-0 items-center justify-center text-slate-400">
                                    <Loader2 size={24} className="animate-spin" />
                                </div>
                            ) : orderbookRequiresExactSlice ? (
                                <div className="v-card p-8 flex h-full min-h-0 flex-col items-center justify-center text-center">
                                    <Ship size={44} className="text-slate-300 dark:text-slate-600 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t('orderBook.selectProduct.title')}</h3>
                                    <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t('orderBook.selectProduct.body')}</p>
                                </div>
                            ) : (
                                <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">
                                    <OrderBook
                                        key={`${marketProduct}:${resolvedDeliveryPointId}:${availability}`}
                                        marketProduct={marketProduct}
                                        executionMode={marketProduct === 'UCOME_B100' ? b100Product?.execution_mode
                                            : marketProduct === 'BIO_LNG' ? bioLngProduct?.execution_mode
                                                : undefined}
                                        region={resolvedPort || undefined}
                                        deliveryPointId={resolvedDeliveryPointId || undefined}
                                        availability={availability || undefined}
                                        actionableSide={role === 'BUYER' ? 'ASK' : 'BID'}
                                        onLevelClick={handleOrderbookLevelClick}
                                    />
                                    <TradeTape
                                        marketProduct={marketProduct}
                                        availability={availability || undefined}
                                        deliveryPointId={resolvedDeliveryPointId || undefined}
                                        region={resolvedDeliveryPointId ? undefined : resolvedPort || undefined}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


    </>;
}
