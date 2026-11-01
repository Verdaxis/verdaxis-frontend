import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  getTradeAlertPermission,
  requestTradeAlertPermission,
  whenSignInPromptSettled,
  type TradeAlertPermission,
} from '../services/tradeAlertNotifications';
import {
  isTradeAlertPromptSnoozed,
  readTradeAlertPreferences,
  snoozeTradeAlertPrompt,
  subscribeTradeAlertPreferences,
} from '../services/tradeAlertPreferences';

/**
 * Wait before the card first appears. It lets the page settle, and gives the
 * browser prompt from sign-in time to be answered so the two never compete.
 */
export const PROMPT_DELAY_MS = 8000;
/** How long the "notifications are on" confirmation stays on screen. */
export const PROMPT_CONFIRMATION_MS = 4000;

export interface TradeAlertPrompt {
  /** The offer is on screen. */
  visible: boolean;
  /** The brief "notifications are on" message is on screen instead. */
  confirmed: boolean;
  /** Call from the click handler: the browser prompt needs the gesture. */
  turnOn: () => void;
  /** "Not now": hides the card for a week; after three, for good. */
  notNow: () => void;
}

/**
 * The in-page offer to turn on browser notifications. Safari and Firefox show
 * the browser prompt only after a click, so a signed-in user who never saw one
 * gets this card instead. It shows only while every condition holds:
 * signed in, notifications supported, permission still undecided, the user has
 * not turned notifications off in Settings, not snoozed, no assisted Market
 * Support context, and the start-up delay has passed.
 */
export const useTradeAlertPrompt = (userId: string, isMarketSupportActive: boolean): TradeAlertPrompt => {
  const preferences = useSyncExternalStore(
    subscribeTradeAlertPreferences,
    () => readTradeAlertPreferences(userId),
    () => readTradeAlertPreferences(''),
  );
  const [permission, setPermission] = useState<TradeAlertPermission>(getTradeAlertPermission);
  const [delayPassed, setDelayPassed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // A choice made in another tab changes the browser permission for every tab;
  // look again whenever the user comes back to this one. Preference choices
  // (snooze, explicit off) arrive through the preferences store.
  useEffect(() => {
    const refresh = () => {
      setPermission(getTradeAlertPermission());
      setNow(Date.now());
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      void whenSignInPromptSettled().then(() => {
        if (cancelled) return;
        setPermission(getTradeAlertPermission());
        setNow(Date.now());
        setDelayPassed(true);
      });
    }, PROMPT_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId]);

  const offerable = Boolean(userId)
    && !isMarketSupportActive
    && permission === 'default'
    && preferences.notifications !== false
    && !isTradeAlertPromptSnoozed(preferences, now);

  const notNow = useCallback(() => {
    snoozeTradeAlertPrompt(userId, Date.now());
    setNow(Date.now());
  }, [userId]);

  const turnOn = useCallback(() => {
    // The first call in the handler: the browser prompt needs this click.
    void requestTradeAlertPermission().then((answer) => {
      if (!mounted.current) return;
      setPermission(answer);
      if (answer === 'granted') {
        // Notifications are now on through the default-on rule; nothing to store.
        setConfirmed(true);
        setTimeout(() => { if (mounted.current) setConfirmed(false); }, PROMPT_CONFIRMATION_MS);
      } else if (answer === 'default') {
        // Dismissed without an answer: the same as "Not now".
        notNow();
      }
      // `denied` hides the card by itself (permission is no longer `default`),
      // and it cannot be asked again; Settings explains how to allow it.
    });
  }, [notNow]);

  return {
    visible: delayPassed && offerable,
    confirmed,
    turnOn,
    notNow,
  };
};
