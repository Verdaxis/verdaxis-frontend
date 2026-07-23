import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketSupportFinalConfirmation } from '../components/market-support/MarketSupportFinalConfirmation';

describe('MarketSupportFinalConfirmation', () => {
  it('shows a frozen exact draft summary and critical supplier metadata', () => {
    render(
      <MarketSupportFinalConfirmation
        organizationName="Northstar Fuels"
        supplierName="Amina Supplier"
        supportReference="CASE-42"
        draft={{
          product: 'Bio Methanol',
          deliveryPoint: 'Singapore',
          availabilityWindow: 'Q4 2026',
          quantityMt: 2500,
          pricePerMtUsd: 745,
          expiresAt: '2026-08-01T23:59:59.000Z',
          certificationScheme: 'ISCC EU',
          specificationStandard: 'ISO 8217',
          msdsAvailable: true,
          carbonIntensity: 18.4,
          carbonIntensityMethod: 'Supplier declaration',
          feedstock: 'Used cooking oil',
          origin: 'Netherlands',
        }}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Bio Methanol')).toBeTruthy();
    expect(screen.getByText('Singapore')).toBeTruthy();
    expect(screen.getByText('2,500 MT')).toBeTruthy();
    expect(screen.getByText('$745.00/MT')).toBeTruthy();
    expect(screen.getByText('ISCC EU')).toBeTruthy();
    expect(screen.getByText('Used cooking oil')).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });

  it('keeps confirmation controls keyboard accessible and submits after acknowledgement', () => {
    const onConfirm = vi.fn();
    render(
      <MarketSupportFinalConfirmation
        organizationName="Northstar Fuels"
        supplierName="Amina Supplier"
        supportReference="CASE-42"
        draft={{ product: 'Bio Methanol', deliveryPoint: 'Singapore', availabilityWindow: 'Spot', quantityMt: 500, pricePerMtUsd: 700, expiresAt: '2026-08-01T23:59:59.000Z', certificationScheme: 'ISCC EU', specificationStandard: 'ISO 8217', msdsAvailable: true, carbonIntensity: 18, carbonIntensityMethod: 'Declared', feedstock: 'UCO', origin: 'NL' }}
        onBack={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /evidence excerpt/i }), { target: { value: 'Exact instruction' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing ask/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ evidence_excerpt: 'Exact instruction' }));
  });
});
