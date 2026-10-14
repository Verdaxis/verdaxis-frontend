import { mapOrderbookFameResponse, mapTradeFameResponse } from './fameOrder';
import { mapOrderbookLngResponse, mapTradeLngResponse } from './lngOrder';

/** Normalize every product-specific order-terms layer in one pass. */
export function mapOrderbookTermsResponse<T>(value: T): T {
    return mapOrderbookLngResponse(mapOrderbookFameResponse(value));
}

export function mapTradeTermsResponse<T>(value: T): T {
    return mapTradeLngResponse(mapTradeFameResponse(value));
}
