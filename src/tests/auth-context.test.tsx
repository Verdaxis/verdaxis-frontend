import React, { useLayoutEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AUTH_IDENTITY_CHANGED_EVENT, clearAccessToken, getAccessToken, refreshAccessToken, refreshSession, setAccessToken } from '../services/authToken';
import { api } from '../services/api';
import { ACTIVITY_BROADCAST_INTERVAL_MS, AUTH_TAB_SYNC_CHANNEL } from '../services/authTabSync';
import { FakeBroadcastChannel } from './fake-broadcast-channel';

function jwt(subject: string, expiresAt?: number): string {
  const payload = btoa(JSON.stringify({ sub: subject, ...(expiresAt ? { exp: expiresAt } : {}) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function Probe() {
  const { isLoading, isAuthenticated, user, isBackendUnavailable, checkAuth, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email ?? ''}</div>
      <div data-testid="backend-unavailable">{String(isBackendUnavailable)}</div>
      <button type="button" onClick={() => void checkAuth()}>retry</button>
      <button type="button" onClick={logout}>sign out</button>
      <button type="button" onClick={() => void login('new-access-token')}>switch account</button>
      <button type="button" onClick={() => void api.feedback.submit('test').catch(() => undefined)}>API request</button>
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
    const initialToken = jwt('user-same');
    const refreshedToken = jwt('user-same');
    setAccessToken(initialToken);
    let resolveProfile!: (response: Response) => void;
    global.fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveProfile = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: refreshedToken }),
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await expect(refreshSession()).resolves.toEqual({
      status: 'success',
      token: refreshedToken,
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

  it('clears the rendered identity when an API refresh discovers another account cookie', async () => {
    window.history.replaceState({}, '', '/app');
    const oldAccountToken = jwt('user-a');
    const newAccountToken = jwt('user-b');
    setAccessToken(oldAccountToken);
    global.fetch = vi.fn().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/me')) {
        return new Response(JSON.stringify({
          email: 'old@example.com',
          first_name: 'Old',
          last_name: 'Account',
          role: 'BUYER',
          id: 'user-a',
          status: 'APPROVED',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ access_token: newAccountToken }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ detail: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('old@example.com'));
    fireEvent.click(screen.getByRole('button', { name: 'API request' }));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('email').textContent).toBe('');
    });
    expect(getAccessToken()).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(
      ([input]) => String(input).includes('/auth/logout'),
    )).toBe(false);

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

describe('AuthProvider cross-tab sync', () => {
  const originalFetch = global.fetch;
  let otherTab: FakeBroadcastChannel;
  let messagesToOtherTab: unknown[];

  const logoutRequests = () => (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    .filter(([input]) => String(input).includes('/auth/logout'));

  async function renderSignedInTab() {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'profile login' }));
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/app');
    FakeBroadcastChannel.open.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    // Stands in for a second browser tab listening to this tab's messages.
    otherTab = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
    messagesToOtherTab = [];
    otherTab.onmessage = (message) => messagesToOtherTab.push(message.data);
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 })) as typeof fetch;
  });

  afterEach(() => {
    clearAccessToken();
    otherTab.close();
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('broadcasts only a logout event when this tab signs out', async () => {
    await renderSignedInTab();

    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(logoutRequests()).toHaveLength(1);
    expect(messagesToOtherTab).toEqual([{ type: 'logout' }]);
  });

  it('clears local auth when another tab logs out, without calling /auth/logout or re-broadcasting', async () => {
    const loggedOutEvents = vi.fn();
    window.addEventListener('verdaxis:auth-logout', loggedOutEvents);
    await renderSignedInTab();
    expect(getAccessToken()).toBe('profile-access-token');

    otherTab.postMessage({ type: 'logout' });

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    window.removeEventListener('verdaxis:auth-logout', loggedOutEvents);
    expect(getAccessToken()).toBeNull();
    expect(screen.getByTestId('email').textContent).toBe('');
    // Same local cleanup as a normal logout, so the read cache and activity
    // tracking (which listen for this event) are cleared too.
    expect(loggedOutEvents).toHaveBeenCalledTimes(1);
    expect(logoutRequests()).toHaveLength(0);
    expect(messagesToOtherTab).toEqual([]);
  });

  it('broadcasts an identity change detected by this tab', async () => {
    await renderSignedInTab();

    window.dispatchEvent(new CustomEvent(AUTH_IDENTITY_CHANGED_EVENT));

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(messagesToOtherTab).toEqual([{ type: 'identity_changed' }]);
    expect(logoutRequests()).toHaveLength(0);
  });

  it('drops the session and blocks silent restore when another tab reports an identity change', async () => {
    await renderSignedInTab();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    otherTab.postMessage({ type: 'identity_changed' });

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(getAccessToken()).toBeNull();
    // A straggling request must not quietly adopt the new account's cookie.
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(messagesToOtherTab).toEqual([]);
  });

  it('stops listening for other tabs when the provider unmounts', async () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    unmount();

    expect(FakeBroadcastChannel.open).toEqual(new Set([otherTab]));
  });

  it('still logs out normally when BroadcastChannel is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    await renderSignedInTab();

    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(logoutRequests()).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });
});

describe('AuthProvider idle logout across tabs', () => {
  const originalFetch = global.fetch;
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const MINUTE_MS = 60 * 1000;
  let otherTab: FakeBroadcastChannel;
  let messagesToOtherTab: Array<{ type: string; at?: number }>;

  const logoutRequests = () => (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    .filter(([input]) => String(input).includes('/auth/logout'));
  const isAuthenticated = () => screen.getByTestId('authenticated').textContent === 'true';
  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  const peerIsActive = (activeAt = Date.now()) => act(() => {
    otherTab.postMessage({ type: 'activity', at: activeAt });
  });
  const activityMessages = () => messagesToOtherTab.filter(message => message.type === 'activity');

  async function renderSignedInTab() {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'profile login' }));
    await advance(0);
    expect(isAuthenticated()).toBe(true);
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/app');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    FakeBroadcastChannel.open.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    // Stands in for a second browser tab on the same channel.
    otherTab = new FakeBroadcastChannel(AUTH_TAB_SYNC_CHANNEL);
    messagesToOtherTab = [];
    otherTab.onmessage = (message) => messagesToOtherTab.push(message.data);
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 })) as typeof fetch;
  });

  afterEach(() => {
    clearAccessToken();
    otherTab.close();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('logs out and tells the other tabs when no tab has been active for the timeout', async () => {
    await renderSignedInTab();

    await advance(IDLE_TIMEOUT_MS - 1000);
    expect(isAuthenticated()).toBe(true);
    await advance(5000);

    expect(isAuthenticated()).toBe(false);
    expect(logoutRequests()).toHaveLength(1);
    expect(messagesToOtherTab).toEqual([{ type: 'logout' }]);
  });

  it('postpones logout when another tab reports activity', async () => {
    await renderSignedInTab();
    await advance(20 * MINUTE_MS);

    await peerIsActive();
    await advance(15 * MINUTE_MS);
    // 35 minutes after sign-in, but only 15 after the peer's activity.
    expect(isAuthenticated()).toBe(true);
    expect(logoutRequests()).toHaveLength(0);

    await advance(16 * MINUTE_MS);
    expect(isAuthenticated()).toBe(false);
    expect(logoutRequests()).toHaveLength(1);
  });

  it('postpones logout again for each later peer activity', async () => {
    await renderSignedInTab();

    for (let i = 0; i < 4; i += 1) {
      await advance(25 * MINUTE_MS);
      await peerIsActive();
    }

    expect(isAuthenticated()).toBe(true);
    await advance(IDLE_TIMEOUT_MS + 5000);
    expect(isAuthenticated()).toBe(false);
  });

  it('does not let an old peer timestamp shorten the deadline', async () => {
    await renderSignedInTab();
    await advance(10 * MINUTE_MS);

    await peerIsActive(Date.now() - 60 * MINUTE_MS);
    await advance(IDLE_TIMEOUT_MS - 11 * MINUTE_MS);

    // Local sign-in activity at minute 0 still counts: 29 minutes have passed.
    expect(isAuthenticated()).toBe(true);
  });

  it('does not let a future peer timestamp postpone logout forever', async () => {
    await renderSignedInTab();

    await peerIsActive(Date.now() + 24 * 60 * MINUTE_MS);
    await advance(IDLE_TIMEOUT_MS + 5000);

    expect(isAuthenticated()).toBe(false);
  });

  it('does not log out a tab that wakes after another tab was recently active', async () => {
    await renderSignedInTab();
    await advance(IDLE_TIMEOUT_MS);
    // The deadline passed while this tab slept; the peer's message about its
    // activity a minute ago is delivered only now.
    await peerIsActive(Date.now() - MINUTE_MS);
    await advance(5000);

    expect(isAuthenticated()).toBe(true);
    expect(logoutRequests()).toHaveLength(0);

    await advance(IDLE_TIMEOUT_MS);
    expect(isAuthenticated()).toBe(false);
  });

  it('postpones logout on local activity', async () => {
    await renderSignedInTab();
    await advance(20 * MINUTE_MS);

    fireEvent.keyDown(window);
    await advance(15 * MINUTE_MS);

    expect(isAuthenticated()).toBe(true);
    await advance(16 * MINUTE_MS);
    expect(isAuthenticated()).toBe(false);
  });

  it('throttles activity broadcasts from this tab', async () => {
    await renderSignedInTab();

    for (let i = 0; i < 50; i += 1) {
      fireEvent.scroll(window);
      await advance(100);
    }
    expect(activityMessages()).toHaveLength(1);
    expect(activityMessages()[0]).toEqual({ type: 'activity', at: expect.any(Number) });

    await advance(ACTIVITY_BROADCAST_INTERVAL_MS);
    fireEvent.mouseDown(window);
    expect(activityMessages()).toHaveLength(2);
  });

  it('does not re-broadcast activity received from another tab', async () => {
    await renderSignedInTab();

    await peerIsActive();
    await advance(ACTIVITY_BROADCAST_INTERVAL_MS * 2);

    expect(messagesToOtherTab).toEqual([]);
  });

  it('does not count a token change as activity', async () => {
    await renderSignedInTab();
    await advance(20 * MINUTE_MS);

    // Same effect on the token as a background refresh: a new token, no input.
    fireEvent.click(screen.getByRole('button', { name: 'switch account' }));
    await advance(11 * MINUTE_MS);

    expect(logoutRequests()).toHaveLength(1);
  });

  it('falls back to a per-tab timer without BroadcastChannel', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    await renderSignedInTab();
    await advance(20 * MINUTE_MS);

    fireEvent.keyDown(window);
    await advance(15 * MINUTE_MS);
    expect(isAuthenticated()).toBe(true);

    await advance(16 * MINUTE_MS);
    expect(isAuthenticated()).toBe(false);
    expect(logoutRequests()).toHaveLength(1);
  });

  it('stops the idle timer and listeners when signed out', async () => {
    await renderSignedInTab();
    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));
    await advance(0);
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    messagesToOtherTab.length = 0;

    fireEvent.keyDown(window);
    await advance(IDLE_TIMEOUT_MS * 2);

    expect(logoutRequests()).toHaveLength(0);
    expect(activityMessages()).toHaveLength(0);
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
