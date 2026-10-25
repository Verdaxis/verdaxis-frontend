import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

const storageKey = 'verdaxis_onboarding_survey';

beforeEach(async () => {
  localStorage.clear();
  await loadNamespace('auth');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    email: 'verified@example.com',
  }), { status: 200 })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function submitSurvey(referral?: string) {
  renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=verification-fixture' });
  fireEvent.click(await screen.findByRole('button', { name: /Fuel Buyer/ }));
  if (referral) {
    fireEvent.change(screen.getByPlaceholderText('How did you hear about us? (optional)'), {
      target: { value: referral },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('link', { name: 'Sign In' })).toBeTruthy();
}

it.each([undefined, 'Industry event'])('saves the verified answer with referral %s without posting a survey', async referral => {
  await submitSurvey(referral);
  expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({
    email: 'verified@example.com',
    use_case: 'buyer',
    ...(referral ? { referral_source: referral } : {}),
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/survey'), expect.anything());
});

it('shows the done state when storage cannot be written', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage unavailable', 'SecurityError');
  });
  await submitSurvey();
  expect(fetch).toHaveBeenCalledTimes(1);
});
