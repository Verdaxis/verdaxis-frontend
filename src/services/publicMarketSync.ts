type PublicMarketRefresh = () => void | Promise<void>;

interface RefreshSubscriber {
    refresh: PublicMarketRefresh;
    active: boolean;
    running: boolean;
    dirty: boolean;
}

// Batch bursts from duplicate or reconnect signals before refreshing each mounted view.
const REFRESH_DEBOUNCE_MS = 500;
const subscribers = new Set<RefreshSubscriber>();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const runSubscriber = (subscriber: RefreshSubscriber): void => {
    if (!subscriber.active) return;
    if (subscriber.running) {
        subscriber.dirty = true;
        return;
    }

    subscriber.running = true;
    Promise.resolve()
        .then(() => subscriber.refresh())
        .catch(() => undefined)
        .finally(() => {
            subscriber.running = false;
            if (!subscriber.active || !subscriber.dirty) return;
            subscriber.dirty = false;
            runSubscriber(subscriber);
        });
};

export const queuePublicMarketRefresh = (): void => {
    if (refreshTimer !== null) return;
    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        subscribers.forEach(runSubscriber);
    }, REFRESH_DEBOUNCE_MS);
};

export const subscribePublicMarketRefresh = (refresh: PublicMarketRefresh): (() => void) => {
    const subscriber: RefreshSubscriber = {
        refresh,
        active: true,
        running: false,
        dirty: false,
    };
    subscribers.add(subscriber);
    return () => {
        subscriber.active = false;
        subscriber.dirty = false;
        subscribers.delete(subscriber);
    };
};
