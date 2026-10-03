import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicMarketSync } from '../components/PublicMarketSync';
import { subscribePublicMarketRefresh } from '../services/publicMarketSync';

const streamHandlers = vi.hoisted(() => new Map<string, (event: string, data: unknown) => void>());

vi.mock('../hooks/useSSE', () => ({
  useSSE: (channel: string, handler: (event: string, data: unknown) => void) => {
    streamHandlers.set(channel, handler);
    return { isConnected: true };
  },
}));

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('public market refresh synchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    streamHandlers.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('shares one public stream and keeps one active refresh plus one dirty rerun', async () => {
    const firstRefresh = deferred();
    const refresh = vi.fn().mockReturnValueOnce(firstRefresh.promise).mockResolvedValue(undefined);
    const unsubscribe = subscribePublicMarketRefresh(refresh);
    const view = render(<PublicMarketSync />);

    expect([...streamHandlers.keys()]).toEqual(['orderbook']);
    act(() => {
      streamHandlers.get('orderbook')?.('market_invalidated', { schema_version: 1, resync_required: true });
      streamHandlers.get('orderbook')?.('market_invalidated', { schema_version: 1, resync_required: true });
      vi.advanceTimersByTime(500);
    });
    await act(async () => { await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => {
      streamHandlers.get('orderbook')?.('market_invalidated', { schema_version: 1, resync_required: true });
      streamHandlers.get('orderbook')?.('reconnect', { reason: 'transport_reconnected' });
      vi.advanceTimersByTime(500);
    });
    await act(async () => { await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      firstRefresh.resolve();
      await firstRefresh.promise;
      await Promise.resolve();
    });
    expect(refresh).toHaveBeenCalledTimes(2);

    act(() => {
      streamHandlers.get('orderbook')?.('market_invalidated', { schema_version: 2, resync_required: true });
      vi.advanceTimersByTime(500);
    });
    await act(async () => { await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(2);
    unsubscribe();
    view.unmount();
  });
});
