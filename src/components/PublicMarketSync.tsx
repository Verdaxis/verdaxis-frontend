import React, { useCallback } from 'react';

import { useSSE } from '../hooks/useSSE';
import { queuePublicMarketRefresh } from '../services/publicMarketSync';

const isMarketInvalidation = (data: unknown): boolean => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const payload = data as Record<string, unknown>;
    return payload.schema_version === 1 && payload.resync_required === true;
};

export const PublicMarketSync: React.FC = () => {
    const handleEvent = useCallback((event: string, data: unknown) => {
        if (event === 'market_invalidated' && isMarketInvalidation(data)) {
            queuePublicMarketRefresh();
            return;
        }
        if (['order_created', 'order_cancelled', 'orders_matched', 'reset', 'reconnect'].includes(event)) {
            queuePublicMarketRefresh();
        }
    }, []);

    useSSE('orderbook', handleEvent);
    return null;
};
