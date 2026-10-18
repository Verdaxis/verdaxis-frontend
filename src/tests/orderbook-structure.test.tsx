import React from 'react';
import { createHash } from 'node:crypto';
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

// Pin the entire DOM, including SVGs, text, styles, ARIA and portal placement.
// Only React's generated tooltip identifier is normalized. Attribute order is not meaningful.
function domDigest() {
  function tree(node: Node): unknown {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    return [node.tagName, [...node.attributes].map(({ name, value }) => [
      name, name === 'id' || name === 'aria-describedby' ? value.replace(/_r_[^_]+_/g, 'REACT_ID') : value,
    ]).sort(([a], [b]) => a.localeCompare(b)), [...node.childNodes].map(tree)];
  }
  return createHash('sha256').update(JSON.stringify([...document.body.childNodes].map(tree))).digest('hex');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  snapshot.mockReset();
  snapshot.mockResolvedValue(result());
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('OrderBook pre-move DOM contract', () => {
  it.each([
    ['empty', '36985a00155dc360cc6921c18fab8a5c9b9c2f6f53708f7bd8894529b0760fca'],
    ['loaded', '3411b64f79af79ab865fd1437e35fce2b86b98afcc59821c39f6959c5fb0c8b3'],
    ['rfq', '17239a0c6ef3e46f9a993f39d4a8e919b3fef9fa8121bbeb78dea4b567f471b5'],
    ['loading', '803432997a57499efe1cc50d9c97a89240908650d8e58d2afda8941a72f44a07'],
    ['error', '8262a1bf9549fb9d5f0d80e56a5d2ff6ae589ceb04ba54ebd510ad38f71b0a62'],
    ['fame', '767fe3e9c2c5966eb7c7e4a288b6ccd7c87b0d6d9f91e34bbf3f7f1936f2a64c'],
    ['lng', '35410fe1da5c9b7c261edc5f5f7a102345d17a03d2b5c0c090a4e18e663c8825'],
    ['demo-tooltip', '12573c40be27d5a2a70e13e27c8c489e8832eb3fab0b8f5fe87610fe51e2a23d'],
    ['lng-tooltip', '03aaf6922163f12aa920d9be0257a8cfddb501e40c1933f677ce18b12497689d'],
  ])('preserves the complete %s tree', async (state, expected) => {
    const props = { ...MARKET, actionableSide: 'ASK' as const, onLevelClick: vi.fn(), onInstantTrade: vi.fn() };
    if (state === 'loading') snapshot.mockReturnValue(new Promise(() => {}));
    if (state === 'error') snapshot.mockRejectedValue(new Error('offline'));
    if (state === 'rfq') Object.assign(props, { executionMode: 'RFQ_ONLY' });
    if (state === 'loaded') snapshot.mockResolvedValue(result(
      [order('low', 'BID', 590, 25), order('high', 'BID', 610, 100)],
      [order('ask', 'ASK', 600, 50, { carbon_intensity_gco2_mj: 29.6 })],
    ));
    if (state === 'fame') {
      Object.assign(props, { marketProduct: 'UCOME_B100', executionMode: 'ORDERBOOK' });
      snapshot.mockResolvedValue(result(
        [order('bid', 'BID', 1200, 100, { market_product: 'UCOME_B100', fuel_type: 'FAME' })],
        [order('ask', 'ASK', 1100, 50, { market_product: 'UCOME_B100', fuel_type: 'FAME' })],
      ));
    }
    if (state.startsWith('lng')) {
      Object.assign(props, { marketProduct: 'BIO_LNG', executionMode: 'ORDERBOOK', region: 'Rotterdam' });
      snapshot.mockResolvedValue(result([], [order('lng', 'ASK', 915.25, 12.34, {
        market_product: 'BIO_LNG', fuel_type: 'LNG', carbon_intensity_gco2_mj: null,
        lng_terms: { side: 'ASK', certification_scheme: 'ISCC_EU', feedstock: 'UCO', origin_country: 'NL', reseller: true, fueleu_recognition: true } as unknown as OrderBookOrder['lng_terms'],
      })]));
    }
    if (state === 'demo-tooltip') snapshot.mockResolvedValue(result([order('demo', 'BID', 1000, 12.34, { source_kind: 'DEMO_SEED', demo_status: 'DEMO_ONLY' })], []));
    renderWithProviders(<OrderBook {...props} />);
    await act(async () => {});
    if (state.endsWith('tooltip')) {
      fireEvent.focus(screen.getByRole(state === 'demo-tooltip' ? 'group' : 'button', { name: state === 'demo-tooltip' ? /Bid/ : /ask/i }));
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.parentElement).toBe(document.body);
      expect(document.querySelector('[aria-describedby]')?.getAttribute('aria-describedby')).toBe(tooltip.id);
      expect(tooltip.style.left).toBe('14px');
      expect(tooltip.style.top).toBe('16px');
    }
    expect(domDigest()).toBe(expected);
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
    expect(bids[0].querySelector('[style]')?.getAttribute('style')).toBe('width: 50%;');
    expect(screen.getByRole('group', { name: /Ask/ }).querySelector('[style]')?.getAttribute('style')).toBe('width: 100%;');
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
    fireEvent.focus(level);
    expect(screen.getByRole('tooltip')).toBeTruthy();
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
