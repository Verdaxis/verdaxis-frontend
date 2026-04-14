import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from './test-utils';
import { ForwardCurve, selectVisibleCurvePoints } from '../components/ForwardCurve';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const subscriptionsMeMock = vi.fn();
const curvesForwardMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      products: (...args: unknown[]) => productsMock(...args),
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    subscriptions: {
      me: (...args: unknown[]) => subscriptionsMeMock(...args),
    },
    curves: {
      forward: (...args: unknown[]) => curvesForwardMock(...args),
      exportCsvUrl: vi.fn(() => 'https://example.com/export.csv'),
    },
  },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('lightweight-charts', () => {
  const series = { setData: vi.fn() };
  const chart = {
    addSeries: vi.fn(() => series),
    subscribeCrosshairMove: vi.fn(),
    subscribeClick: vi.fn(),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
  };
  return {
    createChart: vi.fn(() => chart),
    LineSeries: 'LineSeries',
    AreaSeries: 'AreaSeries',
    CrosshairMode: { Normal: 0 },
    ColorType: { Solid: 'solid' },
  };
});

describe('selectVisibleCurvePoints', () => {
  it('keeps only spot, next 6 months, next 4 quarters, and next 2 calendar years', () => {
    const visible = selectVisibleCurvePoints([
      { availability_window: 'SPOT', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2026-04', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2026-05', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2026-10', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2026-11', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2026-Q3', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2027-Q2', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2027-Q3', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2027-CAL', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2028-CAL', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
      { availability_window: '2029-CAL', mid_price: 100, best_bid: 98, best_ask: 102, spread: 4, volume_mt: 1000, order_count: 2 },
    ], new Date('2026-04-14T00:00:00Z'));

    expect(visible.map((point) => point.availability_window)).toEqual([
      'SPOT',
      '2026-05',
      '2026-10',
      '2026-Q3',
      '2027-Q2',
      '2027-CAL',
      '2028-CAL',
    ]);
  });
});

describe('ForwardCurve', () => {
  beforeEach(() => {
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    subscriptionsMeMock.mockReset();
    curvesForwardMock.mockReset();

    productsMock.mockResolvedValue([
      { id: 'prod-bio-met', name: 'Bio Methanol', market_product: 'BIO_METHANOL', fuel_type: 'Methanol', fuel_grade: 'Bio', unit: 'MT', min_lot_size: 500, is_active: true },
    ]);
    deliveryPointsMock.mockResolvedValue([
      { id: 'dp-sg', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
    ]);
    subscriptionsMeMock.mockResolvedValue({ id: 'sub-1', org_id: 'org-1', tier: 'free', is_active: true });
    curvesForwardMock.mockResolvedValue({
      product_id: 'prod-bio-met',
      delivery_point_id: 'dp-sg',
      curve: [],
      generated_at: '2026-04-14T10:00:00Z',
    });
  });

  it('shows the indicative title and empty-state hint when no curve exists for the selected product and port', async () => {
    renderWithProviders(
      <ForwardCurve marketProductCode="BIO_METHANOL" deliveryPointName="Singapore" />,
    );

    expect(screen.getByText('Indicative Forward Curve')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('No indicative curve is available for this product and port yet.')).toBeTruthy();
    });

    expect(screen.getByText('Check Marketplace or Orderbook for live spot and near-dated liquidity.')).toBeTruthy();
  });
});
