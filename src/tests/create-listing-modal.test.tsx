import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateListingModal } from '../components/supplier/CreateListingModal';
import { renderWithProviders } from './test-utils';

const productsMock = vi.fn();
const deliveryPointsMock = vi.fn();
const latestAskTemplateMock = vi.fn();
const benchmarksLookupMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      products: (...args: unknown[]) => productsMock(...args),
      deliveryPoints: (...args: unknown[]) => deliveryPointsMock(...args),
    },
    orderbook: {
      latestAskTemplate: (...args: unknown[]) => latestAskTemplateMock(...args),
    },
    benchmarks: {
      lookup: (...args: unknown[]) => benchmarksLookupMock(...args),
    },
  },
}));

describe('CreateListingModal', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset();
    productsMock.mockReset();
    deliveryPointsMock.mockReset();
    latestAskTemplateMock.mockReset();
    benchmarksLookupMock.mockReset();

    productsMock.mockResolvedValue([
      { id: 'prod-bio-met', name: 'Bio Methanol', market_product: 'BIO_METHANOL', fuel_type: 'Methanol', fuel_grade: 'Bio', unit: 'MT', min_lot_size: 500, is_active: true },
      { id: 'prod-e-met', name: 'e-Methanol', market_product: 'E_METHANOL', fuel_type: 'Methanol', fuel_grade: 'E', unit: 'MT', min_lot_size: 500, is_active: true },
      { id: 'prod-bio-et', name: 'Bio Ethanol', market_product: 'BIO_ETHANOL', fuel_type: 'Ethanol', fuel_grade: 'Bio', unit: 'MT', min_lot_size: 500, is_active: true },
      { id: 'prod-syn-et', name: 'Synthetic Ethanol', market_product: 'SYNTHETIC_ETHANOL', fuel_type: 'Ethanol', fuel_grade: 'Synthetic', unit: 'MT', min_lot_size: 500, is_active: true },
    ]);
    deliveryPointsMock.mockResolvedValue([
      { id: 'dp-1', name: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore', is_active: true },
      { id: 'dp-2', name: 'Amsterdam', region: 'Europe', timezone: 'Europe/Amsterdam', is_active: true },
    ]);
    latestAskTemplateMock.mockResolvedValue(null);
    benchmarksLookupMock.mockResolvedValue({
      items: [
        {
          market_product: 'BIO_METHANOL',
          delivery_point_id: 'dp-1',
          availability_window: 'SPOT',
          benchmark_price_per_mt_usd: 630,
          source: 'seeded',
        },
      ],
    });
  });

  it('shows only the approved market products and distinct form sections', async () => {
    renderWithProviders(
      <CreateListingModal onSubmit={onSubmit} onCancel={() => undefined} />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalled(), { timeout: 10000 });
    await waitFor(() => expect(screen.getByText('Certification and documents')).toBeTruthy(), { timeout: 10000 });

    fireEvent.click(screen.getByRole('combobox', { name: 'Listing product' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Bio Methanol/i })).toBeTruthy();
      expect(screen.getByRole('option', { name: /e-Methanol/i })).toBeTruthy();
      expect(screen.getByRole('option', { name: /Bio Ethanol/i })).toBeTruthy();
      expect(screen.getByRole('option', { name: /Synthetic Ethanol/i })).toBeTruthy();
    }, { timeout: 10000 });

    expect(screen.getByText('Attribute pack')).toBeTruthy();
    expect(screen.getByText('Off-spec handling')).toBeTruthy();
  }, 15000);

  it('requires certification declaration and only shows off-spec notes when toggled', async () => {
    renderWithProviders(
      <CreateListingModal onSubmit={onSubmit} onCancel={() => undefined} />
    );

    await waitFor(() => expect(productsMock).toHaveBeenCalled());

    expect(screen.queryByPlaceholderText(/Describe the variance clearly/i)).toBeNull();

    fireEvent.click(screen.getByLabelText(/This listing is off-spec/i));
    expect(screen.getByPlaceholderText(/Describe the variance clearly/i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('e.g. 625'), {
      target: { value: '625' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Publish listing/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/I declare this listing is certified/i));
    fireEvent.click(screen.getByRole('combobox', { name: 'Certification scheme' }));
    fireEvent.click(screen.getByRole('option', { name: /ISCC EU/i }));
    fireEvent.change(screen.getByPlaceholderText(/Describe the variance clearly/i), {
      target: { value: 'Chloride is above target spec' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Publish listing/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        certification_declared: true,
        certification_scheme: 'ISCC EU',
        off_spec: true,
        off_spec_notes: 'Chloride is above target spec',
      }));
    });
  });

  it('prefills from the latest listing template without carrying off-spec state', async () => {
    latestAskTemplateMock.mockResolvedValue({
      product_id: 'prod-e-met',
      delivery_point_id: 'dp-2',
      quantity_mt: 2500,
      price_per_mt_usd: 740,
      availability_window: '2026-04',
      certifications: ['ISCC PLUS'],
      certification_declared: true,
      certification_scheme: 'ISCC PLUS',
      specification_standard: 'IMPCA',
      msds_available: true,
      carbon_intensity_gco2_mj: 15.2,
      carbon_intensity_method: 'LCFS',
      feedstock: 'Renewable CO2 + H2',
      origin: 'Spain',
      off_spec: true,
      off_spec_notes: 'Do not carry',
    });

    renderWithProviders(
      <CreateListingModal onSubmit={onSubmit} onCancel={() => undefined} />
    );

    await waitFor(() => expect(latestAskTemplateMock).toHaveBeenCalled());

    expect(screen.getByText(/Prefilled from your latest supplier listing/i)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Listing product' }).textContent).toContain('e-Methanol');
    expect(screen.getByRole('combobox', { name: 'Listing delivery point' }).textContent).toContain('Amsterdam');
    expect(screen.getByRole('combobox', { name: 'Certification scheme' }).textContent).toContain('ISCC PLUS');
    expect(screen.queryByPlaceholderText(/Describe the variance clearly/i)).toBeNull();
  });
});
