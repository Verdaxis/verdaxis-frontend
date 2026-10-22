import { FameRfqWorkspace } from '../../../components/rfq/FameRfqWorkspace';
import { SupplierOffersWorkspace } from '../../../components/supplier/SupplierOffersWorkspace';


import type { TFunction } from 'i18next';

interface MarketplaceHistoryProps {
    isHistorySelected: boolean;
    isMarketSupportActive: boolean;
    fameTab: 'history_offers' | 'history_my_offers' | 'history_rfqs';
    user: { id: string; organization_id?: string | null; role?: string | null } | null;
    t: TFunction;
}

export function MarketplaceHistory({ isHistorySelected, isMarketSupportActive, fameTab, user, t }: MarketplaceHistoryProps) {
    return <>
            {isHistorySelected && <div className="px-4 pb-8 lg:px-10"><div className="mx-auto max-w-7xl">
                {isMarketSupportActive ? <div role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{t('marketplace.ucomeRfq.supportUnavailable')}</div>
                    : fameTab === 'history_rfqs' ? <FameRfqWorkspace key={`${user?.id}:${user?.organization_id}`} embedded historyOnly />
                        : <SupplierOffersWorkspace
                            key={`${fameTab}:${user?.id}:${user?.organization_id}`}
                            mine={fameTab === 'history_my_offers' && user?.role === 'SUPPLIER'}
                            historyOnly
                            onRequestQuote={() => undefined}
                            onEdit={() => undefined}
                            onPostSupply={() => undefined}
                        />}

            </div></div>}


    </>;
}
