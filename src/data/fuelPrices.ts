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

export interface FuelTickerItem extends FuelPrice {
  kind: 'price' | 'location-spread' | 'pathway-premium';
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
    priceDate: '2026-08-01',
    availabilityWindow: 'Preview',
  }))
));

const comparable = (left: FuelPrice, right: FuelPrice) => (
  Boolean(left.priceDate)
  && left.unit === right.unit
  && left.source === right.source
  && left.priceDate === right.priceDate
  && left.availabilityWindow === right.availabilityWindow
);

export const buildFuelTickerItems = (prices: FuelPrice[]): FuelTickerItem[] => {
  const byMarket = new Map(prices.map(price => [`${price.region}|${price.fuel}`, price]));
  const comparisons: FuelTickerItem[] = [];

  DEMO_PRODUCTS.forEach((product) => {
    const fuel = formatMarketProduct(product);
    const singapore = byMarket.get(`Singapore|${fuel}`);
    const shanghai = byMarket.get(`Shanghai|${fuel}`);
    if (!singapore || !shanghai || !comparable(singapore, shanghai)) return;

    comparisons.push({
      ...singapore,
      kind: 'location-spread',
      fuel: `${fuel} spread`,
      region: 'Singapore vs Shanghai',
      price: singapore.price - shanghai.price,
    });
  });

  ([
    ['BIO_METHANOL', 'E_METHANOL'],
    ['BIO_ETHANOL', 'SYNTHETIC_ETHANOL'],
  ] as const).forEach(([bioProduct, syntheticProduct]) => {
    const bioFuel = formatMarketProduct(bioProduct);
    const eFuel = formatMarketProduct(syntheticProduct);
    DEMO_PORTS.forEach((port) => {
      const bio = byMarket.get(`${port}|${bioFuel}`);
      const synthetic = byMarket.get(`${port}|${eFuel}`);
      if (!bio || !synthetic || !comparable(bio, synthetic)) return;

      comparisons.push({
        ...synthetic,
        kind: 'pathway-premium',
        fuel: `${eFuel} premium`,
        region: `${port} vs ${bioFuel}`,
        price: synthetic.price - bio.price,
      });
    });
  });

  return [
    ...comparisons.filter(item => item.kind === 'pathway-premium'),
    ...comparisons.filter(item => item.kind === 'location-spread'),
    ...prices.map(price => ({ ...price, kind: 'price' as const })),
  ];
};

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
