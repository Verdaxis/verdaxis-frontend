import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
const snapshot = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

const subscribe = (listener: () => void) => {
    if (listeners.size === 0 && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', notify);
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', notify);
        }
    };
};

export const useVisibleDocument = () => useSyncExternalStore(subscribe, snapshot, () => true);
