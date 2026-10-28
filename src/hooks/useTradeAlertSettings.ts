import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  isTradeNotificationOn,
  readTradeAlertPreferences,
  subscribeTradeAlertPreferences,
  writeTradeAlertPreferences,
} from '../services/tradeAlertPreferences';
import {
  getTradeAlertPermission,
  requestTradeAlertPermission,
  type TradeAlertPermission,
} from '../services/tradeAlertNotifications';
import { playTradeAlertTone, unlockTradeAlertAudio } from '../services/tradeAlertSound';

export interface TradeAlertSettings {
  soundEnabled: boolean;
  /** On when the browser allows notifications and the user has not chosen off. */
  notificationsEnabled: boolean;
  /** The browser's own answer; `denied` and `unsupported` explain a toggle that stays off. */
  notificationPermission: TradeAlertPermission;
  setSoundEnabled: (enabled: boolean) => void;
  /** Call from a click handler: turning it on may show the browser permission prompt. */
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Reads and changes the two trade-alert settings for one user on this device.
 * Sound is off until the user turns it on; notifications are on once the
 * browser permission is granted, unless the user chose off.
 */
export const useTradeAlertSettings = (userId: string): TradeAlertSettings => {
  const preferences = useSyncExternalStore(
    subscribeTradeAlertPreferences,
    () => readTradeAlertPreferences(userId),
    () => readTradeAlertPreferences(''),
  );
  const [notificationPermission, setNotificationPermission] = useState<TradeAlertPermission>(getTradeAlertPermission);

  // The user can change the browser's site setting at any time; look again
  // whenever they come back to this tab.
  useEffect(() => {
    const refresh = () => setNotificationPermission(getTradeAlertPermission());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    const current = readTradeAlertPreferences(userId);
    writeTradeAlertPreferences(userId, { ...current, sound: enabled });
    if (enabled) {
      // This click is the user gesture that lets the browser play audio.
      // The preview tone confirms it works.
      if (unlockTradeAlertAudio()) playTradeAlertTone('done');
    }
  }, [userId]);

  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    const save = (value: boolean) => writeTradeAlertPreferences(
      userId,
      { ...readTradeAlertPreferences(userId), notifications: value },
    );
    if (!enabled) {
      save(false);
      return;
    }

    // First await in this handler: the permission prompt needs the click.
    const permission = await requestTradeAlertPermission();
    setNotificationPermission(permission);
    save(permission === 'granted');
  }, [userId]);

  return {
    soundEnabled: preferences.sound,
    notificationsEnabled: isTradeNotificationOn(preferences, notificationPermission === 'granted'),
    notificationPermission,
    setSoundEnabled,
    setNotificationsEnabled,
  };
};
