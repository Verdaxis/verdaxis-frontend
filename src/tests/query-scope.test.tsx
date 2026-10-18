import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { QueryProvider } from '../lib/query/QueryProvider';
import { queryKeys } from '../lib/query/keys';
import { getAuthGeneration, setAccessToken } from '../services/authToken';

const identity = vi.hoisted(() => ({ user: { id: 'a', organization_id: 'org-a' } as { id: string; organization_id: string } | null,
    support: null as { id: string } | null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: identity.user }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ context: identity.support }) }));

afterEach(() => { identity.user = { id: 'a', organization_id: 'org-a' }; identity.support = null; });

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

    it('keeps one committed client through StrictMode and cleans listeners on unmount', () => {
        const clients = new Set();
        function ClientProbe() { clients.add(useQueryClient()); return null; }
        const view = render(<StrictMode><QueryProvider><ClientProbe /></QueryProvider></StrictMode>);
        expect(clients.size).toBe(1);
        view.unmount();
        act(() => window.dispatchEvent(new Event('verdaxis:query-auth-revoked')));
    });
});
