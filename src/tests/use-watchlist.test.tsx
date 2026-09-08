import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWatchlist } from '../hooks/useWatchlist';

const apiMocks = vi.hoisted(() => ({
  getRadar: vi.fn(),
  listEvents: vi.fn(),
  markEventRead: vi.fn(),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ isActive: false }),
}));

vi.mock('../services/api', () => ({
  api: {
    watchlists: {
      getRadar: apiMocks.getRadar,
      listEvents: apiMocks.listEvents,
      markEventRead: apiMocks.markEventRead,
    },
  },
}));

describe('useWatchlist pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getRadar.mockResolvedValue({ id: 'radar-1', slices: [] });
    apiMocks.markEventRead.mockResolvedValue({});
  });

  it('drops an old load-more response after a mutation refreshes page one', async () => {
    let resolveOldPage!: (page: { items: Array<{ id: string }>; next_cursor: string | null }) => void;
    const oldPage = new Promise<{ items: Array<{ id: string }>; next_cursor: string | null }>((resolve) => {
      resolveOldPage = resolve;
    });
    let firstPageRequest = 0;
    apiMocks.listEvents.mockImplementation((_watchlistId: string, params: { cursor?: string }) => {
      if (params.cursor === 'cursor-2') return oldPage;
      firstPageRequest += 1;
      return Promise.resolve(firstPageRequest === 1
        ? { items: [{ id: 'event-1' }], next_cursor: 'cursor-2' }
        : { items: [{ id: 'event-new' }], next_cursor: null });
    });

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.events.map((event) => event.id)).toEqual(['event-1']));

    let loadMore!: Promise<void>;
    act(() => {
      loadMore = result.current.loadMoreEvents();
    });
    await act(async () => {
      await result.current.markEventRead('event-1');
    });
    expect(result.current.events.map((event) => event.id)).toEqual(['event-new']);

    await act(async () => {
      resolveOldPage({ items: [{ id: 'event-old-page-2' }], next_cursor: null });
      await loadMore;
    });
    expect(result.current.events.map((event) => event.id)).toEqual(['event-new']);
  });
});
