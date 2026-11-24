import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ToastProvider, useToast } from '../components/Toast';
import i18n from '../i18n';

function ToastActions() {
    const { addToast } = useToast();
    return (
        <>
            <button onClick={() => addToast({ type: 'success', title: 'Alert saved', message: 'Your price alert is active.' })}>Save</button>
            <button onClick={() => addToast({ type: 'info', title: 'Alert removed' })}>Remove</button>
        </>
    );
}

it('adds each new toast once to a persistent polite status without moving focus', () => {
    render(<ToastProvider><ToastActions /></ToastProvider>);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('false');
    expect(status.getAttribute('aria-relevant')).toBe('additions');

    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.click(save);
    const saved = within(status).getByText('Alert saved. Your price alert is active.');
    expect(document.activeElement).toBe(save);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('status')).toBe(status);
    expect(within(status).getByText('Alert saved. Your price alert is active.')).toBe(saved);
    expect(within(status).getByText('Alert removed')).toBeTruthy();
});

it('names the dismiss button in Simplified Chinese and lets the user close the toast', async () => {
    const previousLanguage = i18n.language;
    try {
        await i18n.changeLanguage('zh');
        const { unmount } = render(<ToastProvider><ToastActions /></ToastProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));
        expect(screen.queryByText('Alert saved')).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('');
        unmount();
    } finally {
        await i18n.changeLanguage(previousLanguage);
    }
});
