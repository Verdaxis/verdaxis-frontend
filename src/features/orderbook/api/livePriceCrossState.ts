import { OrderBookOrder } from '../../../types';
import { isOrderbookMarketProduct } from '../../../utils/marketProduct';
import { isDemoMarketActivity } from '../../../utils/marketActivity';

function isOrderbookOrder(order: OrderBookOrder): boolean {
    // B100 rows need a canonical code. Only legacy alcohol rows use fuel labels.
    return order.market_product
        ? isOrderbookMarketProduct(order.market_product)
        : ['methanol', 'ethanol'].includes(order.fuel_type?.trim().toLowerCase());
}

export function getLivePriceCrossState(bids: OrderBookOrder[], asks: OrderBookOrder[]) {
    // This is a provenance-scoped public price signal, not execution authority.
    // The boundary converts `price_per_mt_usd` to a number before either list
    // reaches this component, so a malformed value is NaN, exactly as the
    // `Number(...)` coercion here used to produce.
    const hasLivePrice = (order: OrderBookOrder) => isOrderbookOrder(order) && !isDemoMarketActivity(order)
        && Number.isFinite(order.price_per_mt_usd) && order.price_per_mt_usd > 0;
    const realBids = bids
        .filter(hasLivePrice)
        .sort((a, b) => b.price_per_mt_usd - a.price_per_mt_usd);
    const realAsks = asks
        .filter(hasLivePrice)
        .sort((a, b) => a.price_per_mt_usd - b.price_per_mt_usd);

    const products = new Set([...realBids, ...realAsks].map(order => order.market_product || order.fuel_type.trim().toLowerCase()));
    // A combined product view has no meaningful common price spread.
    if (products.size > 1) {
        return { hasCross: false, bidIds: new Set<string>(), askIds: new Set<string>(), spread: null };
    }

    const bestBid = realBids[0];
    const bestAsk = realAsks[0];
    const hasCross = Boolean(bestBid && bestAsk && bestBid.price_per_mt_usd >= bestAsk.price_per_mt_usd);
    const bidIds = new Set<string>();
    const askIds = new Set<string>();

    if (hasCross && bestBid && bestAsk) {
        realBids
            .filter(order => order.price_per_mt_usd >= bestAsk.price_per_mt_usd)
            .forEach(order => bidIds.add(order.id));
        realAsks
            .filter(order => order.price_per_mt_usd <= bestBid.price_per_mt_usd)
            .forEach(order => askIds.add(order.id));
    }

    return {
        hasCross,
        bidIds,
        askIds,
        spread: bestBid && bestAsk ? bestAsk.price_per_mt_usd - bestBid.price_per_mt_usd : null,
    };
}
