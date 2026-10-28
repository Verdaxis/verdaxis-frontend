// Per-browser, per-user settings for optional trade alerts (sound and browser
// notifications). They are deliberately NOT server preferences: the backend
// accepts only fixed preference namespaces (`NAMESPACE_SCHEMAS`, extra keys
// forbidden), and both settings describe this device. Browser notification
// permission is per browser, and a user may want sound on a desk computer but
// not on a laptop.
//
// Sound is off until the user turns it on. Browser notifications are on by
// default once the browser permission is granted (the sign-in prompt asks for
// it), unless the user has chosen off, which is stored and respected.

export interface TradeAlertPreferences {
  sound: boolean;
  /** `null` means the user has not chosen; see `isTradeNotificationOn`. */
  notifications: boolean | null;
  /** How many times the user chose "Not now" on the in-page notification card. */
  promptSnoozes: number;
  /** Epoch ms until which the card stays hidden after "Not now"; `null` when not snoozed. */
  promptSnoozedUntil: number | null;
}

export const DEFAULT_TRADE_ALERT_PREFERENCES: TradeAlertPreferences = {
  sound: false,
  notifications: null,
  promptSnoozes: 0,
  promptSnoozedUntil: null,
};

/**
 * "Not now" hides the in-page card for a week: long enough not to nag, short
 * enough that someone who changed their mind is asked again.
 */
export const PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** After three "Not now" answers the card stops; Settings stays the way to turn alerts on. */
export const PROMPT_MAX_SNOOZES = 3;

/** True while the card must stay hidden because of earlier "Not now" answers. */
export const isTradeAlertPromptSnoozed = (preferences: TradeAlertPreferences, now: number): boolean => {
  if (preferences.promptSnoozes >= PROMPT_MAX_SNOOZES) return true;
  const until = preferences.promptSnoozedUntil;
  if (until === null) return false;
  // An end more than one snooze away means the clock was set back: do not hide for longer.
  return until > now && until - now <= PROMPT_SNOOZE_MS;
};

/**
 * Whether browser notifications are on. The browser permission always decides
 * first. Without an explicit choice the default is on, so a user who granted
 * permission at sign-in gets them; an explicit off is kept.
 */
export const isTradeNotificationOn = (
  preferences: TradeAlertPreferences,
  permissionGranted: boolean,
): boolean => permissionGranted && preferences.notifications !== false;

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
    return {
      sound: record.sound === true,
      notifications: typeof record.notifications === 'boolean' ? record.notifications : null,
      promptSnoozes: Number.isInteger(record.promptSnoozes) && (record.promptSnoozes as number) > 0
        ? (record.promptSnoozes as number)
        : 0,
      promptSnoozedUntil: typeof record.promptSnoozedUntil === 'number' && Number.isFinite(record.promptSnoozedUntil)
        ? record.promptSnoozedUntil
        : null,
    };
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

/** Records a "Not now" answer: one more snooze, and a hidden card for `PROMPT_SNOOZE_MS`. */
export const snoozeTradeAlertPrompt = (userId: string, now: number): void => {
  const current = readTradeAlertPreferences(userId);
  writeTradeAlertPreferences(userId, {
    ...current,
    promptSnoozes: current.promptSnoozes + 1,
    promptSnoozedUntil: now + PROMPT_SNOOZE_MS,
  });
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
