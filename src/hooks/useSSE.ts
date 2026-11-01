import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarketSupport } from '../context/MarketSupportContext';
import { getAuthGeneration } from '../services/authToken';
import type { Heartbeat } from '../services/streamHealth';
import { subscribeStream, type SSEChannel, type SSEHandler } from '../lib/sse/streamManager';

/**
 * Subscribes to a Server-Sent Events stream through the shared stream manager.
 * Returns the connection status and the latest server heartbeat (null until one
 * arrives). Every open stream also reports into `services/streamHealth`, so the
 * app can show one aggregate indicator and status banner.
 */
export function useSSE(channel: SSEChannel, onEvent: SSEHandler, enabled = true, _scopeKey = '') {
    const [isConnected, setIsConnected] = useState(false);
    const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);
    const handler = useRef(onEvent);
    handler.current = onEvent;
    const { user } = useAuth();
    const { context } = useMarketSupport();
    const scope = JSON.stringify([getAuthGeneration(), user?.id ?? null,
        user?.organization_id ?? null, context?.id ?? null]);
    useEffect(() => {
        setIsConnected(false);
        setHeartbeat(null);
        if (!enabled || (channel === 'trades' && !user)) return;
        return subscribeStream(channel, scope, {
            onEvent: (event, data, eventId) => {
                if (eventId) {
                    handler.current(event, data, eventId);
                } else {
                    handler.current(event, data);
                }
            },
            onStatus: setIsConnected,
            onHeartbeat: setHeartbeat,
        });
    }, [channel, enabled, scope, Boolean(user)]);
    return { isConnected, heartbeat };
}
