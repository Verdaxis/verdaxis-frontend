export interface FuelPrice {
  fuel: string;
  region: string;
  price: number;
  unit: string;
  change: number | null;
  source: string;
  sourceLabel: string;
  priceDate: string;
}

interface MarinaPulseFuelPrice {
  source: string;
  commodity: string;
  region: string | null;
  price_usd: number | string | null;
  unit: string | null;
  price_date: string;
}

interface MarinaPulseFuelPricesResponse {
  items: MarinaPulseFuelPrice[];
}

interface BenchmarkConfig {
  commodity: string;
  region: string;
  fuel: string;
  displayRegion: string;
}

const MARINA_PULSE_FUEL_PRICES_URL =
  'https://pulse.marinachain.io/api/fuels/prices?limit=220';

const BENCHMARKS: BenchmarkConfig[] = [
  { commodity: 'VLSFO', region: 'Global', fuel: 'VLSFO', displayRegion: 'Global bunker' },
  { commodity: 'MGO', region: 'Global', fuel: 'Marine Gas Oil', displayRegion: 'Global bunker' },
  { commodity: 'IFO380', region: 'Global', fuel: 'IFO380', displayRegion: 'Global bunker' },
  { commodity: 'Brent Crude Futures', region: 'Global', fuel: 'Brent', displayRegion: 'Global futures' },
  { commodity: 'WTI Crude Futures', region: 'US', fuel: 'WTI', displayRegion: 'US futures' },
  { commodity: 'Heating Oil Futures (ULSD)', region: 'US', fuel: 'ULSD', displayRegion: 'US futures' },
  { commodity: 'Corn Futures (CBOT)', region: 'US', fuel: 'Corn', displayRegion: 'Biofuel feedstock' },
  { commodity: 'Soybean Futures (CBOT)', region: 'US', fuel: 'Soybeans', displayRegion: 'Biofuel feedstock' },
];

const SOURCE_LABELS: Record<string, string> = {
  ship_bunker: 'Ship & Bunker',
  yfinance: 'Yahoo Finance',
  eia: 'EIA',
  worldbank: 'World Bank',
};

const toNumber = (value: number | string | null): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDate = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString().slice(0, 10);
};

const calculateChange = (
  latest: MarinaPulseFuelPrice,
  previous?: MarinaPulseFuelPrice
): number | null => {
  const latestPrice = toNumber(latest.price_usd);
  const previousPrice = toNumber(previous?.price_usd ?? null);

  if (latestPrice === null || previousPrice === null || previousPrice === 0) {
    return null;
  }

  return ((latestPrice - previousPrice) / previousPrice) * 100;
};

const buildTickerItems = (items: MarinaPulseFuelPrice[]): FuelPrice[] => {
  return BENCHMARKS.flatMap((benchmark) => {
    const rows = items
      .filter((item) => (
        item.commodity === benchmark.commodity
        && (item.region ?? '') === benchmark.region
        && toNumber(item.price_usd) !== null
      ))
      .sort((a, b) => normalizeDate(b.price_date).localeCompare(normalizeDate(a.price_date)));

    const latest = rows[0];
    if (!latest) {
      return [];
    }

    const latestDate = normalizeDate(latest.price_date);
    const previous = rows.find((row) => normalizeDate(row.price_date) < latestDate);
    const price = toNumber(latest.price_usd);

    if (price === null) {
      return [];
    }

    return [{
      fuel: benchmark.fuel,
      region: benchmark.displayRegion,
      price,
      unit: latest.unit ?? '',
      change: calculateChange(latest, previous),
      source: latest.source,
      sourceLabel: SOURCE_LABELS[latest.source] ?? latest.source,
      priceDate: latestDate,
    }];
  });
};

export const fetchFuelPrices = async (signal?: AbortSignal): Promise<FuelPrice[]> => {
  const response = await fetch(MARINA_PULSE_FUEL_PRICES_URL, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`MarinaPulse prices request failed: ${response.status}`);
  }

  const payload = await response.json() as MarinaPulseFuelPricesResponse;
  return buildTickerItems(payload.items ?? []);
};
