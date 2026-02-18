export interface CalculatorInputs {
  fuelA_energyDensity: number;      // MJ/kg
  fuelB_energyDensity: number;      // MJ/kg
  fuelA_price: number;              // $/mt
  fuelB_price: number;              // $/mt
  fuelA_dailyConsumption: number;   // t/day at reference energy
  fuelB_dailyConsumption: number;   // t/day at reference energy
  voyageDays: number;
  euaPrice: number;                 // EUR/tCO2
  etsCoverage: number;              // fraction (0.5 = 50%)
  fueleuThreshold: number;          // gCO2e/MJ
  eurToUsd: number;
  emissionFactor: number;           // tCO2/t fuel
}

export const defaultInputs: CalculatorInputs = {
  fuelA_energyDensity: 40.4,
  fuelB_energyDensity: 43.3,
  fuelA_price: 450,
  fuelB_price: 480,
  fuelA_dailyConsumption: 35,
  fuelB_dailyConsumption: 33,
  voyageDays: 25,
  euaPrice: 75,
  etsCoverage: 0.50,
  fueleuThreshold: 89.34,
  eurToUsd: 1.18,
  emissionFactor: 3.114,
};

export interface VoyageResult {
  energyDensity: number;
  fuelBurnT: number;
  effTperDay: number;
  totalEnergyGJ: number;
  co2T: number;
  etsCostEur: number;
  fueleuIntensity: number;
  fueleuCompliant: boolean;
  fueleuPenaltyEur: number;
  ciiProxy: number;
  fuelCostUsd: number;
  totalCostUsd: number;
}

export function calculateVoyage(
  energyDensity: number,
  fuelPrice: number,
  dailyConsumption: number,
  inputs: CalculatorInputs,
): VoyageResult {
  // Reference energy needed for voyage (based on ~41 MJ/kg reference)
  // Total energy = daily consumption * voyage days * reference energy density
  // Same ship needs same ENERGY, not same MASS
  const referenceEnergyMJ = dailyConsumption * 1000 * inputs.voyageDays * 41.0; // ~41 MJ/kg reference
  const totalEnergyGJ = referenceEnergyMJ / 1000;

  // Fuel required = total energy / fuel energy density
  const fuelBurnT = referenceEnergyMJ / (energyDensity * 1000); // MJ / (MJ/kg * 1000 kg/t)

  const effTperDay = fuelBurnT / inputs.voyageDays;

  // CO2 emissions
  const co2T = fuelBurnT * inputs.emissionFactor;

  // EU ETS cost
  const etsCostEur = co2T * inputs.euaPrice * inputs.etsCoverage;

  // FuelEU Maritime intensity (gCO2e/MJ)
  // emissionFactor is tCO2/t fuel = 3.114
  // In g/kg: 3.114 * 1000 * 1000 / 1000 = 3114 gCO2/kg
  // Intensity = 3114 / energyDensity gCO2e/MJ
  const fueleuIntensity = (inputs.emissionFactor * 1000000 / 1000) / energyDensity;

  const fueleuCompliant = fueleuIntensity <= inputs.fueleuThreshold;

  // FuelEU penalty: simplified as excess intensity * total energy * penalty factor
  const excessIntensity = Math.max(0, fueleuIntensity - inputs.fueleuThreshold);
  const fueleuPenaltyEur = fueleuCompliant ? 0 : excessIntensity * totalEnergyGJ * 0.33;

  // CII proxy (relative rating, lower is better)
  const ciiProxy = co2T / (totalEnergyGJ * 0.01);

  // Costs
  const fuelCostUsd = fuelBurnT * fuelPrice;
  const totalCostUsd = fuelCostUsd + (etsCostEur * inputs.eurToUsd) + (fueleuPenaltyEur * inputs.eurToUsd);

  return {
    energyDensity,
    fuelBurnT: Math.round(fuelBurnT),
    effTperDay: Math.round(effTperDay * 10) / 10,
    totalEnergyGJ: Math.round(totalEnergyGJ),
    co2T: Math.round(co2T),
    etsCostEur: Math.round(etsCostEur),
    fueleuIntensity: Math.round(fueleuIntensity * 100) / 100,
    fueleuCompliant,
    fueleuPenaltyEur: Math.round(fueleuPenaltyEur),
    ciiProxy: Math.round(ciiProxy * 100) / 100,
    fuelCostUsd: Math.round(fuelCostUsd),
    totalCostUsd: Math.round(totalCostUsd),
  };
}
