import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TradeAlertPrompt } from '../components/notifications/TradeAlertPrompt';
import { PROMPT_CONFIRMATION_MS, PROMPT_DELAY_MS } from '../hooks/useTradeAlertPrompt';
import i18n, { loadNamespace } from '../i18n';
import { requestTradeAlertPermissionAtSignIn } from '../services/tradeAlertNotifications';
import {
  PROMPT_MAX_SNOOZES,
  PROMPT_SNOOZE_MS,
  DEFAULT_TRADE_ALERT_PREFERENCES,
  readTradeAlertPreferences,
  tradeAlertStorageKey,
  writeTradeAlertPreferences,
} from '../services/tradeAlertPreferences';

const authControl = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }));
const supportControl = vi.hoisted(() => ({ isActive: false }));

vi.mock('../context/AuthContext', () => ({ useAuth: () => authControl }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => supportControl }));

const USER_ID = 'user-1';
const TITLE = 'Get notified when a trade needs you';

type FakeNotification = {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
};

/** Installs a Notification whose prompt resolves with `answer` and applies it, like a browser. */
const installNotification = (permission: NotificationPermission, answer: NotificationPermission = 'granted') => {
  const fake = vi.fn() as unknown as FakeNotification;
  fake.permission = permission;
  fake.requestPermission = vi.fn(async () => {
    fake.permission = answer;
    return answer;
  });
  Object.defineProperty(window, 'Notification', { configurable: true, value: fake });
  return fake;
};

const showAfterDelay = async () => {
  await act(async () => { await vi.advanceTimersByTimeAsync(PROMPT_DELAY_MS); });
};

const renderPrompt = async () => {
  const view = render(<TradeAlertPrompt />);
  await showAfterDelay();
  return view;
};

const card = () => screen.queryByRole('region', { name: 'Trade notifications' });

describe('in-page notification card', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    window.localStorage.clear();
    authControl.user = { id: USER_ID };
    supportControl.isActive = false;
    installNotification('default');
    await loadNamespace('common');
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'Notification');
  });

  describe('when it shows', () => {
    it('shows after the start-up delay, not before, with a labelled region and two buttons', async () => {
      render(<TradeAlertPrompt />);
      expect(card()).toBeNull();

      await act(async () => { await vi.advanceTimersByTimeAsync(PROMPT_DELAY_MS - 1); });
      expect(card()).toBeNull();

      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(card()).not.toBeNull();
      expect(screen.getByText(TITLE)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Turn on notifications' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy();
    });

    it('does not take focus', async () => {
      await renderPrompt();
      expect(card()).not.toBeNull();
      expect(document.activeElement).toBe(document.body);
    });

    it('is localized in Chinese', async () => {
      await i18n.changeLanguage('zh');
      await renderPrompt();
      expect(screen.getByRole('region', { name: '交易通知' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '开启通知' })).toBeTruthy();
    });

    it('does not show for a user who is not signed in', async () => {
      authControl.user = null;
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('does not show in a browser without notifications', async () => {
      Reflect.deleteProperty(window, 'Notification');
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it.each(['granted', 'denied'] as const)('does not show when permission is %s', async (permission) => {
      installNotification(permission);
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('does not show after the user turned notifications off in Settings', async () => {
      writeTradeAlertPreferences(USER_ID, { ...DEFAULT_TRADE_ALERT_PREFERENCES, notifications: false });
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('does not show while snoozed', async () => {
      writeTradeAlertPreferences(USER_ID, {
        ...DEFAULT_TRADE_ALERT_PREFERENCES,
        promptSnoozes: 1,
        promptSnoozedUntil: Date.now() + 60_000,
      });
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('shows again once the snooze has ended', async () => {
      writeTradeAlertPreferences(USER_ID, {
        ...DEFAULT_TRADE_ALERT_PREFERENCES,
        promptSnoozes: 1,
        promptSnoozedUntil: Date.now() - 1,
      });
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();
    });

    it('does not show during an assisted Market Support context', async () => {
      supportControl.isActive = true;
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('hides when a Market Support context starts while it is showing', async () => {
      const view = await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();

      supportControl.isActive = true;
      view.rerender(<TradeAlertPrompt />);
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('shows for a session restored from a cookie (no sign-in click happened)', async () => {
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();
      expect((window.Notification as unknown as FakeNotification).requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('turn on notifications', () => {
    it('asks inside the click, and confirms briefly when granted', async () => {
      const notification = installNotification('default', 'granted');
      await renderPrompt();

      fireEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }));
      // Straight after the click, no await: the prompt ran inside the gesture.
      expect(notification.requestPermission).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(card()).toBeNull();
      expect(screen.getByRole('status').textContent).toContain('Notifications are on.');

      await act(async () => { await vi.advanceTimersByTimeAsync(PROMPT_CONFIRMATION_MS); });
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByText(TITLE)).toBeNull();
      // On through the default-on rule: nothing stored, no snooze.
      expect(readTradeAlertPreferences(USER_ID)).toEqual(DEFAULT_TRADE_ALERT_PREFERENCES);
    });

    it('hides the card for good when the browser denies', async () => {
      installNotification('default', 'denied');
      const view = await renderPrompt();

      fireEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(screen.queryByRole('status')).toBeNull();

      view.unmount();
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(readTradeAlertPreferences(USER_ID).promptSnoozes).toBe(0);
    });

    it('treats a dismissed browser prompt as "Not now"', async () => {
      installNotification('default', 'default');
      await renderPrompt();

      fireEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(screen.queryByText(TITLE)).toBeNull();
      expect(readTradeAlertPreferences(USER_ID).promptSnoozes).toBe(1);
    });
  });

  describe('Not now', () => {
    it('snoozes for 7 days and shows again afterwards', async () => {
      const view = await renderPrompt();
      const clickedAt = Date.now();

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(readTradeAlertPreferences(USER_ID)).toMatchObject({
        promptSnoozes: 1,
        promptSnoozedUntil: clickedAt + PROMPT_SNOOZE_MS,
      });

      // A reload within the week stays hidden.
      view.unmount();
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();

      // A reload after the week shows it again.
      cleanup();
      vi.setSystemTime(clickedAt + PROMPT_SNOOZE_MS + 1);
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();
    });

    it('stops offering after three snoozes', async () => {
      expect(PROMPT_MAX_SNOOZES).toBe(3);
      for (let round = 1; round <= PROMPT_MAX_SNOOZES; round += 1) {
        await renderPrompt();
        expect(screen.getByText(TITLE)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
        cleanup();
        vi.setSystemTime(Date.now() + PROMPT_SNOOZE_MS + 1);
      }

      expect(readTradeAlertPreferences(USER_ID).promptSnoozes).toBe(3);
      await renderPrompt();
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('keeps each user\'s snoozes separate', async () => {
      await renderPrompt();
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      cleanup();

      authControl.user = { id: 'user-2' };
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();
    });

    it('is not shortened by a clock that was set back', async () => {
      writeTradeAlertPreferences(USER_ID, {
        ...DEFAULT_TRADE_ALERT_PREFERENCES,
        promptSnoozes: 1,
        promptSnoozedUntil: Date.now() + 10 * PROMPT_SNOOZE_MS,
      });
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();
    });
  });

  describe('other tabs', () => {
    it('hides when another tab snoozed', async () => {
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();

      const raw = JSON.stringify({
        ...DEFAULT_TRADE_ALERT_PREFERENCES,
        promptSnoozes: 1,
        promptSnoozedUntil: Date.now() + PROMPT_SNOOZE_MS,
      });
      window.localStorage.setItem(tradeAlertStorageKey(USER_ID), raw);
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: tradeAlertStorageKey(USER_ID), newValue: raw }));
      });

      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('hides when another tab turned notifications off', async () => {
      await renderPrompt();

      const raw = JSON.stringify({ ...DEFAULT_TRADE_ALERT_PREFERENCES, notifications: false });
      window.localStorage.setItem(tradeAlertStorageKey(USER_ID), raw);
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: tradeAlertStorageKey(USER_ID), newValue: raw }));
      });

      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it.each(['granted', 'denied'] as const)('hides when another tab was answered %s', async (answer) => {
      const notification = installNotification('default');
      await renderPrompt();
      expect(screen.getByText(TITLE)).toBeTruthy();

      notification.permission = answer; // the browser setting is shared by every tab
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });

      expect(screen.queryByText(TITLE)).toBeNull();
    });
  });

  describe('with the sign-in prompt', () => {
    const openSignInPrompt = (answer: NotificationPermission) => {
      const notification = installNotification('default');
      let finish: () => void = () => undefined;
      notification.requestPermission = vi.fn(() => new Promise<NotificationPermission>((resolve) => {
        finish = () => {
          notification.permission = answer;
          resolve(answer);
        };
      }));
      requestTradeAlertPermissionAtSignIn();
      return { answer: () => finish() };
    };

    it('waits while the sign-in prompt is still open, then stays hidden once it was answered', async () => {
      const signIn = openSignInPrompt('granted');
      render(<TradeAlertPrompt />);
      await showAfterDelay();
      expect(screen.queryByText(TITLE)).toBeNull();

      await act(async () => { signIn.answer(); await vi.advanceTimersByTimeAsync(0); });
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('shows the card if the sign-in prompt ended without an answer', async () => {
      const signIn = openSignInPrompt('default');
      render(<TradeAlertPrompt />);
      await showAfterDelay();
      expect(screen.queryByText(TITLE)).toBeNull();

      await act(async () => { signIn.answer(); await vi.advanceTimersByTimeAsync(0); });
      expect(screen.getByText(TITLE)).toBeTruthy();
    });
  });
});
