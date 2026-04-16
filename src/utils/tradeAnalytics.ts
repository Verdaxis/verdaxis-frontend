import type { Trade, TradeStatus } from '../types';

export type TradeLifecycleStatus = Exclude<TradeStatus, 'DELIVERED' | 'PAID'> | 'CONFIRMED';

interface MonthlyTradeCount {
  label: string;
  count: number;
}

interface FuelVolumeEntry {
  fuel: string;
  volumeMt: number;
}

interface FuelComparisonEntry {
  fuel: string;
  weightedExecutionUsd: number;
  weightedBenchmarkUsd: number;
  differenceUsd: number;
  differencePct: number;
}

export interface TradePerformanceModel {
  totalTrades: number;
  totalVolumeMt: number;
  grossNotionalUsd: number;
  weightedAveragePriceUsd: number;
  volumeByFuel: FuelVolumeEntry[];
  monthlyTradeCounts: MonthlyTradeCount[];
  fuelComparisons: FuelComparisonEntry[];
}

const CONFIRMED_LIKE_STATUSES = new Set<TradeStatus>(['CONFIRMED', 'DELIVERED', 'PAID']);
const ACTIVE_STATUSES = new Set<TradeLifecycleStatus>(['PENDING_CONFIRMATION', 'CONFIRMED']);
const COMPLETED_STATUSES = new Set<TradeLifecycleStatus>(['CANCELLED', 'DECLINED']);

export function normalizeTradeLifecycleStatus(status: TradeStatus): TradeLifecycleStatus {
  if (status === 'DELIVERED' || status === 'PAID') {
    return 'CONFIRMED';
  }
  return status;
}

export function isConfirmedLikeTrade(status: TradeStatus): boolean {
  return CONFIRMED_LIKE_STATUSES.has(status);
}

export function isActiveTradeStatus(status: TradeStatus): boolean {
  return ACTIVE_STATUSES.has(normalizeTradeLifecycleStatus(status));
}

export function isCompletedTradeStatus(status: TradeStatus): boolean {
  return COMPLETED_STATUSES.has(normalizeTradeLifecycleStatus(status));
}

export function coerceTradeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function tradeDisplayQuantityMt(trade: Trade): number {
  const finalQuantity = coerceTradeNumber(trade.final_quantity_mt);
  return finalQuantity > 0 ? finalQuantity : coerceTradeNumber(trade.quantity_mt);
}

export function tradeDisplayPricePerMt(trade: Trade): number {
  const finalPrice = coerceTradeNumber(trade.final_price_per_mt);
  return finalPrice > 0 ? finalPrice : coerceTradeNumber(trade.price_per_mt_usd);
}

export function tradeGrossNotionalUsd(trade: Trade): number {
  const finalTotal = coerceTradeNumber(trade.final_total_usd);
  if (finalTotal > 0) {
    return finalTotal;
  }
  return tradeDisplayQuantityMt(trade) * tradeDisplayPricePerMt(trade);
}

export function tradeSliceKey(trade: Trade): string | null {
  if (!trade.market_product || !trade.delivery_point_id || !trade.availability_window) {
    return null;
  }
  return `${trade.market_product}::${trade.delivery_point_id}::${trade.availability_window}`;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function lastThreeMonths(now: Date): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: monthLabel(date) });
  }
  return months;
}

export function buildTradePerformanceModel(
  trades: Trade[],
  referenceBySlice: Record<string, number>,
  now: Date = new Date(),
): TradePerformanceModel {
  const confirmedTrades = trades.filter((trade) => isConfirmedLikeTrade(trade.status));

  const totalVolumeMt = confirmedTrades.reduce((sum, trade) => sum + tradeDisplayQuantityMt(trade), 0);
  const grossNotionalUsd = confirmedTrades.reduce((sum, trade) => sum + tradeGrossNotionalUsd(trade), 0);
  const weightedAveragePriceUsd = totalVolumeMt > 0 ? grossNotionalUsd / totalVolumeMt : 0;

  const volumeByFuelMap = new Map<string, number>();
  for (const trade of confirmedTrades) {
    const fuel = trade.product_name || trade.fuel_type || 'Unknown';
    volumeByFuelMap.set(fuel, (volumeByFuelMap.get(fuel) || 0) + tradeDisplayQuantityMt(trade));
  }
  const volumeByFuel = Array.from(volumeByFuelMap.entries())
    .map(([fuel, volumeMt]) => ({ fuel, volumeMt }))
    .sort((left, right) => right.volumeMt - left.volumeMt);

  const monthBuckets = lastThreeMonths(now);
  const monthlyTradeCounts = monthBuckets.map(({ key, label }) => {
    const count = confirmedTrades.filter((trade) => {
      const tradeDate = new Date(trade.created_at);
      const tradeKey = `${tradeDate.getUTCFullYear()}-${String(tradeDate.getUTCMonth() + 1).padStart(2, '0')}`;
      return tradeKey === key;
    }).length;
    return { label, count };
  });

  const comparisonMap = new Map<string, { execNotional: number; benchmarkNotional: number; volumeMt: number }>();
  for (const trade of confirmedTrades) {
    const sliceKey = tradeSliceKey(trade);
    const benchmarkPrice = sliceKey ? referenceBySlice[sliceKey] : undefined;
    if (!benchmarkPrice || benchmarkPrice <= 0) {
      continue;
    }
    const fuel = trade.product_name || trade.fuel_type || 'Unknown';
    const quantityMt = tradeDisplayQuantityMt(trade);
    const executionPrice = tradeDisplayPricePerMt(trade);
    const aggregate = comparisonMap.get(fuel) || { execNotional: 0, benchmarkNotional: 0, volumeMt: 0 };
    aggregate.execNotional += executionPrice * quantityMt;
    aggregate.benchmarkNotional += benchmarkPrice * quantityMt;
    aggregate.volumeMt += quantityMt;
    comparisonMap.set(fuel, aggregate);
  }

  const fuelComparisons = Array.from(comparisonMap.entries())
    .map(([fuel, aggregate]) => {
      const weightedExecutionUsdRaw = aggregate.volumeMt > 0 ? aggregate.execNotional / aggregate.volumeMt : 0;
      const weightedBenchmarkUsdRaw = aggregate.volumeMt > 0 ? aggregate.benchmarkNotional / aggregate.volumeMt : 0;
      const differenceUsdRaw = weightedExecutionUsdRaw - weightedBenchmarkUsdRaw;
      const differencePct = weightedBenchmarkUsdRaw > 0 ? (differenceUsdRaw / weightedBenchmarkUsdRaw) * 100 : 0;
      return {
        fuel,
        weightedExecutionUsd: roundToTwo(weightedExecutionUsdRaw),
        weightedBenchmarkUsd: roundToTwo(weightedBenchmarkUsdRaw),
        differenceUsd: roundToTwo(differenceUsdRaw),
        differencePct: roundToTwo(differencePct),
      };
    })
    .sort((left, right) => right.weightedExecutionUsd - left.weightedExecutionUsd);

  return {
    totalTrades: confirmedTrades.length,
    totalVolumeMt,
    grossNotionalUsd,
    weightedAveragePriceUsd,
    volumeByFuel,
    monthlyTradeCounts,
    fuelComparisons,
  };
}
