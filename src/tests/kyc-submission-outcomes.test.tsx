import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import KycPage from '../pages/KycPage';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'synthetic' }) }));
afterEach(() => vi.restoreAllMocks());

it('renders a structured document validation response without repeating the upload', async () => {
  await loadNamespace('auth');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    detail: { code: 'INVALID_DOCUMENT', message: 'Choose a supported document' },
  }, { status: 422 }));
  const { container } = renderWithProviders(<KycPage />);
  const file = new File(['synthetic'], 'synthetic.pdf', { type: 'application/pdf' });
  container.querySelectorAll('input[type=file]').forEach(input => fireEvent.change(input, { target: { files: [file] } }));
  fireEvent.submit(container.querySelector('form')!);
  expect(await screen.findByText('Choose a supported document')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/kyc\/submit$/);
  expect(options?.method).toBe('POST');
  expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer synthetic');
  expect(options?.body).toBeInstanceOf(FormData);
});

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
