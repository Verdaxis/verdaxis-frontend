import React, { StrictMode } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { TFunction } from 'i18next';
import type { OrderBookOrder } from '../types';
import { useCancelOrder } from '../features/marketplace/hooks/useCancelOrder';
import { ApiError } from '../services/api';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { QueryProvider } from '../lib/query/QueryProvider';
import { queryKeys } from '../lib/query/keys';
import { getAuthGeneration, setAccessToken } from '../services/authToken';

const cancel = vi.hoisted(() => vi.fn());
vi.mock('../features/marketplace/api/marketplaceApi', () => ({ marketplaceApi: { cancelOrder: cancel } }));

const identity = vi.hoisted(() => ({ user: { id: 'a', organization_id: 'org-a' } as { id: string; organization_id: string } | null,
    support: null as { id: string } | null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: identity.user }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ context: identity.support }) }));

afterEach(() => {
    identity.user = { id: 'a', organization_id: 'org-a' }; identity.support = null;
    clearMarketSupportContextId(); cancel.mockReset();
});

function Probe() {
    const client = useQueryClient();
    return <span data-testid="private-count">{client.getQueryCache().findAll({ queryKey: ['private'] }).length}</span>;
}

describe('accepted Query scope lifecycle', () => {
    it.each(['organization', 'support', 'logout', 'revoked'] as const)('removes pending private data on %s without losing public catalog', async change => {
        setAccessToken('same-token');
        identity.support = { id: 'support-a' };
        const client = createQueryClient();
        const view = render(<QueryProvider client={client}><Probe /></QueryProvider>);
        const key = queryKeys.myOrders([getAuthGeneration(), 'a', 'org-a', 'support-a']);
        client.setQueryData(['public', 'catalog', 'products'], ['B30']);
        let finish!: (value: string[]) => void;
        const pending = client.fetchQuery({ queryKey: key, queryFn: () => new Promise<string[]>(resolve => { finish = resolve; }) }).catch(() => undefined);
        if (change === 'organization') identity.user = { id: 'a', organization_id: 'org-b' };
        if (change === 'support') identity.support = { id: 'support-b' };
        if (change === 'logout') identity.user = null;
        if (change === 'revoked') act(() => window.dispatchEvent(new Event('verdaxis:query-auth-revoked')));
        view.rerender(<QueryProvider client={client}><Probe /></QueryProvider>);
        expect(screen.getByTestId('private-count').textContent).toBe('0');
        await act(async () => { finish(['old-private']); await pending; });
        expect(client.getQueryData(key)).toBeUndefined();
        expect(client.getQueryData(['public', 'catalog', 'products'])).toEqual(['B30']);
        view.unmount();
        client.clear();
    });

    it.each([
        ['organization', 412], ['organization', 428], ['organization', 'missing-version'],
        ['support', 412], ['support', 428], ['support', 'missing-version'],
    ] as const)('keeps the current cancellation dialog after %s changes during %s recovery', async (change, recovery) => {
        setAccessToken('recovery-token');
        identity.support = { id: 'support-a' };
        setMarketSupportContextId('support-a');
        const client = createQueryClient();
        let finish!: () => void;
        const refresh = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
        cancel.mockRejectedValue(new ApiError('version', typeof recovery === 'number' ? recovery : 412));
        const t = ((key: string) => key) as TFunction;
        const wrapper = ({ children }: { children: React.ReactNode }) => <QueryProvider client={client}>{children}</QueryProvider>;
        const hook = renderHook(() => useCancelOrder({
            userId: identity.user!.id, organizationId: identity.user!.organization_id,
            marketSupportContextId: identity.support!.id,
            scope: [getAuthGeneration(), identity.user!.id, identity.user!.organization_id, identity.support!.id],
            isMarketSupportActive: true, isHistorySelected: false, readError: null, t, fetchMyOrders: refresh,
        }), { wrapper });
        const order = { id: 'order-a', creation_method: 'MARKET_SUPPORT',
            etag: recovery === 'missing-version' ? null : '"v1"' } as OrderBookOrder;
        try {
            await act(async () => { await hook.result.current.handleCancelOrder(order); });
            let pending!: Promise<void>;
            act(() => { pending = hook.result.current.confirmCancelOrder(); });
            await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
            if (change === 'organization') identity.user = { id: 'a', organization_id: 'org-b' };
            else { identity.support = { id: 'support-b' }; setMarketSupportContextId('support-b'); }
            hook.rerender();
            const nextOrder = { ...order, id: 'order-b', etag: '"v2"' };
            await act(async () => { await hook.result.current.handleCancelOrder(nextOrder); });
            await act(async () => { finish(); await pending; });
            expect(hook.result.current.pendingCancellation?.id).toBe('order-b');
            expect(hook.result.current.myOrdersError).toBeNull();
            expect(hook.result.current.cancellationLoading).toBe(false);
        } finally { hook.unmount(); client.clear(); }
    });

    it('keeps one committed client through StrictMode and cleans listeners on unmount', () => {
        const clients = new Set();
        function ClientProbe() { clients.add(useQueryClient()); return null; }
        const view = render(<StrictMode><QueryProvider><ClientProbe /></QueryProvider></StrictMode>);
        expect(clients.size).toBe(1);
        view.unmount();
        act(() => window.dispatchEvent(new Event('verdaxis:query-auth-revoked')));
    });
});
