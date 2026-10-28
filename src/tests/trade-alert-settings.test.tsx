import React from 'react';
import { act, cleanup, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../components/Settings';
import { useTradeAlertSettings } from '../hooks/useTradeAlertSettings';
import { readTradeAlertPreferences, tradeAlertStorageKey } from '../services/tradeAlertPreferences';
import { renderWithProviders } from './test-utils';

const soundControl = vi.hoisted(() => ({
  unlock: vi.fn(() => true),
  play: vi.fn(() => true),
}));

vi.mock('../services/tradeAlertSound', () => ({
  unlockTradeAlertAudio: soundControl.unlock,
  playTradeAlertTone: soundControl.play,
}));
vi.mock('../services/api', () => ({ api: { subscriptions: { fees: vi.fn(), me: vi.fn() } } }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test', last_name: 'Buyer', email: 'buyer@example.test', role: 'BUYER' },
    token: 'test-token',
    login: vi.fn(),
  }),
}));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));
vi.mock('../hooks/useServerPreference', () => ({
  useServerPreference: (_ns: string, _key: string, _sanitize: unknown, defaults: unknown) => [defaults, vi.fn()],
}));
vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('../components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));

const installNotification = (permission: NotificationPermission, onRequest?: NotificationPermission) => {
  const requestPermission = vi.fn(async () => onRequest ?? permission);
  const FakeNotification = Object.assign(vi.fn(), { permission, requestPermission });
  vi.stubGlobal('Notification', FakeNotification);
  Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
  return requestPermission;
};

const SOUND_LABEL = 'Play a sound for trade events';
const BROWSER_LABEL = 'Show browser notifications when Verdaxis is in the background';

describe('trade alert settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'Notification');
  });

  describe('hook', () => {
    it('has both settings off by default and never asks for permission on its own', () => {
      const requestPermission = installNotification('default');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      expect(result.current.soundEnabled).toBe(false);
      expect(result.current.notificationsEnabled).toBe(false);
      expect(result.current.notificationPermission).toBe('default');
      expect(requestPermission).not.toHaveBeenCalled();
    });

    it('asks for permission only when notifications are turned on, then saves the choice', async () => {
      const requestPermission = installNotification('default', 'granted');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      await act(async () => { await result.current.setNotificationsEnabled(true); });

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(result.current.notificationPermission).toBe('granted');
      expect(result.current.notificationsEnabled).toBe(true);
      expect(readTradeAlertPreferences('user-1').notifications).toBe(true);
    });

    it('keeps the setting off and reports the denied state when permission is refused', async () => {
      const requestPermission = installNotification('default', 'denied');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      await act(async () => { await result.current.setNotificationsEnabled(true); });

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(result.current.notificationPermission).toBe('denied');
      expect(result.current.notificationsEnabled).toBe(false);
      expect(readTradeAlertPreferences('user-1').notifications).toBe(false);
    });

    it('keeps the setting off when the permission prompt is dismissed', async () => {
      installNotification('default', 'default');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      await act(async () => { await result.current.setNotificationsEnabled(true); });

      expect(result.current.notificationsEnabled).toBe(false);
      expect(result.current.notificationPermission).toBe('default');
    });

    it('does not show the prompt again when the browser has already blocked it', async () => {
      const requestPermission = installNotification('denied');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      await act(async () => { await result.current.setNotificationsEnabled(true); });

      expect(requestPermission).not.toHaveBeenCalled();
      expect(result.current.notificationsEnabled).toBe(false);
    });

    it('turns itself off in the UI when the browser permission is later revoked', () => {
      installNotification('granted');
      window.localStorage.setItem(tradeAlertStorageKey('user-1'), JSON.stringify({ sound: false, notifications: true }));
      const granted = renderHook(() => useTradeAlertSettings('user-1'));
      expect(granted.result.current.notificationsEnabled).toBe(true);
      granted.unmount();

      installNotification('denied');
      const revoked = renderHook(() => useTradeAlertSettings('user-1'));
      expect(revoked.result.current.notificationsEnabled).toBe(false);
    });

    it('reports an unsupported browser without failing', async () => {
      Reflect.deleteProperty(window, 'Notification');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      await act(async () => { await result.current.setNotificationsEnabled(true); });

      expect(result.current.notificationPermission).toBe('unsupported');
      expect(result.current.notificationsEnabled).toBe(false);
    });

    it('turning notifications off never prompts', async () => {
      const requestPermission = installNotification('granted');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));
      await act(async () => { await result.current.setNotificationsEnabled(true); });
      await act(async () => { await result.current.setNotificationsEnabled(false); });

      expect(requestPermission).not.toHaveBeenCalled();
      expect(readTradeAlertPreferences('user-1').notifications).toBe(false);
    });

    it('unlocks audio and plays a preview in the click that turns sound on', () => {
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));

      act(() => result.current.setSoundEnabled(true));

      expect(result.current.soundEnabled).toBe(true);
      expect(soundControl.unlock).toHaveBeenCalledTimes(1);
      expect(soundControl.play).toHaveBeenCalledWith('done');

      act(() => result.current.setSoundEnabled(false));
      expect(result.current.soundEnabled).toBe(false);
      expect(soundControl.play).toHaveBeenCalledTimes(1);
    });

    it('keeps each user\'s choice separate on the same device', () => {
      const first = renderHook(() => useTradeAlertSettings('user-1'));
      act(() => first.result.current.setSoundEnabled(true));

      const second = renderHook(() => useTradeAlertSettings('user-2'));
      expect(second.result.current.soundEnabled).toBe(false);
    });

    it('ignores corrupt stored values', () => {
      window.localStorage.setItem(tradeAlertStorageKey('user-1'), '{not json');
      const { result } = renderHook(() => useTradeAlertSettings('user-1'));
      expect(result.current.soundEnabled).toBe(false);
      expect(result.current.notificationsEnabled).toBe(false);
    });
  });

  describe('Settings page', () => {
    const openNotifications = async () => {
      renderWithProviders(<Settings viewMode="BUYER" />);
      fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    };

    it('shows both toggles off by default', async () => {
      installNotification('default');
      await openNotifications();

      expect(screen.getByRole('button', { name: SOUND_LABEL }).getAttribute('aria-pressed')).toBe('false');
      expect(screen.getByRole('button', { name: BROWSER_LABEL }).getAttribute('aria-pressed')).toBe('false');
    });

    it('asks for permission in the toggle click, and turns on when it is granted', async () => {
      const requestPermission = installNotification('default', 'granted');
      await openNotifications();
      expect(requestPermission).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: BROWSER_LABEL }));

      await waitFor(() => expect(
        screen.getByRole('button', { name: BROWSER_LABEL }).getAttribute('aria-pressed'),
      ).toBe('true'));
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });

    it('shows the blocked state and keeps the toggle off when permission is denied', async () => {
      installNotification('default', 'denied');
      await openNotifications();

      fireEvent.click(screen.getByRole('button', { name: BROWSER_LABEL }));

      expect((await screen.findByRole('status')).textContent).toContain('blocked');
      expect(screen.getByRole('button', { name: BROWSER_LABEL }).getAttribute('aria-pressed')).toBe('false');
    });
  });
});
