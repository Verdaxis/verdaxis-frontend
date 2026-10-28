import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import i18n from '../i18n';
import { ServerStatusBanner } from '../components/layout/ServerStatusBanner';
import { registerStream, resetStreamHealth, type Heartbeat } from '../services/streamHealth';

type Stream = ReturnType<typeof registerStream>;

const beat = (status: Heartbeat['status'], message: string | null = null): Heartbeat => ({
    status,
    message,
    serverTime: '2026-10-28T10:00:00Z',
    receivedAt: Date.now(),
});

describe('ServerStatusBanner', () => {
    let stream: Stream;

    beforeEach(async () => {
        await i18n.changeLanguage('en');
        resetStreamHealth();
        stream = registerStream();
        stream.setConnected(true);
        render(<I18nextProvider i18n={i18n}><ServerStatusBanner /></I18nextProvider>);
    });

    afterEach(() => resetStreamHealth());

    const send = (heartbeat: Heartbeat) => act(() => stream.recordHeartbeat(heartbeat));

    it('shows nothing before any heartbeat (unknown) and for operational', () => {
        expect(screen.queryByTestId('server-status-banner')).toBeNull();
        send(beat('operational'));
        expect(screen.queryByTestId('server-status-banner')).toBeNull();
    });

    it('shows a degraded banner with the server message as a status region', () => {
        send(beat('degraded', 'Order matching is slow'));
        const banner = screen.getByRole('status');
        expect(banner.getAttribute('data-status')).toBe('degraded');
        expect(banner.textContent).toContain('Service degraded');
        expect(banner.textContent).toContain('Order matching is slow');
    });

    it('shows a localized fallback when there is no message', () => {
        send(beat('maintenance'));
        expect(screen.getByRole('status').textContent).toContain('Platform maintenance');
        expect(screen.getByRole('status').textContent).toContain('The platform is under maintenance.');
    });

    it('renders the message as plain text, never HTML', () => {
        send(beat('degraded', '<img src="x" onerror="alert(1)"><b>bold</b>'));
        const banner = screen.getByTestId('server-status-banner');
        expect(banner.querySelector('img')).toBeNull();
        expect(banner.querySelector('b')).toBeNull();
        expect(banner.textContent).toContain('<img src="x" onerror="alert(1)"><b>bold</b>');
    });

    it('hides when the status recovers', () => {
        send(beat('degraded', 'Slow'));
        send(beat('operational'));
        expect(screen.queryByTestId('server-status-banner')).toBeNull();
    });

    it('dismisses per status and message, and shows again when either changes', () => {
        send(beat('degraded', 'Slow'));
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss server status notice' }));
        expect(screen.queryByTestId('server-status-banner')).toBeNull();

        send(beat('degraded', 'Slow'));
        expect(screen.queryByTestId('server-status-banner')).toBeNull();

        send(beat('degraded', 'Still slow'));
        expect(screen.getByRole('status').textContent).toContain('Still slow');

        send(beat('maintenance', 'Still slow'));
        expect(screen.getByRole('status').getAttribute('data-status')).toBe('maintenance');
    });

    it('shows a dismissed notice again after the server reported operational in between', () => {
        send(beat('degraded', 'Slow'));
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss server status notice' }));
        send(beat('operational'));
        send(beat('degraded', 'Slow'));
        expect(screen.getByRole('status').textContent).toContain('Slow');
    });
});
