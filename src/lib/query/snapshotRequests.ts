interface SnapshotStatus {
    loading: boolean;
    refreshing: boolean;
    error: boolean;
}

interface SnapshotRequestsOptions<T> {
    read: (signal: AbortSignal) => Promise<T>;
    apply: (value: T) => void;
    change: (status: SnapshotStatus) => void;
}

// Query owns the value and freshness; the shared per-key refresh registration
// owns which signals each read covers. This helper only arbitrates the results
// of overlapping ordinary/forced requests within one mounted slice lifecycle.
export function createSnapshotRequests<T>({ read, apply, change }: SnapshotRequestsOptions<T>) {
    let active = true;
    let sequence = 0;
    let applied = 0;
    let accepted: { value: T } | undefined;
    let ordinary: Promise<T> | undefined;
    let forced: Promise<T> | undefined;
    const controllers = new Set<AbortController>();
    const pending = new Set<number>();

    const start = (): Promise<T> => {
        const id = ++sequence;
        const controller = new AbortController();
        controllers.add(controller);
        pending.add(id);
        change({ loading: !accepted, refreshing: Boolean(accepted), error: false });
        return read(controller.signal).then(value => {
            if (!active) throw new Error('Snapshot lifecycle ended');
            if (id >= applied) {
                applied = id;
                accepted = { value };
                apply(value);
                change({ loading: false, refreshing: [...pending].some(other => other > id), error: false });
            }
            return accepted!.value;
        }).catch(error => {
            if (active && id === sequence) {
                change({ loading: false, refreshing: false, error: true });
            }
            // A late failed ordinary request must not replace newer evidence
            // or turn Query's accepted newer success into an error.
            if (active && applied > id && accepted) return accepted.value;
            throw error;
        }).finally(() => { controllers.delete(controller); pending.delete(id); });
    };

    return {
        ordinary(): Promise<T> {
            if (ordinary) return ordinary;
            // The registered refresh lifecycle decides when an ordinary read
            // is needed after forced work; this helper only orders results.
            ordinary = start().finally(() => { ordinary = undefined; });
            return ordinary;
        },
        force(): Promise<T> {
            if (forced) return forced;
            forced = start().finally(() => { forced = undefined; });
            return forced;
        },
        dispose() {
            active = false;
            controllers.forEach(controller => controller.abort());
            controllers.clear();
        },
    };
}
