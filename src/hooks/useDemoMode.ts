import { useState, useCallback } from 'react';

const STORAGE_KEY = 'verdaxis_demo_mode';

export function useDemoMode(): [boolean, () => void] {
    const [enabled, setEnabled] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const toggle = useCallback(() => {
        setEnabled(prev => {
            const next = !prev;
            try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
            return next;
        });
    }, []);

    return [enabled, toggle];
}

/** Read-only check — use in components that don't need the toggle */
export function isDemoMode(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}
