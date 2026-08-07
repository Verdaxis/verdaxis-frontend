/**
 * Shared fuel type styling + status config — single source of truth.
 * Case-insensitive lookups fix the supplier bug where "ammonia (green)" missed exact-match.
 */
import React from 'react';
import type { TFunction } from 'i18next';
import { OrderBookOrder } from '../types';
import { formatAvailabilityWindow } from './availabilityWindow';

// ─── Fuel Color Map ────────────────────────────────────────────
type ColorKey = 'violet' | 'green' | 'sky' | 'teal' | 'amber' | 'slate';

const FUEL_COLOR_MAP: Record<string, ColorKey> = {
  methanol: 'violet',
  biofuel: 'green',
  lng: 'sky',
  ammonia: 'teal',
  'ammonia (green)': 'teal',
  ethanol: 'green',
  biomethane: 'sky',
  lsmgo: 'amber',
};

function colorFor(fuelType: string): ColorKey {
  return FUEL_COLOR_MAP[fuelType.toLowerCase()] ?? 'slate';
}

const ROW_CLASSES: Record<ColorKey, string> = {
  violet: 'border-l-2 border-l-violet-400 bg-violet-50/60 dark:bg-violet-950/20',
  green:  'border-l-2 border-l-green-400 bg-green-50/60 dark:bg-green-950/20',
  sky:    'border-l-2 border-l-sky-400 bg-sky-50/60 dark:bg-sky-950/20',
  teal:   'border-l-2 border-l-teal-400 bg-teal-50/60 dark:bg-teal-950/20',
  amber:  'border-l-2 border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20',
  slate:  'border-l-2 border-l-slate-400 bg-white dark:bg-slate-800',
};

const BADGE_CLASSES: Record<ColorKey, string> = {
  violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  green:  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  sky:    'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  teal:   'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  amber:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  slate:  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

const STICKY_BG: Record<ColorKey, string> = {
  violet: 'bg-violet-50/60 dark:bg-violet-950/20',
  green:  'bg-green-50/60 dark:bg-green-950/20',
  sky:    'bg-sky-50/60 dark:bg-sky-950/20',
  teal:   'bg-teal-50/60 dark:bg-teal-950/20',
  amber:  'bg-amber-50/60 dark:bg-amber-950/20',
  slate:  'bg-white dark:bg-slate-800',
};

export function getFuelRowClasses(fuelType: string): string {
  return ROW_CLASSES[colorFor(fuelType)];
}

export function getFuelBadgeClasses(fuelType: string): string {
  return BADGE_CLASSES[colorFor(fuelType)];
}

export function getFuelStickyBg(fuelType: string): string {
  return STICKY_BG[colorFor(fuelType)];
}

// ─── Watchlist Chip Colors ────────────────────────────────────
const CHIP_CLASSES: Record<ColorKey, string> = {
  violet: 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
  green:  'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
  sky:    'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
  teal:   'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300',
  amber:  'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  slate:  'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

export function getFuelChipClasses(fuelType: string): string {
  return CHIP_CLASSES[colorFor(fuelType)];
}

// ─── Status Config ─────────────────────────────────────────────
export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

const STATUS_MAP: Record<string, Omit<StatusConfig, 'label'> & { labelKey: string }> = {
  OPEN:             { labelKey: 'status.open',      bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  PARTIALLY_FILLED: { labelKey: 'status.partial',   bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',      dot: 'bg-blue-500' },
  FILLED:           { labelKey: 'status.filled',    bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400',    dot: 'bg-amber-500' },
  CANCELLED:        { labelKey: 'status.cancelled', bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',        dot: 'bg-red-500' },
  EXPIRED:          { labelKey: 'status.expired',   bg: 'bg-slate-500/10',  text: 'text-slate-600 dark:text-slate-400',    dot: 'bg-slate-500' },
};

export function getStatusConfig(status: string, t: TFunction): StatusConfig {
  const config = STATUS_MAP[status];
  if (!config) return { label: t('status.unknown'), bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' };
  return { ...config, label: t(config.labelKey) };
}

// ─── Expiry Formatter ──────────────────────────────────────────
export function formatExpiry(order: OrderBookOrder, locale = 'en'): React.ReactNode {
  const expiryDate = order.expires_at;
  if (!expiryDate) {
    return React.createElement('span', {
      className: 'text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono'
    }, 'GTC');
  }
  const formatted = new Date(expiryDate).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' });
  return React.createElement('span', {
    className: 'text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono whitespace-nowrap'
  }, formatted);
}

// ─── Availability Window ───────────────────────────────────────
export function formatDeliveryWindow(order: OrderBookOrder, locale = 'en'): string {
  return formatAvailabilityWindow(order.availability_window, locale);
}
