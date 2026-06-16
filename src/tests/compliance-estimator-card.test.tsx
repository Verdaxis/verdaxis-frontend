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

  it('renders collapsed by default and expands into labelled planning controls', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: /fueleu \/ eu ets estimator/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/indicative planning estimate only/i)).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/indicative planning estimate only/i)).toBeTruthy();
    expect(screen.getByLabelText('Green fuel pathway')).toBeTruthy();
    expect(screen.getByLabelText('Voyage days')).toBeTruthy();
    expect(screen.getByLabelText('Daily burn (MT)')).toBeTruthy();
    expect(screen.getByLabelText('Target CI (gCO2e/MJ)')).toBeTruthy();
  });

  it('announces recalculated results when voyage assumptions change', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /fueleu \/ eu ets estimator/i }));

    const resultRegion = screen.getByRole('status');
    expect(resultRegion.getAttribute('aria-atomic')).toBe('true');
    expect(within(resultRegion).getByText('€102,178')).toBeTruthy();
    expect(resultRegion.textContent).toContain('Estimator results');

    fireEvent.change(screen.getByLabelText('Voyage days'), { target: { value: '10' } });

    expect(within(resultRegion).getByText('€40,871')).toBeTruthy();
  });

  it('keeps user-facing copy away from compliance-certainty claims', () => {
    renderWithProviders(<ComplianceEstimatorCard selectedPort={PORTS[0]} onOpenMarketplace={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /fueleu \/ eu ets estimator/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /fueleu \/ eu ets estimator/i }));
    fireEvent.click(screen.getByRole('button', { name: `Open ${selectedPort.name} spot market` }));

    expect(localStorage.getItem('verdaxis_marketplace_product')).toBe('BIO_METHANOL');
    expect(localStorage.getItem('verdaxis_marketplace_port')).toBe(selectedPort.name);
    expect(localStorage.getItem('verdaxis_marketplace_delivery_point_id')).toBe(selectedPort.id);
    expect(localStorage.getItem('verdaxis_marketplace_window')).toBe('SPOT');
    expect(localStorage.getItem('verdaxis_marketplace_fuel')).toBeNull();
    expect(onOpenMarketplace).toHaveBeenCalledWith(selectedPort);
  });

  it('disables Marketplace handoff until the user has selected a port', () => {
    renderWithProviders(<ComplianceEstimatorCard onOpenMarketplace={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /fueleu \/ eu ets estimator/i }));

    const cta = screen.getByRole('button', { name: /select a port to open marketplace/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
  });
});
