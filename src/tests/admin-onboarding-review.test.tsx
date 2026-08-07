import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  reviewQueue: vi.fn(),
  reviewCase: vi.fn(),
  resendVerification: vi.fn(),
  approveUser: vi.fn(),
  approveOrganization: vi.fn(),
  approveOrganizationJoin: vi.fn(),
  rejectUser: vi.fn(),
  invitationOrganizations: vi.fn(),
  createInvitation: vi.fn(),
  onboardingAttention: vi.fn(),
}));

vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    api: {
      ...original.api,
      admin: {
        ...original.api.admin,
        ...mocks,
      },
    },
  };
});

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({
    start: vi.fn(),
    resume: vi.fn(),
  }),
}));

vi.mock('../components/admin/product-analytics/ProductAnalyticsWorkspace', () => ({
  ProductAnalyticsWorkspace: () => null,
}));

import { AdminDashboard } from '../components/admin/AdminDashboard';
import i18n, { loadNamespace } from '../i18n';

const reviewCase = {
  user_id: 'user-1',
  email: 'hesham.nasr@hlag.com',
  email_verified: false,
  account_status: 'PENDING',
  role: 'BUYER',
  created_at: '2026-07-29T15:00:00Z',
  current_organization: null,
  requested_organizations: [{
    request_id: 'join-1',
    status: 'PENDING',
    organization: {
      id: 'org-1',
      name: 'Hapag-Lloyd AG',
      verification_status: 'PENDING',
    },
  }],
};

describe('admin onboarding review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.users.mockResolvedValue({
      total: 1,
      items: [{
        id: 'user-1',
        email: 'hesham.nasr@hlag.com',
        first_name: 'Hesham',
        last_name: 'Nasr',
        role: 'BUYER',
        status: 'PENDING',
        created_at: '2026-07-29T15:00:00Z',
        org_name: null,
        org_type: null,
        org_provenance: null,
        organization_id: null,
      }],
    });
    mocks.reviewQueue.mockResolvedValue({ items: [reviewCase], limit: 100 });
    mocks.reviewCase.mockResolvedValue(reviewCase);
    mocks.resendVerification.mockResolvedValue({
      message: 'Verification email sent.',
    });
    mocks.invitationOrganizations.mockResolvedValue({
      items: [{
        id: 'org-1',
        name: 'Goldwind Green Methanol',
        domain: 'goldwind.example',
        type: 'FUEL_SUPPLIER',
      }],
    });
    mocks.createInvitation.mockResolvedValue({
      user_id: 'invited-user-1',
      email: 'abdullah@customer.example',
      role: 'SUPPLIER',
      organization_name: 'Goldwind Green Methanol',
      acceptance_url: 'https://app.verdaxis.exchange/accept-invite#token=claim-secret',
      expires_at: '2026-08-12T12:00:00Z',
      reissued: false,
    });
    mocks.onboardingAttention.mockResolvedValue({ items: [], generated_at: '2026-08-07T00:00:00Z' });
  });

  afterEach(async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  it('shows the requested organization and blocks approval on email verification', async () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    await screen.findByText('Hapag-Lloyd AG');
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    await screen.findByText('Awaiting verification');
    fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }));

    await waitFor(() => {
      expect(mocks.resendVerification).toHaveBeenCalledWith('hesham.nasr@hlag.com');
    });
  });

  it('generates a pre-approved invitation for an existing organization', async () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Invite user' }));
    expect(await screen.findByRole('option', { name: 'Select role' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Abdullah' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Rahman' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'abdullah@customer.example' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'SUPPLIER' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'org-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));

    await waitFor(() => {
      expect(mocks.createInvitation).toHaveBeenCalledWith({
        email: 'abdullah@customer.example',
        first_name: 'Abdullah',
        last_name: 'Rahman',
        role: 'SUPPLIER',
        organization_id: 'org-1',
      });
    });
    expect(await screen.findByText('Invitation ready')).toBeTruthy();
    expect(screen.getByDisplayValue('https://app.verdaxis.exchange/accept-invite#token=claim-secret')).toBeTruthy();
  });

  it('does not expose unknown organization or outreach enums in Chinese', async () => {
    await loadNamespace('admin');
    await act(async () => { await i18n.changeLanguage('zh'); });
    mocks.users.mockResolvedValue({
      total: 1,
      items: [{
        id: 'future-user',
        email: 'future@example.test',
        first_name: 'Future',
        last_name: 'User',
        role: 'BUYER',
        status: 'PENDING',
        created_at: '2026-08-07T00:00:00Z',
        org_name: 'Future Fuels Ltd.',
        org_type: 'FUTURE_ORG',
        org_provenance: 'REAL',
        organization_id: 'future-org',
      }],
    });
    mocks.onboardingAttention.mockResolvedValue({
      generated_at: '2026-08-07T00:00:00Z',
      items: [{
        email: 'future@example.test',
        name: 'Future User',
        role: 'BUYER',
        stage: 'FUTURE_STAGE',
        since: '2026-08-06T00:00:00Z',
        organization_name: 'Future Fuels Ltd.',
        last_login: null,
      }],
    });

    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/其他机构类型/)).toBeTruthy();
    expect(await screen.findByText('其他入驻阶段')).toBeTruthy();
    expect(screen.queryByText('FUTURE_ORG')).toBeNull();
    expect(screen.queryByText('FUTURE_STAGE')).toBeNull();
  });
});
