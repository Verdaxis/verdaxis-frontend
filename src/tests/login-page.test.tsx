import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, isAuthenticated: false }),
}));

vi.mock('../components/public/DataOcean', () => ({
  DataOcean: () => null,
}));

import LoginPage from '../pages/LoginPage';

describe('password login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the server-validated profile to AuthContext', async () => {
    const profile = {
      id: 'user-1',
      email: 'buyer@example.com',
      first_name: 'Buyer',
      last_name: 'User',
      role: 'BUYER',
      status: 'APPROVED',
      organization_id: null,
      referral_code: null,
      must_change_password: false,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-token',
      token_type: 'bearer',
      profile,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Email Address'), {
      target: { value: 'buyer@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('access-token', profile);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
