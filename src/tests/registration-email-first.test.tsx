import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { loadNamespace } from '../i18n';
import RegisterPage from '../pages/RegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import CreateOrganizationPage from '../pages/CreateOrganizationPage';

vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));

beforeEach(async () => { await loadNamespace('auth'); });
afterEach(() => vi.unstubAllGlobals());

it('shows neutral email guidance for an accepted registration', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'check_email' }), { status: 202 })));
  const view = render(<MemoryRouter><RegisterPage /></MemoryRouter>);
  await screen.findByLabelText('First Name');
  for (const [id, value] of Object.entries({
    'register-first-name': 'Test', 'register-last-name': 'Buyer',
    'register-email': 'buyer@example.test', 'register-password': 'Password123',
    'register-confirm-password': 'Password123',
  })) fireEvent.change(view.container.querySelector(`#${id}`)!, { target: { value } });
  fireEvent.submit(view.container.querySelector('form')!);
  expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeTruthy();
  expect(screen.getByText(/If registration can proceed/)).toBeTruthy();
  expect(screen.queryByText(/We sent a verification link/)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each(['created', 'requires_org'])('retains the transitional registration response %s', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    status, registration_token: 'legacy-registration-fixture',
  }), { status: 200 })));
  const view = render(<MemoryRouter><Routes>
    <Route path="/" element={<RegisterPage />} />
    <Route path="/create-organization" element={<CreateOrganizationPage />} />
  </Routes></MemoryRouter>);
  await screen.findByLabelText('First Name');
  for (const [id, value] of Object.entries({
    'register-first-name': 'Test', 'register-last-name': 'Buyer',
    'register-email': 'buyer@example.test', 'register-password': 'Password123',
    'register-confirm-password': 'Password123',
  })) fireEvent.change(view.container.querySelector(`#${id}`)!, { target: { value } });
  fireEvent.submit(view.container.querySelector('form')!);
  if (status === 'created') expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeTruthy();
  else expect(await screen.findByLabelText('Organization Name')).toBeTruthy();
});

it('completes organization registration after email verification', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      email: 'buyer@example.test', requires_org: true, registration_token: 'registration-fixture',
    }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'buyer@example.test' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter initialEntries={['/verify-email?token=email-fixture']}><Routes>
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/create-organization" element={<CreateOrganizationPage />} />
  </Routes></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Organization Name'), { target: { value: 'Test Shipping' } });
  fireEvent.click(screen.getByRole('button', { name: 'Country Select country…' }));
  fireEvent.click(screen.getByRole('button', { name: /SG.*Singapore/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));
  expect(await screen.findByRole('heading', { name: 'Email Verified!' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Sign In' }).getAttribute('href')).toBe('/login');
  expect(screen.queryByRole('button', { name: 'Resend verification email' })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toContain('/auth/register-with-org');
  expect(JSON.parse(options.body)).toEqual({ registration_token: 'registration-fixture', organization: {
    name: 'Test Shipping', type: 'SHIPPING_LINE', country_code: 'SG', tax_id: '',
  } });
});

it('does not offer organization completion without a registration token', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ requires_org: true }), { status: 200 })));
  render(<MemoryRouter initialEntries={['/verify-email?token=email-fixture']}><VerifyEmailPage /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Reset Password' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create Organization' })).toBeNull();
});
