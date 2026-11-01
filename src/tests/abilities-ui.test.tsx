import React from 'react';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './test-utils';
import { AbilitiesProvider } from '../context/AbilitiesContext';
import { NeedsAttentionFeed } from '../components/NeedsAttentionFeed';
import { Sidebar } from '../components/layout/Sidebar';
import { ApiError } from '../services/api';
import i18n from '../i18n';
import type { Trade } from '../types';
import { abilitiesPayload } from './abilities-fixtures';

const { mineMock, authState, supportState } = vi.hoisted(() => ({
  mineMock: vi.fn(),
  authState: { user: { id: 'user-1', email: 'u@example.com', role: 'BUYER', organization_id: 'org-1', status: 'APPROVED' } as Record<string, unknown> },
  supportState: { isActive: false },
}));

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: { abilities: { mine: mineMock } },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ isActive: supportState.isActive }),
}));

const pendingTrade = {
  id: 'trade-1',
  status: 'PENDING_CONFIRMATION',
  initiated_by: 'SELLER',
  seller_name: 'Seller Co',
  buyer_name: 'Buyer Co',
  quantity_mt: 100,
  price_per_mt_usd: 700,
  fuel_type: 'Methanol',
  product_name: 'Methanol',
} as unknown as Trade;

// Let the mocked abilities request and its state update finish before asserting an absence.
const settleAbilitiesRequest = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

const renderFeed = (withProvider = true) => {
  const feed = (
    <NeedsAttentionFeed trades={[pendingTrade]} viewMode="BUYER" onNavigate={vi.fn()} onConfirmTrade={vi.fn()} />
  );
  return renderWithProviders(withProvider ? <AbilitiesProvider>{feed}</AbilitiesProvider> : feed);
};

const renderSidebar = (userRole: string | null, viewMode: 'BUYER' | 'SUPPLIER' = 'BUYER') => renderWithProviders(
  <AbilitiesProvider>
    <Sidebar
      viewMode={viewMode}
      currentPage="DASHBOARD"
      onNavigate={vi.fn()}
      isCollapsed={false}
      onToggleCollapse={vi.fn()}
      isMobileOpen={false}
      onMobileClose={vi.fn()}
      userRole={userRole}
    />
  </AbilitiesProvider>,
);

describe('server abilities in the UI', () => {
  beforeEach(() => {
    mineMock.mockReset();
    supportState.isActive = false;
  });

  afterEach(async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  describe('confirm trade button', () => {
    it('is disabled and shows the localized reason when the server denies it', async () => {
      mineMock.mockResolvedValue(abilitiesPayload({ confirm_trade: { code: 'ORGANIZATION_NOT_APPROVED' } }));

      renderFeed();

      const note = await screen.findByTestId('ability-denial-note');
      expect(note.textContent).toContain('Your organization has not been approved yet.');
      expect(note.getAttribute('data-reason-code')).toBe('ORGANIZATION_NOT_APPROVED');
      const button = screen.getByRole('button', { name: 'Confirm' });
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.getAttribute('title')).toBe('Your organization has not been approved yet.');
    });

    it('shows the Chinese text for a known reason code', async () => {
      await act(async () => { await i18n.changeLanguage('zh'); });
      mineMock.mockResolvedValue(abilitiesPayload({ confirm_trade: { code: 'EMAIL_NOT_VERIFIED' } }));

      renderFeed();

      expect((await screen.findByTestId('ability-denial-note')).textContent).toContain('请先验证您的电子邮箱后再继续。');
    });

    it('falls back to the server reason for a reason code this client does not know', async () => {
      mineMock.mockResolvedValue(abilitiesPayload({
        confirm_trade: { code: 'BRAND_NEW_CODE', reason: 'Quota exhausted this month.' },
      }));

      renderFeed();

      expect((await screen.findByTestId('ability-denial-note')).textContent).toContain('Quota exhausted this month.');
      expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('renders the normal enabled button, without a note, when the server allows it', async () => {
      mineMock.mockResolvedValue(abilitiesPayload());

      renderFeed();

      await settleAbilitiesRequest();
      const button = await screen.findByRole('button', { name: 'Confirm' });
      expect((button as HTMLButtonElement).disabled).toBe(false);
      expect(button.hasAttribute('title')).toBe(false);
      expect(screen.queryByTestId('ability-denial-note')).toBeNull();
    });

    it.each([
      ['the request fails with 403', () => mineMock.mockRejectedValue(new ApiError('Password change required.', 403))],
      ['the backend has no abilities route', () => mineMock.mockRejectedValue(new ApiError('Not Found', 404))],
      ['the schema version is unknown', () => mineMock.mockResolvedValue(abilitiesPayload({ confirm_trade: { code: 'ADMIN_CANNOT_EXECUTE' } }, { schema_version: 9 }))],
    ])('keeps today\'s enabled button when %s', async (_label, arrange) => {
      arrange();

      renderFeed();

      await settleAbilitiesRequest();
      expect(((await screen.findByRole('button', { name: 'Confirm' })) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByTestId('ability-denial-note')).toBeNull();
    });

    it('keeps the enabled button when no provider is mounted', () => {
      renderFeed(false);

      expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('assisted Market Support context', () => {
    it('does not apply the administrator\'s own market hints', async () => {
      supportState.isActive = true;
      mineMock.mockResolvedValue(abilitiesPayload({ confirm_trade: { code: 'ADMIN_CANNOT_EXECUTE' } }));

      renderFeed();

      await settleAbilitiesRequest();
      expect(((await screen.findByRole('button', { name: 'Confirm' })) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByTestId('ability-denial-note')).toBeNull();
    });
  });

  describe('sidebar', () => {
    it('disables the primary action with the reason and keeps the Admin entry hidden for a buyer', async () => {
      mineMock.mockResolvedValue(abilitiesPayload({
        place_bid_order: { code: 'KYC_REJECTED' },
        view_admin_analytics: { code: 'ADMIN_ROLE_REQUIRED' },
        view_audit_log: { code: 'ADMIN_ROLE_REQUIRED' },
        view_user_activity: { code: 'ADMIN_ROLE_REQUIRED' },
        view_feedback: { code: 'ADMIN_ROLE_REQUIRED' },
        manage_subscriptions: { code: 'ADMIN_ROLE_REQUIRED' },
        manage_accounts: { code: 'ADMIN_ROLE_REQUIRED' },
        review_kyc: { code: 'ADMIN_ROLE_REQUIRED' },
        manage_commissions: { code: 'ADMIN_ROLE_REQUIRED' },
      }));

      renderSidebar('BUYER');

      expect((await screen.findByTestId('ability-denial-note')).textContent).toContain('Your identity verification was rejected.');
      expect((screen.getByRole('button', { name: 'Post a Bid' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).toBeNull();
    });

    it('uses the ask ability in supplier mode', async () => {
      mineMock.mockResolvedValue(abilitiesPayload({ place_ask_order: { code: 'ORGANIZATION_PROVENANCE_UNVERIFIED' } }));

      renderSidebar('SUPPLIER', 'SUPPLIER');

      expect((await screen.findByTestId('ability-denial-note')).textContent).toContain('not yet verified for live market trading');
    });

    it('shows the Admin entry when the server allows an admin ability', async () => {
      mineMock.mockResolvedValue(abilitiesPayload());

      renderSidebar('ADMIN');

      expect(await screen.findByRole('link', { name: 'Admin Dashboard' })).not.toBeNull();
    });

    it('keeps the role rule for the Admin entry while abilities are unavailable', async () => {
      mineMock.mockRejectedValue(new TypeError('Failed to fetch'));

      renderSidebar('ADMIN');

      await settleAbilitiesRequest();
      expect(await screen.findByRole('link', { name: 'Admin Dashboard' })).not.toBeNull();
      expect((screen.getByRole('button', { name: 'Post a Bid' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
