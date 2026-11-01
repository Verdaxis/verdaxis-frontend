// Trade stream events carry no actor, so the user who confirms or declines a
// trade would also hear the alert tone (and could get the browser notification)
// for the event their own click produced. Before sending the command, the
// tab records which event it expects for that trade. `useTradeAlerts` skips the
// sound and the browser notification for a matching event.
//
// The record is shared with the other tabs of this browser over a
// BroadcastChannel, because every tab has its own trade stream and receives the
// same event. Like `authTabSync` and `tradeAlertElection`, it is feature
// detected, and its messages hold only a trade id and an event name: no user,
// organization, price or quantity.
//
// What it does not cover: a teammate (same organization, another browser) still
// gets the alert for an event that this user caused. The stream gives no way
// to tell the two apart.

export type OwnTradeActionEvent = 'trade_confirmed' | 'trade_declined';

export const OWN_TRADE_ACTION_CHANNEL = 'verdaxis-own-trade-actions';

/**
 * How long a recorded action can silence its event. The event normally follows
 * the click within a second or two (the server commits, the dispatcher
 * sequences the row, the stream delivers it). A minute leaves room for a slow
 * network or a stream that is reconnecting, and stays short enough that a
 * different later event for the same trade (or one the click never produced,
 * after a failed request) is not hidden for long.
 */
export const OWN_TRADE_ACTION_TTL_MS = 60 * 1000;

/** The most records kept at once; the oldest are dropped first. */
const MAX_RECORDS = 200;
const MAX_TRADE_ID_LENGTH = 64;

type MessageKind = 'record' | 'forget';

interface OwnTradeActionMessage {
    type: 'own_trade_action';
    kind: MessageKind;
    tradeId: string;
    event: OwnTradeActionEvent;
}

const isOwnTradeActionEvent = (value: unknown): value is OwnTradeActionEvent => (
    value === 'trade_confirmed' || value === 'trade_declined'
);

const isOwnTradeActionMessage = (value: unknown): value is OwnTradeActionMessage => {
    if (typeof value !== 'object' || value === null) return false;
    const message = value as Record<string, unknown>;
    return message.type === 'own_trade_action'
        && (message.kind === 'record' || message.kind === 'forget')
        && typeof message.tradeId === 'string'
        && message.tradeId.length > 0
        && message.tradeId.length <= MAX_TRADE_ID_LENGTH
        && isOwnTradeActionEvent(message.event);
};

// key -> time after which the record no longer counts. Insertion order is age order.
const expiryByKey = new Map<string, number>();

const keyOf = (tradeId: string, event: OwnTradeActionEvent): string => `${event}:${tradeId}`;

const dropExpired = (now: number): void => {
    for (const [key, expiresAt] of expiryByKey) {
        if (expiresAt <= now) expiryByKey.delete(key);
    }
};

const rememberLocally = (tradeId: string, event: OwnTradeActionEvent): void => {
    const now = Date.now();
    dropExpired(now);
    const key = keyOf(tradeId, event);
    // Re-insert so a repeated action counts as the newest record.
    expiryByKey.delete(key);
    expiryByKey.set(key, now + OWN_TRADE_ACTION_TTL_MS);
    while (expiryByKey.size > MAX_RECORDS) {
        const oldest = expiryByKey.keys().next().value;
        if (oldest === undefined) break;
        expiryByKey.delete(oldest);
    }
};

const forgetLocally = (tradeId: string, event: OwnTradeActionEvent): void => {
    expiryByKey.delete(keyOf(tradeId, event));
};

const createChannel = (): BroadcastChannel | null => {
    if (typeof BroadcastChannel === 'undefined') return null;
    try {
        return new BroadcastChannel(OWN_TRADE_ACTION_CHANNEL);
    } catch {
        return null;
    }
};

let listeningChannel: BroadcastChannel | null = null;
let listenerCount = 0;

const send = (message: OwnTradeActionMessage): void => {
    // Use the open listening channel, or a short-lived one: a message posted
    // before `close()` is still delivered.
    const channel = listeningChannel ?? createChannel();
    if (!channel) return;
    try {
        channel.postMessage(message);
    } catch {
        // A failed broadcast only means other tabs may still play the tone.
    } finally {
        if (channel !== listeningChannel) channel.close();
    }
};

/**
 * Remember that this user is about to cause `event` for the trade, and tell the
 * other tabs. Call it BEFORE sending the command: the stream event can reach the
 * browser before the HTTP response does.
 */
export const recordOwnTradeAction = (tradeId: string, event: OwnTradeActionEvent): void => {
    if (!tradeId) return;
    rememberLocally(tradeId, event);
    send({ type: 'own_trade_action', kind: 'record', tradeId, event });
};

/**
 * Withdraw a record after the command failed for certain, so the same event
 * from someone else is not silenced. Do not call it when the outcome is unknown.
 */
export const forgetOwnTradeAction = (tradeId: string, event: OwnTradeActionEvent): void => {
    if (!tradeId) return;
    forgetLocally(tradeId, event);
    send({ type: 'own_trade_action', kind: 'forget', tradeId, event });
};

/**
 * True while a recorded action of this browser expects `event` for the trade.
 * The record stays until it expires, so a replay of the same event right after a
 * reconnect is still recognised.
 */
export const isOwnTradeAction = (tradeId: string | null, event: string): boolean => {
    if (!tradeId || !isOwnTradeActionEvent(event)) return false;
    dropExpired(Date.now());
    return expiryByKey.has(keyOf(tradeId, event));
};

/**
 * Start receiving records from the other tabs. Every caller gets its own
 * release function; the channel closes with the last one.
 */
export const watchPeerTradeActions = (): (() => void) => {
    if (listenerCount === 0) {
        const channel = createChannel();
        if (channel) {
            channel.onmessage = (message: MessageEvent) => {
                if (!isOwnTradeActionMessage(message.data)) return;
                const { kind, tradeId, event } = message.data;
                if (kind === 'record') rememberLocally(tradeId, event);
                else forgetLocally(tradeId, event);
            };
        }
        listeningChannel = channel;
    }
    listenerCount += 1;

    let released = false;
    return () => {
        if (released) return;
        released = true;
        listenerCount -= 1;
        if (listenerCount === 0) {
            listeningChannel?.close();
            listeningChannel = null;
        }
    };
};

/** Clears every record. For sign-out and for tests. */
export const clearOwnTradeActions = (): void => {
    expiryByKey.clear();
};

if (typeof window !== 'undefined') {
    window.addEventListener('verdaxis:auth-logout', clearOwnTradeActions);
}
