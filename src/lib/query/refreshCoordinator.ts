interface RefreshEntry {
    listeners: Set<() => Promise<unknown>>;
    dirty: boolean;
    running: boolean;
    timer?: ReturnType<typeof setTimeout>;
}

const REFRESH_BATCH_MS = 500;

export function createRefreshCoordinator(initiallyVisible = true) {
    const entries = new Map<string, RefreshEntry>();
    let visible = initiallyVisible;
    let disposed = false;

    const schedule = (key: string, entry: RefreshEntry, delay = REFRESH_BATCH_MS) => {
        if (disposed || !visible || !entry.dirty || entry.running || entry.timer || !entry.listeners.size) return;
        entry.timer = setTimeout(async () => {
            entry.timer = undefined;
            if (disposed || !visible || entries.get(key) !== entry) return;
            entry.dirty = false;
            entry.running = true;
            try {
                await Promise.allSettled([...entry.listeners].map(refresh => Promise.resolve().then(refresh)));
            } finally {
                entry.running = false;
                if (entries.get(key) === entry) schedule(key, entry);
            }
        }, delay);
    };

    return {
        subscribe(key: string, refresh: () => Promise<unknown>) {
            const entry = entries.get(key) ?? { listeners: new Set(), dirty: false, running: false };
            entry.listeners.add(refresh);
            entries.set(key, entry);
            schedule(key, entry);
            return () => {
                entry.listeners.delete(refresh);
                if (!entry.listeners.size) {
                    clearTimeout(entry.timer);
                    entries.delete(key);
                }
            };
        },
        markDirty(key: string, delay = REFRESH_BATCH_MS) {
            const entry = entries.get(key);
            if (!entry || disposed) return;
            entry.dirty = true;
            if (delay === 0 && !entry.running && visible) {
                clearTimeout(entry.timer);
                entry.timer = undefined;
                // The public owner already applied its 500 ms batch.
                entry.running = true;
                entry.dirty = false;
                void Promise.allSettled([...entry.listeners].map(refresh => Promise.resolve().then(refresh))).finally(() => {
                    entry.running = false;
                    if (entries.get(key) === entry) schedule(key, entry);
                });
            } else schedule(key, entry, delay);
        },
        setVisible(next: boolean) {
            visible = next;
            for (const [key, entry] of entries) {
                if (!visible) {
                    clearTimeout(entry.timer);
                    entry.timer = undefined;
                } else schedule(key, entry);
            }
        },
        dispose() {
            disposed = true;
            for (const entry of entries.values()) clearTimeout(entry.timer);
            entries.clear();
        },
    };
}
