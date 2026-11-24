import { act } from '@testing-library/react';
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

vi.mock('../context/AuthContext', () => {
  const user = { id: 'user-1' };
  return { useAuth: () => ({ user }) };
});

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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('waits for a visible tab and queues one resume read behind a pending poll', async () => {
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    const show = (state: DocumentVisibilityState) => act(() => {
      visibility = state;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    let finish!: (items: []) => void;
    listMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    listMock.mockResolvedValue([]);
    unreadCountMock.mockResolvedValue(0);

    renderWithProviders(<NotificationProvider><NotificationProbe /></NotificationProvider>);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(listMock).not.toHaveBeenCalled();
    expect(unreadCountMock).not.toHaveBeenCalled();

    show('visible');
    expect(listMock).toHaveBeenCalledTimes(1);
    show('hidden');
    show('visible');
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(listMock).toHaveBeenCalledTimes(1);

    await act(async () => finish([]));
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(unreadCountMock).toHaveBeenCalledTimes(2);
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
