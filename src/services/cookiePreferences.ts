export const COOKIE_PREFERENCES_STORAGE_KEY = 'verdaxis:cookie-preferences';
export const COOKIE_PREFERENCES_CHANGED_EVENT = 'verdaxis:cookie-preferences-changed';

export interface CookiePreferences {
  version: 1;
  optionalAnalytics: boolean;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;
let browserStorageFailed = false;

const browserStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readCookiePreferences = (
  storage?: ReadableStorage | null,
): CookiePreferences | null => {
  const usesBrowserStorage = storage === undefined;
  try {
    if (usesBrowserStorage && browserStorageFailed) return null;
    const resolvedStorage = usesBrowserStorage ? browserStorage() : storage;
    if (!resolvedStorage) {
      if (usesBrowserStorage) browserStorageFailed = true;
      return null;
    }
    const raw = resolvedStorage.getItem(COOKIE_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CookiePreferences>;
    if (value.version !== 1 || typeof value.optionalAnalytics !== 'boolean') return null;
    return { version: 1, optionalAnalytics: value.optionalAnalytics };
  } catch {
    if (usesBrowserStorage) browserStorageFailed = true;
    return null;
  }
};

export const writeCookiePreferences = (
  optionalAnalytics: boolean,
  options: { storage?: WritableStorage | null; window?: Window } = {},
): boolean => {
  const usesBrowserStorage = options.storage === undefined;
  try {
    const storage = usesBrowserStorage ? browserStorage() : options.storage;
    if (!storage) {
      if (usesBrowserStorage) {
        browserStorageFailed = true;
        options.window?.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT));
      }
      return false;
    }
    storage.setItem(COOKIE_PREFERENCES_STORAGE_KEY, JSON.stringify({
      version: 1,
      optionalAnalytics,
    } satisfies CookiePreferences));
    if (usesBrowserStorage) browserStorageFailed = false;
    options.window?.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT));
    return true;
  } catch {
    if (usesBrowserStorage) {
      browserStorageFailed = true;
      options.window?.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT));
    }
    return false;
  }
};

export const subscribeCookiePreferences = (
  listener: () => void,
  target: Window | null = typeof window === 'undefined' ? null : window,
): (() => void) => {
  if (!target) return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_PREFERENCES_STORAGE_KEY || event.key === null) listener();
  };
  target.addEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, listener);
  target.addEventListener('storage', onStorage);
  return () => {
    target.removeEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, listener);
    target.removeEventListener('storage', onStorage);
  };
};
