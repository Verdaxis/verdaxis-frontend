import React, { useLayoutEffect, useRef, useState } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useMarketSupport } from '../../context/MarketSupportContext';
import { AUTH_IDENTITY_CHANGED_EVENT, getAuthGeneration } from '../../services/authToken';
import { createQueryClient } from './client';
import { attachQueryInvalidation, clearPrivateQueries } from './invalidation';

interface QueryProviderProps {
    children: React.ReactNode;
    client?: QueryClient;
}

export function QueryProvider({ children, client: suppliedClient }: QueryProviderProps) {
    const [ownedClient] = useState(createQueryClient);
    const client = suppliedClient ?? ownedClient;
    const { user } = useAuth();
    const { context } = useMarketSupport();
    const scope = JSON.stringify([getAuthGeneration(), user?.id ?? null,
        user?.organization_id ?? null, context?.id ?? null]);
    const previous = useRef({ client, scope });
    // Clear before rendering the next scope's descendants. An effect alone
    // would let a child observe the previous private cache for one render.
    if (previous.current.client !== client || previous.current.scope !== scope) {
        clearPrivateQueries(previous.current.client);
        previous.current = { client, scope };
    }

    useLayoutEffect(() => {
        const bridge = attachQueryInvalidation(client, document.visibilityState !== 'hidden');
        const visibility = () => bridge.setVisible(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', visibility);
        const clear = () => clearPrivateQueries(client);
        const events = [AUTH_IDENTITY_CHANGED_EVENT, 'verdaxis:auth-logout',
            'verdaxis:market-support-context-invalidated', 'verdaxis:query-auth-revoked'];
        for (const event of events) window.addEventListener(event, clear);
        return () => {
            document.removeEventListener('visibilitychange', visibility);
            bridge.dispose();
            for (const event of events) window.removeEventListener(event, clear);
            clear();
        };
    }, [client]);

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
