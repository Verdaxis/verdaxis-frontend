import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EnergyCalculatorPage } from '../EnergyCalculatorPage';
import { calculateVoyage, defaultInputs } from '../../../data/calculatorDefaults';

const renderWithRouter = (ui: React.ReactElement, { route = '/calculator' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('EnergyCalculatorPage', () => {
  it('renders calculator with default values', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    expect(screen.getByText('Energy Calculator')).toBeTruthy();
    expect(
      screen.getByText(/compare fuels by energy content, not just price per tonne/i)
    ).toBeTruthy();
  });

  it('shows comparison results with metric cards', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // Both fuel rows should show metric labels
    expect(screen.getAllByText(/fuel burn/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/co.*emissions/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/eu ets cost/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/fueleu/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/cii proxy/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/price \/ gj/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/total cost/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders input controls for fuel and voyage parameters', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // Check for per-fuel parameter labels
    expect(screen.getAllByText(/energy density/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/daily consumption/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/fuel price/i).length).toBeGreaterThanOrEqual(2);
    // Check for voyage parameter labels
    expect(screen.getByText(/voyage days/i)).toBeTruthy();
    // Check for regulatory parameters
    expect(screen.getByText(/eua price/i)).toBeTruthy();
    expect(screen.getByText(/eu ets coverage/i)).toBeTruthy();
  });

  it('calculates correctly for default inputs', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // The results should display the savings summary
    expect(screen.getByText(/net savings per voyage/i)).toBeTruthy();
    // Apply for Pilot CTA
    const ctaLink = screen.getByRole('link', { name: /apply for pilot/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/pilot');
  });
});

describe('calculateVoyage', () => {
  it('returns higher fuel burn for lower energy density', () => {
    const resultA = calculateVoyage(40.4, 450, 35, defaultInputs);
    const resultB = calculateVoyage(43.3, 450, 35, defaultInputs);
    expect(resultA.fuelBurnT).toBeGreaterThan(resultB.fuelBurnT);
    // With 35 t/day consumption: Fuel A = 888 t, Fuel B = 829 t
    expect(resultA.fuelBurnT).toBe(888);
    expect(resultB.fuelBurnT).toBe(829);
    expect(resultA.co2T).toBeGreaterThan(resultB.co2T);
    expect(resultA.totalCostUsd).toBeGreaterThan(resultB.totalCostUsd);
    expect(resultA.pricePerGJUsd).toBe(11.14);
    expect(resultB.pricePerGJUsd).toBe(10.39);
  });

  it('returns compliant status when intensity below threshold', () => {
    const result = calculateVoyage(43.3, 450, 35, defaultInputs);
    // 3114 / 43.3 = 71.92 which is below threshold 89.34
    expect(result.fueleuCompliant).toBe(true);
    expect(result.fueleuIntensity).toBe(71.92);
    expect(result.fueleuPenaltyEur).toBe(0);
  });

  it('returns non-compliant with penalty when above threshold', () => {
    // Energy density of 30 MJ/kg gives intensity = 3114 / 30 = 103.8 > 89.34
    const result = calculateVoyage(30, 450, 35, defaultInputs);
    expect(result.fueleuCompliant).toBe(false);
    expect(result.fueleuIntensity).toBe(103.8);
    expect(result.fueleuPenaltyEur).toBeGreaterThan(0);
    expect(result.fueleuPenaltyEur).toBe(171188);
  });

  it('uses per-fuel price and consumption correctly', () => {
    // Same energy density but different prices and consumption
    const resultCheap = calculateVoyage(40.4, 400, 30, defaultInputs);
    const resultExpensive = calculateVoyage(40.4, 600, 40, defaultInputs);
    expect(resultExpensive.fuelCostUsd).toBeGreaterThan(resultCheap.fuelCostUsd);
    expect(resultExpensive.fuelBurnT).toBeGreaterThan(resultCheap.fuelBurnT);
  });
});
