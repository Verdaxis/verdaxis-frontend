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
  ci_basis: 'LISTING',
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
  it('shows the lifecycle comparison and leaves regulatory benefits unpriced', () => {
    renderWithProviders(<CompliancePriceHint overlay={overlay} assumptions={assumptions} />);
    expect(screen.getByText('Regulatory benefit unpriced')).toBeTruthy();
    expect(screen.getByText('1.20 tCO₂e/MT lifecycle gap')).toBeTruthy();
    // A stale server can still send a positive legacy penalty field. Never
    // present that value as a price discount or earned financial benefit.
    expect(screen.queryByText(/830/)).toBeNull();
  });

  it('labels declared CI, physical assumptions and missing financial evidence', () => {
    renderWithProviders(<CompliancePriceHint overlay={overlay} assumptions={assumptions} />);
    const block = screen.getByTitle(/Equal-energy lifecycle comparison/);
    expect(block.title).toContain('listing-declared (31 gCO2e/MJ)');
    expect(block.title).toContain('product default (proxy) (19.9 MJ/kg)');
    expect(block.title).toContain('91.16 gCO2e/MJ');
    expect(block.title).toContain('No ETS savings');
    expect(block.title).toContain('contractual ownership');
  });

  it('does not infer consignment CI from a product proxy', () => {
    const { container } = renderWithProviders(
      <CompliancePriceHint overlay={{ ...overlay, ci_basis: 'PRODUCT_DEFAULT' }} assumptions={assumptions} />,
    );
    expect(container.textContent).toBe('');
  });

  it('keeps an actual declared zero separate from unknown CI', () => {
    renderWithProviders(
      <CompliancePriceHint overlay={{ ...overlay, ci_gco2_mj: '0' }} assumptions={assumptions} />,
    );
    expect(screen.getByText('Regulatory benefit unpriced')).toBeTruthy();
  });

  it.each(['', 'not-a-number'])('hides unknown or invalid CI %s', ci => {
    const { container } = renderWithProviders(
      <CompliancePriceHint overlay={{ ...overlay, ci_gco2_mj: ci }} assumptions={assumptions} />,
    );
    expect(container.textContent).toBe('');
  });
});
