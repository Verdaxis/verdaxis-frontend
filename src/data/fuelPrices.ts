import type { AggregatedOrderbook, DeliveryPoint, MarketProduct, Product } from '../types';
import { API_URL } from '../services/config';
import { buildDemoMarketQuotes } from '../utils/demoMarketQuotes';
import { formatMarketProduct } from '../utils/marketProduct';
import { filterApprovedTradingPorts, normalizeTradingPortName } from '../utils/tradingPorts';

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

const buildTickerItems = (
  rows: AggregatedOrderbook[],
  products: Product[],
  deliveryPoints: DeliveryPoint[],
): FuelPrice[] => {
  const activeProducts = products.filter(product => (
    product.is_active && product.market_product && DEMO_PRODUCTS.includes(product.market_product)
  ));
  const productOrder = new Map(activeProducts.map((product, index) => [product.market_product, index]));
  const activePorts = filterApprovedTradingPorts(deliveryPoints.filter(point => point.is_active));
  const portOrder = new Map(activePorts.map((point, index) => [normalizeTradingPortName(point.name), index]));

  const prices = buildDemoMarketQuotes(rows)
    .filter(quote => (
      productOrder.has(quote.product) && portOrder.has(normalizeTradingPortName(quote.port))
    ))
    .sort((left, right) => (
      (portOrder.get(normalizeTradingPortName(left.port)) ?? 0)
      - (portOrder.get(normalizeTradingPortName(right.port)) ?? 0)
      || (productOrder.get(left.product) ?? 0) - (productOrder.get(right.product) ?? 0)
    ))
    .map(quote => ({
      fuel: formatMarketProduct(quote.product),
      region: quote.port,
      price: quote.price,
      unit: 'USD/mt',
      change: null,
      source: 'marketplace-demo',
      sourceLabel: 'Demo',
      priceDate: quote.observedAt?.slice(0, 10) ?? '',
      availabilityWindow: quote.availabilityWindow,
    }));

  return prices.length > 0 ? prices : DEMO_FUEL_PRICES;
};

export const fetchFuelPrices = async (signal?: AbortSignal): Promise<FuelPrice[]> => {
  const request = {
    headers: { Accept: 'application/json' },
    signal,
  };
  const responses = await Promise.all([
    fetch(`${API_URL}/orderbook/aggregated`, request),
    fetch(`${API_URL}/catalog/products`, request),
    fetch(`${API_URL}/catalog/delivery-points`, request),
  ]);

  const failedResponse = responses.find(response => !response.ok);
  if (failedResponse) {
    throw new Error(`Marketplace prices request failed: ${failedResponse.status}`);
  }

  const [orderbookPayload, productsPayload, deliveryPointsPayload] = await Promise.all(
    responses.map(response => response.json()),
  );
  return buildTickerItems(
    Array.isArray(orderbookPayload) ? orderbookPayload : [],
    Array.isArray(productsPayload) ? productsPayload : [],
    Array.isArray(deliveryPointsPayload) ? deliveryPointsPayload : [],
  );
};
