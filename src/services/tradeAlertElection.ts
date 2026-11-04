// Cross-tab election for trade alerts. Every open tab has its own trade event
// stream, so each tab receives each event. Exactly one tab should make the
// sound or show the notification.
//
// Why a BroadcastChannel claim and not Web Locks: the winner must be a tab
// that is in front, when there is one (it has a user gesture behind its audio,
// and a visible tab means Verdaxis is not "in the background", so no
// notification). A lock only says who asked first; it cannot rank visibility.
// This follows `authTabSync`: feature-detected, messages carry no personal
// data (a random tab id, a visibility flag, and an opaque event key).
//
// Protocol, per event key:
//   1. A tab that receives the event records its own claim and broadcasts it.
//   2. It waits CLAIM_WINDOW_MS for claims from other tabs.
//   3. The best claim wins: a visible tab beats a hidden one, then the lowest
//      tab id. Every tab ranks the same claims, so they agree.
//   4. A tab that is late, because another tab's claim is already older than
//      the window, has lost: that tab has already decided.
//
// Residual risk: if two tabs receive the same event more than about one window
// apart AND a third tab claims between them, two tabs can both alert. Streams
// of one user deliver within milliseconds, so this is not expected.

export const TRADE_ALERT_ELECTION_CHANNEL = 'verdaxis-trade-alert-election';
/** Long enough for a claim to cross tabs on one machine; short enough that an alert feels instant. */
export const CLAIM_WINDOW_MS = 200;
/** How long a decided key is remembered, so a replayed event is not alerted twice. */
export const CLAIM_MEMORY_MS = 10 * 60 * 1000;

export interface ElectionResult {
  /** True in exactly one tab per key. */
  won: boolean;
  /** True when any competing tab, this one included, was in front at decision time. */
  anyTabVisible: boolean;
}

export interface TradeAlertElection {
  claim: (key: string) => Promise<ElectionResult>;
  close: () => void;
}

interface Claim {
  tabId: string;
  visible: boolean;
  receivedAt: number;
}

interface ClaimMessage {
  type: 'claim';
  key: string;
  tabId: string;
  visible: boolean;
}

const isClaimMessage = (value: unknown): value is ClaimMessage => {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.type === 'claim'
    && typeof message.key === 'string'
    && typeof message.tabId === 'string'
    && typeof message.visible === 'boolean';
};

const newTabId = (): string => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
);

const isDocumentVisible = (): boolean => (
  typeof document === 'undefined' || document.visibilityState === 'visible'
);

/** A visible tab beats a hidden one; ties go to the lower tab id. */
const compareClaims = (a: Claim, b: Claim): number => {
  if (a.visible !== b.visible) return a.visible ? -1 : 1;
  return a.tabId < b.tabId ? -1 : a.tabId > b.tabId ? 1 : 0;
};

/**
 * Opens the election. Without BroadcastChannel (older browsers, restricted
 * contexts) each tab can only decide for itself, so every tab wins; a key
 * already handled in this tab is still refused, which de-duplicates replays.
 */
export function openTradeAlertElection(): TradeAlertElection {
  const tabId = newTabId();
  const claimsByKey = new Map<string, Claim[]>();
  const ownKeys = new Set<string>();

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(TRADE_ALERT_ELECTION_CHANNEL);
    } catch {
      channel = null;
    }
  }

  const prune = (now: number) => {
    for (const [key, claims] of claimsByKey) {
      if (claims.every((claim) => now - claim.receivedAt > CLAIM_MEMORY_MS)) {
        claimsByKey.delete(key);
        ownKeys.delete(key);
      }
    }
  };

  const record = (key: string, claim: Claim) => {
    const claims = claimsByKey.get(key) ?? [];
    claims.push(claim);
    claimsByKey.set(key, claims);
  };

  if (channel) {
    channel.onmessage = (message: MessageEvent) => {
      if (!isClaimMessage(message.data) || message.data.tabId === tabId) return;
      const now = Date.now();
      prune(now);
      record(message.data.key, { tabId: message.data.tabId, visible: message.data.visible, receivedAt: now });
    };
  }

  const claim = async (key: string): Promise<ElectionResult> => {
    // Already handled by this tab: a replayed or duplicate event.
    if (ownKeys.has(key)) return { won: false, anyTabVisible: false };
    ownKeys.add(key);

    const claimedAt = Date.now();
    prune(claimedAt);
    const own: Claim = { tabId, visible: isDocumentVisible(), receivedAt: claimedAt };
    record(key, own);

    if (!channel) return { won: true, anyTabVisible: own.visible };

    try {
      channel.postMessage({ type: 'claim', key, tabId, visible: own.visible } satisfies ClaimMessage);
    } catch {
      return { won: true, anyTabVisible: own.visible };
    }

    await new Promise<void>((resolve) => setTimeout(resolve, CLAIM_WINDOW_MS));

    const peers = (claimsByKey.get(key) ?? []).filter((candidate) => candidate !== own);
    // A peer claim older than our window means that tab decided before we asked.
    const peerAlreadyDecided = peers.some((peer) => peer.receivedAt < claimedAt - CLAIM_WINDOW_MS);
    if (peerAlreadyDecided) {
      return { won: false, anyTabVisible: peers.some((peer) => peer.visible) };
    }

    // Visibility can change while waiting; the claim keeps what was announced.
    const competitors = [own, ...peers].sort(compareClaims);
    return {
      won: competitors[0] === own,
      anyTabVisible: competitors.some((candidate) => candidate.visible),
    };
  };

  return {
    claim,
    close: () => channel?.close(),
  };
}
