export interface CalculatorInputs {
  fuelA_energyDensity: number;      // lower calorific value, MJ/kg (equivalent to GJ/t)
  fuelB_energyDensity: number;      // lower calorific value, MJ/kg (equivalent to GJ/t)
  fuelA_price: number;              // illustrative USD/t
  fuelB_price: number;              // illustrative USD/t
  fuelA_emissionFactor: number;     // direct combustion tCO2/t fuel
  fuelB_emissionFactor: number;     // direct combustion tCO2/t fuel
  dailyEnergyDemandGJ: number;
  voyageDays: number;
  euaPrice: number;                 // illustrative EUR/tCO2
  etsCoverage: number;              // fraction of voyage CO2 in scope
  eurToUsd: number;                 // illustrative conversion assumption
}

export const defaultInputs: CalculatorInputs = {
  // HFO and MDO/MGO default LCV and CO2 factors from Regulation (EU) 2023/1805,
  // Annex II. Prices, energy demand, EUA price, scope, and FX are scenario inputs.
  fuelA_energyDensity: 40.5,
  fuelB_energyDensity: 42.7,
  fuelA_price: 450,
  fuelB_price: 480,
  fuelA_emissionFactor: 3.114,
  fuelB_emissionFactor: 3.206,
  dailyEnergyDemandGJ: 1400,
  voyageDays: 25,
  euaPrice: 75,
  etsCoverage: 0.50,
  eurToUsd: 1.18,
};

export interface VoyageResult {
  energyDensity: number;
  fuelBurnT: number;
  effTperDay: number;
  totalEnergyGJ: number;
  co2T: number;
  etsCostEur: number;
  fuelCostUsd: number;
  totalCostUsd: number;
  pricePerGJUsd: number;
}

export function calculateVoyage(
  energyDensity: number,
  fuelPrice: number,
  emissionFactor: number,
  inputs: CalculatorInputs,
): VoyageResult {
  const validInputs = [energyDensity, fuelPrice, emissionFactor, inputs.dailyEnergyDemandGJ,
    inputs.voyageDays, inputs.euaPrice, inputs.etsCoverage, inputs.eurToUsd].every(Number.isFinite);
  if (
    !validInputs
    || energyDensity <= 0
    || fuelPrice < 0
    || emissionFactor < 0
    || inputs.dailyEnergyDemandGJ <= 0
    || inputs.voyageDays <= 0
    || inputs.euaPrice < 0
    || inputs.etsCoverage < 0
    || inputs.etsCoverage > 1
    || inputs.eurToUsd <= 0
  ) {
    throw new RangeError('Calculator inputs are outside the supported range');
  }

  const totalEnergyGJ = inputs.dailyEnergyDemandGJ * inputs.voyageDays;
  // 1 MJ/kg equals 1 GJ/t, so no additional unit conversion is required.
  const fuelBurnT = totalEnergyGJ / energyDensity;
  const effTperDay = fuelBurnT / inputs.voyageDays;
  const co2T = fuelBurnT * emissionFactor;
  const etsCostEur = co2T * inputs.euaPrice * inputs.etsCoverage;
  const fuelCostUsd = fuelBurnT * fuelPrice;
  const totalCostUsd = fuelCostUsd + (etsCostEur * inputs.eurToUsd);
  const pricePerGJUsd = fuelPrice / energyDensity;

  return {
    energyDensity,
    fuelBurnT: Math.round(fuelBurnT),
    effTperDay: Math.round(effTperDay * 10) / 10,
    totalEnergyGJ: Math.round(totalEnergyGJ),
    co2T: Math.round(co2T),
    etsCostEur: Math.round(etsCostEur),
    fuelCostUsd: Math.round(fuelCostUsd),
    totalCostUsd: Math.round(totalCostUsd),
    pricePerGJUsd: Math.round(pricePerGJUsd * 100) / 100,
  };
}
