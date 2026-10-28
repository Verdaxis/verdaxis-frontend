// A price alert fired on the server. The private trade stream is owned by
// `TradeNotifier`; views that show alerts (Trade History) listen here so they
// reload their list without opening a second stream.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Call `listener` after every triggered price alert. Returns the unsubscribe function. */
export const subscribeToPriceAlertTriggers = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const announcePriceAlertTriggered = (): void => {
    for (const listener of [...listeners]) {
        try {
            listener();
        } catch {
            // One failing view must not stop the others.
        }
    }
};
