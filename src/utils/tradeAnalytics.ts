import type { Trade } from '../types';

const ACTIVE_TRADE_STATUSES = new Set(['PENDING', 'CONFIRMED']);
const COMPLETED_TRADE_STATUSES = new Set(['DELIVERED', 'PAID', 'SETTLED']);

export function isActiveTradeStatus(status: string | null | undefined): boolean {
  return ACTIVE_TRADE_STATUSES.has(String(status || '').toUpperCase());
}

export function isCompletedTradeStatus(status: string | null | undefined): boolean {
  return COMPLETED_TRADE_STATUSES.has(String(status || '').toUpperCase());
}

export function isConfirmedLikeTrade(tradeOrStatus: Trade | string | null | undefined): boolean {
  const status = typeof tradeOrStatus === 'object' && tradeOrStatus !== null
    ? tradeOrStatus.status
    : tradeOrStatus;
  return isActiveTradeStatus(status) || isCompletedTradeStatus(status);
}

export function normalizeTradeLifecycleStatus(status: string | null | undefined): string {
  const normalized = String(status || '').toUpperCase();
  if (COMPLETED_TRADE_STATUSES.has(normalized)) return 'CONFIRMED';
  return normalized || 'PENDING';
}

export function tradeDisplayQuantityMt(trade: Trade): number {
  return tradeQuantity(trade);
}

export function tradeDisplayPricePerMt(trade: Trade): number {
  return tradePrice(trade);
}

export function tradeGrossNotionalUsd(trade: Trade): number {
  return tradeDisplayQuantityMt(trade) * tradeDisplayPricePerMt(trade);
}

export interface VolumeByFuel {
  fuel: string;
  volumeMt: number;
}

export interface MonthlyTradeCount {
  label: string;
  count: number;
}

export interface FuelComparison {
  fuel: string;
  weightedExecutionUsd: number;
  weightedBenchmarkUsd: number;
  differenceUsd: number;
  differencePct: number;
}

export interface TradePerformanceModel {
  totalTrades: number;
  totalVolumeMt: number;
  weightedAveragePriceUsd: number;
  grossNotionalUsd: number;
  volumeByFuel: VolumeByFuel[];
  monthlyTradeCounts: MonthlyTradeCount[];
  fuelComparisons: FuelComparison[];
}

function tradeQuantity(trade: Trade): number {
  return Number(trade.final_quantity_mt ?? trade.quantity_mt ?? 0);
}

function tradePrice(trade: Trade): number {
  return Number(trade.final_price_per_mt ?? trade.price_per_mt_usd ?? 0);
}

function tradeFuelLabel(trade: Trade): string {
  return trade.product_name || trade.fuel_type || 'Unknown fuel';
}

export function tradeSliceKey(trade: Trade): string {
  const product = trade.product_id || trade.fuel_type;
  const deliveryPoint = trade.delivery_point_id || trade.region;
  if (!product || !deliveryPoint) return '';

  return [product, deliveryPoint].join('|');
}

export function buildTradePerformanceModel(
  trades: Trade[],
  referenceBySlice: Record<string, number> = {}
): TradePerformanceModel {
  const confirmedTrades = trades.filter((trade) => trade.status !== 'CANCELLED' && trade.status !== 'DECLINED');
  const totalVolumeMt = confirmedTrades.reduce((sum, trade) => sum + tradeQuantity(trade), 0);
  const grossNotionalUsd = confirmedTrades.reduce(
    (sum, trade) => sum + (tradeQuantity(trade) * tradePrice(trade)),
    0
  );

  const volumeByFuel = Array.from(
    confirmedTrades.reduce((groups, trade) => {
      const fuel = tradeFuelLabel(trade);
      groups.set(fuel, (groups.get(fuel) ?? 0) + tradeQuantity(trade));
      return groups;
    }, new Map<string, number>())
  )
    .map(([fuel, volumeMt]) => ({ fuel, volumeMt }))
    .sort((a, b) => b.volumeMt - a.volumeMt);

  const monthlyTradeCounts = buildMonthlyTradeCounts(confirmedTrades);
  const fuelComparisons = buildFuelComparisons(confirmedTrades, referenceBySlice);

  return {
    totalTrades: confirmedTrades.length,
    totalVolumeMt,
    weightedAveragePriceUsd: totalVolumeMt > 0 ? grossNotionalUsd / totalVolumeMt : 0,
    grossNotionalUsd,
    volumeByFuel,
    monthlyTradeCounts,
    fuelComparisons,
  };
}

function buildMonthlyTradeCounts(trades: Trade[]): MonthlyTradeCount[] {
  const now = new Date();
  const buckets: MonthlyTradeCount[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      label: month.toLocaleString(undefined, { month: 'short' }),
      count: 0,
    });
  }

  for (const trade of trades) {
    const rawDate = trade.confirmed_at || trade.created_at;
    if (!rawDate) continue;

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;

    const label = date.toLocaleString(undefined, { month: 'short' });
    const bucket = buckets.find((entry) => entry.label === label);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function buildFuelComparisons(
  trades: Trade[],
  referenceBySlice: Record<string, number>
): FuelComparison[] {
  interface Accumulator {
    executionNotional: number;
    benchmarkNotional: number;
    volumeMt: number;
  }

  const groups = new Map<string, Accumulator>();

  for (const trade of trades) {
    const benchmark = referenceBySlice[tradeSliceKey(trade)];
    const quantity = tradeQuantity(trade);
    if (!benchmark || quantity <= 0) continue;

    const fuel = tradeFuelLabel(trade);
    const current = groups.get(fuel) ?? {
      executionNotional: 0,
      benchmarkNotional: 0,
      volumeMt: 0,
    };

    current.executionNotional += tradePrice(trade) * quantity;
    current.benchmarkNotional += benchmark * quantity;
    current.volumeMt += quantity;
    groups.set(fuel, current);
  }

  return Array.from(groups.entries())
    .map(([fuel, values]) => {
      const weightedExecutionUsd = values.executionNotional / values.volumeMt;
      const weightedBenchmarkUsd = values.benchmarkNotional / values.volumeMt;
      const differenceUsd = weightedExecutionUsd - weightedBenchmarkUsd;

      return {
        fuel,
        weightedExecutionUsd,
        weightedBenchmarkUsd,
        differenceUsd,
        differencePct: weightedBenchmarkUsd > 0 ? (differenceUsd / weightedBenchmarkUsd) * 100 : 0,
      };
    })
    .sort((a, b) => Math.abs(b.differenceUsd) - Math.abs(a.differenceUsd));
}
