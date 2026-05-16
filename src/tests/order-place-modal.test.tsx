import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();
const getRadarMock = vi.fn();
const createSliceTargetMock = vi.fn();

vi.mock('../hooks/useNamespace', () => ({
  useNamespace: () => ({
    ready: true,
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'orderPlaceModal.title') {
        return `Place ${String(options?.side ?? '')}`;
      }
      if (key === 'orderPlaceModal.btn.place') {
        return `Place ${String(options?.side ?? '')}`;
      }
      if (key === 'orderPlaceModal.btn.placing') {
        return `Placing ${String(options?.side ?? '')}`;
      }
      return key;
    },
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      products: (...args: unknown[]) => productsMock(...args),
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    orderbook: {
      create: (...args: unknown[]) => createOrderMock(...args),
    },
    watchlists: {
      getRadar: (...args: unknown[]) => getRadarMock(...args),
      createSliceTarget: (...args: unknown[]) => createSliceTargetMock(...args),
    },
  },
}));

describe('OrderPlaceModal', () => {
  beforeEach(() => {
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();
    getRadarMock.mockReset();
    createSliceTargetMock.mockReset();
    sessionStorage.clear();

    productsMock.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Green Methanol',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Green',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'Test product',
      },
    ]);
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-1',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
    ]);
    createOrderMock.mockResolvedValue({ trades: [] });
    getRadarMock.mockResolvedValue({
      id: 'radar-1',
      name: 'Market Radar',
      kind: 'RADAR_DEFAULT',
      unread_event_count: 0,
      total_slice_count: 0,
      has_more_slices: false,
      slices: [],
      created_at: '2026-04-13T00:00:00Z',
    });
    createSliceTargetMock.mockResolvedValue({
      id: 'slice-1',
      target_type: 'SLICE',
      market_product_code: 'BIO_METHANOL',
      delivery_point_id: 'dp-1',
      availability_window_code: 'SPOT',
      active_order_count: 0,
      unread_event_count: 0,
      pins: [],
      created_at: '2026-04-13T00:00:00Z',
    });
  });

  it('resets to the new canonical slice when reopened', async () => {
    productsMock.mockResolvedValue([
      {
        id: 'prod-bio',
        name: 'Bio Methanol',
        market_product: 'BIO_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'Bio',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'Bio product',
      },
      {
        id: 'prod-e',
        name: 'e-Methanol',
        market_product: 'E_METHANOL',
        fuel_type: 'Methanol',
        fuel_grade: 'E',
        unit: 'MT',
        min_lot_size: 500,
        is_active: true,
        spec_description: 'E product',
      },
    ]);
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-singapore',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
      {
        id: 'dp-rotterdam',
        name: 'Rotterdam',
        region: 'Europe',
        timezone: 'Europe/Amsterdam',
        is_active: true,
      },
    ]);

    const { rerender } = renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="BIO_METHANOL"
        prefillDeliveryPointId="dp-singapore"
        prefillAvailabilityWindow="SPOT"
      />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Order product' }).textContent).toContain('Bio Methanol');
    });

    rerender(
      <OrderPlaceModal
        isOpen={false}
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="BIO_METHANOL"
        prefillDeliveryPointId="dp-singapore"
        prefillAvailabilityWindow="SPOT"
      />
    );

    rerender(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="E_METHANOL"
        prefillDeliveryPointId="dp-rotterdam"
        prefillAvailabilityWindow="2026-05"
      />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Order product' }).textContent).toContain('e-Methanol');
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '575' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /orderPlaceModal.label.certificationDeclared/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), {
      target: { value: 'IMPCA' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), {
      target: { value: '38.4' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), {
      target: { value: 'Biogenic CO2 + green hydrogen' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), {
      target: { value: 'Netherlands' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /orderPlaceModal.label.msdsAvailable/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 'prod-e',
          delivery_point_id: 'dp-rotterdam',
          availability_window: '2026-05',
        })
      );
    });
  });

  it('opens ask metadata by default for supplier orders', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. 40')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Waste residue')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Singapore hub')).toBeTruthy();
  });

  it('submits anonymous orders without exposing an anonymity toggle', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    }, { timeout: 10000 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place Bid' })).toBeTruthy(), { timeout: 10000 });

    fireEvent.click(screen.getByRole('button', { name: /orderPlaceModal.label.advanced/i }));

    expect(screen.queryByText('orderPlaceModal.label.anonymous')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /orderPlaceModal.label.anonymous/i })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'BID',
          product_id: 'prod-1',
          delivery_point_id: 'dp-1',
          quantity_mt: 1000,
          price_per_mt_usd: 540,
          availability_window: 'SPOT',
          is_anonymous: true,
        })
      );
    }, { timeout: 10000 });

    const payload = createOrderMock.mock.calls[0]?.[0];
    expect(payload?.certification_scheme).toBeUndefined();
  }, 15000);

  it('shows post-order next-step actions for live unmatched orders', async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={onClose}
        onNavigate={onNavigate}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(screen.getByText('orderPlaceModal.next.title')).toBeTruthy();
      expect(screen.getByText('orderPlaceModal.next.liveOrder')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'orderPlaceModal.next.action.marketplace' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('MARKETPLACE');
  });

  it('routes instantly matched orders to trade history', async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    createOrderMock.mockResolvedValue({
      trades: [{ quantity_mt: 250, price_per_mt_usd: 535 }],
    });

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={onClose}
        onNavigate={onNavigate}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(screen.getByText('orderPlaceModal.next.autoMatched')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'orderPlaceModal.next.action.trades' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('TRADES');
  });

  it('tracks the submitted market slice before opening Watchlist', async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={onClose}
        onNavigate={onNavigate}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(screen.getByText('orderPlaceModal.next.liveOrder')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'orderPlaceModal.next.action.watchlists' }));

    await waitFor(() => {
      expect(createSliceTargetMock).toHaveBeenCalledWith('radar-1', {
        market_product_code: 'BIO_METHANOL',
        delivery_point_id: 'dp-1',
        availability_window_code: 'SPOT',
      });
      expect(onNavigate).toHaveBeenCalledWith('WATCHLISTS');
    });
    expect(sessionStorage.getItem('verdaxis_watchlist_focus')).toBe('BIO_METHANOL::dp-1::SPOT');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not untrack an existing market slice from the post-order Watchlist action', async () => {
    const onNavigate = vi.fn();
    getRadarMock.mockResolvedValue({
      id: 'radar-1',
      name: 'Market Radar',
      kind: 'RADAR_DEFAULT',
      unread_event_count: 0,
      total_slice_count: 1,
      has_more_slices: false,
      slices: [
        {
          id: 'slice-1',
          target_type: 'SLICE',
          market_product_code: 'BIO_METHANOL',
          delivery_point_id: 'dp-1',
          availability_window_code: 'SPOT',
          active_order_count: 1,
          unread_event_count: 0,
          pins: [],
          created_at: '2026-04-13T00:00:00Z',
        },
      ],
      created_at: '2026-04-13T00:00:00Z',
    });

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        onNavigate={onNavigate}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '540' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(screen.getByText('orderPlaceModal.next.liveOrder')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'orderPlaceModal.next.action.watchlists' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('WATCHLISTS'));
    expect(createSliceTargetMock).not.toHaveBeenCalled();
  });


  it('submits buyer certification preferences as explicit checkbox selections', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="BID"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /orderPlaceModal.label.advanced/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'ISCC EU' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'REDcert EU' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '542' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'BID',
          certifications: ['ISCC EU', 'REDcert EU'],
          is_anonymous: true,
        })
      );
    });

    const payload = createOrderMock.mock.calls[0]?.[0];
    expect(payload?.certification_scheme).toBeUndefined();
  });

  it('requires supplier certification declaration for ask orders', async () => {
    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('e.g. IMPCA')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), {
      target: { value: '555' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /orderPlaceModal.label.certificationDeclared/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), {
      target: { value: 'IMPCA' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), {
      target: { value: '42.5' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), {
      target: { value: 'Waste residue' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), {
      target: { value: 'Singapore hub' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /orderPlaceModal.label.msdsAvailable/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          side: 'ASK',
          product_id: 'prod-1',
          delivery_point_id: 'dp-1',
          quantity_mt: 1000,
          price_per_mt_usd: 555,
          availability_window: 'SPOT',
          certification_declared: true,
          certifications: ['ISCC EU'],
          specification_standard: 'IMPCA',
          msds_available: true,
          carbon_intensity_gco2_mj: 42.5,
          feedstock: 'Waste residue',
          origin: 'Singapore hub',
          is_anonymous: true,
        })
      );
    });
  });

  it('closes on cancel without submitting the form', async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <OrderPlaceModal
        isOpen
        onClose={onClose}
        side="ASK"
      />
    );

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
      expect(deliveryPointsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'orderPlaceModal.btn.cancel' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

});
