import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';
import { attachQueryInvalidation } from '../lib/query/invalidation';
import { invalidateReadCacheWithCause } from '../services/readCache';
import { queuePublicMarketRefresh } from '../services/publicMarketSync';
import { orderbookKeys } from '../features/orderbook/api/orderbookKeys';

const { snapshot } = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('../services/api', () => ({ api: { orderbook: { snapshot } } }));
const market = { marketProduct: 'BIO_METHANOL', deliveryPointId: 'port', availability: 'SPOT' };
const depth = (price = 600, product = 'BIO_METHANOL') => ({ bids: [{ id: 'bid', side: 'BID', market_product: product,
  price_per_mt_usd: price, remaining_quantity_mt: 100, certifications: [] }], asks: [],
  generated_at: '2026-10-19T00:00:00Z' });
function deferred() {
  let resolve!: (value: ReturnType<typeof depth>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ReturnType<typeof depth>>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let hidden = false;
beforeEach(() => {
  snapshot.mockReset().mockResolvedValue(depth());
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => hidden ? 'hidden' : 'visible');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Query-owned OrderBook lifecycle', () => {
  it('stores the coherent mapped snapshot under the canonical key and bypasses legacy storage', async () => {
    const view = renderWithProviders(<OrderBook {...market} />);
    await screen.findByRole('group', { name: /Bid.*600/ });
    expect(snapshot).toHaveBeenCalledWith({ market_product: 'BIO_METHANOL', delivery_point_id: 'port',
      availability_window: 'SPOT' }, { cacheOwner: 'query', signal: expect.any(AbortSignal) });
    expect(view.queryClient.getQueryData(orderbookKeys.snapshot('BIO_METHANOL', 'port', 'SPOT'))).toEqual(depth());
  });

  it('keeps newer depth and age when an older ordinary read fails', async () => {
    const ordinary = deferred();
    snapshot.mockReturnValueOnce(ordinary.promise).mockResolvedValueOnce(depth(700));
    renderWithProviders(<OrderBook {...market} />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(1));
    fireEvent(window, new Event('online'));
    await screen.findByRole('group', { name: /Bid.*700/ });
    await act(async () => { ordinary.reject(new Error('old failure')); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('group', { name: /Bid.*700/ })).toBeTruthy();
  });

  // A read that starts after an event covers it. A read that started before the
  // event does not, so the bridge makes exactly one further read. A resume signal
  // joins a forced read in flight and must not consume that post-event read.
  it.each([
    { phase: 'initial', resume: false, reads: 2 },
    { phase: 'initial', resume: true, reads: 2 },
    { phase: 'forced', resume: false, reads: 3 },
    { phase: 'forced', resume: true, reads: 3 },
  ])('makes exactly $reads reads for an event during $phase work (resume signal: $resume)', async ({ phase, resume, reads }) => {
    const busy = deferred();
    snapshot.mockResolvedValue(depth(730));
    if (phase === 'initial') snapshot.mockReturnValueOnce(busy.promise);
    else snapshot.mockResolvedValueOnce(depth()).mockReturnValueOnce(busy.promise);
    const view = renderWithProviders(<OrderBook {...market} />);
    const bridge = attachQueryInvalidation(view.queryClient);
    try {
      if (phase === 'forced') fireEvent.click(await screen.findByRole('button', { name: 'Refresh orderbook' }));
      const before = phase === 'initial' ? 1 : 2;
      await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(before));
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await act(async () => {
        invalidateReadCacheWithCause('event', 'orderbook:');
        queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(snapshot).toHaveBeenCalledTimes(before);
      if (resume) fireEvent(window, new Event('online'));
      await act(async () => { await Promise.resolve(); });
      expect(snapshot).toHaveBeenCalledTimes(resume && phase === 'initial' ? before + 1 : before);
      await act(async () => { busy.resolve(depth(710)); await busy.promise; });
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      expect(snapshot).toHaveBeenCalledTimes(reads);
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(snapshot).toHaveBeenCalledTimes(reads);
      expect(screen.getByRole('group', { name: /Bid.*730/ })).toBeTruthy();
    } finally { bridge.dispose(); }
  });

  it('does not poll while hidden and forces one read on resume', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    renderWithProviders(<OrderBook {...market} />);
    await screen.findByRole('group', { name: /Bid.*600/ });
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(snapshot).toHaveBeenCalledTimes(1);
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(2));
  });

  it('keeps hidden events stale and makes only one deferred resume read', async () => {
    const resume = deferred();
    const view = renderWithProviders(<OrderBook {...market} />);
    const bridge = attachQueryInvalidation(view.queryClient);
    try {
      await screen.findByRole('group', { name: /Bid.*600/ });
      hidden = true;
      bridge.setVisible(false);
      fireEvent(document, new Event('visibilitychange'));
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
      await act(async () => {
        invalidateReadCacheWithCause('event', 'orderbook:');
        queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(snapshot).toHaveBeenCalledTimes(1);
      snapshot.mockReturnValueOnce(resume.promise);
      hidden = false;
      fireEvent(document, new Event('visibilitychange'));
      bridge.setVisible(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      expect(snapshot).toHaveBeenCalledTimes(2);
      await act(async () => { resume.resolve(depth(720)); await vi.advanceTimersByTimeAsync(500); });
      expect(snapshot).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('group', { name: /Bid.*720/ })).toBeTruthy();
    } finally { bridge.dispose(); }
  });

  it('does not repopulate the accepted snapshot after unmount', async () => {
    const pending = deferred();
    snapshot.mockReturnValueOnce(pending.promise);
    const view = renderWithProviders(<OrderBook {...market} />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => { pending.resolve(depth(900)); });
    expect(view.queryClient.getQueryData(orderbookKeys.snapshot('BIO_METHANOL', 'port', 'SPOT'))).toBeUndefined();
  });

  it('ends the old slice lifecycle on a scope change and reads only the new slice after an event', async () => {
    const old = deferred();
    snapshot.mockImplementation(async params => depth(600, params.market_product));
    snapshot.mockReturnValueOnce(old.promise);
    const view = renderWithProviders(<OrderBook {...market} />);
    const bridge = attachQueryInvalidation(view.queryClient);
    try {
      await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(1));
      view.rerender(<OrderBook {...market} marketProduct="E_METHANOL" />);
      await screen.findByRole('group', { name: /Bid.*600/ });
      expect(snapshot).toHaveBeenCalledTimes(2);
      await act(async () => { old.resolve(depth(900)); await old.promise; });
      expect(screen.queryByRole('group', { name: /Bid.*900/ })).toBeNull();
      expect(view.queryClient.getQueryData(orderbookKeys.snapshot('BIO_METHANOL', 'port', 'SPOT'))).toBeUndefined();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await act(async () => {
        invalidateReadCacheWithCause('event', 'orderbook:');
        queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(snapshot.mock.calls.map(([params]) => params.market_product))
        .toEqual(['BIO_METHANOL', 'E_METHANOL', 'E_METHANOL']);
    } finally { bridge.dispose(); }
  });

  it('stops every read for a slice after unmount, including events, polling and resume', async () => {
    const pending = deferred();
    snapshot.mockReturnValueOnce(pending.promise);
    const view = renderWithProviders(<OrderBook {...market} />);
    const bridge = attachQueryInvalidation(view.queryClient);
    try {
      await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(1));
      view.unmount();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      await act(async () => {
        invalidateReadCacheWithCause('event', 'orderbook:');
        queuePublicMarketRefresh();
        pending.resolve(depth(900));
        await vi.advanceTimersByTimeAsync(30_000);
      });
      fireEvent(window, new Event('online'));
      fireEvent(document, new Event('visibilitychange'));
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      expect(snapshot).toHaveBeenCalledTimes(1);
    } finally { bridge.dispose(); }
  });

  it('registers a fresh lifecycle when the same slice mounts again on one client', async () => {
    const first = deferred();
    snapshot.mockReturnValueOnce(first.promise);
    const initial = renderWithProviders(<OrderBook {...market} />);
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(1));
    initial.unmount();
    const again = renderWithProviders(<OrderBook {...market} />, { queryClient: initial.queryClient });
    await screen.findByRole('group', { name: /Bid.*600/ });
    await act(async () => { first.resolve(depth(900)); await first.promise; });
    expect(screen.queryByRole('group', { name: /Bid.*900/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh orderbook' }));
    await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(3));
    again.unmount();
  });
});
