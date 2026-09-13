import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import RegisterPage from '../pages/RegisterPage';
import { renderWithProviders } from './test-utils';

vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));

const completeRegistrationForm = async () => {
  fireEvent.change(await screen.findByLabelText('First Name'), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'User' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'user@example.test' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Valid123' } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Valid123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
};

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('registration completion', () => {
  it('offers the thank-you next step only after the API creates the account', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'created' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<RegisterPage />);

    await completeRegistrationForm();

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeTruthy();
    expect(screen.getByText('user@example.test')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe('/thank-you');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the form and error visible when registration fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Email already registered' }),
    }));
    renderWithProviders(<RegisterPage />);

    await completeRegistrationForm();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('An account with this email already exists.'));
    expect(screen.queryByRole('link', { name: 'Continue' })).toBeNull();
    expect(screen.getByLabelText('Email Address')).toBeTruthy();
  });
});
