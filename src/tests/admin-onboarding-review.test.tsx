import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  reviewQueue: vi.fn(),
  reviewCase: vi.fn(),
  resendVerification: vi.fn(),
  approveUser: vi.fn(),
  approveOrganization: vi.fn(),
  approveOrganizationJoin: vi.fn(),
  rejectUser: vi.fn(),
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
});
