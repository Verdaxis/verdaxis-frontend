import type { WatchlistEvent, WatchlistSlice, WatchlistTarget } from '../types';
import { formatAvailabilityWindow } from './availabilityWindow';
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
}): string {
    return [
        formatMarketProduct(slice.market_product_code),
        slice.delivery_point_name || 'Unknown delivery point',
        formatAvailabilityWindow(slice.availability_window_code || 'SPOT'),
    ].filter(Boolean).join(' · ');
}

function currency(value: unknown): string {
    if (typeof value !== 'number') return 'n/a';
    return `$${value.toFixed(2)}`;
}

function quantity(value: unknown): string {
    if (typeof value !== 'number') return 'n/a';
    return `${value.toLocaleString()} MT`;
}

export function describeWatchlistEvent(event: WatchlistEvent): string {
    const payload = event.event_payload || {};
    switch (event.event_type) {
        case 'SLICE_NEW_ORDER':
            return `New ${String(payload.side || 'order').toLowerCase()} entered the slice at ${currency(payload.price_per_mt_usd)}.`;
        case 'SLICE_BEST_PRICE_MOVED':
            return `Best live price moved from ${currency(payload.old_price_per_mt_usd)} to ${currency(payload.new_price_per_mt_usd)}.`;
        case 'SLICE_BENCHMARK_MOVED':
            return `Benchmark moved from ${currency(payload.old_price_per_mt_usd)} to ${currency(payload.new_price_per_mt_usd)}.`;
        case 'SLICE_WENT_QUIET':
            return 'No live orders remain in this slice.';
        case 'PIN_PRICE_CHANGED':
            return `Pinned order repriced from ${currency(payload.old_price_per_mt_usd)} to ${currency(payload.new_price_per_mt_usd)}.`;
        case 'PIN_QUANTITY_CHANGED':
            return `Pinned quantity changed from ${quantity(payload.old_remaining_quantity_mt)} to ${quantity(payload.new_remaining_quantity_mt)}.`;
        case 'PIN_PARTIALLY_FILLED':
            return `Pinned order partially filled. Remaining quantity is ${quantity(payload.new_remaining_quantity_mt)}.`;
        case 'PIN_FILLED':
            return 'Pinned order is fully filled.';
        case 'PIN_WITHDRAWN':
            return 'Pinned order was withdrawn.';
        case 'PIN_EXPIRED':
            return 'Pinned order expired.';
        default:
            return event.event_type.replaceAll('_', ' ');
    }
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
