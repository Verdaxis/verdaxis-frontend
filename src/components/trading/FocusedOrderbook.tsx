import React, { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AvailabilityWindow, MarketProduct, OrderBookOrder } from '../../types';
import { useNamespace } from '../../hooks/useNamespace';
import { OrderBook } from '../OrderBook';
import { TradeTape } from '../TradeTape';
import type { VerdaxisSelectOption } from '../ui/VerdaxisSelect';
import { LIVE_BOOK_PRODUCTS, OrderbookFilters } from './OrderbookFilters';

// The offer data is never shipped in a production build or written to the order API.
const SupplyPreview = import.meta.env.DEV || import.meta.env.MODE === 'staging'
    ? lazy(() => import('./StagingSupplyPreview'))
    : null;

interface FocusedOrderbookProps {
    product: MarketProduct | 'All';
    onProductChange: (product: MarketProduct) => void;
    location: string;
    locations: VerdaxisSelectOption[];
    deliveryPointId: string;
    onLocationChange: (value: string) => void;
    period: string;
    periods: VerdaxisSelectOption[];
    onPeriodChange: (value: AvailabilityWindow | '') => void;
    actionableSide: 'BID' | 'ASK';
    onLevelClick: (order: OrderBookOrder) => void;
}

export function FocusedOrderbook(props: FocusedOrderbookProps) {
    const { t } = useNamespace('trading');
    const [searchParams, setSearchParams] = useSearchParams();
    const [showTrades, setShowTrades] = useState(false);
    const changePreview = (open: boolean) => {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'orderbook');
        if (open) next.set('preview', 'supply');
        else next.delete('preview');
        setSearchParams(next);
    };
    if (SupplyPreview && searchParams.get('preview') === 'supply') {
        return <Suspense fallback={<p role="status">{t('orderBook.loading')}</p>}>
            <SupplyPreview onExit={() => changePreview(false)} />
        </Suspense>;
    }

    const missing = [
        props.product === 'All' ? t('orderBook.requirement.product') : null,
        !props.deliveryPointId ? t('marketplace.filter.port') : null,
        !props.period ? t('marketplace.filter.window') : null,
    ].filter(Boolean);
    const scopeKey = `${props.product}:${props.deliveryPointId}:${props.period}`;

    return (
        <section className="space-y-4" aria-label={t('orderBook.title')}>
            <OrderbookFilters products={LIVE_BOOK_PRODUCTS} product={props.product}
                onProductChange={value => {
                    const product = LIVE_BOOK_PRODUCTS.find(option => option.value === value);
                    if (product) props.onProductChange(product.value as MarketProduct);
                }}
                location={props.location} locations={props.locations} onLocationChange={props.onLocationChange}
                period={props.period} periods={props.periods}
                onPeriodChange={value => props.onPeriodChange(value as AvailabilityWindow | '')} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <p>{t('orderBook.focused.exact')}</p>
                {SupplyPreview && <button type="button" onClick={() => changePreview(true)}
                    className="min-h-11 rounded-lg px-3 font-semibold text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-sky-300 dark:hover:bg-slate-800">
                    {t('orderBook.preview.open')}
                </button>}
            </div>
            {missing.length > 0 ? (
                <div role="status" className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    {t('orderBook.focused.missing', { fields: missing.join(' · ') })}
                </div>
            ) : (
                <>
                    <div className="h-[420px] min-h-0" data-tour="marketplace-orderbook-panel">
                        <OrderBook key={scopeKey} marketProduct={props.product} region={props.location}
                            deliveryPointId={props.deliveryPointId} availability={props.period}
                            actionableSide={props.actionableSide} onLevelClick={props.onLevelClick} />
                    </div>
                    <details onToggle={event => setShowTrades(event.currentTarget.open)}
                        className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <summary className="cursor-pointer rounded-lg p-4 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-slate-200">
                            {t('orderBook.focused.recentTrades')}
                        </summary>
                        {showTrades && <div className="h-[320px] px-4 pb-4">
                            <TradeTape key={scopeKey} marketProduct={props.product} availability={props.period}
                                deliveryPointId={props.deliveryPointId} />
                        </div>}
                    </details>
                </>
            )}
        </section>
    );
}
