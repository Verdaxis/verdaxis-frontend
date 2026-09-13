import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import CreateOrganizationPage from '../pages/CreateOrganizationPage';

vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));

const renderPage = () => render(
  <I18nextProvider i18n={i18n}>
    <MemoryRouter initialEntries={[{
      pathname: '/create-organization',
      state: { registration_token: 'registration-token', role: 'BUYER' },
    }]}>
      <CreateOrganizationPage />
    </MemoryRouter>
  </I18nextProvider>,
);

const completeOrganizationForm = async () => {
  fireEvent.change(await screen.findByLabelText('Organization Name'), { target: { value: 'Test Shipping' } });
  expect(screen.getByRole('button', { name: 'Organization Type Ship Owner' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Country Select country…' }));
  fireEvent.change(screen.getByPlaceholderText('Search country…'), { target: { value: 'Sing' } });
  expect(screen.getByRole('button', { name: 'Clear country search' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /SG.*Singapore/ }));
  expect(screen.getByRole('button', { name: 'Country SG — Singapore' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Create Organization' }));
};

afterEach(() => vi.unstubAllGlobals());

describe('organization completion', () => {
  it('preserves verification guidance before offering the thank-you step', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'user@example.test' }),
    }));
    renderPage();

    await completeOrganizationForm();

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeTruthy();
    expect(screen.getByText('user@example.test')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe('/thank-you');
  });

  it('does not expose the completion step when organization creation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: { message: 'Organization could not be created' } }),
    }));
    renderPage();

    await completeOrganizationForm();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Organization could not be created'));
    expect(screen.queryByRole('link', { name: 'Continue' })).toBeNull();
    expect(screen.getByLabelText('Organization Name')).toBeTruthy();
  });
});
