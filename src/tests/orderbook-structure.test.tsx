import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { OrderBook } from '../components/OrderBook';
import type { OrderBookOrder } from '../types';

const { snapshot } = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('../services/api', () => ({ api: { orderbook: { snapshot } } }));

const NOW = new Date('2026-10-18T12:00:00Z');
const MARKET = { marketProduct: 'BIO_METHANOL', deliveryPointId: 'singapore', availability: 'SPOT', region: 'Singapore' };

function order(id: string, side: 'BID' | 'ASK', price: number, quantity: number, extra: Partial<OrderBookOrder> = {}): OrderBookOrder {
  return {
    id, side, market_product: 'BIO_METHANOL', fuel_type: 'methanol', price_per_mt_usd: price,
    remaining_quantity_mt: quantity, availability_window: 'SPOT', region: 'Singapore',
    certifications: ['ISCC'], certification_scheme: 'ISCC EU', origin: 'Singapore', feedstock: 'Waste',
    ...extra,
  } as OrderBookOrder;
}

function result(bids: OrderBookOrder[] = [], asks: OrderBookOrder[] = []) {
  return { bids, asks, generated_at: NOW.toISOString() };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  snapshot.mockReset();
  snapshot.mockResolvedValue(result());
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('OrderBook ladder', () => {
  it('shows separate empty states for bids and asks in an empty snapshot', async () => {
    renderWithProviders(<OrderBook {...MARKET} />);
    await act(async () => {});

    expect(screen.getByText('No bids')).toBeTruthy();
    expect(screen.getByText('No asks')).toBeTruthy();
  });

  it('sorts and caps each side at 15 and scales quantities against the largest visible order', async () => {
    snapshot.mockResolvedValue(result(
      Array.from({ length: 17 }, (_, i) => order(`bid-${i}`, 'BID', 500 + i, i + 1)),
      [order('ask', 'ASK', 600, 34)],
    ));
    renderWithProviders(<OrderBook {...MARKET} />);
    await act(async () => {});
    const bids = screen.getAllByRole('group', { name: /Bid/ });
    expect(bids).toHaveLength(15);
    expect(bids[0].getAttribute('aria-label')).toContain('$516');
    expect(bids[14].getAttribute('aria-label')).toContain('$502');
    const bidDepth = bids[0].querySelector<HTMLElement>('[style*="width:"]');
    const askDepth = screen.getByRole('group', { name: /Ask/ }).querySelector<HTMLElement>('[style*="width:"]');
    expect(bidDepth?.style.width).toBe('50%');
    expect(askDepth?.style.width).toBe('100%');
  });

  it('keeps keyboard, instant-action propagation and tooltip dismissal contracts', async () => {
    const bid = order('bid', 'BID', 610, 100);
    const ask = order('ask', 'ASK', 600, 50);
    snapshot.mockResolvedValue(result([bid], [ask]));
    const open = vi.fn();
    const instant = vi.fn();
    renderWithProviders(<OrderBook {...MARKET} actionableSide="ASK" onLevelClick={open} onInstantTrade={instant} />);
    await act(async () => {});
    const level = screen.getByRole('button', { name: /ask/i });
    const tooltipWidth = 420;
    const tooltipHeight = 300;
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === level) return new DOMRect(window.innerWidth - 20, window.innerHeight - 20, 20, 20);
      if (this.getAttribute('role') === 'tooltip') return new DOMRect(0, 0, tooltipWidth, tooltipHeight);
      return new DOMRect();
    });
    fireEvent.focus(level);
    const tooltip = screen.getByRole('tooltip');
    measure.mockRestore();
    expect(level.getAttribute('aria-describedby')).toBe(tooltip.id);
    const left = Number.parseFloat(tooltip.style.left);
    const top = Number.parseFloat(tooltip.style.top);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + tooltipWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(top + tooltipHeight).toBeLessThanOrEqual(window.innerHeight);
    fireEvent.keyDown(level, { key: 'Enter' });
    fireEvent.keyDown(level, { key: ' ' });
    expect(open.mock.calls).toEqual([[ask], [ask]]);
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    expect(instant).toHaveBeenCalledWith('ask', 'BID', 600, 50);
    expect(open).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(level, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(level);
    fireEvent.blur(level);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
