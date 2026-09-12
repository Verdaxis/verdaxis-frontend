import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { Settings } from '../components/Settings';
import RegisterPage from '../pages/RegisterPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

const billingApi = vi.hoisted(() => ({
  fees: vi.fn(async () => ({ currency: 'USD', buyer_fee_per_mt_usd: '0', seller_fee_per_mt_usd: { free: '2.25', standard: '1.75', enterprise: null } })),
  me: vi.fn(async () => ({ id: 'subscription', org_id: 'org', tier: 'standard', is_active: true })),
}));
vi.mock('../services/api', () => ({ api: { subscriptions: billingApi } }));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { first_name: 'Test', last_name: 'Buyer', email: 'buyer@example.test', role: 'BUYER' },
  logout: vi.fn(),
}) }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));
vi.mock('../context/TutorialContext', () => ({ useTutorial: () => ({ start: vi.fn() }), scheduleTutorial: vi.fn() }));
vi.mock('../hooks/useServerPreference', () => ({ useServerPreference: (_ns: string, _key: string, _sanitize: unknown, defaults: unknown) => [defaults, vi.fn()] }));
vi.mock('../services/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('../components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));

describe('audited UI controls', () => {
  it('associates registration and onboarding inputs with visible labels and selection state', async () => {
    renderWithProviders(<RegisterPage />);
    for (const name of ['First Name', 'Last Name', 'Email Address', 'Password', 'Confirm Password']) {
      expect(await screen.findByLabelText(name, { exact: true })).toBeTruthy();
    }
    expect(screen.getByRole('combobox').getAttribute('id')).toBeTruthy();
    const password = screen.getByLabelText('Password', { exact: true });
    const rules = document.getElementById(password.getAttribute('aria-describedby') ?? '')!;
    expect(rules.textContent).toContain('8');
    expect(rules.getAttribute('aria-live')).toBe('polite');
    expect(within(rules).getAllByText('Not met')).toHaveLength(3);
    fireEvent.change(password, { target: { value: 'Test1234' } });
    expect(within(rules).getAllByText('Met')).toHaveLength(3);
    expect(within(rules).queryByText('Not met')).toBeNull();
    cleanup();

    renderWithProviders(<OnboardingPage />);
    expect(await screen.findByLabelText('First Name')).toBeTruthy();
    expect(screen.getByLabelText('Last Name')).toBeTruthy();
    const buyer = screen.getByRole('button', { name: /Buyer/ });
    fireEvent.click(buyer);
    expect(buyer.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows fixed currency, labelled passwords, and a working sales destination', async () => {
    billingApi.me.mockResolvedValueOnce({ id: 'subscription', org_id: 'org', tier: 'free', is_active: true });
    renderWithProviders(<Settings viewMode="BUYER" />);
    expect(await screen.findByLabelText('First Name')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('USD ($)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Security' }));
    for (const label of ['Current Password', 'New Password', 'Confirm New Password']) {
      expect(screen.getByLabelText(label, { exact: true })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Billing' }));
    expect((await screen.findByRole('link', { name: 'Upgrade' })).getAttribute('href')).toBe('mailto:sales@verdaxis.exchange');
    expect(screen.getByText('Buyer transaction fees are always free.')).toBeTruthy();
    expect(screen.getAllByText('$2.25/MT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1.75/MT').length).toBeGreaterThan(0);
    expect(screen.queryByText(/0\.5%/)).toBeNull();
  });

  it('keeps collapsed navigation named and removes the nonfunctional header search', () => {
    renderWithProviders(<Sidebar viewMode="BUYER" currentPage="MARKETPLACE" onNavigate={vi.fn()}
      isCollapsed onToggleCollapse={vi.fn()} isMobileOpen={false} onMobileClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand navigation' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Post a Bid' })).toBeTruthy();
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('aria-label')).toBeTruthy();
    renderWithProviders(<Header viewMode="BUYER" onSwitchView={vi.fn()} onOpenMobileSidebar={vi.fn()} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('button', { name: 'Profile' }).getAttribute('aria-expanded')).toBe('true');
  });
});
