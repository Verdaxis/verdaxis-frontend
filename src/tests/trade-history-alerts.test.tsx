import React from 'react';
import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { TradeHistoryPage } from '../components/TradeHistoryPage';
import { announcePriceAlertTriggered } from '../services/priceAlertEvents';

const apiMock = vi.hoisted(() => ({
  alertsList: vi.fn(),
  products: vi.fn(),
  deliveryPoints: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: {
  alerts: { list: apiMock.alertsList, create: vi.fn(), delete: vi.fn() },
  catalog: { products: apiMock.products, deliveryPoints: apiMock.deliveryPoints },
  trades: { myTrades: vi.fn() },
  prices: { getReference: vi.fn() },
} }));
vi.mock('../components/MyTrades', () => ({ MyTrades: () => null }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const alert = (overrides: Record<string, unknown>) => ({
  id: 'alert-1', product_id: 'methanol', product_name: 'Bio-Methanol', direction: 'above',
  threshold_usd: 700, is_active: true, ...overrides,
});

describe('trade history price alerts', () => {
  it('reloads the alert list when an alert fires while the tab is open', async () => {
    apiMock.products.mockResolvedValue([]);
    apiMock.deliveryPoints.mockResolvedValue([]);
    apiMock.alertsList
      .mockResolvedValueOnce([alert({})])
      .mockResolvedValue([alert({ is_active: false, triggered_at: '2026-10-28T09:00:00Z' })]);

    renderWithProviders(<TradeHistoryPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Alerts' }));
    expect(await screen.findByText('Active')).toBeTruthy();

    act(() => announcePriceAlertTriggered());

    expect(await screen.findByText('Triggered')).toBeTruthy();
    expect(apiMock.alertsList).toHaveBeenCalledTimes(2);
  });

  it('opens on the alerts tab when the address asks for it', async () => {
    apiMock.products.mockResolvedValue([]);
    apiMock.deliveryPoints.mockResolvedValue([]);
    apiMock.alertsList.mockResolvedValue([alert({})]);

    renderWithProviders(<TradeHistoryPage />, { route: '/app/trades?tab=alerts', path: '/app/trades' });

    await waitFor(() => expect(apiMock.alertsList).toHaveBeenCalled());
    expect(await screen.findByText('Bio-Methanol')).toBeTruthy();
  });
});
