import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
  GREEN_FUEL_ASSUMPTIONS,
  estimateCompliancePlanning,
} from '../utils/complianceEstimator';

const bioMethanol = GREEN_FUEL_ASSUMPTIONS.find(fuel => fuel.marketProduct === 'BIO_METHANOL')!;
const syntheticEthanol = GREEN_FUEL_ASSUMPTIONS.find(fuel => fuel.marketProduct === 'SYNTHETIC_ETHANOL')!;

const makeInput = (overrides = {}) => ({
  ...DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
  greenFuel: bioMethanol,
  ...overrides,
});

describe('estimateCompliancePlanning', () => {
  it('solves the green-fuel energy blend needed to move weighted CI toward the planning target', () => {
    const result = estimateCompliancePlanning(makeInput());

    expect(result.status).toBe('READY');
    expect(result.blend.feasible).toBe(true);
    expect(result.totalEnergyGJ).toBe(35350);
    expect(result.conventionalFuelMt).toBe(875);
    expect(result.blend.ratio).toBeCloseTo(0.0571, 4);
    expect(result.blend.greenFuelMt).toBeCloseTo(101.4, 1);
    expect(result.blend.displacedConventionalMt).toBeCloseTo(50, 0);
    expect(result.blend.blendedCarbonIntensityGco2ePerMj).toBeCloseTo(89.34, 2);
  });

  it('returns no feasible blend when selected green fuel CI is above the planning target', () => {
    const result = estimateCompliancePlanning(makeInput({
      greenFuel: {
        ...bioMethanol,
        carbonIntensityGco2ePerMj: 91,
      },
      planningTargetGco2ePerMj: 89.34,
    }));

    expect(result.status).toBe('READY');
    expect(result.blend.feasible).toBe(false);
    expect(result.blend.ratio).toBeNull();
    expect(result.blend.greenFuelMt).toBe(0);
    expect(result.blend.noFeasibleReason).toBe('Selected fuel CI is above the planning target');
  });

  it('allows a 100% green blend when selected green fuel CI exactly equals the target', () => {
    const result = estimateCompliancePlanning(makeInput({
      greenFuel: {
        ...syntheticEthanol,
        carbonIntensityGco2ePerMj: 5,
      },
      planningTargetGco2ePerMj: 5,
    }));

    expect(result.status).toBe('READY');
    expect(result.blend.feasible).toBe(true);
    expect(result.blend.ratio).toBe(1);
    expect(result.blend.blendedCarbonIntensityGco2ePerMj).toBe(5);
    expect(result.blend.greenFuelMt).toBeGreaterThan(0);
  });

  it('validates invalid or unsafe input bounds instead of producing misleading numbers', () => {
    const result = estimateCompliancePlanning(makeInput({
      voyageDays: 0,
      conventionalDailyConsumptionMt: -5,
      euaPriceEurPerTco2: 0,
      etsCoverage: 1.5,
    }));

    expect(result.status).toBe('INVALID');
    expect(result.errors).toContain('Voyage duration must be greater than zero');
    expect(result.errors).toContain('Daily conventional fuel consumption must be greater than zero');
    expect(result.errors).toContain('EUA price must be greater than zero');
    expect(result.errors).toContain('EU ETS exposure coverage must be between 0% and 100%');
    expect(result.totalConventionalEstimateEur).toBe(0);
  });

  it('calculates fuel cost, indicative ETS exposure, and FuelEU-style shortfall estimates from stated assumptions', () => {
    const result = estimateCompliancePlanning(makeInput());

    expect(result.conventionalFuelCostEur).toBe(362250);
    expect(result.indicativeEtsExposureEur).toBe(102178);
    expect(result.fuelEuStyleShortfallEur).toBe(54361);
    expect(result.totalConventionalEstimateEur).toBe(518789);
    expect(result.blend.blendedFuelEuStyleShortfallEur).toBe(0);
    expect(result.blend.blendedIndicativeEtsExposureEur).toBeLessThan(result.indicativeEtsExposureEur);
  });

  it('uses the declared conventional emission factor for EU ETS exposure estimates', () => {
    const result = estimateCompliancePlanning(makeInput({
      conventionalEmissionFactorTco2PerMt: 4,
    }));

    expect(result.indicativeEtsExposureEur).toBe(131250);
    expect(result.blend.blendedIndicativeEtsExposureEur).toBe(123755);
  });
});
