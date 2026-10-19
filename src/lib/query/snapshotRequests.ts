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

// Query owns the value and freshness. This helper only arbitrates overlapping
// ordinary/forced requests within one mounted slice lifecycle.
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
            // Bridge refetches wait for force completion, then read again.
            // A manual/resume signal cannot consume this post-event read.
            const pendingForce = forced;
            ordinary = (pendingForce
                ? pendingForce.catch(() => undefined).then(() => {
                    if (!active) throw new Error('Snapshot lifecycle ended');
                    return start();
                })
                : start()).finally(() => { ordinary = undefined; });
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
