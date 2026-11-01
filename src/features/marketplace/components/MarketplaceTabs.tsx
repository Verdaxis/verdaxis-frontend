import { ClipboardList } from 'lucide-react';
import { ViewMode } from '../../../types';


import type { TFunction } from 'i18next';

interface MarketplaceTabsProps {
    t: TFunction;
    setMarketTab: (tab: 'market' | 'orderbook' | 'my_orders') => void;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    role: ViewMode;
}

export function MarketplaceTabs({ t, setMarketTab, marketTab, role }: MarketplaceTabsProps) {
    return <>
                    {/* Tab Switcher: Market | Orderbook | My Listings */}
                    <><div className="relative mb-3 grid w-full max-w-[420px] grid-cols-3 rounded-lg border border-white/20 bg-white/30 p-0.5 backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/30">
                        <div
                            className="absolute top-0.5 bottom-0.5 rounded-md bg-white/90 dark:bg-slate-700/90 shadow-md backdrop-blur-sm border border-white/30 dark:border-slate-600/30 transition-all duration-300 ease-in-out"
                            style={{
                                left: marketTab === 'market'
                                    ? '2px'
                                    : marketTab === 'orderbook'
                                        ? 'calc(33.333% + 1px)'
                                        : 'calc(66.666% + 1px)',
                                width: 'calc(33.333% - 2px)',
                            }}
                        />
                        <button
                            data-tour="marketplace-tab-market"
                            aria-pressed={marketTab === 'market'}
                            onClick={() => setMarketTab('market')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'market'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {t('marketplace.tab.market')}
                        </button>
                        <button
                            data-tour="marketplace-tab-orderbook"
                            aria-pressed={marketTab === 'orderbook'}
                            onClick={() => setMarketTab('orderbook')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'orderbook'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {t('marketplace.tab.listings')}
                        </button>
                        <button
                            data-tour="marketplace-tab-my-orders"
                            aria-pressed={marketTab === 'my_orders'}
                            onClick={() => setMarketTab('my_orders')}
                            className={`relative z-10 min-w-0 px-4 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 ${
                                marketTab === 'my_orders'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center gap-1 justify-center">
                                <ClipboardList size={12} />
                                {t('marketplace.tab.myOrders')}
                            </span>
                        </button>
                    </div>

                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                        {marketTab === 'market'
                            ? t(role === 'BUYER' ? 'marketplace.viewHint.listings.buyer' : 'marketplace.viewHint.listings.supplier')
                            : marketTab === 'orderbook'
                                ? t('marketplace.viewHint.orderbook')
                                : t('marketplace.viewHint.myOrders')}
                    </p></>

    </>;
}
