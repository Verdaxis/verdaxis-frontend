import { describe, expect, it, vi } from 'vitest';

import {
  COOKIE_PREFERENCES_STORAGE_KEY,
  hasOutdatedCookiePreferences,
  readCookiePreferences,
  subscribeCookiePreferences,
  writeCookiePreferences,
} from '../services/cookiePreferences';

describe('cookie preferences storage', () => {
  it('persists the versioned optional analytics choice', () => {
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
    };

    expect(writeCookiePreferences(true, { storage, window })).toBe(true);
    expect(readCookiePreferences(storage)).toEqual({ version: 2, optionalAnalytics: true });
    expect(JSON.parse(stored.get(COOKIE_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      optionalAnalytics: true,
    });
  });

  it('treats malformed, unknown, and unavailable storage as no consent', () => {
    expect(readCookiePreferences({ getItem: () => '{bad json' })).toBeNull();
    expect(readCookiePreferences({ getItem: () => JSON.stringify({ version: 1, optionalAnalytics: true }) })).toBeNull();
    expect(readCookiePreferences({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
    expect(writeCookiePreferences(true, {
      storage: { setItem: () => { throw new Error('blocked'); } },
      window,
    })).toBe(false);
  });

  it('requires a fresh choice when the stored preference predates identified activity', () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 1, optionalAnalytics: true }),
    };

    expect(readCookiePreferences(storage)).toBeNull();
    expect(hasOutdatedCookiePreferences(storage)).toBe(true);
  });

  it('notifies subscribers after same-tab and cross-tab changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCookiePreferences(listener, window);

    window.dispatchEvent(new CustomEvent('verdaxis:cookie-preferences-changed'));
    window.dispatchEvent(new StorageEvent('storage', { key: COOKIE_PREFERENCES_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));

    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
