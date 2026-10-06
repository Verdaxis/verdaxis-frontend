import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EnergyCalculatorPage } from '../EnergyCalculatorPage';
import { calculateVoyage, defaultInputs } from '../../../data/calculatorDefaults';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('../../../services/analytics', () => ({
  analytics: { track },
}));

const renderWithRouter = (ui: React.ReactElement, { route = '/calculator' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('EnergyCalculatorPage', () => {
  beforeEach(() => {
    track.mockClear();
  });

  it('renders calculator with default values', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    expect(screen.getByText('Energy Calculator')).toBeTruthy();
    expect(
      screen.getByText(/compare two fuel scenarios for the same energy demand/i)
    ).toBeTruthy();
  });

  it('shows comparison results with metric cards', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // Both fuel rows should show metric labels
    expect(screen.getAllByText(/required fuel/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/direct combustion co₂/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/eu ets illustration/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/energy demand/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/price \/ gj/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/scenario cost/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders input controls for fuel and voyage parameters', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // Check for per-fuel parameter labels
    expect(screen.getAllByText(/lower calorific value/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/direct co₂ factor/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/assumed fuel price/i).length).toBeGreaterThanOrEqual(2);
    // Check for voyage parameter labels
    expect(screen.getAllByText(/voyage days/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/daily energy demand/i).length).toBeGreaterThanOrEqual(1);
    // Check for regulatory parameters
    expect(screen.getAllByText(/eua price/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/voyage co₂ share in scope/i)).toBeTruthy();
  });

  it('clamps typed numeric values to the supported input range', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    const lowerCalorificValueInput = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    fireEvent.change(lowerCalorificValueInput, { target: { value: '-10' } });
    expect(lowerCalorificValueInput.value).toBe('15');
  });

  it('calculates correctly for default inputs', () => {
    renderWithRouter(<EnergyCalculatorPage />);
    // The results should display the savings summary
    expect(screen.getByText(/scenario cost difference/i)).toBeTruthy();
    expect(screen.getByText(/does not calculate FuelEU Maritime compliance/i)).toBeTruthy();
    // Apply for Pilot CTA
    const ctaLink = screen.getByRole('link', { name: /apply for pilot/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/en/pilot');
  });

  it('tracks the first valid user-triggered result exactly once', async () => {
    renderWithRouter(<EnergyCalculatorPage />);
    expect(track).not.toHaveBeenCalledWith('energy_calculator_completed', expect.anything());

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '41' } });

    await waitFor(() => {
      expect(track.mock.calls.filter(([event]) => event === 'energy_calculator_completed')).toHaveLength(1);
    });
    expect(track).toHaveBeenCalledWith('energy_calculator_completed', { language: 'en' });

    fireEvent.change(sliders[1], { target: { value: '500' } });
    expect(track.mock.calls.filter(([event]) => event === 'energy_calculator_completed')).toHaveLength(1);
  });
});

describe('calculateVoyage', () => {
  it('uses the same energy demand and returns higher fuel burn for lower LCV', () => {
    const resultA = calculateVoyage(40.5, 450, 3.114, defaultInputs);
    const resultB = calculateVoyage(42.7, 450, 3.114, defaultInputs);
    expect(resultA.totalEnergyGJ).toBe(resultB.totalEnergyGJ);
    expect(resultA.totalEnergyGJ).toBe(35_000);
    expect(resultA.fuelBurnT).toBeGreaterThan(resultB.fuelBurnT);
    expect(resultA.fuelBurnT).toBe(864);
    expect(resultB.fuelBurnT).toBe(820);
    expect(resultA.co2T).toBeGreaterThan(resultB.co2T);
    expect(resultA.totalCostUsd).toBeGreaterThan(resultB.totalCostUsd);
    expect(resultA.pricePerGJUsd).toBe(11.11);
    expect(resultB.pricePerGJUsd).toBe(10.54);
  });

  it('calculates the CO2-only ETS illustration from explicit assumptions', () => {
    const result = calculateVoyage(40.5, 450, 3.114, defaultInputs);
    expect(result.co2T).toBe(2691);
    expect(result.etsCostEur).toBe(100917);
    expect(result.totalCostUsd).toBe(507971);
  });

  it('rejects invalid numeric inputs instead of showing a free-fuel result', () => {
    expect(() => calculateVoyage(0, -1, -1, {
        ...defaultInputs,
        dailyEnergyDemandGJ: Number.NaN,
        voyageDays: -5,
      }))
      .toThrow(RangeError);
  });

  it('uses per-fuel price and combustion factor correctly', () => {
    const resultCheap = calculateVoyage(40.5, 400, 3.0, defaultInputs);
    const resultExpensive = calculateVoyage(40.5, 600, 3.2, defaultInputs);
    expect(resultExpensive.fuelCostUsd).toBeGreaterThan(resultCheap.fuelCostUsd);
    expect(resultExpensive.co2T).toBeGreaterThan(resultCheap.co2T);
  });
});
