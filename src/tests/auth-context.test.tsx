import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { clearAccessToken, getAccessToken, refreshAccessToken, refreshSession, setAccessToken } from '../services/authToken';
import { api } from '../services/api';

function jwt(subject: string, expiresAt?: number): string {
  const payload = btoa(JSON.stringify({ sub: subject, ...(expiresAt ? { exp: expiresAt } : {}) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

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

describe('AuthProvider saved onboarding answer', () => {
  const storageKey = 'verdaxis_onboarding_survey';
  const answer = { email: 'profile@example.com', use_case: 'buyer', referral_source: 'Conference' };
  let surveyResponse: () => Promise<Response>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAccessToken();
    localStorage.clear();
    localStorage.setItem(storageKey, JSON.stringify(answer));
    window.history.replaceState({}, '', '/login');
    surveyResponse = async () => new Response(null, { status: 204 });
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/survey')) return surveyResponse();
      if (String(input).endsWith('/auth/me')) {
        return new Response(JSON.stringify({
          email: 'profile@example.com', id: 'user-profile', role: 'BUYER',
          first_name: 'Profile', last_name: 'User', status: 'APPROVED', organization_id: null,
        }));
      }
      return new Response(null, { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearAccessToken();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  async function signIn(button = 'profile login') {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: button }));
    });
    expect(screen.getByTestId('email').textContent).toBe('profile@example.com');
  }

  function surveyCalls() {
    return fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/survey'));
  }

  it.each(['profile login', 'switch account'])('submits once with bearer auth and no email after %s', async button => {
    await signIn(button);
    await waitFor(() => expect(surveyCalls()).toHaveLength(1));
    const options = (surveyCalls()[0] as unknown as [unknown, RequestInit])[1];
    expect(new Headers(options.headers).get('Authorization')).toBe(
      `Bearer ${button === 'profile login' ? 'profile-access-token' : 'new-access-token'}`,
    );
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ use_case: 'buyer', referral_source: 'Conference' });
    await waitFor(() => expect(localStorage.getItem(storageKey)).toBeNull());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'profile login' })); });
    expect(surveyCalls()).toHaveLength(1);
  });

  it('leaves another email answer untouched', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ ...answer, email: 'other@example.com' }));
    await signIn();
    expect(surveyCalls()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(storageKey)!).email).toBe('other@example.com');
  });

  it('does not send a survey when no answer is saved', async () => {
    localStorage.removeItem(storageKey);
    await signIn();
    expect(surveyCalls()).toHaveLength(0);
  });

  it.each([400, 401, 403, 409, 422, 429])('clears an answer after HTTP %s without changing sign-in state', async status => {
    surveyResponse = async () => new Response(JSON.stringify({ detail: 'Not accepted' }), { status });
    const rateLimited = vi.fn();
    window.addEventListener('verdaxis:rate-limited', rateLimited);
    await signIn();
    await waitFor(() => expect(surveyCalls()).toHaveLength(1));
    await waitFor(() => expect(localStorage.getItem(storageKey)).toBeNull());
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('backend-unavailable').textContent).toBe('false');
    window.removeEventListener('verdaxis:rate-limited', rateLimited);
    expect(rateLimited).not.toHaveBeenCalled();
  });

  it.each(['network', 'server'])('keeps an answer after a %s failure for the next sign-in', async failure => {
    surveyResponse = async () => {
      if (failure === 'network') throw new TypeError('Network unavailable');
      return new Response(null, { status: 503 });
    };
    await signIn();
    await waitFor(() => expect(surveyCalls()).toHaveLength(1));
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(answer);
    surveyResponse = async () => new Response(null, { status: 204 });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'profile login' })); });
    await waitFor(() => expect(surveyCalls()).toHaveLength(2));
    await waitFor(() => expect(localStorage.getItem(storageKey)).toBeNull());
  });

  it('does not wait for the survey response before completing sign-in', async () => {
    let resolve!: (response: Response) => void;
    surveyResponse = () => new Promise<Response>(done => { resolve = done; });
    await signIn();
    expect(surveyCalls()).toHaveLength(1);
    expect(screen.getByTestId('loading').textContent).toBe('false');
    await act(async () => { resolve(new Response(null, { status: 204 })); });
    await waitFor(() => expect(localStorage.getItem(storageKey)).toBeNull());
  });

  it.each(['getItem', 'removeItem'] as const)('keeps sign-in working when storage %s throws', async method => {
    const original = Storage.prototype[method];
    vi.spyOn(Storage.prototype, method).mockImplementation(function (this: Storage, key: string) {
      if (this === localStorage) throw new DOMException('Storage unavailable', 'SecurityError');
      return original.call(this, key);
    });
    await signIn();
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('backend-unavailable').textContent).toBe('false');
    expect(surveyCalls()).toHaveLength(method === 'getItem' ? 0 : 1);
  });

  it('ignores malformed saved JSON', async () => {
    localStorage.setItem(storageKey, '{');
    await signIn();
    expect(surveyCalls()).toHaveLength(0);
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
