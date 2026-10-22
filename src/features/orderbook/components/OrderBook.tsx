import React, { useState, useEffect, useCallback, useId, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { OrderBookOrder, ProductExecutionMode } from '../../../types';
import { useNamespace } from '../../../hooks/useNamespace';
import { useOrderBookSnapshot } from '../hooks/useOrderBookSnapshot';
import { isOrderbookMarketProduct } from '../../../utils/marketProduct';
import { isDemoMarketActivity } from '../../../utils/marketActivity';
import i18n from '../../../i18n';

import { OrderBookLadder } from './OrderBookLadder';

interface OrderBookProps {
    fuelType?: string;
    marketProduct?: string;
    executionMode?: ProductExecutionMode;
    region?: string;
    deliveryPointId?: string;
    availability?: string;
    actionableSide?: 'BID' | 'ASK';
    onLevelClick?: (order: OrderBookOrder) => void;
    onInstantTrade?: (orderId: string, side: 'BID' | 'ASK', price: number, quantity: number) => void;
}

const MAX_ROWS = 15;

function isOrderbookFuelType(fuelType: string | undefined): boolean {
    return fuelType != null && ['methanol', 'ethanol', 'fame'].includes(fuelType.trim().toLowerCase());
}

function isOrderbookOrder(order: OrderBookOrder): boolean {
    // B100 rows need a canonical code. Only legacy alcohol rows use fuel labels.
    return order.market_product
        ? isOrderbookMarketProduct(order.market_product)
        : ['methanol', 'ethanol'].includes(order.fuel_type?.trim().toLowerCase());
}

export const OrderBook: React.FC<OrderBookProps> = ({ fuelType, marketProduct, executionMode, region, deliveryPointId, availability, actionableSide, onLevelClick, onInstantTrade }) => {
    const { t, ready } = useNamespace('trading');
    const [hoverTooltip, setHoverTooltip] = useState<{ order: OrderBookOrder; x: number; y: number } | null>(null);
    const tooltipId = useId();
    const b100Selected = marketProduct === 'UCOME_B100' || fuelType?.trim().toLowerCase() === 'fame';
    const orderbookAvailable = executionMode !== 'RFQ_ONLY'
        && (!b100Selected || executionMode === 'ORDERBOOK')
        && (!marketProduct || isOrderbookMarketProduct(marketProduct))
        && (!fuelType || isOrderbookFuelType(fuelType));
    const requestScope = JSON.stringify([fuelType, marketProduct, executionMode, region, deliveryPointId, availability]);
    const completeSlice = Boolean(marketProduct && deliveryPointId && availability);
    const { snapshot, loading, refreshing, error: refreshError, refresh: fetchData } = useOrderBookSnapshot({
        product: marketProduct ?? '', deliveryPointId: deliveryPointId ?? '', window: availability ?? '',
    }, orderbookAvailable && completeSlice, requestScope);
    const error = refreshError || (orderbookAvailable && !completeSlice) ? t('orderBook.error') : null;
    const generatedAt = snapshot?.generated_at ?? null;
    const bids = useMemo(() => [...(snapshot?.bids ?? [])].filter(isOrderbookOrder)
        .sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd).slice(0, MAX_ROWS), [snapshot?.bids]);
    const asks = useMemo(() => [...(snapshot?.asks ?? [])].filter(isOrderbookOrder)
        .sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd).slice(0, MAX_ROWS), [snapshot?.asks]);
    useEffect(() => { setHoverTooltip(null); }, [requestScope]);

    const showTooltipFromElement = useCallback((order: OrderBookOrder, element: HTMLDivElement) => {
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeight = isDemoMarketActivity(order) ? 196 : 152;
        const padding = 16;
        const preferredX = rect.right + 14;
        const fallbackX = rect.left - tooltipWidth - 14;
        const x = preferredX + tooltipWidth <= window.innerWidth - padding
            ? preferredX
            : Math.max(padding, fallbackX);
        const y = Math.max(padding, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding));
        setHoverTooltip({ order, x, y });
    }, []);

    if (!ready) return null;
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

    if (!orderbookAvailable) {
        return (
            <div role="status" className="v-glass h-full p-6 flex items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                {t('orderBook.rfqOnly')}
            </div>
        );
    }

    if (loading) {
        return (
            <div role="status" className="v-glass h-full p-6 mb-0 flex items-center justify-center gap-3 text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">{t('orderBook.loading')}</span>
            </div>
        );
    }

    if (error && generatedAt === null) {
        return (
            <div role="alert" className="v-glass p-4 mb-0 text-center text-sm text-red-600 dark:text-red-400">
                <p>{t('orderBook.unavailable')}</p>
                <button type="button" onClick={() => void fetchData(true)}
                    className="mt-3 min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t('orderBook.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="v-glass mb-0 overflow-hidden h-full flex flex-col" data-tour="orderbook-panel">
            <OrderBookLadder
                bids={bids} asks={asks} marketProduct={marketProduct} region={region} availability={availability}
                b100Selected={b100Selected} generatedAt={generatedAt} refreshing={refreshing} error={error}
                actionableSide={actionableSide} onLevelClick={onLevelClick} onInstantTrade={onInstantTrade}
                hoverTooltip={hoverTooltip} tooltipId={tooltipId} setHoverTooltip={setHoverTooltip}
                showTooltipFromElement={showTooltipFromElement} fetchData={fetchData} locale={locale} t={t}
            />
        </div>
    );
};
