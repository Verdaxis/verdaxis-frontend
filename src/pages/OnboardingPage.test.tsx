import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { OnboardingPage } from './OnboardingPage';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from '../tests/test-utils';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'synthetic-session' }) }));
afterEach(() => vi.restoreAllMocks());

it.each([
  { detail: { code: 'INVALID_PROFILE', message: 'Choose a valid profile' } },
  { detail: 'Choose a valid profile' },
])('submits the selected profile with the current principal and renders a rejected update %#', async payload => {
  await loadNamespace('auth');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 422 }));
  const { container } = renderWithProviders(<OnboardingPage />);
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Member' } });
  fireEvent.click(screen.getByRole('button', { name: /buyer/i }));
  fireEvent.submit(container.querySelector('form')!);
  expect((await screen.findByRole('alert')).textContent).toBe('Choose a valid profile');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/auth\/me$/);
  expect(options?.method).toBe('PUT');
  expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer synthetic-session');
  expect(JSON.parse(String(options?.body))).toEqual({ first_name: 'Test', last_name: 'Member', role: 'BUYER' });
});
