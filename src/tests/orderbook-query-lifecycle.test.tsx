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
const depth = (price = 600) => ({ bids: [{ id: 'bid', side: 'BID', market_product: 'BIO_METHANOL',
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

  it.each(['initial', 'forced'])('performs one bridge-owned post-event read during %s work', async phase => {
    const busy = deferred();
    if (phase === 'initial') snapshot.mockReturnValueOnce(busy.promise);
    else snapshot.mockResolvedValueOnce(depth()).mockReturnValueOnce(busy.promise);
    const view = renderWithProviders(<OrderBook {...market} />);
    const bridge = attachQueryInvalidation(view.queryClient);
    try {
      if (phase === 'forced') fireEvent.click(await screen.findByRole('button', { name: 'Refresh orderbook' }));
      await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(phase === 'initial' ? 1 : 2));
      const before = snapshot.mock.calls.length;
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await act(async () => {
        invalidateReadCacheWithCause('event', 'orderbook:');
        queuePublicMarketRefresh();
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(snapshot).toHaveBeenCalledTimes(before);
      fireEvent(window, new Event('online'));
      const withResume = snapshot.mock.calls.length;
      await act(async () => { busy.resolve(depth(710)); await busy.promise; });
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      expect(snapshot.mock.calls.length).toBeGreaterThan(before);
      expect(snapshot.mock.calls.length).toBeLessThanOrEqual(withResume + 1);
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
});
