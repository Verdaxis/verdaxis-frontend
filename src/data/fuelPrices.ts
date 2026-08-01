import type { AggregatedOrderbook, MarketProduct } from '../types';
import { API_URL } from '../services/config';
import { buildDemoMarketQuotes } from '../utils/demoMarketQuotes';
import { formatMarketProduct } from '../utils/marketProduct';

export interface FuelPrice {
  fuel: string;
  region: string;
  price: number;
  unit: string;
  change: number | null;
  source: string;
  sourceLabel: string;
  priceDate: string;
  availabilityWindow: string;
}

const DEMO_PRODUCTS: MarketProduct[] = [
  'BIO_METHANOL',
  'E_METHANOL',
  'BIO_ETHANOL',
  'SYNTHETIC_ETHANOL',
];
const DEMO_PORTS = ['Singapore', 'Shanghai'];

const previewPrices: Record<string, number> = {
  'Singapore|BIO_METHANOL': 985,
  'Singapore|E_METHANOL': 1188,
  'Singapore|BIO_ETHANOL': 863,
  'Singapore|SYNTHETIC_ETHANOL': 1278,
  'Shanghai|BIO_METHANOL': 935,
  'Shanghai|E_METHANOL': 1095,
  'Shanghai|BIO_ETHANOL': 843,
  'Shanghai|SYNTHETIC_ETHANOL': 1208,
};

export const DEMO_FUEL_PRICES: FuelPrice[] = DEMO_PORTS.flatMap(region => (
  DEMO_PRODUCTS.map(product => ({
    fuel: formatMarketProduct(product),
    region,
    price: previewPrices[`${region}|${product}`],
    unit: 'USD/mt',
    change: null,
    source: 'marketplace-demo',
    sourceLabel: 'Demo',
    priceDate: '',
    availabilityWindow: 'Preview',
  }))
));

const buildTickerItems = (rows: AggregatedOrderbook[]): FuelPrice[] => {
  const quotes = new Map(
    buildDemoMarketQuotes(rows).map(quote => [
      `${quote.port.toLowerCase()}|${quote.product}`,
      quote,
    ]),
  );

  return DEMO_FUEL_PRICES.map((fallback) => {
    const product = DEMO_PRODUCTS.find(value => formatMarketProduct(value) === fallback.fuel);
    const quote = product ? quotes.get(`${fallback.region.toLowerCase()}|${product}`) : undefined;
    if (!quote) return fallback;
    return {
      ...fallback,
      price: quote.price,
      priceDate: quote.observedAt?.slice(0, 10) ?? '',
      availabilityWindow: quote.availabilityWindow,
    };
  });
};

export const fetchFuelPrices = async (signal?: AbortSignal): Promise<FuelPrice[]> => {
  const response = await fetch(`${API_URL}/orderbook/aggregated`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Marketplace prices request failed: ${response.status}`);
  }

  const payload = await response.json() as AggregatedOrderbook[];
  return buildTickerItems(Array.isArray(payload) ? payload : []);
};
