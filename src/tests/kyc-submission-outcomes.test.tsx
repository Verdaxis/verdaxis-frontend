import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import KycPage from '../pages/KycPage';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'synthetic' }) }));
afterEach(() => vi.restoreAllMocks());

it.each([200, 503, 504])('does not claim approval or rollback for KYC HTTP %s', async status => {
  await loadNamespace('auth');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(
    status === 200 ? { kyc_status: 'REVIEW_REQUIRED' } : { detail: 'Gateway unavailable' }, { status }));
  const { container } = renderWithProviders(<KycPage />);
  const file = new File(['%PDF-1.4 synthetic'], 'synthetic.pdf', { type: 'application/pdf' });
  container.querySelectorAll('input[type=file]').forEach(input => fireEvent.change(input, { target: { files: [file] } }));
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(screen.queryByText('Verifying Documents...')).toBeNull());
  expect(screen.queryByText('Account Approved!')).toBeNull();
  if (status === 200) expect(await screen.findByText('Documents submitted for review')).toBeTruthy();
  if (status === 504) expect(await screen.findByText(/may have been saved/i)).toBeTruthy();
  expect(container.textContent).not.toMatch(/nothing was saved|no documents were saved/i);
});
