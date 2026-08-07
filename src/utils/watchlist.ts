import type { WatchlistEvent, WatchlistSlice, WatchlistTarget } from '../types';
import type { TFunction } from 'i18next';
import { formatAvailabilityWindow } from './availabilityWindow';
import type { MarketActivityInput } from './marketActivity';
import { formatMarketProduct } from './marketProduct';

export function getWatchlistSliceKeyFromParts(
    marketProductCode?: string | null,
    deliveryPointId?: string | null,
    availabilityWindowCode?: string | null,
): string {
    return [marketProductCode ?? '', deliveryPointId ?? '', availabilityWindowCode ?? ''].join('::');
}

export function getWatchlistSliceKey(target: {
    market_product_code?: string | null;
    delivery_point_id?: string | null;
    availability_window_code?: string | null;
}): string {
    return getWatchlistSliceKeyFromParts(
        target.market_product_code,
        target.delivery_point_id,
        target.availability_window_code,
    );
}

export function formatWatchlistSliceLabel(slice: {
    market_product_code?: string | null;
    delivery_point_name?: string | null;
    availability_window_code?: string | null;
}, t: TFunction, locale = 'en'): string {
    return [
        formatMarketProduct(slice.market_product_code),
        slice.delivery_point_name || t('watchlist.unknownDeliveryPoint'),
        formatAvailabilityWindow(slice.availability_window_code || 'SPOT', locale),
    ].filter(Boolean).join(' · ');
}

function currency(value: unknown, t: TFunction, locale: string): string {
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(numberValue)) return t('common.notAvailable');
    return `$${numberValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quantity(value: unknown, t: TFunction, locale: string): string {
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(numberValue)) return t('common.notAvailable');
    return `${numberValue.toLocaleString(locale)} MT`;
}

export function describeWatchlistEvent(event: WatchlistEvent, t: TFunction, locale = 'en'): string {
    const payload = event.event_payload || {};
    switch (event.event_type) {
        case 'SLICE_NEW_ORDER': {
            const side = payload.side === 'BID'
                ? t('watchlist.event.side.bid')
                : payload.side === 'ASK'
                    ? t('watchlist.event.side.ask')
                    : t('watchlist.event.side.order');
            return t('watchlist.event.sliceNewOrder', { side, price: currency(payload.price_per_mt_usd, t, locale) });
        }
        case 'SLICE_BEST_PRICE_MOVED':
            return t('watchlist.event.bestPriceMoved', {
                oldPrice: currency(payload.old_price_per_mt_usd, t, locale),
                newPrice: currency(payload.new_price_per_mt_usd, t, locale),
            });
        case 'SLICE_BENCHMARK_MOVED':
            return t('watchlist.event.benchmarkMoved', {
                oldPrice: currency(payload.old_price_per_mt_usd, t, locale),
                newPrice: currency(payload.new_price_per_mt_usd, t, locale),
            });
        case 'SLICE_WENT_QUIET':
            return t('watchlist.event.sliceWentQuiet');
        case 'PIN_PRICE_CHANGED':
            return t('watchlist.event.pinPriceChanged', {
                oldPrice: currency(payload.old_price_per_mt_usd, t, locale),
                newPrice: currency(payload.new_price_per_mt_usd, t, locale),
            });
        case 'PIN_QUANTITY_CHANGED':
            return t('watchlist.event.pinQuantityChanged', {
                oldQuantity: quantity(payload.old_remaining_quantity_mt, t, locale),
                newQuantity: quantity(payload.new_remaining_quantity_mt, t, locale),
            });
        case 'PIN_PARTIALLY_FILLED':
            return t('watchlist.event.pinPartiallyFilled', { quantity: quantity(payload.new_remaining_quantity_mt, t, locale) });
        case 'PIN_FILLED':
            return t('watchlist.event.pinFilled');
        case 'PIN_WITHDRAWN':
            return t('watchlist.event.pinWithdrawn');
        case 'PIN_EXPIRED':
            return t('watchlist.event.pinExpired');
        default:
            return t('watchlist.event.unknown');
    }
}

export function getWatchlistEventActivity(event: WatchlistEvent): MarketActivityInput {
    const payload = event.event_payload || {};
    return {
        source_kind: event.source_kind ?? (typeof payload.source_kind === 'string' ? payload.source_kind as MarketActivityInput['source_kind'] : undefined),
        demo_status: event.demo_status ?? (typeof payload.demo_status === 'string' ? payload.demo_status as MarketActivityInput['demo_status'] : undefined),
    };
}

export function getLatestEventForSlice(
    slice: WatchlistSlice,
    events: WatchlistEvent[],
): WatchlistEvent | undefined {
    const targetIds = new Set([slice.id, ...slice.pins.map((pin) => pin.id)]);
    return events.find((event) => targetIds.has(event.watchlist_target_id));
}

export function getLatestEventForTarget(
    target: WatchlistTarget,
    events: WatchlistEvent[],
): WatchlistEvent | undefined {
    return events.find((event) => event.watchlist_target_id === target.id);
}
