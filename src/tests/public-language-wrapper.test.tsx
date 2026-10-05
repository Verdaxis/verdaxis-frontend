import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PublicLanguageWrapper from '../components/public/PublicLanguageWrapper';
import i18n from '../i18n';

describe('PublicLanguageWrapper', () => {
  it('retains referral attribution when a server redirect lands on a localized page', async () => {
    await i18n.changeLanguage('en');
    sessionStorage.removeItem('verdaxis_ref_code');

    render(
      <MemoryRouter initialEntries={['/en/?ref=partner-code']}>
        <Routes>
          <Route path="/:lang" element={<PublicLanguageWrapper invalidLanguageElement={<div>invalid language</div>} />}>
            <Route index element={<div>localized page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('localized page')).toBeTruthy();
    expect(sessionStorage.getItem('verdaxis_ref_code')).toBe('partner-code');
    sessionStorage.removeItem('verdaxis_ref_code');
  });

  it('shows the shared loading screen while applying a URL language', async () => {
    await i18n.changeLanguage('en');
    const changeLanguage = vi.spyOn(i18n, 'changeLanguage').mockReturnValue(new Promise(() => {}));

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/zh']}>
          <Routes>
            <Route path="/:lang" element={<PublicLanguageWrapper invalidLanguageElement={<div>invalid language</div>} />}>
              <Route index element={<div>localized page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('localized page')).toBeNull();
    expect(changeLanguage).toHaveBeenCalledWith('zh');
    changeLanguage.mockRestore();
  });
});
