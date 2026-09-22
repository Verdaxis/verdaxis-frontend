import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import i18n, { loadNamespace } from '../i18n';
import { getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import type { AvailabilityWindow } from '../types';
import type { SupplierOffer } from '../types/fameSupplierOffer';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const createOrderMock = vi.fn();
const createSupplierOfferMock = vi.fn();
const updateSupplierOfferMock = vi.fn();
const validateSupplierOfferMock = vi.fn();
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
    supplierOffers: {
      create: (...args: unknown[]) => createSupplierOfferMock(...args),
      update: (...args: unknown[]) => updateSupplierOfferMock(...args),
    },
  },
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => marketSupportControl.current,
}));

// The declaration fields have their own tests. Keep one named field here to
// verify that the modal includes the child form data in the offer submission.
vi.mock('../components/supplier/FameSupplierOfferForm', () => ({
  FameSupplierOfferForm: ({ offer, pending }: { offer?: SupplierOffer; pending: boolean }) => (
    <label>
      Supplier batch reference
      <input name="supplier_batch_reference" defaultValue={offer?.fuelTerms.batch_reference ?? ''} disabled={pending} />
    </label>
  ),
  buildFameSupplierOfferInput: (data: FormData, core: Record<string, unknown>) => ({
    ...core,
    fuel_terms: { batch_reference: data.get('supplier_batch_reference') },
  }),
  validateFameSupplierOfferInput: (...args: unknown[]) => validateSupplierOfferMock(...args),
}));

describe('OrderPlaceModal', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await loadNamespace('rfq');
    await i18n.changeLanguage('en');
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    createOrderMock.mockReset();
    createSupplierOfferMock.mockReset();
    updateSupplierOfferMock.mockReset();
    validateSupplierOfferMock.mockReset().mockReturnValue(null);
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

  it('excludes UCOME from order creation even when execution metadata is missing', async () => {
    const legacyProducts = await productsMock();
    productsMock.mockResolvedValue([
      { ...legacyProducts[0], id: 'ucome', name: 'UCOME B100', market_product: 'UCOME_B100', fuel_type: 'FAME' },
      ...legacyProducts,
    ]);
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);

    const selector = await screen.findByRole('combobox', { name: 'Order product' });
    await waitFor(() => expect(selector.textContent).toContain('Bio Methanol'));
    fireEvent.click(selector);
    expect(screen.queryByRole('option', { name: /UCOME/i })).toBeNull();
    expect(screen.getByRole('option', { name: /Bio Methanol/i })).toBeTruthy();
  });

  it('blocks an unavailable UCOME prefill without changing its product to alcohol', async () => {
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct="UCOME_B100" />);

    expect((await screen.findByRole('link', { name: 'Return to Marketplace' })).getAttribute('href')).toBe('/app/marketplace?product=UCOME_B100');
    expect(screen.queryByRole('combobox', { name: 'Order product' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Place Bid' })).toBeNull();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it.each(['BID', 'ASK'] as const)('submits executable B100 %s through the standard orderbook', async (side) => {
    productsMock.mockResolvedValue([{
      id: 'prod-ucome', name: 'UCOME B100', market_product: 'UCOME_B100', fuel_type: 'FAME',
      fuel_grade: 'UCOME', execution_mode: 'ORDERBOOK', available_delivery_point_ids: ['dp-1'],
      unit: 'MT', min_lot_size: 1, is_active: true,
    }]);
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side={side} prefillMarketProduct="UCOME_B100" />);

    fireEvent.change(await screen.findByLabelText('Standard edition'), { target: { value: '2012+A2:2019' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Price/  }), { target: { value: '1095' } });
    if (side === 'ASK') {
      fireEvent.change(screen.getByLabelText('Scheme certificate reference'), { target: { value: 'ISCC-001' } });
      fireEvent.change(screen.getByLabelText('Certificate holder'), { target: { value: 'Supplier A' } });
      fireEvent.change(screen.getByLabelText('Certificate valid until'), { target: { value: '2099-12-31' } });
      fireEvent.click(screen.getByRole('checkbox', { name: 'I declare that this is neat UCOME B100 made from 100% used cooking oil feedstock inputs.' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I declare that the stated certification applies to this supply.' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'A safety data sheet is available for this supply.' }));
    }
    fireEvent.click(screen.getByRole('button', { name: side === 'BID' ? 'Place Bid' : 'Place Ask' }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      side, product_id: 'prod-ucome', delivery_point_id: 'dp-1', quantity_mt: 1000,
      price_per_mt_usd: 1095, availability_window: 'SPOT', is_anonymous: true,
      idempotency_key: expect.any(String),
      fame_terms: expect.objectContaining({ side, standard: 'EN_14214', standard_edition: '2012+A2:2019', neat_fame: true }),
    }));
    expect(createSupplierOfferMock).not.toHaveBeenCalled();
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

  it('does not bind Escape before the trading namespace is ready', async () => {
    i18n.removeResourceBundle('en', 'trading');
    const onClose = vi.fn();
    renderWithProviders(<OrderPlaceModal isOpen onClose={onClose} side="BID" />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    // The focus effect also installs Escape; a rendered dialog alone is not ready.
    await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('leaves keyboard focus trapping to assisted confirmation', async () => {
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
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '525' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    const externalReference = await screen.findByLabelText(/external instruction reference/i);
    const backButton = screen.getByRole('button', { name: /back/i });
    backButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(externalReference);
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

  it('retries a timed-out regular order with the same payload and key', async () => {
    createOrderMock
      .mockRejectedValueOnce(new Error('Request timed out. Please try again.'))
      .mockResolvedValueOnce({ trades: [] });
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstPayload = createOrderMock.mock.calls[0]?.[0];
    expect(firstPayload?.idempotency_key).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry safely/i }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
    expect(createOrderMock.mock.calls[1]?.[0]).toEqual(firstPayload);
  });

  it('creates a new key after the failed draft is closed and edited', async () => {
    createOrderMock
      .mockRejectedValueOnce(new Error('Request timed out. Please try again.'))
      .mockResolvedValueOnce({ trades: [] });
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /retry safely/i })).toBeTruthy());
    const firstKey = createOrderMock.mock.calls[0]?.[0]?.idempotency_key;

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '541' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
    expect(createOrderMock.mock.calls[1]?.[0]?.price_per_mt_usd).toBe(541);
    expect(createOrderMock.mock.calls[1]?.[0]?.idempotency_key).not.toBe(firstKey);
  });

  it('guards against double submit while the request is pending', async () => {
    let resolveRequest!: (value: { trades: never[] }) => void;
    createOrderMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" />);
    await waitFor(() => expect(productsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText('e.g. 540'), { target: { value: '540' } });
    const submit = screen.getByRole('button', { name: 'Place Bid' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    resolveRequest({ trades: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy());
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
    // The heading renders before the asynchronous catalog selects a product.
    expect(await screen.findByText('该产品适用平台目录中的标准规格；下单前请核对认证、质量和交付要求。')).toBeTruthy();
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

  describe('B100 standard orders and explicit history edits', () => {
    const b100Product = {
      id: 'prod-ucome',
      name: 'UCOME B100',
      market_product: 'UCOME_B100',
      fuel_type: 'FAME',
      fuel_grade: 'UCOME',
      execution_mode: 'ORDERBOOK',
      available_delivery_point_ids: ['dp-1'],
      unit: 'MT',
      min_lot_size: 500,
      is_active: true,
      spec_description: 'Supplier-declared UCOME B100',
    };

    function makeOffer(overrides: Partial<SupplierOffer> = {}): SupplierOffer {
      return {
        id: 'offer-1',
        productId: 'prod-ucome',
        productName: 'UCOME B100',
        deliveryPointId: 'dp-1',
        deliveryPointName: 'Singapore',
        quantityMt: 750,
        minFillMt: 500,
        pricePerMtUsd: 1095,
        availabilityWindow: 'SPOT',
        deliveryBasis: 'EX_TANK',
        namedLocation: 'Singapore terminal',
        deliveryStart: '2099-01-01',
        deliveryEnd: '2099-01-31',
        quantityTolerancePct: 5,
        paymentTerms: 'Payment before loading',
        inspectionTerms: 'Independent inspection at loading',
        titleRiskTerms: 'Transfer at loading',
        claimsTerms: 'Report claims within 30 days',
        evidenceDue: 'BEFORE_LOADING',
        expiresAt: '2098-12-31T16:00:00.000Z',
        notes: null,
        fuelTerms: {
          schema_version: 1,
          neat_fame: true,
          nomination_status: 'IDENTIFIED',
          batch_reference: 'BATCH-EXISTING',
          producing_site: 'Site A',
          production_origin: 'Malaysia',
          feedstock_origin: 'Malaysia',
          shipping_location: 'Singapore',
          uco_mass_pct: 100,
          standard: 'EN_14214',
          standard_edition: '2012+A2:2019',
          sustainability_scheme: 'ISCC_EU',
          certificate_reference: 'CERT-1',
          certificate_holder: 'Supplier A',
          certificate_valid_until: '2099-12-31',
          evidence_status: 'DECLARED',
          document_references: [],
        },
        status: 'OPEN',
        revision: 3,
        createdAt: '2098-11-01T00:00:00.000Z',
        updatedAt: '2098-11-02T00:00:00.000Z',
        executionEnabled: false,
        listingKind: 'SUPPLIER_OFFER',
        canEdit: true,
        canWithdraw: true,
        canRequestQuote: false,
        ...overrides,
      };
    }

    beforeEach(async () => {
      const alcoholProducts = await productsMock();
      productsMock.mockResolvedValue([...alcoholProducts, b100Product]);
      createSupplierOfferMock.mockResolvedValue(makeOffer());
      updateSupplierOfferMock.mockResolvedValue(makeOffer({ revision: 4 }));
    });

    function enableAssistedSession() {
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
    }

    async function fillOrder(side: 'BID' | 'ASK' = 'ASK') {
      fireEvent.change(await screen.findByLabelText('Standard edition'), { target: { value: '2012+A2:2019' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: /^Price/ }), { target: { value: '1095' } });
      if (side === 'ASK') {
        fireEvent.change(screen.getByLabelText('Scheme certificate reference'), { target: { value: 'CERT-1' } });
        fireEvent.change(screen.getByLabelText('Certificate holder'), { target: { value: 'Supplier A' } });
        fireEvent.change(screen.getByLabelText('Certificate valid until'), { target: { value: '2099-12-31' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /I declare that this is neat/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: /stated certification applies/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: /safety data sheet is available/ }));
      }
    }

    it.each(['BID', 'ASK'] as const)('offers active ORDERBOOK B100 alongside alcohols for %s', async (side) => {
      productsMock.mockResolvedValue([...(await productsMock()), { ...b100Product, id: 'inactive-ucome', is_active: false }]);
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side={side} />);
      fireEvent.click(await screen.findByRole('combobox', { name: 'Order product' }));
      expect(screen.getByRole('option', { name: /Bio Methanol/i })).toBeTruthy();
      const b100Options = screen.getAllByRole('option', { name: /UCOME/i });
      expect(b100Options).toHaveLength(1);
      fireEvent.click(b100Options[0]);
      expect(await screen.findByLabelText('Standard edition')).toBeTruthy();
      expect(screen.getByRole('button', { name: side === 'BID' ? 'Place Bid' : 'Place Ask' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Publish offer' })).toBeNull();
    });

    it.each(['BID', 'ASK'] as const)('keeps explicit RFQ_ONLY catalog products nonexecuting for %s', async (side) => {
      productsMock.mockResolvedValue([{ ...b100Product, execution_mode: 'RFQ_ONLY' }]);
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side={side} prefillMarketProduct="UCOME_B100" />);
      expect(await screen.findByRole('heading', { name: 'B100 orders are not available' })).toBeTruthy();
      expect(screen.queryByLabelText('Standard edition')).toBeNull();
      expect(createOrderMock).not.toHaveBeenCalled();
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
    });

    it.each(['prefill', 'product switch'] as const)('uses an allowed Singapore port after an unsupported %s', async (entry) => {
      deliveryPointsMock.mockResolvedValue([
        { id: 'dp-rotterdam', name: 'Rotterdam', region: 'Europe', timezone: 'Europe/Amsterdam', is_active: true },
        { id: 'dp-1', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
        { id: 'dp-unavailable', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
      ]);
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK"
        prefillMarketProduct={entry === 'prefill' ? 'UCOME_B100' : 'BIO_METHANOL'} prefillDeliveryPointId="dp-rotterdam" />);
      const product = await screen.findByRole('combobox', { name: 'Order product' });
      if (entry === 'product switch') {
        fireEvent.click(product);
        fireEvent.click(screen.getByRole('option', { name: /UCOME B100/i }));
      }
      await fillOrder();
      fireEvent.click(screen.getByRole('combobox', { name: 'Order delivery point' }));
      expect(screen.queryByRole('option', { name: /Rotterdam/i })).toBeNull();
      const ports = screen.getAllByRole('option', { name: /Singapore/i });
      expect(ports).toHaveLength(1);
      fireEvent.click(ports[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));
      await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'prod-ucome', delivery_point_id: 'dp-1' })));
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
    });

    it.each(['BID', 'ASK'] as const)('preserves B100 %s fields through assisted confirmation and Back', async (side) => {
      enableAssistedSession();
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side={side} prefillMarketProduct="UCOME_B100" />);
      await fillOrder(side);
      const place = side === 'BID' ? 'Place Bid' : 'Place Ask';
      fireEvent.click(screen.getByRole('button', { name: place }));
      expect(await screen.findByRole('heading', { name: /confirm assisted order/i })).toBeTruthy();
      expect(createOrderMock).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(await screen.findByLabelText('Standard edition')).toHaveProperty('value', '2012+A2:2019');
      if (side === 'ASK') {
        expect(screen.getByLabelText('Scheme certificate reference')).toHaveProperty('value', 'CERT-1');
        expect(screen.getByRole('checkbox', { name: /safety data sheet is available/ })).toHaveProperty('checked', true);
      }
      fireEvent.click(screen.getByRole('button', { name: place }));
      fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
      fireEvent.click(screen.getByRole('button', { name: side === 'BID' ? /confirm and submit bid/i : /confirm and submit ask/i }));
      await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
      expect(createOrderMock.mock.calls[0][0]).toEqual(expect.objectContaining({
        fame_terms: expect.objectContaining({ side, standard_edition: '2012+A2:2019' }),
        support_confirmation: expect.objectContaining({ acknowledge_exact_terms: true, acknowledge_executable_standing_order: true }),
      }));
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
    });

    it('retries an uncertain B100 submission with the same declaration and idempotency key', async () => {
      createOrderMock.mockRejectedValueOnce(new Error('Request timed out.')).mockResolvedValueOnce({ trades: [] });
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="ASK" prefillMarketProduct="UCOME_B100" />);
      await fillOrder();
      fireEvent.click(screen.getByRole('button', { name: 'Place Ask' }));
      fireEvent.click(await screen.findByRole('button', { name: /retry safely/i }));
      await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(2));
      expect(createOrderMock.mock.calls[1]).toEqual(createOrderMock.mock.calls[0]);
      expect(createOrderMock.mock.calls[1][0].fame_terms.ci_gco2e_mj).toBeNull();
    });

    it('shows the normal automatic match result for a compatible B100 order', async () => {
      createOrderMock.mockResolvedValue({ trades: [{ quantity_mt: 500, price_per_mt_usd: 1090 }] });
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct="UCOME_B100" />);
      await fillOrder('BID');
      fireEvent.click(screen.getByRole('button', { name: 'Place Bid' }));
      expect(await screen.findByRole('heading', { name: i18n.t('orderPlaceModal.autoMatched.title', { ns: 'trading' }) })).toBeTruthy();
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
    });

    it('keeps invalid CI requirements editable and does not send an order', async () => {
      renderWithProviders(<OrderPlaceModal isOpen onClose={() => undefined} side="BID" prefillMarketProduct="UCOME_B100" />);
      await fillOrder('BID');
      fireEvent.change(screen.getByLabelText('Maximum CI (gCO₂e/MJ, optional)'), { target: { value: '0' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Place Bid' }).closest('form')!);
      expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('validation.ciContext', { ns: 'rfq' }));
      expect(screen.getByLabelText('Maximum CI (gCO₂e/MJ, optional)')).toHaveProperty('value', '0');
      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('prefills every core value when editing and submits its revision through the offer endpoint', async () => {
      const nextQuarter = getAvailabilityWindowOptions({ timeZone: 'Asia/Singapore' })
        .find((option) => option.kind === 'quarter')!;
      deliveryPointsMock.mockResolvedValue([
        { id: 'dp-1', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
        { id: 'dp-edit', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
      ]);
      productsMock.mockResolvedValue((await productsMock()).map((product: { id: string }) => product.id === 'prod-ucome'
        ? { ...product, available_delivery_point_ids: ['dp-1', 'dp-edit'] }
        : product));
      const offer = makeOffer({ deliveryPointId: 'dp-edit', availabilityWindow: nextQuarter.value });
      const onOfferSaved = vi.fn();
      renderWithProviders(
        <OrderPlaceModal isOpen onClose={() => undefined} side="ASK" editSupplierOffer={offer} onOfferSaved={onOfferSaved} />
      );

      await screen.findByRole('heading', { name: 'Edit B100 offer' });
      const product = await screen.findByRole('combobox', { name: 'Order product' });
      expect(product.textContent).toContain('UCOME B100');
      expect(product).toHaveProperty('disabled', true);
      expect(screen.getByRole('combobox', { name: 'Order delivery point' }).textContent).toContain('Singapore');
      expect(screen.getByRole('combobox', { name: 'Order delivery point' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('spinbutton', { name: 'Quantity (MT)' })).toHaveProperty('value', '750');
      expect(screen.getByRole('spinbutton', { name: 'Price ($/MT)' })).toHaveProperty('value', '1095');
      expect(screen.getByRole('combobox', { name: 'Order availability window' }).textContent).toContain(nextQuarter.label);
      expect(screen.getByLabelText('Supplier batch reference')).toHaveProperty('value', 'BATCH-EXISTING');

      fireEvent.change(screen.getByRole('spinbutton', { name: 'Price ($/MT)' }), { target: { value: '1100' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(updateSupplierOfferMock).toHaveBeenCalledWith('offer-1', expect.objectContaining({
        product_id: 'prod-ucome',
        delivery_point_id: 'dp-edit',
        quantity_mt: 750,
        price_per_mt_usd: 1100,
        availability_window: nextQuarter.value,
        expected_revision: 3,
        fuel_terms: { batch_reference: 'BATCH-EXISTING' },
      })));
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
      expect(createOrderMock).not.toHaveBeenCalled();
      expect(onOfferSaved).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('heading', { name: 'Offer updated' })).toBeTruthy();
    });

    it('keeps an unavailable edit product separate from the available alcohol catalog', async () => {
      productsMock.mockResolvedValue((await productsMock()).filter((product: { id: string }) => product.id !== 'prod-ucome'));
      renderWithProviders(
        <OrderPlaceModal isOpen onClose={() => undefined} side="ASK" editSupplierOffer={makeOffer()} />
      );

      const product = await screen.findByRole('combobox', { name: 'Order product' });
      expect(product.textContent).not.toContain('Bio Methanol');
      expect(product).toHaveProperty('disabled', true);
      expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('offerModal.catalogUnavailable', { ns: 'rfq' }));
      const save = screen.getByRole('button', { name: 'Save changes' });
      expect(save).toHaveProperty('disabled', true);
      fireEvent.submit(save.closest('form')!);

      expect(updateSupplierOfferMock).not.toHaveBeenCalled();
      expect(createSupplierOfferMock).not.toHaveBeenCalled();
      expect(createOrderMock).not.toHaveBeenCalled();
    });

  });

});
