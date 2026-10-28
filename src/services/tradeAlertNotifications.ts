// Browser notifications for trade alerts. This is the ONLY module that asks for
// notification permission, and only two functions do so, both from a user
// gesture: `requestTradeAlertPermission` (the Settings toggle) and
// `requestTradeAlertPermissionAtSignIn` (the sign-in submit). Never on page
// load and never when a session is restored from a cookie.

export type TradeAlertPermission = NotificationPermission | 'unsupported';

export const getTradeAlertPermission = (): TradeAlertPermission => {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return 'unsupported';
  return window.Notification.permission;
};

/**
 * Shows the browser permission prompt when the choice is still open. A granted
 * or denied choice is returned as is, without a prompt.
 */
export const requestTradeAlertPermission = async (): Promise<TradeAlertPermission> => {
  const current = getTradeAlertPermission();
  if (current !== 'default') return current;

  try {
    return await window.Notification.requestPermission();
  } catch {
    return getTradeAlertPermission();
  }
};

/**
 * Offers the browser permission prompt when a user signs in.
 *
 * Call it SYNCHRONOUSLY at the start of the sign-in handler, before any
 * `await`: Safari and Firefox ignore a prompt outside a user gesture, and
 * Chrome's transient activation expires. It never waits for the answer, so it
 * cannot delay sign-in, and it swallows every error. It asks only while the
 * choice is still open (`default`): a granted choice needs no prompt, and a
 * denied one cannot be asked again (Settings explains how to allow it).
 */
export const requestTradeAlertPermissionAtSignIn = (): void => {
  if (getTradeAlertPermission() !== 'default') return;

  try {
    // Old Safari returns nothing and takes a callback; a modern browser returns a promise.
    void Promise.resolve(window.Notification.requestPermission()).catch(() => undefined);
  } catch {
    // Sign-in must never depend on the prompt.
  }
};

export interface TradeAlertNotificationInput {
  title: string;
  body: string;
  /** Notifications with the same tag replace each other, so one event shows once. */
  tag: string;
  onClick: () => void;
}

/** Shows one notification. Returns false when permission is missing or the browser refuses. */
export const showTradeAlertNotification = ({ title, body, tag, onClick }: TradeAlertNotificationInput): boolean => {
  if (getTradeAlertPermission() !== 'granted') return false;

  try {
    const notification = new window.Notification(title, { body, tag });
    notification.onclick = () => {
      notification.close();
      onClick();
    };
    return true;
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
    return false;
  }
};
