import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login }),
}));

import AcceptInvitationPage from '../pages/AcceptInvitationPage';

describe('pre-approved invitation acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/accept-invite#token=claim-secret');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        email: 'abdullah@customer.example',
        first_name: 'Abdullah',
        last_name: 'Rahman',
        role: 'SUPPLIER',
        organization_name: 'Goldwind Green Methanol',
        invited_by_name: 'Belinda Tan',
        expires_at: '2026-08-12T12:00:00Z',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'access-token',
        token_type: 'bearer',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  });

  it('shows the prepared account and accepts it only with password and consent', async () => {
    render(
      <MemoryRouter initialEntries={['/accept-invite']}>
        <AcceptInvitationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Goldwind Green Methanol')).toBeTruthy();
    expect(screen.getByText('abdullah@customer.example')).toBeTruthy();
    expect(window.location.hash).toBe('');
    expect(window.history.state.verdaxisInvitationToken).toBe('claim-secret');

    fireEvent.change(screen.getByLabelText('Create password'), { target: { value: 'Accepted-password-9' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Accepted-password-9' } });
    const submit = screen.getByRole('button', { name: 'Accept invitation' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);

    await waitFor(() => expect(login).toHaveBeenCalledWith('access-token'));
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/invitations/resolve');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ token: 'claim-secret' });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      token: 'claim-secret',
      new_password: 'Accepted-password-9',
      accept_terms: true,
    });
  });

  it('recovers the fragment token from the current history entry after a reload', async () => {
    const details = {
      email: 'abdullah@customer.example',
      first_name: 'Abdullah',
      last_name: 'Rahman',
      role: 'SUPPLIER',
      organization_name: 'Goldwind Green Methanol',
      invited_by_name: 'Belinda Tan',
      expires_at: '2026-08-12T12:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(details), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(details), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const first = render(<MemoryRouter><AcceptInvitationPage /></MemoryRouter>);
    expect(await screen.findByText('Goldwind Green Methanol')).toBeTruthy();
    first.unmount();

    render(<MemoryRouter><AcceptInvitationPage /></MemoryRouter>);
    expect(await screen.findByText('abdullah@customer.example')).toBeTruthy();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('ignores query-string invitation secrets so they cannot reach request logs', async () => {
    window.history.pushState({}, '', '/accept-invite?token=query-secret');
    const fetchMock = vi.mocked(fetch);

    render(<MemoryRouter><AcceptInvitationPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: /invitation/i })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
