import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VerifyEmailPage from '../pages/VerifyEmailPage';

describe('email verification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges the email token with a POST mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      email: 'candidate@example.test',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/verify-email?token=verification-token']}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('routes invalid verification links to sign in or password recovery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    render(
      <MemoryRouter initialEntries={['/verify-email?token=used-token']}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect((await screen.findByRole('link', { name: 'Sign In' })).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Reset Password' }).getAttribute('href')).toBe('/forgot-password');
  });
});
