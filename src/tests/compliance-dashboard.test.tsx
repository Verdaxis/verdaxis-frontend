import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ComplianceDashboard } from '../components/compliance/ComplianceDashboard';
import { api } from '../services/api';
import { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

vi.mock('recharts', async () => {
  const charts = await vi.importActual<typeof import('recharts')>('recharts');
  return { ...charts, ResponsiveContainer: () => null };
});

afterEach(() => vi.restoreAllMocks());

it('keeps missing ETS emissions and cost visibly unpriced instead of zero', async () => {
  await loadNamespace('compliance');
  vi.spyOn(api.compliance, 'fleet').mockResolvedValue({
    total_vessels: 1, green_count: 0, amber_count: 1, red_count: 0,
    average_score: 47,
    vessels: [{
      vessel_id: 'vessel-1', vessel_name: 'No emissions data', overall_score: 47,
      status: 'AT_RISK', traffic_light: 'AMBER', recommendations: [],
      fueleu: {
        ghg_intensity_gco2_mj: '91.16', target_intensity_gco2_mj: '89.3368',
        reduction_pct: '-2.04', compliance_balance_gco2: '-546960000',
        estimated_penalty_eur: '351219.51', score: 40,
      },
      eu_ets: {
        calculation_status: 'UNPRICED', total_co2_tonnes: null,
        estimated_cost_eur: null, ets_price_per_tonne_eur: '68',
        phase_in_pct: '100', score: 50,
      },
      cii: { rating: 'C', score: 60 },
    }],
  });
  vi.spyOn(api.compliance, 'fuels').mockResolvedValue({
    fuels: { VLSFO: '91.16' }, unit: 'gCO2e/MJ', source: 'Illustrative assumptions',
  });

  renderWithProviders(<ComplianceDashboard onOpenLedger={vi.fn()} />);

  expect(await screen.findByText('Unpriced: in-scope combustion emissions are not provided.')).toBeTruthy();
  expect(screen.queryByText('€0')).toBeNull();
  expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  expect(screen.getByText('Fleet Planning Scenarios')).toBeTruthy();
});
