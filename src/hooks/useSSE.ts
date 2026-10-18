import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarketSupport } from '../context/MarketSupportContext';
import { getAuthGeneration } from '../services/authToken';
import { subscribeStream, type SSEChannel, type SSEHandler } from '../lib/sse/streamManager';

export function useSSE(channel: SSEChannel, onEvent: SSEHandler, enabled = true, _scopeKey = '') {
    const [isConnected, setIsConnected] = useState(false);
    const handler = useRef(onEvent);
    handler.current = onEvent;
    const { user } = useAuth();
    const { context } = useMarketSupport();
    const scope = JSON.stringify([getAuthGeneration(), user?.id ?? null,
        user?.organization_id ?? null, context?.id ?? null]);
    useEffect(() => {
        setIsConnected(false);
        if (!enabled || (channel === 'trades' && !user)) return;
        return subscribeStream(channel, scope, {
            onEvent: (event, data) => handler.current(event, data),
            onStatus: setIsConnected,
        });
    }, [channel, enabled, scope, Boolean(user)]);
    return { isConnected };
}
