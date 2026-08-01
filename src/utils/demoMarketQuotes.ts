import type { AggregatedOrderbook, MarketProduct } from '../types';
import { compareAvailabilityWindows } from './availabilityWindow';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from './marketProducts';

export interface DemoMarketQuote {
  product: MarketProduct;
  port: string;
  availabilityWindow: string;
  price: number;
  observedAt?: string;
}

const products = new Set<MarketProduct>(
  ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.value),
);

const isDemo = (row: AggregatedOrderbook) => (
  row.source_kind === 'DEMO_SEED'
  || row.demo_status === 'DEMO_ONLY'
  || row.evidence_class === 'DEMO'
);

export const buildDemoMarketQuotes = (rows: AggregatedOrderbook[]): DemoMarketQuote[] => {
  const slices = new Map<string, {
    product: MarketProduct;
    port: string;
    availabilityWindow: string;
    bestBid: number | null;
    bestAsk: number | null;
    observedAt?: string;
  }>();

  rows.forEach((row) => {
    const product = row.market_product;
    const port = row.delivery_point_name?.trim();
    const availabilityWindow = row.availability_window?.trim();
    if (typeof product !== 'string' || !products.has(product as MarketProduct)) return;
    if (!port || !availabilityWindow || !isDemo(row)) return;

    const key = `${product}|${port.toLowerCase()}|${availabilityWindow}`;
    const slice = slices.get(key) ?? {
      product: product as MarketProduct,
      port,
      availabilityWindow,
      bestBid: null,
      bestAsk: null,
      observedAt: row.observed_at,
    };

    if (row.side === 'BID') {
      const price = Number(row.max_price);
      if (Number.isFinite(price)) slice.bestBid = Math.max(slice.bestBid ?? price, price);
    } else if (row.side === 'ASK') {
      const price = Number(row.min_price);
      if (Number.isFinite(price)) slice.bestAsk = Math.min(slice.bestAsk ?? price, price);
    }
    if ((row.observed_at ?? '') > (slice.observedAt ?? '')) slice.observedAt = row.observed_at;
    slices.set(key, slice);
  });

  const nearestByMarket = new Map<string, DemoMarketQuote>();
  Array.from(slices.values())
    .sort((left, right) => compareAvailabilityWindows(left.availabilityWindow, right.availabilityWindow))
    .forEach((slice) => {
      const marketKey = `${slice.product}|${slice.port.toLowerCase()}`;
      if (nearestByMarket.has(marketKey)) return;
      const price = slice.bestBid != null && slice.bestAsk != null
        ? (slice.bestBid + slice.bestAsk) / 2
        : slice.bestBid ?? slice.bestAsk;
      if (price == null) return;
      nearestByMarket.set(marketKey, {
        product: slice.product,
        port: slice.port,
        availabilityWindow: slice.availabilityWindow,
        price,
        observedAt: slice.observedAt,
      });
    });

  return Array.from(nearestByMarket.values());
};
