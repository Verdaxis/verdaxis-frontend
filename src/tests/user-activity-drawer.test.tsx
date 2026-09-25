import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ userActivity: vi.fn() }));

vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    api: {
      ...original.api,
      admin: { ...original.api.admin, userActivity: mocks.userActivity },
    },
  };
});

import { UserActivityDrawer } from '../components/admin/UserActivityDrawer';

const user = { id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' };

describe('UserActivityDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters and paginates the safely rendered timeline', async () => {
    mocks.userActivity.mockResolvedValue({
      items: [{
        id: 'event-1',
        occurred_at: '2026-09-25T08:30:00Z',
        source: 'browsing',
        action: 'page_view',
        details: { page: '<img src=x onerror=alert(1)>', market_product: 'BIO_METHANOL' },
      }],
      has_more: true,
      last_activity_at: '2026-09-25T08:30:00Z',
    });

    render(<UserActivityDrawer user={user} onClose={vi.fn()} />);

    expect(await screen.findByText('Viewed page')).toBeTruthy();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(document.querySelector('img')).toBeNull();
    expect(mocks.userActivity).toHaveBeenLastCalledWith(
      'user-1',
      { days: 30, kind: 'all', limit: 50, offset: 0 },
      expect.any(AbortSignal),
    );

    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(mocks.userActivity).toHaveBeenLastCalledWith(
      'user-1',
      { days: 7, kind: 'all', limit: 50, offset: 0 },
      expect.any(AbortSignal),
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Browsing' }));
    await waitFor(() => expect(mocks.userActivity).toHaveBeenLastCalledWith(
      'user-1',
      { days: 7, kind: 'browsing', limit: 50, offset: 0 },
      expect.any(AbortSignal),
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(mocks.userActivity).toHaveBeenLastCalledWith(
      'user-1',
      { days: 7, kind: 'browsing', limit: 50, offset: 50 },
      expect.any(AbortSignal),
    ));
  });

  it('ignores a stale response after the selected user changes', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    let resolveSecond: (value: unknown) => void = () => undefined;
    mocks.userActivity.mockImplementation((userId: string) => new Promise(resolve => {
      if (userId === 'user-1') resolveFirst = resolve;
      else resolveSecond = resolve;
    }));

    const { rerender } = render(<UserActivityDrawer user={user} onClose={vi.fn()} />);
    rerender(<UserActivityDrawer user={{ id: 'user-2', name: 'Bao Li', email: 'bao@example.test' }} onClose={vi.fn()} />);

    await act(async () => {
      resolveSecond({
        items: [{ id: 'second', occurred_at: '2026-09-25T09:00:00Z', source: 'business', action: 'second_action', details: {} }],
        has_more: false,
        last_activity_at: '2026-09-25T09:00:00Z',
      });
    });
    expect(await screen.findByText('Second Action')).toBeTruthy();

    await act(async () => {
      resolveFirst({
        items: [{ id: 'first', occurred_at: '2026-09-25T08:00:00Z', source: 'business', action: 'stale_action', details: {} }],
        has_more: false,
        last_activity_at: '2026-09-25T08:00:00Z',
      });
    });
    expect(screen.queryByText('Stale Action')).toBeNull();
  });

  it('offers a retry and then shows the empty state', async () => {
    mocks.userActivity
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce({ items: [], has_more: false, last_activity_at: null });

    render(<UserActivityDrawer user={user} onClose={vi.fn()} />);

    expect((await screen.findByRole('alert')).textContent).toContain('Activity could not be loaded.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No activity was recorded for these filters.')).toBeTruthy();
  });
});
