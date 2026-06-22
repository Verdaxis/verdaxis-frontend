import { APPROVED_TRADING_PORTS } from '../data';

export const normalizeTradingPortName = (value: string | null | undefined) => (
  (value ?? '').trim().toLowerCase()
);

export const isApprovedTradingPortName = (value: string | null | undefined): boolean => {
  const normalized = normalizeTradingPortName(value);
  return APPROVED_TRADING_PORTS.some(port => normalizeTradingPortName(port) === normalized);
};

export const filterApprovedTradingPorts = <T extends { name?: string | null }>(items: T[]): T[] => (
  items.filter(item => isApprovedTradingPortName(item.name))
);
