import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketSupportFinalConfirmation } from '../components/market-support/MarketSupportFinalConfirmation';
import i18n, { loadNamespace } from '../i18n';

beforeAll(async () => { await Promise.all([loadNamespace('rfq'), loadNamespace('trading')]); });

describe('MarketSupportFinalConfirmation', () => {
  it('shows B100 buyer requirements in the exact draft before assisted submission', async () => {
    render(<MarketSupportFinalConfirmation organizationName="Northstar Fuels" supportReference="CASE-B100" onBack={vi.fn()} onConfirm={vi.fn()} draft={{
      side: 'BID', product: 'UCOME B100', deliveryPoint: 'Singapore', availabilityWindow: 'SPOT', quantityMt: 500, pricePerMtUsd: 1100, expiresAt: '', certificationScheme: '', specificationStandard: '', msdsAvailable: false, carbonIntensity: null, feedstock: '', origin: '',
      fameTerms: { side: 'BID', schema_version: 1, neat_fame: true, standard: 'ASTM_D6751', standard_edition: '24', astm_grade: '1-B S15 LM', max_ci_gco2e_mj: 0, sustainability_scheme: 'ISCC_EU', require_quality_evidence: true, require_sustainability_evidence: false, evidence_due: 'BEFORE_LOADING' },
    }} />);
    expect(await screen.findByRole('heading', { name: 'Buyer fuel requirements' })).toBeTruthy();
    expect(screen.getByText('1-B S15 LM')).toBeTruthy();
    expect(screen.getByText('0 gCO₂e/MJ')).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirm and submit/i })).toHaveProperty('disabled', true);
  });

  it('shows B100 supplier declarations instead of generic fuel fields', async () => {
    render(<MarketSupportFinalConfirmation organizationName="Northstar Fuels" supportReference="CASE-B100" onBack={vi.fn()} onConfirm={vi.fn()} draft={{
      side: 'ASK', product: 'UCOME B100', deliveryPoint: 'Singapore', availabilityWindow: 'SPOT', quantityMt: 500, pricePerMtUsd: 1100, expiresAt: '', certificationScheme: 'Stale generic scheme', specificationStandard: 'Stale generic specification', msdsAvailable: false, carbonIntensity: null, feedstock: 'Stale generic feedstock', origin: 'Stale generic origin',
      fameTerms: { side: 'ASK', schema_version: 1, neat_fame: true, nomination_status: 'PENDING', uco_mass_pct: 100, standard: 'EN_14214', standard_edition: '2019', sustainability_scheme: 'ISCC_EU', certificate_reference: 'DRAFT-CERT', certificate_holder: 'Declared operator', certificate_valid_until: '2027-12-31', evidence_status: 'DECLARED', document_references: [], evidence_due: 'BEFORE_LOADING', ci_gco2e_mj: null },
    }} />);
    expect(await screen.findByText('DRAFT-CERT')).toBeTruthy();
    expect(screen.getByText('Declared carbon intensity').nextElementSibling?.textContent).toBe('Not supplied');
    expect(screen.queryByText('Stale generic specification')).toBeNull();
    expect(screen.queryByText('Stale generic feedstock')).toBeNull();
  });

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
