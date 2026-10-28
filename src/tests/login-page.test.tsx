import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, isAuthenticated: false }),
}));

vi.mock('../components/public/DataOcean', () => ({
  DataOcean: () => null,
}));

import i18n from '../i18n';
import LoginPage from '../pages/LoginPage';

const installNotification = (permission: NotificationPermission, requestPermission: () => unknown) => {
  const FakeNotification = Object.assign(vi.fn(), { permission, requestPermission });
  Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
};

describe('password login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'Notification');
  });

  const submitLogin = async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Email Address'), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  };

  const stubLoginResponse = () => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    access_token: 'access-token',
    token_type: 'bearer',
    profile: null,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

  it('asks for notification permission inside the sign-in click, before the login request', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    installNotification('default', requestPermission);
    stubLoginResponse();

    await submitLogin();

    // Checked straight after the click, with no await: still inside the gesture.
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(requestPermission.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(fetch).mock.invocationCallOrder[0]);
    await waitFor(() => expect(login).toHaveBeenCalledWith('access-token', null));
  });

  it.each(['granted', 'denied'] as const)('does not prompt when permission is already %s', async (permission) => {
    const requestPermission = vi.fn(async () => 'granted');
    installNotification(permission, requestPermission);
    stubLoginResponse();

    await submitLogin();

    await waitFor(() => expect(login).toHaveBeenCalled());
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not prompt when the browser has no Notification API, and signs in', async () => {
    stubLoginResponse();
    await submitLogin();
    await waitFor(() => expect(login).toHaveBeenCalled());
  });

  it.each([
    ['throws', () => { throw new Error('blocked'); }],
    ['rejects', () => Promise.reject(new Error('dismissed'))],
    ['never answers', () => new Promise(() => undefined)],
  ])('signs in when the permission prompt %s', async (_case, requestPermission) => {
    installNotification('default', requestPermission);
    stubLoginResponse();

    await submitLogin();

    await waitFor(() => expect(login).toHaveBeenCalledWith('access-token', null));
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
