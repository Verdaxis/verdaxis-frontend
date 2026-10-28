// Per-browser, per-user settings for optional trade alerts (sound and browser
// notifications). They are deliberately NOT server preferences: the backend
// accepts only fixed preference namespaces (`NAMESPACE_SCHEMAS`, extra keys
// forbidden), and both settings describe this device. Browser notification
// permission is per browser, and a user may want sound on a desk computer but
// not on a laptop. Both default to off.

export interface TradeAlertPreferences {
  sound: boolean;
  notifications: boolean;
}

export const DEFAULT_TRADE_ALERT_PREFERENCES: TradeAlertPreferences = {
  sound: false,
  notifications: false,
};

const STORAGE_KEY_PREFIX = 'verdaxis_trade_alerts:';

/** One key per user, so a shared computer never applies one user's choice to another. */
export const tradeAlertStorageKey = (userId: string): string => `${STORAGE_KEY_PREFIX}${userId}`;

interface CachedRead {
  raw: string | null;
  value: TradeAlertPreferences;
}

// `useSyncExternalStore` needs the same object back while nothing changed.
const readCache = new Map<string, CachedRead>();
// Used only when localStorage throws (blocked storage), so a toggle still works
// for the life of the page.
const memoryFallback = new Map<string, string>();
const listeners = new Set<() => void>();

const parsePreferences = (raw: string | null): TradeAlertPreferences => {
  if (raw === null) return DEFAULT_TRADE_ALERT_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_TRADE_ALERT_PREFERENCES;
    }
    const record = parsed as Record<string, unknown>;
    return { sound: record.sound === true, notifications: record.notifications === true };
  } catch {
    return DEFAULT_TRADE_ALERT_PREFERENCES;
  }
};

const readRaw = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
};

export const readTradeAlertPreferences = (userId: string): TradeAlertPreferences => {
  if (!userId || typeof window === 'undefined') return DEFAULT_TRADE_ALERT_PREFERENCES;

  const key = tradeAlertStorageKey(userId);
  const raw = readRaw(key);
  const cached = readCache.get(key);
  if (cached && cached.raw === raw) return cached.value;

  const value = parsePreferences(raw);
  readCache.set(key, { raw, value });
  return value;
};

export const writeTradeAlertPreferences = (userId: string, next: TradeAlertPreferences): void => {
  if (!userId || typeof window === 'undefined') return;

  const key = tradeAlertStorageKey(userId);
  const serialized = JSON.stringify(next);
  memoryFallback.set(key, serialized);
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    // Keep the in-memory value; the choice is then lost on reload (alerts off).
  }
  listeners.forEach((listener) => listener());
};

/** Notifies on changes made in this tab and, through `storage`, in other tabs. */
export const subscribeTradeAlertPreferences = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_KEY_PREFIX)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};
