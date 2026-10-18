import React, { StrictMode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSSE } from '../hooks/useSSE';

const scope = vi.hoisted(() => ({ user: { id: 'user', organization_id: 'org' }, context: null as { id: string } | null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: scope.user }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ context: scope.context }) }));
vi.mock('../services/authToken', () => ({ getAccessToken: () => 'token', getAuthGeneration: () => 1, refreshAccessToken: vi.fn() }));

class Source {
    static all: Source[] = [];
    closed = false;
    listeners = new Map<string, EventListener[]>();
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(readonly url: string) { Source.all.push(this); }
    close() { this.closed = true; }
    addEventListener(event: string, listener: EventListener) { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
    emit(event: string, data: unknown) {
        for (const listener of this.listeners.get(event) ?? []) listener({ data: JSON.stringify(data), lastEventId: '42' } as MessageEvent);
    }
}
function Subscriber({ channel = 'trades', spelling = '', handler = () => {} }: {
    channel?: 'trades' | 'orderbook'; spelling?: string; handler?: (event: string, data: unknown) => void;
}) { useSSE(channel, handler, true, spelling); return null; }

beforeEach(() => {
    Source.all = [];
    scope.user = { id: 'user', organization_id: 'org' };
    scope.context = null;
    vi.stubGlobal('EventSource', Source);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ stream_token: 'stream-token' }) }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('shared SSE transport', () => {
    it('shares private scope despite direct and empty caller suffixes and fans one mapped value out', async () => {
        const first = vi.fn(); const second = vi.fn(); const third = vi.fn();
        const a = render(<Subscriber spelling="user:org:direct" handler={first} />);
        const b = render(<Subscriber spelling="user:org:" handler={second} />);
        const c = render(<Subscriber handler={third} />);
        await waitFor(() => expect(Source.all).toHaveLength(1));
        expect(fetch).toHaveBeenCalledTimes(1);
        act(() => Source.all[0].emit('trade_created', { quantity: '500.00', price: '915.00' }));
        expect(first.mock.calls[0][1]).toMatchObject({ quantity: 500, price: 915 });
        expect(first.mock.calls[0][1]).toBe(second.mock.calls[0][1]);
        expect(second.mock.calls[0][1]).toBe(third.mock.calls[0][1]);
        a.unmount(); expect(Source.all[0].closed).toBe(false);
        b.unmount(); expect(Source.all[0].closed).toBe(false);
        c.unmount(); expect(Source.all[0].closed).toBe(true);
    });

    it('shares public sources without a token and isolates throwing subscribers', () => {
        const handler = vi.fn();
        const a = render(<Subscriber channel="orderbook" handler={() => { throw new Error('subscriber failed'); }} />);
        const b = render(<Subscriber channel="orderbook" handler={handler} />);
        expect(Source.all).toHaveLength(1);
        expect(fetch).not.toHaveBeenCalled();
        act(() => Source.all[0].emit('order_created', { id: 'one' }));
        expect(handler).toHaveBeenCalledWith('order_created', { id: 'one' });
        a.unmount(); b.unmount();
    });

    it('closes the old organization and support scope before replacing it', async () => {
        const view = render(<Subscriber />);
        await waitFor(() => expect(Source.all).toHaveLength(1));
        scope.user = { id: 'user', organization_id: 'next-org' };
        view.rerender(<Subscriber />);
        expect(Source.all[0].closed).toBe(true);
        await waitFor(() => expect(Source.all).toHaveLength(2));
        scope.context = { id: 'support-a' }; view.rerender(<Subscriber />);
        await waitFor(() => expect(Source.all).toHaveLength(3));
        scope.context = { id: 'support-b' }; view.rerender(<Subscriber />);
        expect(Source.all[2].closed).toBe(true);
        await waitFor(() => expect(Source.all).toHaveLength(4));
        view.unmount();
    });

    it('leaves no live source after StrictMode teardown', async () => {
        const view = render(<StrictMode><Subscriber /><Subscriber /></StrictMode>);
        await waitFor(() => expect(Source.all.filter(source => !source.closed)).toHaveLength(1));
        view.unmount();
        expect(Source.all.every(source => source.closed)).toBe(true);
    });
});
