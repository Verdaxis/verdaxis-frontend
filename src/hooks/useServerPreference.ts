import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DEBOUNCE_MS = 1000;

interface CachedPreferences {
  userId: string;
  value: Record<string, unknown> | null;
  promise: Promise<Record<string, unknown>> | null;
}

interface LocalPreference<T> {
  value: T;
  hasStoredValue: boolean;
}

type PreferenceUpdate<T> = T | ((current: T) => T);
type ServerPreferenceSetter<T> = (next: PreferenceUpdate<T>) => void;

let cachedPreferences: CachedPreferences = {
  userId: '',
  value: null,
  promise: null,
};

const readLocalPreference = <T>(
  localStorageKey: string,
  sanitize: (raw: unknown) => T | null,
  defaultValue: T,
): LocalPreference<T> => {
  if (typeof window === 'undefined') {
    return { value: defaultValue, hasStoredValue: false };
  }

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    if (raw === null) {
      return { value: defaultValue, hasStoredValue: false };
    }

    const sanitized = sanitize(JSON.parse(raw));
    return sanitized === null
      ? { value: defaultValue, hasStoredValue: false }
      : { value: sanitized, hasStoredValue: true };
  } catch {
    return { value: defaultValue, hasStoredValue: false };
  }
};

const writeLocalPreference = (localStorageKey: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localStorageKey, JSON.stringify(value));
  } catch {
    // Preferences are a cache; storage failures must not interrupt the UI.
  }
};

const loadAllPreferences = (userId: string): Promise<Record<string, unknown>> => {
  if (cachedPreferences.userId !== userId) {
    cachedPreferences = { userId, value: null, promise: null };
  }

  if (cachedPreferences.value) {
    return Promise.resolve(cachedPreferences.value);
  }

  if (!cachedPreferences.promise) {
    cachedPreferences.promise = api.preferences.getAll()
      .then((value) => {
        cachedPreferences = { userId, value, promise: null };
        return value;
      })
      .catch((error: unknown) => {
        cachedPreferences = { userId, value: null, promise: null };
        throw error;
      });
  }

  return cachedPreferences.promise;
};

const updateCachedPreference = (userId: string, namespace: string, value: unknown) => {
  if (cachedPreferences.userId !== userId || !cachedPreferences.value) return;
  cachedPreferences = {
    ...cachedPreferences,
    value: {
      ...cachedPreferences.value,
      [namespace]: value,
    },
  };
};

const putWithRetry = async (namespace: string, value: unknown, shouldContinue: () => boolean) => {
  if (!shouldContinue()) return;
  try {
    await api.preferences.put(namespace, value);
    return;
  } catch {
    if (!shouldContinue()) return;
  }

  try {
    await api.preferences.put(namespace, value);
  } catch {
    // Silent by design: preference sync must not break the interactive surface.
  }
};

/**
 * Returns a local-first preference tuple.
 *
 * The first item is the sanitized preference value. The setter updates React
 * state and localStorage synchronously, then debounces authenticated server
 * persistence by 1000ms with one silent retry.
 */
export const useServerPreference = <T>(
  namespace: string,
  localStorageKey: string,
  sanitize: (raw: unknown) => T | null,
  defaultValue: T,
): [T, ServerPreferenceSetter<T>] => {
  const { isAuthenticated, user } = useAuth();
  const initialLocal = useMemo(
    () => readLocalPreference(localStorageKey, sanitize, defaultValue),
    [defaultValue, localStorageKey, sanitize],
  );
  const [value, setValue] = useState<T>(initialLocal.value);
  const valueRef = useRef(value);
  const sanitizeRef = useRef(sanitize);
  const authenticatedRef = useRef(isAuthenticated);
  const userIdRef = useRef(user?.id ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedRef = useRef(false);
  const initialLocalRef = useRef(initialLocal);

  useEffect(() => {
    sanitizeRef.current = sanitize;
  }, [sanitize]);

  useEffect(() => {
    authenticatedRef.current = isAuthenticated;
    userIdRef.current = user?.id ?? '';
    if (!isAuthenticated && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const userId = user?.id ?? 'authenticated';
    let cancelled = false;

    loadAllPreferences(userId)
      .then((preferences) => {
        if (cancelled || !authenticatedRef.current) return;
        if (Object.prototype.hasOwnProperty.call(preferences, namespace)) {
          const sanitized = sanitizeRef.current(preferences[namespace]);
          if (sanitized !== null) {
            valueRef.current = sanitized;
            setValue(sanitized);
            writeLocalPreference(localStorageKey, sanitized);
          }
          return;
        }

        if (!initialLocalRef.current.hasStoredValue || migratedRef.current) return;
        migratedRef.current = true;
        const localValue = initialLocalRef.current.value;
        void putWithRetry(namespace, localValue, () => !cancelled && authenticatedRef.current)
          .then(() => {
            updateCachedPreference(userId, namespace, localValue);
          });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, localStorageKey, namespace, user?.id]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const setPreference = useCallback((update: PreferenceUpdate<T>) => {
    const next = typeof update === 'function'
      ? (update as (current: T) => T)(valueRef.current)
      : update;

    valueRef.current = next;
    setValue(next);
    writeLocalPreference(localStorageKey, next);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!authenticatedRef.current) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!authenticatedRef.current) return;
      const userId = userIdRef.current || 'authenticated';
      void putWithRetry(namespace, next, () => authenticatedRef.current)
        .then(() => {
          updateCachedPreference(userId, namespace, next);
        });
    }, DEBOUNCE_MS);
  }, [localStorageKey, namespace]);

  return [value, setPreference];
};
