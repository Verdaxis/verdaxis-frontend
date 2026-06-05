import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

function Probe() {
  const { isLoading, isAuthenticated, user, isBackendUnavailable, checkAuth } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email ?? ''}</div>
      <div data-testid="backend-unavailable">{String(isBackendUnavailable)}</div>
      <button type="button" onClick={() => void checkAuth()}>retry</button>
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
});

describe('AuthProvider backend availability', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem('token', 'still-valid-locally');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
      json: async () => ({}),
    }) as typeof fetch;
  });

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
  });

  it('keeps the session token and marks the backend unavailable on gateway failure', async () => {
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
    expect(localStorage.getItem('token')).toBe('still-valid-locally');
  });
});
