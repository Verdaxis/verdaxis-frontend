export interface FuelPrice {
  fuel: string;
  region: string;
  price: number;         // $/mt
  change: number;        // % change
  ci: number;            // gCO2e/MJ
  energyDensity: number; // MJ/kg
}

export const fuelPrices: FuelPrice[] = [
  { fuel: 'Bio Methanol', region: 'NW Europe', price: 680, change: 2.1, ci: 12.4, energyDensity: 19.9 },
  { fuel: 'Bio Methanol', region: 'Singapore', price: 715, change: -0.8, ci: 14.2, energyDensity: 19.9 },
  { fuel: 'E-Methanol', region: 'NW Europe', price: 1250, change: 1.5, ci: 3.8, energyDensity: 19.9 },
  { fuel: 'Conventional Methanol', region: 'Global', price: 420, change: -1.2, ci: 94.0, energyDensity: 19.9 },
  { fuel: 'Green Ethanol', region: 'Brazil', price: 590, change: 0.9, ci: 18.5, energyDensity: 26.8 },
  { fuel: 'Bio Ethanol', region: 'EU', price: 820, change: 3.2, ci: 8.2, energyDensity: 26.8 },
  { fuel: 'Green Biomethane', region: 'NW Europe', price: 850, change: 1.2, ci: 14.0, energyDensity: 55.5 },
  { fuel: 'Green Ammonia', region: 'Middle East', price: 670, change: 0.8, ci: 0.0, energyDensity: 18.6 },
  { fuel: 'Sustainable Aviation Fuel', region: 'US Gulf', price: 1680, change: 0.4, ci: 22.0, energyDensity: 44.0 },
  { fuel: 'Bio Diesel', region: 'ARA', price: 620, change: 1.8, ci: 65.0, energyDensity: 40.2 },
];
