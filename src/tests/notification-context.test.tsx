import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from './test-utils';
import { NotificationProvider, useNotifications } from '../context/NotificationContext';

const { listMock, unreadCountMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  unreadCountMock: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    notifications: {
      list: (...args: unknown[]) => listMock(...args),
      getUnreadCount: (...args: unknown[]) => unreadCountMock(...args),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'ops@example.com',
      first_name: 'Ops',
      last_name: 'User',
      role: 'BUYER',
      status: 'APPROVED',
    },
  }),
}));

function NotificationProbe() {
  const { notifications, unreadCount } = useNotifications();
  return (
    <div>
      <span data-testid="notification-count">{notifications.length}</span>
      <span data-testid="unread-count">{unreadCount}</span>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    listMock.mockReset();
    unreadCountMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps notification list updates even if unread-count fetch fails', async () => {
    listMock.mockResolvedValue([
      {
        id: 'notification-1',
        title: 'Order update',
        message: 'A bid was updated',
        type: 'info',
        is_read: false,
        created_at: '2026-04-08T10:00:00Z',
      },
    ]);
    unreadCountMock.mockRejectedValue(new Error('count unavailable'));

    renderWithProviders(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });
});
