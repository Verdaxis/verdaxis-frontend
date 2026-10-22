import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';

const { snapshot, workspaceRender, ladderRender } = vi.hoisted(() => ({ snapshot: vi.fn(), workspaceRender: vi.fn(), ladderRender: vi.fn() }));
vi.mock('../features/orderbook/components/OrderBookLadder', async importOriginal => {
  const { OrderBookLadder } = await importOriginal<typeof import('../features/orderbook/components/OrderBookLadder')>();
  return { OrderBookLadder: (props: React.ComponentProps<typeof OrderBookLadder>) => {
    ladderRender();
    return <OrderBookLadder {...props} />;
  } };
});
vi.mock('../services/api', () => ({ api: { orderbook: { snapshot } } }));
vi.mock('../hooks/useNamespace', async importOriginal => {
  const original = await importOriginal<typeof import('../hooks/useNamespace')>();
  return { ...original, useNamespace: (...args: Parameters<typeof original.useNamespace>) => {
    workspaceRender();
    return original.useNamespace(...args);
  } };
});

const NOW = new Date('2026-10-18T12:00:00Z');
const MARKET = { marketProduct: 'BIO_METHANOL', deliveryPointId: 'singapore', availability: 'SPOT' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function freshness(props: { generatedAt: string | null; refreshing: boolean; error: string | null }) {
  const { SnapshotFreshness } = await import('../features/orderbook/components/SnapshotFreshness');
  return renderWithProviders(<SnapshotFreshness {...props} />);
}

describe('isolated snapshot freshness', () => {
  it.each([
    [0, 'Updated 0s ago', 'text-slate-400'],
    [1, 'Updated 1s ago', 'text-slate-400'],
    [20, 'Updated 20s ago', 'text-slate-400'],
    [21, 'Stale · 21s old', 'text-amber-600'],
  ])('renders server age %i without changing the strict stale threshold', async (age, text, tone) => {
    const view = await freshness({ generatedAt: new Date(NOW.getTime() - age * 1000).toISOString(), refreshing: false, error: null });
    const span = screen.getByTestId('orderbook-freshness');
    expect(span.tagName).toBe('SPAN');
    expect(span.getAttribute('role')).toBe('status');
    expect(span.textContent).toBe(text);
    expect(span.className).toContain(tone);
    expect(view.container.children).toHaveLength(1);
  });

  it.each([null, 'invalid', new Date(NOW.getTime() + 60_000).toISOString()])('keeps missing, invalid and future dates at age zero: %s', async generatedAt => {
    await freshness({ generatedAt, refreshing: false, error: null });
    expect(screen.getByTestId('orderbook-freshness').textContent).toBe('Updated 0s ago');
  });

  it('prioritizes refreshing text while preserving the failure tone and alert role', async () => {
    const view = await freshness({ generatedAt: new Date(NOW.getTime() - 30_000).toISOString(), refreshing: true, error: 'offline' });
    const span = screen.getByTestId('orderbook-freshness');
    expect(span.textContent).toBe('Refreshing · 30s old');
    expect(span.getAttribute('role')).toBe('alert');
    expect(span.className).toBe('text-[11px] font-medium text-red-600 dark:text-red-400');
    const { SnapshotFreshness } = await import('../features/orderbook/components/SnapshotFreshness');
    view.rerender(<SnapshotFreshness generatedAt={new Date(NOW.getTime() - 30_000).toISOString()} refreshing={false} error="offline" />);
    expect(span.textContent).toBe('Stale · refresh failed · 30s old');
  });

  it('updates each second, reads the current time on a new snapshot and clears its timer', async () => {
    const timersBefore = vi.getTimerCount();
    const view = await freshness({ generatedAt: NOW.toISOString(), refreshing: false, error: null });
    expect(vi.getTimerCount()).toBe(timersBefore + 1);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('orderbook-freshness').textContent).toBe('Updated 1s ago');
    vi.setSystemTime(new Date(NOW.getTime() + 5900));
    const { SnapshotFreshness } = await import('../features/orderbook/components/SnapshotFreshness');
    view.rerender(<SnapshotFreshness generatedAt={new Date(NOW.getTime() + 5000).toISOString()} refreshing={false} error={null} />);
    expect(screen.getByTestId('orderbook-freshness').textContent).toBe('Updated 0s ago');
    view.unmount();
    expect(vi.getTimerCount()).toBe(timersBefore);
  });

  it('ticks five seconds without rendering the workspace or reading the API, then applies a changed snapshot', async () => {
    const bid = { id: 'bid', side: 'BID', market_product: 'BIO_METHANOL', price_per_mt_usd: 600, remaining_quantity_mt: 100, availability_window: 'SPOT', region: 'Singapore', certifications: [] };
    snapshot.mockResolvedValue({ bids: [bid], asks: [], generated_at: NOW.toISOString() });
    const view = renderWithProviders(<OrderBook {...MARKET} />);
    await act(async () => {});
    expect(screen.getByRole('group', { name: /Bid.*600/ })).toBeTruthy();
    const settledRenders = workspaceRender.mock.calls.length;
    const settledLadderRenders = ladderRender.mock.calls.length;
    const settledRequests = snapshot.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('orderbook-freshness').textContent).toBe('Updated 5s ago');
    expect(workspaceRender).toHaveBeenCalledTimes(settledRenders);
    expect(ladderRender).toHaveBeenCalledTimes(settledLadderRenders);
    expect(snapshot).toHaveBeenCalledTimes(settledRequests);
    snapshot.mockResolvedValue({ bids: [{ ...bid, price_per_mt_usd: 700 }], asks: [], generated_at: new Date().toISOString() });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh orderbook' }));
    await act(async () => {});
    expect(screen.getByRole('group', { name: /Bid.*700/ })).toBeTruthy();
    expect(screen.getByTestId('orderbook-freshness').textContent).toBe('Updated 0s ago');
    expect(snapshot).toHaveBeenCalledTimes(settledRequests + 1);
    expect(workspaceRender.mock.calls.length).toBeGreaterThan(settledRenders);
    expect(ladderRender.mock.calls.length).toBeGreaterThan(settledLadderRenders);
    view.unmount();
  });
});
