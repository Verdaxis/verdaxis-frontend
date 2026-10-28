import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { requestTradeAlertPermissionAtSignIn } from '../services/tradeAlertNotifications';
import { clearAccessToken } from '../services/authToken';

const installNotification = (
  permission: NotificationPermission,
  requestPermission: () => unknown = vi.fn(async () => 'granted'),
) => {
  const FakeNotification = Object.assign(vi.fn(), { permission, requestPermission });
  Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
  return requestPermission as ReturnType<typeof vi.fn>;
};

describe('sign-in notification prompt', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'Notification');
  });

  it('asks synchronously, exactly once, while the choice is still open', () => {
    const requestPermission = installNotification('default');

    requestTradeAlertPermissionAtSignIn();

    // No await between the call and this check: the prompt ran inside the gesture.
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it.each(['granted', 'denied'] as const)('does not ask again when permission is %s', (permission) => {
    const requestPermission = installNotification(permission);
    requestTradeAlertPermissionAtSignIn();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does nothing and does not throw when the browser has no Notification API', () => {
    Reflect.deleteProperty(window, 'Notification');
    expect(() => requestTradeAlertPermissionAtSignIn()).not.toThrow();
  });

  it('swallows a prompt that throws', () => {
    installNotification('default', () => { throw new Error('blocked'); });
    expect(() => requestTradeAlertPermissionAtSignIn()).not.toThrow();
  });

  it('swallows a prompt that rejects, without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    installNotification('default', () => Promise.reject(new Error('dismissed')));

    expect(() => requestTradeAlertPermissionAtSignIn()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 10));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('copes with an old browser whose prompt returns nothing', () => {
    installNotification('default', () => undefined);
    expect(() => requestTradeAlertPermissionAtSignIn()).not.toThrow();
  });

  describe('session restore', () => {
    const originalFetch = global.fetch;

    const Probe = () => {
      const { isLoading, isAuthenticated } = useAuth();
      return <div data-testid="state">{isLoading ? 'loading' : String(isAuthenticated)}</div>;
    };

    beforeEach(() => {
      window.history.replaceState({}, '', '/app?token=test-access-token');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'buyer@example.com', first_name: 'Buyer', last_name: 'User', role: 'BUYER', id: 'user-1', status: 'APPROVED',
        }),
      }) as typeof fetch;
    });

    afterEach(() => {
      clearAccessToken();
      global.fetch = originalFetch;
      window.history.replaceState({}, '', '/');
    });

    it('never prompts when a session is restored without a sign-in click', async () => {
      const requestPermission = installNotification('default');

      render(<AuthProvider><Probe /></AuthProvider>);

      await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('true'));
      expect(requestPermission).not.toHaveBeenCalled();
    });
  });
});
