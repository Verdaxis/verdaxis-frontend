import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketSupportFinalConfirmation } from '../components/market-support/MarketSupportFinalConfirmation';
import i18n from '../i18n';

describe('MarketSupportFinalConfirmation', () => {
  it('shows a frozen exact draft summary and critical supplier metadata', () => {
    render(
      <MarketSupportFinalConfirmation
        organizationName="Northstar Fuels"
        supportReference="CASE-42"
        draft={{
          side: 'ASK',
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
        supportReference="CASE-42"
        draft={{ side: 'BID', product: 'Bio Methanol', deliveryPoint: 'Singapore', availabilityWindow: 'Spot', quantityMt: 500, pricePerMtUsd: 700, expiresAt: '', certificationScheme: '', specificationStandard: '', msdsAvailable: false, carbonIntensity: 0, feedstock: '', origin: '' }}
        onBack={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /exact terms/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /standing order/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm and submit/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      external_instruction_reference: 'CASE-42',
      acknowledge_executable_standing_order: true,
    }));
    expect(screen.getByText('Good till cancelled')).toBeTruthy();
  });

  it('uses natural Chinese side and availability labels in confirmation prose', async () => {
    await i18n.changeLanguage('zh');
    try {
      render(
        <MarketSupportFinalConfirmation
          organizationName="Northstar Fuels"
          supportReference="CASE-42"
          draft={{ side: 'ASK', product: 'Bio Methanol', deliveryPoint: 'Singapore', availabilityWindow: '2026-Q4', quantityMt: 500, pricePerMtUsd: 700, expiresAt: '', certificationScheme: 'ISCC EU', specificationStandard: 'IMPCA', msdsAvailable: true, carbonIntensity: 18, feedstock: '废食用油', origin: '中国' }}
          onBack={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.getByText('卖单')).toBeTruthy();
      expect(screen.getByText('2026年第4季度')).toBeTruthy();
      expect(screen.getByRole('button', { name: '确认并提交卖单' })).toBeTruthy();
      expect(screen.getByText(/将为 Northstar Fuels 创建的卖单/)).toBeTruthy();
      expect(screen.queryByText(/ASK/)).toBeNull();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
