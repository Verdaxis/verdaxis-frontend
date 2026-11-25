import { expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { loadNamespace } from '../../i18n';
import { renderWithProviders } from '../../tests/test-utils';
import ForgotPasswordPage from '../ForgotPasswordPage';
import ResetPasswordPage from '../ResetPasswordPage';

it('labels the recovery email field', async () => {
  await loadNamespace('auth');
  renderWithProviders(<ForgotPasswordPage />);
  expect(screen.getByRole('textbox', { name: 'Email Address' })).toBe(screen.getByLabelText('Email Address'));
});

it('links password rules and describes a mismatch only while it exists', async () => {
  await loadNamespace('auth');
  renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=test' });
  const password = screen.getByLabelText('New Password');
  const confirm = screen.getByLabelText('Confirm Password');
  fireEvent.change(password, { target: { value: 'Example123' } });
  expect(document.getElementById(password.getAttribute('aria-describedby')!)?.textContent).toContain('At least 8 characters');
  fireEvent.change(confirm, { target: { value: 'Example124' } });
  expect(confirm.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(confirm.getAttribute('aria-describedby')!)).toBe(screen.getByText('Passwords do not match'));
  fireEvent.change(confirm, { target: { value: 'Example123' } });
  expect(confirm.getAttribute('aria-invalid')).not.toBe('true');
  expect(confirm.hasAttribute('aria-describedby')).toBe(false);
});
