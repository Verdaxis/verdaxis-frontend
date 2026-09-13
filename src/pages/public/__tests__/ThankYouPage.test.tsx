import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import { ThankYouPage } from '../ThankYouPage';

const renderPage = (state?: { completion: 'registration' | 'organization' }) => render(
  <I18nextProvider i18n={i18n}>
    <MemoryRouter initialEntries={[{ pathname: '/thank-you', state }]}>
      <ThankYouPage />
    </MemoryRouter>
  </I18nextProvider>,
);

describe('ThankYouPage', () => {
  it('shows verified next steps after a real registration completion', async () => {
    renderPage({ completion: 'registration' });

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeTruthy();
    expect(screen.getByText('Your Verdaxis account registration is complete.')).toBeTruthy();
    expect(screen.getByText(/Verify your email address before signing in/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Sign In' }).getAttribute('href')).toBe('/login');
  });

  it('does not claim success on a direct visit', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Verdaxis account onboarding' })).toBeTruthy();
    expect(screen.queryByText('Thank you')).toBeNull();
    expect(screen.getByRole('link', { name: 'Create Account' }).getAttribute('href')).toBe('/register');
  });
});
