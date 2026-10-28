import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '../i18n';
import { StreamStatusIndicator } from '../components/layout/StreamStatusIndicator';
import {
    INITIAL_CONNECT_GRACE_MS,
    OFFLINE_AFTER_MS,
    registerStream,
    resetStreamHealth,
    STALE_AFTER_MS,
} from '../services/streamHealth';

const renderIndicator = () => render(
    <I18nextProvider i18n={i18n}><StreamStatusIndicator /></I18nextProvider>,
);
const state = () => screen.getByTestId('stream-status-indicator').getAttribute('data-state');
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const heartbeat = () => ({
    status: 'operational' as const,
    message: null,
    serverTime: '2026-10-28T10:00:00Z',
    receivedAt: Date.now(),
});

describe('StreamStatusIndicator', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en');
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
        resetStreamHealth();
    });

    afterEach(() => {
        resetStreamHealth();
        vi.useRealTimers();
    });

    it('renders nothing when no stream is enabled', () => {
        renderIndicator();
        expect(screen.queryByTestId('stream-status-indicator')).toBeNull();
    });

    it('shows live with a screen-reader text label', () => {
        const stream = registerStream();
        renderIndicator();
        act(() => stream.setConnected(true));
        expect(state()).toBe('live');
        expect(screen.getByRole('status').textContent).toContain('Live');
    });

    it('goes from connecting to offline when no stream opens', () => {
        registerStream();
        renderIndicator();
        expect(state()).toBe('connecting');
        expect(screen.getByRole('status').textContent).toContain('Connecting');

        // Still connecting past the 30 s first keep-alive of a server without the heartbeat.
        advance(OFFLINE_AFTER_MS + 5_000);
        expect(state()).toBe('connecting');

        advance(INITIAL_CONNECT_GRACE_MS);
        expect(state()).toBe('offline');
        expect(screen.getByRole('status').textContent).toContain('Offline');
    });

    it('shows reconnecting after an open stream drops', () => {
        const stream = registerStream();
        renderIndicator();
        act(() => stream.setConnected(true));
        act(() => stream.setConnected(false));
        expect(state()).toBe('reconnecting');
    });

    it('turns stale when heartbeats stop, and recovers with the next one', () => {
        const stream = registerStream();
        renderIndicator();
        act(() => {
            stream.setConnected(true);
            stream.recordHeartbeat(heartbeat());
        });
        advance(STALE_AFTER_MS - 5_000);
        expect(state()).toBe('live');

        advance(10_000);
        expect(state()).toBe('stale');
        expect(screen.getByRole('status').textContent).toContain('Delayed');

        act(() => stream.recordHeartbeat(heartbeat()));
        expect(state()).toBe('live');
    });

    it('stays live indefinitely when the server never sent a heartbeat', () => {
        const stream = registerStream();
        renderIndicator();
        act(() => stream.setConnected(true));
        advance(10 * 60_000);
        expect(state()).toBe('live');
    });

    it('shows offline immediately when the browser goes offline with no open stream', () => {
        registerStream();
        renderIndicator();
        const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        act(() => { window.dispatchEvent(new Event('offline')); });
        expect(state()).toBe('offline');
        onLine.mockRestore();
    });

    it('uses the Chinese labels', async () => {
        await i18n.changeLanguage('zh');
        const stream = registerStream();
        renderIndicator();
        act(() => stream.setConnected(true));
        expect(screen.getByRole('status').textContent).toContain('实时');
    });
});
