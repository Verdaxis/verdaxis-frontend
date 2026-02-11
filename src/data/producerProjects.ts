// src/data/producerProjects.ts
export type FuelType = 'Methanol' | 'Ethanol' | 'SAF' | 'Ammonia' | 'Biofuel' | 'Biomethane';
export type ProjectStatus = 'Operational' | 'Under Construction' | 'Planned';

export interface ProducerProject {
  id: string;
  name: string;
  company: string;
  fuelType: FuelType;
  pathway: string;
  status: ProjectStatus;
  capacityMtpa: number;
  codYear: number;
  lat: number;
  lng: number;
  country: string;
  ci?: number;
  certifications?: string[];
  offtakeCommitted?: boolean;
}

export const fuelTypeColors: Record<FuelType, string> = {
  Methanol: '#5DADE2',
  Ethanol: '#4CAF50',
  SAF: '#FF9800',
  Ammonia: '#9C27B0',
  Biofuel: '#795548',
  Biomethane: '#00BCD4',
};

export const producerProjects: ProducerProject[] = [
  // Methanol - Operational
  { id: 'meoh-1', name: 'Carbon Recycling International', company: 'CRI', fuelType: 'Methanol', pathway: 'CO\u2082 + Green H\u2082 (e-methanol)', status: 'Operational', capacityMtpa: 4000, codYear: 2012, lat: 63.87, lng: -22.43, country: 'Iceland', ci: 3.2, certifications: ['ISCC EU'] },
  { id: 'meoh-2', name: 'OCI Beaumont', company: 'OCI Global', fuelType: 'Methanol', pathway: 'Natural gas (conventional)', status: 'Operational', capacityMtpa: 900000, codYear: 2018, lat: 30.08, lng: -94.10, country: 'United States' },
  { id: 'meoh-3', name: 'GoldWind Green Methanol', company: 'GoldWind', fuelType: 'Methanol', pathway: 'Green H\u2082 + Biogenic CO\u2082', status: 'Under Construction', capacityMtpa: 500000, codYear: 2026, lat: 44.04, lng: 87.62, country: 'China', ci: 8.5, offtakeCommitted: true },
  { id: 'meoh-4', name: 'MGC Japan Bio-Methanol', company: 'Mitsubishi Gas Chemical', fuelType: 'Methanol', pathway: 'Biomass gasification', status: 'Operational', capacityMtpa: 50000, codYear: 2024, lat: 35.45, lng: 139.64, country: 'Japan', ci: 12.0 },
  { id: 'meoh-5', name: 'European Energy e-Methanol', company: 'European Energy', fuelType: 'Methanol', pathway: 'Wind + DAC CO\u2082', status: 'Under Construction', capacityMtpa: 32000, codYear: 2026, lat: 55.49, lng: 9.47, country: 'Denmark', ci: 4.1, certifications: ['ISCC EU'] },
  { id: 'meoh-6', name: 'Liquid Wind FlagshipONE', company: 'Liquid Wind', fuelType: 'Methanol', pathway: 'Wind + Biogenic CO\u2082', status: 'Under Construction', capacityMtpa: 50000, codYear: 2026, lat: 62.63, lng: 17.94, country: 'Sweden', ci: 5.8 },

  // Ethanol
  { id: 'etoh-1', name: 'Raizen 2G Ethanol', company: 'Raizen', fuelType: 'Ethanol', pathway: 'Sugarcane bagasse (2G)', status: 'Operational', capacityMtpa: 82000, codYear: 2024, lat: -22.32, lng: -46.96, country: 'Brazil', ci: 15.2, certifications: ['RenovaBio'] },
  { id: 'etoh-2', name: 'Clariant Cellulosic Ethanol', company: 'Clariant', fuelType: 'Ethanol', pathway: 'Agricultural residues (2G)', status: 'Under Construction', capacityMtpa: 50000, codYear: 2026, lat: 47.39, lng: 8.52, country: 'Switzerland', ci: 10.8, certifications: ['ISCC EU', 'RED III'] },
  { id: 'etoh-3', name: 'POET-DSM Project Liberty', company: 'POET-DSM', fuelType: 'Ethanol', pathway: 'Corn stover (2G)', status: 'Operational', capacityMtpa: 75000, codYear: 2014, lat: 43.42, lng: -95.11, country: 'United States', ci: 22.0 },
  { id: 'etoh-4', name: 'Praj Bio2G', company: 'Praj Industries', fuelType: 'Ethanol', pathway: 'Rice straw (2G)', status: 'Operational', capacityMtpa: 30000, codYear: 2023, lat: 18.52, lng: 73.86, country: 'India', ci: 18.5 },

  // SAF
  { id: 'saf-1', name: 'Neste Rotterdam SAF', company: 'Neste', fuelType: 'SAF', pathway: 'HEFA (used cooking oil)', status: 'Operational', capacityMtpa: 500000, codYear: 2023, lat: 51.88, lng: 4.32, country: 'Netherlands', ci: 22.0, certifications: ['ISCC EU', 'RSB'] },
  { id: 'saf-2', name: 'TotalEnergies Grandpuits', company: 'TotalEnergies', fuelType: 'SAF', pathway: 'HEFA (animal fats)', status: 'Under Construction', capacityMtpa: 210000, codYear: 2025, lat: 48.59, lng: 2.96, country: 'France', ci: 28.0 },
  { id: 'saf-3', name: 'LanzaJet Freedom Pines', company: 'LanzaJet', fuelType: 'SAF', pathway: 'Alcohol-to-Jet (AtJ)', status: 'Operational', capacityMtpa: 38000, codYear: 2024, lat: 31.17, lng: -81.49, country: 'United States', ci: 16.5 },

  // Ammonia
  { id: 'nh3-1', name: 'NEOM Green Hydrogen', company: 'NEOM', fuelType: 'Ammonia', pathway: 'Green H\u2082 (solar/wind)', status: 'Under Construction', capacityMtpa: 1200000, codYear: 2027, lat: 28.00, lng: 35.18, country: 'Saudi Arabia', ci: 0.5 },
  { id: 'nh3-2', name: 'Yara Pilbara Green Ammonia', company: 'Yara', fuelType: 'Ammonia', pathway: 'Green H\u2082 (solar)', status: 'Under Construction', capacityMtpa: 40000, codYear: 2026, lat: -20.73, lng: 116.85, country: 'Australia', ci: 1.2, certifications: ['ISCC PLUS'] },

  // Biofuel
  { id: 'bio-1', name: 'Neste Singapore', company: 'Neste', fuelType: 'Biofuel', pathway: 'HVO/HEFA (UCO + animal fats)', status: 'Operational', capacityMtpa: 2600000, codYear: 2023, lat: 1.26, lng: 103.70, country: 'Singapore', ci: 25.0, certifications: ['ISCC EU'] },
  { id: 'bio-2', name: 'Shell Energy Park Rotterdam', company: 'Shell', fuelType: 'Biofuel', pathway: 'HVO (waste oils)', status: 'Under Construction', capacityMtpa: 820000, codYear: 2025, lat: 51.89, lng: 4.38, country: 'Netherlands', ci: 18.0 },
];
