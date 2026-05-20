import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { ForwardCurveWorkspace } from '../components/ForwardCurveWorkspace';
import { MARKET_PRODUCTS } from '../types';
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

const makeBoard = () => {
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

  return {
    availability_window: 'SPOT',
    products,
    ports,
    focus: {
      product_id: 'prod-0',
      market_product: 'BIO_METHANOL',
      product_name: 'Bio Methanol',
      delivery_point_id: 'dp-singapore',
      delivery_point_name: 'Singapore',
      region: 'Asia',
      availability_window: 'SPOT',
      curve: ports[3].cells.map((cell, index) => ({ ...cell, availability_window: index === 0 ? 'SPOT' : `2026-0${index}` })),
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
      expect(screen.getByText('Market Matrix')).toBeTruthy();
    });

    expect(screen.getByText('Dalian')).toBeTruthy();
    expect(screen.getByText('Santos')).toBeTruthy();
    expect(screen.getAllByText('Demo').length).toBeGreaterThanOrEqual(32);
    expect(screen.getByText('Hybrid Forward Curve')).toBeTruthy();
  });

  it('places the forward curve chart above the market matrix', async () => {
    renderWithProviders(<ForwardCurveWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Market Matrix')).toBeTruthy();
    });

    const curveTitle = screen.getByText('Hybrid Forward Curve');
    const matrixTitle = screen.getByText('Market Matrix');
    expect(curveTitle.compareDocumentPosition(matrixTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
