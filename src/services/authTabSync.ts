// Cross-tab auth sync. The access token is memory-only per tab, so a logout or
// identity change in one tab would otherwise go unnoticed by the others until
// their next refresh fails. Messages carry only an event type (plus a timestamp
// for activity): never a token, user id, or any other personal data.

export const AUTH_TAB_SYNC_CHANNEL = 'verdaxis-auth-sync';

export type AuthTabSyncEvent = 'logout' | 'identity_changed';

/**
 * Longest gap between two activity messages from one tab. Activity events such
 * as scroll can fire many times a second, so they are throttled. Against the
 * 30 minute idle timeout, 30 seconds keeps the channel quiet (at most two
 * messages a minute per tab) and costs little accuracy: a peer sees the user's
 * last activity at most 30 seconds late, so it can sign the user out up to 30
 * seconds early, and never late.
 */
export const ACTIVITY_BROADCAST_INTERVAL_MS = 30 * 1000;

export interface AuthTabSync {
  /** Tell the other tabs about an event that happened in this tab. */
  broadcast: (event: AuthTabSyncEvent) => void;
  /**
   * Tell the other tabs that the user was active here just now. Call it on
   * every user input: it throttles itself to one message per
   * `ACTIVITY_BROADCAST_INTERVAL_MS`.
   */
  reportActivity: () => void;
  close: () => void;
}

const NO_TAB_SYNC: AuthTabSync = {
  broadcast: () => undefined,
  reportActivity: () => undefined,
  close: () => undefined,
};

function isAuthTabSyncEvent(value: unknown): value is AuthTabSyncEvent {
  return value === 'logout' || value === 'identity_changed';
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Opens one channel that both listens for events from other tabs and sends
 * this tab's events. A BroadcastChannel object never receives its own
 * messages, so a tab is not notified of what it broadcast itself. Use
 * `onPeerEvent` only to apply state; never broadcast from it, or two tabs
 * would echo the event to each other forever. The same rule applies to
 * `onPeerActivity`, which receives the epoch milliseconds at which the user
 * last acted in another tab.
 *
 * Returns a no-op when BroadcastChannel is unavailable (older browsers,
 * restricted contexts): tabs then simply do not sync.
 */
export function openAuthTabSync(
  onPeerEvent: (event: AuthTabSyncEvent) => void,
  onPeerActivity: (activeAt: number) => void = () => undefined,
): AuthTabSync {
  if (typeof BroadcastChannel === 'undefined') return NO_TAB_SYNC;

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
  } catch {
    return NO_TAB_SYNC;
  }

  channel.onmessage = (message: MessageEvent) => {
    const event = message.data?.type;
    if (isAuthTabSyncEvent(event)) {
      onPeerEvent(event);
    } else if (event === 'activity' && isTimestamp(message.data?.at)) {
      onPeerActivity(message.data.at);
    }
  };

  const post = (data: { type: string; at?: number }) => {
    try {
      channel.postMessage(data);
    } catch {
      // A failed broadcast must never break a local logout.
    }
  };

  let lastActivityBroadcastAt = -Infinity;

  return {
    broadcast: (event) => post({ type: event }),
    reportActivity: () => {
      const now = Date.now();
      const sinceLastBroadcast = now - lastActivityBroadcastAt;
      // A negative gap means the system clock moved back: send, do not stall.
      if (sinceLastBroadcast >= 0 && sinceLastBroadcast < ACTIVITY_BROADCAST_INTERVAL_MS) return;
      lastActivityBroadcastAt = now;
      post({ type: 'activity', at: now });
    },
    close: () => channel.close(),
  };
}
