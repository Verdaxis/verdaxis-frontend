// Order lifecycle events on the private `trades:{org}` stream (backend
// docs/market-event-dispatch.md). They say that one of the organization's own
// orders changed: a teammate placed, edited or cancelled it, it matched, or it
// expired. They carry an order id and plain order fields, not a trade, so they
// refresh order lists only. They never raise a toast, a notification entry, a
// sound or a trade-list refetch.
//
// `order_outbid` is not listed: the backend defines the builder but never
// emits that event.

export const PRIVATE_ORDER_EVENTS = [
    'order_created',
    'order_updated',
    'order_cancelled',
    'orders_matched',
    'order_expired',
] as const;

const privateOrderEvents: ReadonlySet<string> = new Set(PRIVATE_ORDER_EVENTS);

export const isPrivateOrderEvent = (event: string | undefined): boolean => (
    event !== undefined && privateOrderEvents.has(event)
);

// Stream events that mean "the organization's own orders may have changed":
// the order events, and the two signals that follow a gap in the stream.
export const eventChangesOwnOrders = (event: string): boolean => (
    isPrivateOrderEvent(event) || event === 'reset' || event === 'reconnect'
);

// One matching run can send several events within milliseconds (a new order
// and its matches, a replay after a reconnect). Views reload once per burst.
export const OWN_ORDERS_REFRESH_DEBOUNCE_MS = 500;

type Listener = () => void;

const listeners = new Set<Listener>();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Call `listener` once after a burst of changes to the organization's own
 * orders. The private trade stream is owned by `TradeNotifier`; order views
 * listen here instead of opening a second stream. Returns the unsubscribe
 * function.
 */
export const subscribeToOwnOrderChanges = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** Report a change to the organization's own orders. Listeners run after a short debounce. */
export const announceOwnOrdersChanged = (): void => {
    if (refreshTimer !== null) return;
    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch {
                // One failing view must not stop the others.
            }
        }
    }, OWN_ORDERS_REFRESH_DEBOUNCE_MS);
};
