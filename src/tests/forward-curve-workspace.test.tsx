import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { ForwardCurveWorkspace } from '../components/ForwardCurveWorkspace';
import { MARKET_PRODUCTS } from '../types';
import type { MarketProduct } from '../types';
import { renderWithProviders } from './test-utils';

const boardMock = vi.fn();
const tradeTapeMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    curves: {
      board: (...args: unknown[]) => boardMock(...args),
    },
    tradeTape: {
      list: (...args: unknown[]) => tradeTapeMock(...args),
    },
  },
}));

const PORTS = [
  ['dp-dalian', 'Dalian', 'Asia'],
  ['dp-busan', 'Busan', 'Asia'],
  ['dp-shanghai', 'Shanghai', 'Asia'],
  ['dp-singapore', 'Singapore', 'Asia'],
  ['dp-rotterdam', 'Rotterdam', 'Europe'],
  ['dp-houston', 'Houston', 'Americas'],
  ['dp-la', 'Los Angeles', 'Americas'],
  ['dp-santos', 'Santos', 'Americas'],
] as const;

const productName = (marketProduct: string) => marketProduct
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, letter => letter.toUpperCase())
  .replace('E Methanol', 'e-Methanol');

const makeBoard = (
  focusMarketProduct: MarketProduct = 'BIO_METHANOL',
  focusDeliveryPointId = 'dp-singapore'
) => {
  const products = MARKET_PRODUCTS.map((marketProduct, index) => ({
    product_id: `prod-${index}`,
    market_product: marketProduct,
    product_name: productName(marketProduct),
  }));
  const ports = PORTS.map(([deliveryPointId, deliveryPointName, region], portIndex) => ({
    delivery_point_id: deliveryPointId,
    delivery_point_name: deliveryPointName,
    region,
    cells: products.map((product, productIndex) => ({
      product_id: product.product_id,
      market_product: product.market_product,
      product_name: product.product_name,
      delivery_point_id: deliveryPointId,
      delivery_point_name: deliveryPointName,
      region,
      availability_window: 'SPOT',
      benchmark_mid: 600 + (portIndex * 10) + productIndex,
      benchmark_source: 'seed_matrix',
      is_demo_benchmark: true,
      best_bid: 590 + (portIndex * 10) + productIndex,
      best_ask: 610 + (portIndex * 10) + productIndex,
      spread: 20,
      volume_mt: 5000,
      order_count: 2,
    })),
  }));

  const focusPort = ports.find(port => port.delivery_point_id === focusDeliveryPointId) ?? ports[3];
  const focusCell = focusPort.cells.find(cell => cell.market_product === focusMarketProduct) ?? focusPort.cells[0];

  return {
    availability_window: 'SPOT',
    products,
    ports,
    focus: {
      product_id: focusCell.product_id,
      market_product: focusCell.market_product,
      product_name: focusCell.product_name,
      delivery_point_id: focusCell.delivery_point_id,
      delivery_point_name: focusCell.delivery_point_name,
      region: focusCell.region,
      availability_window: 'SPOT',
      curve: focusPort.cells.map((cell, index) => ({ ...cell, availability_window: index === 0 ? 'SPOT' : `2026-0${index}` })),
      depth_bids: [{ price_per_mt_usd: 1048, quantity_mt: 5000, order_count: 1 }],
      depth_asks: [{ price_per_mt_usd: 1056, quantity_mt: 4000, order_count: 1 }],
    },
    generated_at: '2026-04-14T00:00:00Z',
  };
};

describe('ForwardCurveWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
    boardMock.mockReset();
    tradeTapeMock.mockReset();
    boardMock.mockResolvedValue(makeBoard());
    tradeTapeMock.mockResolvedValue({ items: [], total: 0, market_hours: true });
  });

  it('renders the all-port multi-product matrix and demo labels', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Selected-Window Forward Matrix')).toBeTruthy();
    });

    expect(screen.getByText('Dalian')).toBeTruthy();
    expect(screen.getByText('Santos')).toBeTruthy();
    expect(screen.getAllByText('Demo').length).toBeGreaterThanOrEqual(32);
    expect(screen.getByText('Indicative Forward Curve')).toBeTruthy();
    expect(screen.getByText('Indicative Period Range')).toBeTruthy();
    expect(screen.getByText('24h market · 7D confirmed trades')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('No confirmed trades in the last 7 days for this selected slice.')).toBeTruthy();
    });
    expect(screen.queryByText('Live · 7D history')).toBeNull();
  });

  it('places the forward curve chart above the market matrix', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Selected-Window Forward Matrix')).toBeTruthy();
    });

    const curveTitle = screen.getByText('Indicative Forward Curve');
    const matrixTitle = screen.getByText('Selected-Window Forward Matrix');
    expect(curveTitle.compareDocumentPosition(matrixTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('updates the selected-period detail when a matrix cell is clicked', async () => {
    boardMock.mockImplementation(({ focus_market_product, focus_delivery_point_id }) => Promise.resolve(makeBoard(
      (focus_market_product as MarketProduct | undefined) ?? 'BIO_METHANOL',
      (focus_delivery_point_id as string | undefined) ?? 'dp-singapore'
    )));

    renderWithProviders(<ForwardCurveWorkspace />);

    const rotterdamMethanol = await screen.findByRole('button', {
      name: 'Open period detail for E-Methanol at Rotterdam, SPOT',
    });
    expect(rotterdamMethanol.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(rotterdamMethanol);

    await waitFor(() => {
      expect(screen.getAllByText('E-Methanol - Rotterdam').length).toBeGreaterThan(0);
      expect(rotterdamMethanol.getAttribute('aria-pressed')).toBe('true');
    });

    expect(screen.getAllByText('Indicative Period Range').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demo reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5.0k MT').length).toBeGreaterThan(0);
  });

  it('opens a selected-period drilldown with honest unavailable signal labels', async () => {
    boardMock.mockImplementation(({ focus_market_product, focus_delivery_point_id }) => Promise.resolve(makeBoard(
      (focus_market_product as MarketProduct | undefined) ?? 'BIO_METHANOL',
      (focus_delivery_point_id as string | undefined) ?? 'dp-singapore'
    )));

    renderWithProviders(<ForwardCurveWorkspace />);

    const rotterdamMethanol = await screen.findByRole('button', {
      name: 'Open period detail for E-Methanol at Rotterdam, SPOT',
    });

    fireEvent.click(rotterdamMethanol);

    const dialog = await screen.findByRole('dialog', { name: 'Single-Period Drilldown' });
    expect(dialog).toBeTruthy();
    expect(screen.getByText('Signal Readiness')).toBeTruthy();
    expect(screen.getByText('Indications')).toBeTruthy();
    expect(screen.getByText('No indications feed connected yet')).toBeTruthy();
    expect(screen.getByText('Physical stems')).toBeTruthy();
    expect(screen.getByText('No stems feed connected yet')).toBeTruthy();
    expect(screen.getByText('Fair-value band')).toBeTruthy();
    expect(screen.getByText('No model-derived fair-value band yet')).toBeTruthy();
    expect(screen.queryByText(/latest indications/i)).toBeNull();
    expect(screen.queryByText(/physical stems available/i)).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Single-Period Drilldown' })).toBeNull();
    });
  });

  it('gates drilldown depth and prints while a newly selected slice is still refreshing', async () => {
    boardMock
      .mockResolvedValueOnce(makeBoard())
      .mockImplementationOnce(() => new Promise(() => {}));

    tradeTapeMock
      .mockResolvedValueOnce({
        items: [{
          id: 'old-print',
          market_product: 'BIO_METHANOL',
          fuel_type: 'Methanol',
          fuel_grade: 'Bio',
          region: 'Singapore',
          quantity_mt: 1400,
          price_per_mt_usd: 712,
          confirmed_at: new Date().toISOString(),
          availability_window: 'SPOT',
          is_demo_trade: true,
        }],
        total: 1,
        market_hours: true,
      })
      .mockImplementationOnce(() => new Promise(() => {}));

    renderWithProviders(<ForwardCurveWorkspace />);

    await screen.findByText('Selected-Window Forward Matrix');

    const rotterdamMethanol = await screen.findByRole('button', {
      name: 'Open period detail for E-Methanol at Rotterdam, SPOT',
    });
    fireEvent.click(rotterdamMethanol);

    await screen.findByRole('dialog', { name: 'Single-Period Drilldown' });
    expect(screen.getByText('Refreshing selected slice depth')).toBeTruthy();
    expect(screen.getByText('Refreshing confirmed 7-day prints')).toBeTruthy();
    expect(screen.queryByText('2 visible depth levels')).toBeNull();
    expect(screen.queryByText('1 confirmed prints in last 7 days')).toBeNull();
  });

  it('renders missing selected-period prices as empty instead of zero', async () => {
    const board = makeBoard();
    const singaporeBio = board.ports[3].cells[0];
    singaporeBio.benchmark_mid = null;
    singaporeBio.best_bid = null;
    singaporeBio.best_ask = null;
    singaporeBio.spread = null;
    singaporeBio.volume_mt = 0;
    singaporeBio.order_count = 0;
    board.focus = {
      ...board.focus,
      ...singaporeBio,
      curve: [singaporeBio],
      depth_bids: [],
      depth_asks: [],
    };
    boardMock.mockResolvedValue(board);

    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Not enough bid/ask context yet.')).toBeTruthy();
    });

    expect(screen.queryByText('$0')).toBeNull();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the focused slice in Marketplace through the explicit CTA', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(<ForwardCurveWorkspace onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Open Marketplace')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Open Marketplace'));

    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe('Singapore');
    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('BIO_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('SPOT');
  });

  it('keeps demo trade provenance accessible in the forward curve trade tape', async () => {
    tradeTapeMock.mockResolvedValue({
      items: [{
        id: 'demo-print-1',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Bio',
        region: 'Singapore',
        quantity_mt: 1400,
        price_per_mt_usd: 712,
        confirmed_at: new Date().toISOString(),
        availability_window: 'SPOT',
        is_demo_trade: true,
      }],
      total: 1,
      market_hours: false,
    });

    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getByLabelText('Demo trade seeded for platform preview. Not user-posted liquidity.')).toBeTruthy();
    });
  });

  it('ignores stale stored filters that would make the board endpoint reject the request', async () => {
    localStorage.setItem('verdaxis_forward_curve_product', 'Methanol');
    localStorage.setItem('verdaxis_forward_curve_delivery_point', 'Singapore');

    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(boardMock).toHaveBeenCalledWith({
        availability_window: 'SPOT',
        focus_market_product: 'BIO_METHANOL',
        focus_delivery_point_id: undefined,
      });
    });
  });
});
