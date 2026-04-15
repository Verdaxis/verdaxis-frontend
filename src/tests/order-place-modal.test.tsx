import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();

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
  },
}));

describe('OrderPlaceModal', () => {
  beforeEach(() => {
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();

    productsMock.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Green Methanol',
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

    fireEvent.click(screen.getByRole('button', { name: /orderPlaceModal.label.advanced/i }));
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

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText('orderPlaceModal.label.anonymous')).toBeNull();

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

    fireEvent.click(screen.getByRole('button', { name: /orderPlaceModal.label.advanced/i }));
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
