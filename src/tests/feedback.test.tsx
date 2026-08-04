import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  adminFeedback: vi.fn(),
  onboardingAttention: vi.fn(),
  users: vi.fn(),
  reviewQueue: vi.fn(),
}));

vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    api: {
      ...original.api,
      feedback: { submit: mocks.submit },
      admin: {
        ...original.api.admin,
        feedback: mocks.adminFeedback,
        onboardingAttention: mocks.onboardingAttention,
        users: mocks.users,
        reviewQueue: mocks.reviewQueue,
      },
    },
  };
});

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ start: vi.fn(), resume: vi.fn() }),
}));

vi.mock('../components/admin/product-analytics/ProductAnalyticsWorkspace', () => ({
  ProductAnalyticsWorkspace: () => null,
}));

import { FeedbackButton } from '../components/FeedbackButton';
import { AdminDashboard } from '../components/admin/AdminDashboard';

describe('feedback widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submit.mockResolvedValue({ id: 'f-1', created_at: '2026-08-04T08:00:00Z' });
  });

  it('submits the trimmed message with the current app path', async () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace']}>
        <FeedbackButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('feedback-button'));
    fireEvent.change(screen.getByTestId('feedback-message'), {
      target: { value: '  the order form is confusing  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith('the order form is confusing', '/app/marketplace'),
    );
    await screen.findByRole('status');
  });

  it('disables sending while the message is empty', () => {
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <FeedbackButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('feedback-button'));
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the message when submission fails', async () => {
    mocks.submit.mockRejectedValueOnce(new Error('offline'));
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <FeedbackButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('feedback-button'));
    fireEvent.change(screen.getByTestId('feedback-message'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByRole('alert');
    expect((screen.getByTestId('feedback-message') as HTMLTextAreaElement).value).toBe('hello');
  });
});

describe('admin feedback tab and outreach panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.users.mockResolvedValue({ items: [], total: 0 });
    mocks.reviewQueue.mockResolvedValue({ items: [] });
    mocks.adminFeedback.mockResolvedValue({
      total: 1,
      items: [{
        id: 'f-1',
        created_at: '2026-08-04T08:00:00Z',
        message: 'Please add CIF pricing',
        page: '/app/marketplace',
        user_email: 'ada@example.com',
        user_name: 'Ada Lovelace',
        org_name: 'Acme Shipping',
      }],
    });
    mocks.onboardingAttention.mockResolvedValue({
      generated_at: '2026-08-04T08:00:00Z',
      items: [{
        email: 'stalled@example.com',
        name: 'Stal Led',
        role: 'BUYER',
        stage: 'first_login_overdue',
        since: '2026-08-03T08:00:00Z',
        organization_name: 'Acme Shipping',
        last_login: null,
      }],
    });
  });

  it('lists identified feedback entries on the Feedback tab', async () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/feedback']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    await screen.findByTestId('admin-feedback-list');
    expect(screen.getByText('Please add CIF pricing')).toBeTruthy();
    const mailto = screen.getByRole('link', { name: 'ada@example.com' }) as HTMLAnchorElement;
    expect(mailto.href).toBe('mailto:ada@example.com');
  });

  it('shows stalled users with stage and mailto in the Users tab outreach panel', async () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    await screen.findByTestId('outreach-panel');
    expect(screen.getByText('Approved, never logged in')).toBeTruthy();
    const mailto = screen.getByRole('link', { name: 'stalled@example.com' }) as HTMLAnchorElement;
    expect(mailto.href).toBe('mailto:stalled@example.com');
  });

  it('hides the outreach panel when nobody is stalled', async () => {
    mocks.onboardingAttention.mockResolvedValue({ generated_at: '2026-08-04T08:00:00Z', items: [] });
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <AdminDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.onboardingAttention).toHaveBeenCalled());
    expect(screen.queryByTestId('outreach-panel')).toBeNull();
  });
});
