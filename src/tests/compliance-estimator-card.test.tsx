import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';

import { ComplianceEstimatorCard } from '../components/map/ComplianceEstimatorCard';
import { PORTS } from '../data';
import { renderWithProviders } from './test-utils';

describe('ComplianceEstimatorCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders expanded planning controls with voyage segments by default', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);

    expect(screen.getByText(/indicative planning estimate only/i)).toBeTruthy();
    expect(screen.getByText('Voyage segments')).toBeTruthy();
    expect(screen.getByLabelText('Segment 1')).toBeTruthy();
    expect(screen.getByLabelText('Days')).toBeTruthy();
    expect(screen.getByLabelText('Green fuel pathway')).toBeTruthy();
    expect(screen.getByLabelText('Daily burn (MT)')).toBeTruthy();
    expect(screen.getByLabelText('Conventional fuel ($/MT)')).toBeTruthy();
    expect(screen.getByLabelText('EUA price (€/tCO2)')).toBeTruthy();
    expect(screen.getByText('25 voyage days · weighted ETS coverage 50%')).toBeTruthy();
    expect(screen.getByLabelText('Target CI (gCO2e/MJ)')).toBeTruthy();
  });

  it('announces recalculated results when voyage assumptions change', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);

    const resultRegion = screen.getByRole('status');
    expect(resultRegion.getAttribute('aria-atomic')).toBe('true');
    expect(within(resultRegion).getByText('€362,250')).toBeTruthy();
    expect(within(resultRegion).getByText('€518,789')).toBeTruthy();
    expect(within(resultRegion).getByText('€102,178')).toBeTruthy();
    expect(resultRegion.textContent).toContain('Estimator results');

    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '10' } });

    expect(within(resultRegion).getByText('€40,871')).toBeTruthy();
  });

  it('recalculates conventional totals when price and ETS assumptions change', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);

    const resultRegion = screen.getByRole('status');

    fireEvent.change(screen.getByLabelText('Conventional fuel ($/MT)'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('EUA price (€/tCO2)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Segment 1'), { target: { value: 'INTRA_EU' } });

    expect(within(resultRegion).getByText('€402,500')).toBeTruthy();
    expect(within(resultRegion).getByText('€272,475')).toBeTruthy();
    expect(screen.getByText(/conventional fuel \$500\/MT/i)).toBeTruthy();
    expect(screen.getByText(/EUA €100\/tCO2/i)).toBeTruthy();
    expect(screen.getAllByText(/ETS coverage 100%/i).length).toBeGreaterThan(0);
  });

  it('keeps user-facing copy away from compliance-certainty claims', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);

    const text = screen.getByTestId('compliance-estimator-card').textContent || '';

    [
      /non-compliant/i,
      /certified savings/i,
      /tax due/i,
      /penalty avoided/i,
      /filing-ready/i,
    ].forEach((pattern) => {
      expect(text).not.toMatch(pattern);
    });
  });

  it('prefills canonical Marketplace filters before opening the selected port', () => {
    const onOpenMarketplace = vi.fn();
    const selectedPort = PORTS[0];
    renderWithProviders(<ComplianceEstimatorCard selectedPort={selectedPort} onOpenMarketplace={onOpenMarketplace} />);

    fireEvent.click(screen.getByRole('button', { name: `Open ${selectedPort.name} spot market` }));

    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('BIO_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe(selectedPort.name);
    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBeNull();
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('SPOT');
    expect(localStorage.getItem('verdaxis_marketplace_fuel')).toBeNull();
    expect(onOpenMarketplace).toHaveBeenCalledWith(selectedPort);
  });

  it('writes the catalog delivery point ID when the map port has been resolved against the catalog', () => {
    const onOpenMarketplace = vi.fn();
    const selectedPort = {
      ...PORTS[0],
      catalogDeliveryPointId: '11111111-1111-1111-1111-111111111111',
    };
    renderWithProviders(<ComplianceEstimatorCard selectedPort={selectedPort} onOpenMarketplace={onOpenMarketplace} />);

    fireEvent.click(screen.getByRole('button', { name: `Open ${selectedPort.name} spot market` }));

    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBe(selectedPort.catalogDeliveryPointId);
    expect(onOpenMarketplace).toHaveBeenCalledWith(selectedPort);
  });

  it('disables Marketplace handoff until the user has selected a port', () => {
    renderWithProviders(<ComplianceEstimatorCard onOpenMarketplace={vi.fn()} />);

    const cta = screen.getByRole('button', { name: /select a port to open marketplace/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
  });
});
