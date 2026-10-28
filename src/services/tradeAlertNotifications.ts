// Browser notifications for trade alerts. This is the ONLY module that asks for
// notification permission, and only `requestTradeAlertPermission` does so: call
// it from the click handler of the Settings toggle, never on page load.

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
