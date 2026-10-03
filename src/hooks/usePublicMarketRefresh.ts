import { useEffect, useLayoutEffect, useRef } from 'react';

import { subscribePublicMarketRefresh } from '../services/publicMarketSync';

export const usePublicMarketRefresh = (
    refresh: () => void | Promise<void>,
    enabled = true,
): void => {
    const refreshRef = useRef(refresh);
    useLayoutEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        if (!enabled) return undefined;
        return subscribePublicMarketRefresh(() => refreshRef.current());
    }, [enabled]);
};
