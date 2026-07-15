import { MARKET_PRODUCTS, MarketProduct } from '../types';
import { APPROVED_TRADING_PORTS } from '../data';
import {
    CALENDAR_WINDOW_RE,
    MONTH_WINDOW_RE,
    QUARTER_WINDOW_RE,
    SPOT_WINDOW,
} from './availabilityWindow';

// The single home for the /app/m/:product/:port/:window URL grammar.
// Existing helpers deliberately not reused: getMarketplaceProductValue
// doesn't match hyphenated slugs, normalizeAvailabilityWindow never
// rejects junk, normalizeTradingPortName only trims/lowercases.

export interface MarketSlice {
    product: MarketProduct;
    port: string;
    window: string;
}

export const sliceToPath = (slice: MarketSlice): string => {
    const product = slice.product.toLowerCase().replace(/_/g, '-');
    const port = slice.port.toLowerCase().replace(/ /g, '-');
    const window = slice.window.toLowerCase();
    return `/app/m/${product}/${port}/${window}`;
};

export const parseSlicePath = (
    productSlug: string | undefined,
    portSlug: string | undefined,
    windowSlug: string | undefined,
): MarketSlice | null => {
    if (!productSlug || !portSlug || !windowSlug) return null;

    const product = productSlug.toUpperCase().replace(/-/g, '_');
    if (!(MARKET_PRODUCTS as readonly string[]).includes(product)) return null;

    const portName = portSlug.toLowerCase().replace(/-/g, ' ');
    const port = APPROVED_TRADING_PORTS.find((approved) => approved.toLowerCase() === portName);
    if (!port) return null;

    const window = windowSlug.toUpperCase();
    if (
        window !== SPOT_WINDOW
        && !MONTH_WINDOW_RE.test(window)
        && !QUARTER_WINDOW_RE.test(window)
        && !CALENDAR_WINDOW_RE.test(window)
    ) return null;

    return { product: product as MarketProduct, port, window };
};
