import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import i18n, { loadNamespace } from '../i18n';
import { getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import type { AvailabilityWindow } from '../types';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();
const marketSupportControl = vi.hoisted(() => ({
  current: {
    context: null as any,
    isActive: false,
    isLoading: false,
  },
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

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => marketSupportControl.current,
}));

describe('OrderPlaceModal', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();
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
    marketSupportControl.current = { context: null, isActive: false, isLoading: false };
  });

  it('resets to the new canonical slice when reopened', async () => {
    const spotWindow: AvailabilityWindow = 'Spot';
    const prefillWindow = getAvailabilityWindowOptions({ timeZone: 'Europe/Amsterdam' })
      .find((option) => option.kind === 'quarter')?.value ?? 'SPOT';
    const prefillAvailabilityWindow = prefillWindow as AvailabilityWindow;

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
        prefillAvailabilityWindow={spotWindow}
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
        prefillAvailabilityWindow={spotWindow}
      />
    );

    rerender(
      <OrderPlaceModal
        isOpen
        onClose={() => undefined}
        side="ASK"
        prefillMarketProduct="E_METHANOL"
        prefillDeliveryPointId="dp-rotterdam"
        prefillAvailabilityWindow={prefillAvailabilityWindow}
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
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
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
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 'prod-e',
          delivery_point_id: 'dp-rotterdam',
          availability_window: prefillWindow,
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

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

    expect(screen.queryByText('Anonymous Order')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /anonymous order/i })).toBeNull();

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

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
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
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
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
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('requires final support confirmation before submitting an assisted ASK', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2026-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);

    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '555' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), { target: { value: 'IMPCA' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), { target: { value: '42.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), { target: { value: 'Waste residue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), { target: { value: 'Singapore hub' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /confirm assisted order/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/external instruction reference/i), { target: { value: 'INSTR-7' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit ask/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      support_confirmation: expect.objectContaining({
        external_instruction_reference: 'INSTR-7',
        acknowledge_exact_terms: true,
        acknowledge_executable_standing_order: true,
      }),
    })));
  });

  it('retries an ambiguous assisted ASK with the identical payload and idempotency key', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2026-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    createOrderMock
      .mockRejectedValueOnce(new Error('The request status is unknown'))
      .mockResolvedValueOnce({ trades: [] });

    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '555' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /certification declaration/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. IMPCA'), { target: { value: 'IMPCA' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 40'), { target: { value: '42.5' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Waste residue'), { target: { value: 'Waste residue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Singapore hub'), { target: { value: 'Singapore hub' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /MSDS available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit ask/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstPayload = createOrderMock.mock.calls[0]?.[0];
    expect(firstPayload?.idempotency_key).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
    expect(createOrderMock.mock.calls[1]?.[0]).toEqual(firstPayload);
  });

  it('supports an organization-scoped GTC BID without evidence text', async () => {
    marketSupportControl.current = {
      isActive: true,
      isLoading: false,
      context: {
        id: 'ctx-1',
        organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
        actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
        supportReference: 'CASE-42',
        expiresAt: '2099-07-23T18:00:00.000Z',
        scope: ['ORDER_CREATE', 'ORDER_CANCEL'],
      },
    };
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '525' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    expect(screen.queryByLabelText(/evidence excerpt/i)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit bid/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      side: 'BID',
      support_confirmation: expect.objectContaining({
        external_instruction_reference: 'CASE-42',
      }),
    })));
    expect(createOrderMock.mock.calls[0]?.[0]?.expires_at).toBeUndefined();
  });

  it('uses natural Chinese order actions without mixing BID into prose', async () => {
    await i18n.changeLanguage('zh');
    deliveryPointsMock.mockResolvedValue([
      {
        id: 'dp-1',
        name: 'Singapore',
        region: 'Asia',
        timezone: 'Asia/Singapore',
        is_active: true,
      },
      {
        id: 'dp-unknown',
        name: 'Rotterdam',
        region: 'Unmapped Region',
        timezone: 'UTC',
        is_active: true,
      },
    ]);

    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);

    expect(await screen.findByRole('heading', { name: '发布买单' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '发布买单' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /高级选项 可成交期限：现货/ })).toBeTruthy();
    expect(screen.getByText('该产品适用平台目录中的标准规格；下单前请核对认证、质量和交付要求。')).toBeTruthy();
    expect(screen.getByText('亚洲')).toBeTruthy();

    fireEvent.click(screen.getByRole('combobox', { name: '订单交付点' }));

    expect(screen.getAllByText('亚洲').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('其他地区')).toBeTruthy();
    expect(screen.queryByText('Asia')).toBeNull();
    expect(screen.queryByText('Unmapped Region')).toBeNull();
    expect(screen.queryByText('Test product')).toBeNull();
    expect(screen.queryByText('BID')).toBeNull();
    expect(screen.getAllByText('买单').length).toBeGreaterThan(0);
    expect(screen.queryByText(/发布BID/i)).toBeNull();
  });

});
