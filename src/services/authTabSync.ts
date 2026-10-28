// Cross-tab auth sync. The access token is memory-only per tab, so a logout or
// identity change in one tab would otherwise go unnoticed by the others until
// their next refresh fails. Messages carry only an event type: never a token,
// user id, or any other personal data.

export const AUTH_TAB_SYNC_CHANNEL = 'verdaxis-auth-sync';

export type AuthTabSyncEvent = 'logout' | 'identity_changed';

export interface AuthTabSync {
  /** Tell the other tabs about an event that happened in this tab. */
  broadcast: (event: AuthTabSyncEvent) => void;
  close: () => void;
}

const NO_TAB_SYNC: AuthTabSync = { broadcast: () => undefined, close: () => undefined };

function isAuthTabSyncEvent(value: unknown): value is AuthTabSyncEvent {
  return value === 'logout' || value === 'identity_changed';
}

/**
 * Opens one channel that both listens for events from other tabs and sends
 * this tab's events. A BroadcastChannel object never receives its own
 * messages, so a tab is not notified of what it broadcast itself. Use
 * `onPeerEvent` only to apply state; never broadcast from it, or two tabs
 * would echo the event to each other forever.
 *
 * Returns a no-op when BroadcastChannel is unavailable (older browsers,
 * restricted contexts): tabs then simply do not sync.
 */
export function openAuthTabSync(onPeerEvent: (event: AuthTabSyncEvent) => void): AuthTabSync {
  if (typeof BroadcastChannel === 'undefined') return NO_TAB_SYNC;

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
  } catch {
    return NO_TAB_SYNC;
  }

  channel.onmessage = (message: MessageEvent) => {
    const event = message.data?.type;
    if (isAuthTabSyncEvent(event)) onPeerEvent(event);
  };

  return {
    broadcast: (event) => {
      try {
        channel.postMessage({ type: event });
      } catch {
        // A failed broadcast must never break a local logout.
      }
    },
    close: () => channel.close(),
  };
}
