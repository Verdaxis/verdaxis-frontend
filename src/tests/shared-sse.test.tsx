import React, { StrictMode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSSE } from '../hooks/useSSE';
import { QueryObserver } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { attachQueryInvalidation } from '../lib/query/invalidation';
import { queuePublicMarketRefresh } from '../services/publicMarketSync';
import { subscribeReadInvalidations } from '../services/readCache';

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

    it('does not repeat market reads for a late private reconnect after public recovery', async () => {
        vi.useFakeTimers();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const client = createQueryClient();
        const keys = [['public', 'orderbook', 'listings', 'ASK'], ['public', 'orderbook', 'counts', 'ASK']];
        const reads = keys.map(() => vi.fn().mockResolvedValue('new'));
        const unobserve = keys.map((queryKey, index) => {
            client.setQueryData(queryKey, 'old');
            return new QueryObserver(client, { queryKey, queryFn: reads[index], staleTime: Infinity }).subscribe(() => {});
        });
        const bridge = attachQueryInvalidation(client);
        const invalidations = vi.fn();
        const detach = subscribeReadInvalidations(invalidations);
        const publicView = render(<Subscriber channel="orderbook" handler={() => queuePublicMarketRefresh()} />);
        const privateView = render(<Subscriber />);
        try {
            await act(async () => { await vi.advanceTimersByTimeAsync(0); });
            const publicSource = Source.all.find(source => source.url.includes('/orderbook'))!;
            const privateSource = Source.all.find(source => source.url.includes('/trades'))!;
            act(() => { publicSource.onopen?.(); privateSource.onopen?.(); publicSource.onerror?.(); });
            await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
            const recoveredPublic = Source.all.filter(source => source.url.includes('/orderbook')).at(-1)!;
            act(() => recoveredPublic.onopen?.());
            await act(async () => { await vi.advanceTimersByTimeAsync(100); });
            act(() => recoveredPublic.emit('order_created', { id: 'fixture-order' }));
            await act(async () => { await vi.advanceTimersByTimeAsync(500); });
            reads.forEach(read => expect(read).toHaveBeenCalledTimes(1));

            // The private source recovers after that batch has already read.
            act(() => privateSource.onerror?.());
            await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
            const recoveredPrivate = Source.all.filter(source => source.url.includes('/trades')).at(-1)!;
            invalidations.mockClear();
            act(() => recoveredPrivate.onopen?.());
            expect(invalidations).toHaveBeenCalledWith({ prefixes: ['trades:'], cause: 'event' });
            // A queued public batch must not flush market work left by private recovery.
            queuePublicMarketRefresh();
            await act(async () => { await vi.advanceTimersByTimeAsync(500); });
            reads.forEach(read => expect(read).toHaveBeenCalledTimes(1));
            expect(invalidations.mock.calls.filter(([event]) => event.prefixes.includes('orderbook:'))).toHaveLength(0);
            act(() => recoveredPublic.emit('order_created', { id: 'next-order' }));
            await act(async () => { await vi.advanceTimersByTimeAsync(500); });
            reads.forEach(read => expect(read).toHaveBeenCalledTimes(2));
        } finally {
            publicView.unmount(); privateView.unmount(); detach(); bridge.dispose();
            unobserve.forEach(stop => stop()); client.clear(); vi.useRealTimers();
        }
    });

    it.each(['absent', 'disconnected'] as const)('keeps broad private recovery when the public owner is %s', async owner => {
        vi.useFakeTimers();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const invalidations = vi.fn();
        const detach = subscribeReadInvalidations(invalidations);
        const publicView = owner === 'disconnected' ? render(<Subscriber channel="orderbook" />) : null;
        const privateView = render(<Subscriber />);
        try {
            await act(async () => { await vi.advanceTimersByTimeAsync(0); });
            const privateSource = Source.all.find(source => source.url.includes('/trades'))!;
            act(() => { privateSource.onopen?.(); privateSource.onerror?.(); });
            await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
            invalidations.mockClear();
            act(() => Source.all.filter(source => source.url.includes('/trades')).at(-1)!.onopen?.());
            expect(invalidations).toHaveBeenCalledWith(expect.objectContaining({ prefixes: expect.arrayContaining(['orderbook:']), cause: 'event' }));
            expect(invalidations).toHaveBeenCalledWith({ prefixes: ['trades:'], cause: 'event' });
        } finally { publicView?.unmount(); privateView.unmount(); detach(); vi.useRealTimers(); }
    });

    it('keeps market invalidation for real private events and resets with a connected public owner', async () => {
        const invalidations = vi.fn();
        const detach = subscribeReadInvalidations(invalidations);
        const publicView = render(<Subscriber channel="orderbook" />);
        const privateView = render(<Subscriber />);
        try {
            await waitFor(() => expect(Source.all).toHaveLength(2));
            act(() => Source.all.find(source => source.url.includes('/orderbook'))!.onopen?.());
            const privateSource = Source.all.find(source => source.url.includes('/trades'))!;
            for (const event of ['trade_created', 'reset']) {
                invalidations.mockClear();
                act(() => privateSource.emit(event, { reason: 'subscriber_overflow' }));
                expect(invalidations).toHaveBeenCalledWith(expect.objectContaining({ prefixes: expect.arrayContaining(['orderbook:']), cause: 'event' }));
            }
        } finally { publicView.unmount(); privateView.unmount(); detach(); }
    });

    it('leaves no live source after StrictMode teardown', async () => {
        const view = render(<StrictMode><Subscriber /><Subscriber /></StrictMode>);
        await waitFor(() => expect(Source.all.filter(source => !source.closed)).toHaveLength(1));
        view.unmount();
        expect(Source.all.every(source => source.closed)).toBe(true);
    });
});
