import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KycPage from '../pages/KycPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import AcceptInvitationPage from '../pages/AcceptInvitationPage';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'synthetic-session' }) }));
afterEach(() => vi.restoreAllMocks());

const SHAPES = [
  { label: 'structured', payload: { detail: { code: 'DOCUMENT_REJECTED', message: 'The document is unreadable' } } },
  { label: 'string', payload: { detail: 'The document is unreadable' } },
  { label: 'validation list', payload: { detail: [{ msg: 'The document is unreadable' }, { msg: '' }] } },
] as const;

const submitKyc = async () => {
  const { container } = renderWithProviders(<KycPage />);
  const file = new File(['synthetic'], 'synthetic.pdf', { type: 'application/pdf' });
  container.querySelectorAll('input[type=file]').forEach(input => fireEvent.change(input, { target: { files: [file] } }));
  fireEvent.submit(container.querySelector('form')!);
};

const submitOnboarding = async () => {
  const { container } = renderWithProviders(<OnboardingPage />);
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Member' } });
  fireEvent.click(screen.getByRole('button', { name: /buyer/i }));
  fireEvent.submit(container.querySelector('form')!);
};

describe('moved-route error shapes at page level', () => {
  beforeEach(async () => {
    await loadNamespace('auth');
    await i18n.changeLanguage('en');
  });

  describe.each(SHAPES)('$label detail', ({ payload }) => {
    it('kyc page shows the message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 422 }));
      await submitKyc();
      expect(await screen.findByText('The document is unreadable')).toBeTruthy();
    });

    it('onboarding page shows the message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 422 }));
      await submitOnboarding();
      expect(await screen.findByText('The document is unreadable')).toBeTruthy();
    });

    it('accept-invitation page shows the message', async () => {
      window.history.pushState({}, '', '/accept-invite#token=claim-secret');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 400 }));
      render(<MemoryRouter><AcceptInvitationPage /></MemoryRouter>);
      expect(await screen.findByText('The document is unreadable')).toBeTruthy();
    });
  });

  it('keeps the localized fallback when the envelope carries no message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: { code: 'DOCUMENT_REJECTED' } }, { status: 422 }));
    await submitKyc();
    expect(await screen.findByText('Submission failed. Please try again.')).toBeTruthy();
  });
});
