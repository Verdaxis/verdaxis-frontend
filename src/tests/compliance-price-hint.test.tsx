import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { CompliancePriceHint } from '../components/trading/CompliancePriceHint';
import { ComplianceOverlayAssumptions, ListingComplianceOverlay } from '../types';
import { renderWithProviders } from './test-utils';

const overlay: ListingComplianceOverlay = {
  penalty_avoided_eur_per_mt: '768.75',
  penalty_avoided_usd_per_mt: '830.25',
  tco2e_avoided_per_mt: '1.197',
  ci_gco2_mj: '31',
  ci_basis: 'PRODUCT_DEFAULT',
  lcv_mj_kg: '19.9',
  lcv_basis: 'PRODUCT_DEFAULT',
};

const assumptions: ComplianceOverlayAssumptions = {
  eur_usd_rate: '1.08',
  vlsfo_baseline_gco2_mj: '91.16',
  ghgie_actual_gco2_mj: '91.16',
  fleet_intensity_basis: 'DEFAULT_VLSFO',
  fleet_vessel_count: 0,
  penalty_eur_per_tonne: '2400',
  year: 2026,
  year_target: '89.34',
  excluded_factors: ['RFNBO_MULTIPLIER', 'DEFICIT_ESCALATION', 'EXTRA_EU_VOYAGE_SCOPE'],
};

describe('CompliancePriceHint', () => {
  it('renders USD penalty avoided and tCO2e from string decimals', () => {
    renderWithProviders(<CompliancePriceHint overlay={overlay} assumptions={assumptions} />);

    expect(screen.getByText('FuelEU −$830/MT')).toBeTruthy();
    expect(screen.getByText('1.20 tCO₂e/MT avoided')).toBeTruthy();
  });

  it('spells out assumptions and exclusions in the tooltip', () => {
    renderWithProviders(<CompliancePriceHint overlay={overlay} assumptions={assumptions} />);

    const block = screen.getByTitle(/Indicative estimate only/);
    expect(block.title).toContain('product default (proxy)');
    expect(block.title).toContain('default 100% VLSFO fleet assumption');
    expect(block.title).toContain('EUR/USD 1.08');
    expect(block.title).toContain('RFNBO_MULTIPLIER');
  });

  it('renders the zero case muted, not hidden', () => {
    renderWithProviders(
      <CompliancePriceHint
        overlay={{ ...overlay, penalty_avoided_eur_per_mt: '0.00', penalty_avoided_usd_per_mt: '0.00', tco2e_avoided_per_mt: '0.000' }}
        assumptions={assumptions}
      />,
    );

    expect(screen.getByText('FuelEU −$0/MT')).toBeTruthy();
  });

  it('renders nothing when numbers are malformed', () => {
    const { container } = renderWithProviders(
      <CompliancePriceHint
        overlay={{ ...overlay, penalty_avoided_usd_per_mt: 'not-a-number' }}
        assumptions={assumptions}
      />,
    );

    expect(container.textContent).toBe('');
  });
});