import React, { useLayoutEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { clearAccessToken, getAccessToken, refreshSession, setAccessToken } from '../services/authToken';

function Probe() {
  const { isLoading, isAuthenticated, user, isBackendUnavailable, checkAuth, login } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email ?? ''}</div>
      <div data-testid="backend-unavailable">{String(isBackendUnavailable)}</div>
      <button type="button" onClick={() => void checkAuth()}>retry</button>
      <button type="button" onClick={() => void login('new-access-token')}>switch account</button>
      <button type="button" onClick={() => void login('profile-access-token', {
        email: 'profile@example.com',
        first_name: 'Profile',
        last_name: 'User',
        role: 'BUYER',
        id: 'user-profile',
        status: 'APPROVED',
        organization_id: null,
        must_change_password: false,
      })}>profile login</button>
    </div>
  );
}

function EarlyCredentialScrubber() {
  useLayoutEffect(() => {
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  return null;
}

describe('AuthProvider token bootstrap', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/app?token=test-access-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'buyer@example.com',
        first_name: 'Buyer',
        last_name: 'User',
        role: 'BUYER',
        id: 'user-1',
        status: 'APPROVED',
      }),
    }) as typeof fetch;
  });

  afterEach(() => {
    clearAccessToken();
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('exits loading and authenticates when bootstrapped from a token in the URL', async () => {
    render(
      <AuthProvider>
        <EarlyCredentialScrubber />
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('buyer@example.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-access-token' },
      }),
    );
  });

  it('does not let a stale profile response restore the previous account', async () => {
    let resolveOldProfile!: (response: Response) => void;
    global.fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveOldProfile = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'new@example.com',
          first_name: 'New',
          last_name: 'User',
          role: 'BUYER',
          id: 'user-2',
          status: 'APPROVED',
        }),
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'switch account' }));

    await waitFor(() => {
      expect(screen.getByTestId('email').textContent).toBe('new@example.com');
    });

    resolveOldProfile({
      ok: true,
      json: async () => ({
        email: 'old@example.com',
        first_name: 'Old',
        last_name: 'User',
        role: 'BUYER',
        id: 'user-1',
        status: 'APPROVED',
      }),
    } as Response);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId('email').textContent).toBe('new@example.com');
  });

  it('uses a login profile without a second request and supersedes the global auth check', async () => {
    let resolveOldProfile!: (response: Response) => void;
    global.fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveOldProfile = resolve;
    }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'profile login' }));

    await waitFor(() => {
      expect(screen.getByTestId('email').textContent).toBe('profile@example.com');
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveOldProfile({
      ok: true,
      json: async () => ({
        email: 'old@example.com',
        first_name: 'Old',
        last_name: 'User',
        role: 'BUYER',
        id: 'user-old',
        status: 'APPROVED',
      }),
    } as Response);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId('email').textContent).toBe('profile@example.com');
  });

  it('accepts a profile response while the same account refreshes its token', async () => {
    window.history.replaceState({}, '', '/app');
    setAccessToken('same-account');
    let resolveProfile!: (response: Response) => void;
    global.fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveProfile = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'rotated-same-account' }),
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await expect(refreshSession()).resolves.toEqual({
      status: 'success',
      token: 'rotated-same-account',
    });
    resolveProfile({
      ok: true,
      json: async () => ({
        email: 'same@example.com',
        first_name: 'Same',
        last_name: 'Account',
        role: 'BUYER',
        id: 'user-same',
        status: 'APPROVED',
      }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('email').textContent).toBe('same@example.com');
    });
  });
});

describe('AuthProvider backend availability', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAccessToken('still-valid-locally');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
      json: async () => ({}),
    }) as typeof fetch;
  });

  afterEach(() => {
    clearAccessToken();
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('keeps the in-memory token and marks the backend unavailable on gateway failure', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('backend-unavailable').textContent).toBe('true');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(getAccessToken()).toBe('still-valid-locally');
  });
});
