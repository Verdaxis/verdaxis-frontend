import { act, renderHook } from '@testing-library/react';
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

const auth = vi.hoisted(() => ({ user: { id: 'user-1' } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

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
    auth.user = { id: 'user-1' };
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

  it('clears the previous account’s notifications and does not wait for its pending read', async () => {
    vi.useFakeTimers();
    let finish!: (items: unknown[]) => void;
    const oldItem = { id: 'old' };
    const newItem = { id: 'new' };
    listMock.mockResolvedValueOnce([oldItem])
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce([newItem]);
    unreadCountMock.mockResolvedValueOnce(1).mockResolvedValue(0);
    const { result, rerender } = renderHook(useNotifications, { wrapper: NotificationProvider });
    await act(async () => {});
    expect(result.current.notifications).toEqual([oldItem]);
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    auth.user = { id: 'user-2' };
    rerender();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    await act(async () => {});
    expect(result.current.notifications).toEqual([newItem]);
    await act(async () => finish([oldItem]));
    expect(result.current.notifications).toEqual([newItem]);
  });

  it('preserves the context for equal poll results but shows notification edits', async () => {
    vi.useFakeTimers();
    const item = {
      id: 'notification-1', title: 'Order update', message: 'A bid was updated',
      type: 'ORDER_UPDATE', is_read: false, created_at: '2026-04-08T10:00:00Z',
      data: { order_id: 'first-order' },
    };
    listMock.mockImplementation(async () => [{ ...item, data: { ...item.data } }]);
    unreadCountMock.mockResolvedValue(1);
    const { result } = renderHook(useNotifications, { wrapper: NotificationProvider });
    await act(async () => {});
    const before = result.current;
    expect(before.notifications).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(result.current).toBe(before);

    listMock.mockResolvedValue([{ ...item, data: { order_id: 'second-order' } }]);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(result.current.notifications[0].data?.order_id).toBe('second-order');
    expect(result.current.markAsRead).toBe(before.markAsRead);
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
