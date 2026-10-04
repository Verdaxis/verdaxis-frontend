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

import i18n from '../i18n';
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

  it('renders the English fallback when the Chinese auth namespace fails to load', async () => {
    const previousLanguage = i18n.language;
    const previousEnglishAuth = i18n.hasResourceBundle('en', 'auth')
      ? i18n.getResourceBundle('en', 'auth')
      : undefined;
    const previousChineseAuth = i18n.hasResourceBundle('zh', 'auth')
      ? i18n.getResourceBundle('zh', 'auth')
      : undefined;
    const rawSecret = 'secret-auth-chunk-detail';

    await i18n.changeLanguage('zh');
    i18n.removeResourceBundle('zh', 'auth');

    const addResourceBundle = i18n.addResourceBundle.bind(i18n);
    const addResourceBundleSpy = vi.spyOn(i18n, 'addResourceBundle').mockImplementation((
      language,
      namespace,
      resources,
      deep,
      overwrite,
    ) => {
      if (language === 'zh' && namespace === 'auth') {
        throw new Error(`Failed with ${rawSecret}`);
      }
      return addResourceBundle(language, namespace, resources, deep, overwrite);
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let view: ReturnType<typeof render> | undefined;

    try {
      view = render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      expect(await screen.findByRole('button', { name: 'Sign In' })).toBeTruthy();
      expect(screen.getByLabelText('Email Address')).toBeTruthy();
      expect(screen.getByLabelText('Password')).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[i18n] Failed to load zh/auth translations.');
      expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(rawSecret);
    } finally {
      view?.unmount();
      addResourceBundleSpy.mockRestore();
      consoleErrorSpy.mockRestore();

      i18n.removeResourceBundle('en', 'auth');
      if (previousEnglishAuth !== undefined) {
        i18n.addResourceBundle('en', 'auth', previousEnglishAuth, true, true);
      }
      i18n.removeResourceBundle('zh', 'auth');
      if (previousChineseAuth !== undefined) {
        i18n.addResourceBundle('zh', 'auth', previousChineseAuth, true, true);
      }
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
