import type { MarketProduct } from '../types';

export interface FuelAssumption {
    marketProduct: MarketProduct;
    label: string;
    energyDensityMjPerKg: number;
    carbonIntensityGco2ePerMj: number;
    referencePriceUsdPerMt: number;
}

export interface ComplianceEstimatorInput {
    voyageDays: number;
    conventionalDailyConsumptionMt: number;
    conventionalPriceUsdPerMt: number;
    conventionalEnergyDensityMjPerKg: number;
    conventionalCarbonIntensityGco2ePerMj: number;
    conventionalEmissionFactorTco2PerMt: number;
    greenFuel: FuelAssumption;
    greenPriceUsdPerMt: number;
    planningTargetGco2ePerMj: number;
    euaPriceEurPerTco2: number;
    etsCoverage: number;
    usdToEur: number;
    shortfallFactorEurPerGco2eGJ: number;
}

export interface ComplianceEstimatorResult {
    status: 'READY' | 'INVALID';
    errors: string[];
    totalEnergyGJ: number;
    conventionalFuelMt: number;
    conventionalFuelCostEur: number;
    indicativeEtsExposureEur: number;
    fuelEuStyleShortfallEur: number;
    totalConventionalEstimateEur: number;
    blend: {
        feasible: boolean;
        ratio: number | null;
        greenFuelMt: number;
        displacedConventionalMt: number;
        blendedCarbonIntensityGco2ePerMj: number;
        blendedFuelCostEur: number;
        blendedIndicativeEtsExposureEur: number;
        blendedFuelEuStyleShortfallEur: number;
        noFeasibleReason?: string;
    };
}

export const GREEN_FUEL_ASSUMPTIONS: FuelAssumption[] = [
    {
        marketProduct: 'BIO_METHANOL',
        label: 'Bio Methanol',
        energyDensityMjPerKg: 19.9,
        carbonIntensityGco2ePerMj: 12.4,
        referencePriceUsdPerMt: 680,
    },
    {
        marketProduct: 'E_METHANOL',
        label: 'e-Methanol',
        energyDensityMjPerKg: 19.9,
        carbonIntensityGco2ePerMj: 3.8,
        referencePriceUsdPerMt: 1250,
    },
    {
        marketProduct: 'BIO_ETHANOL',
        label: 'Bio Ethanol',
        energyDensityMjPerKg: 26.8,
        carbonIntensityGco2ePerMj: 18,
        referencePriceUsdPerMt: 590,
    },
    {
        marketProduct: 'SYNTHETIC_ETHANOL',
        label: 'Synthetic Ethanol',
        energyDensityMjPerKg: 26.8,
        carbonIntensityGco2ePerMj: 5,
        referencePriceUsdPerMt: 740,
    },
];

export const DEFAULT_COMPLIANCE_ESTIMATOR_INPUT: Omit<ComplianceEstimatorInput, 'greenFuel'> = {
    voyageDays: 25,
    conventionalDailyConsumptionMt: 35,
    conventionalPriceUsdPerMt: 450,
    conventionalEnergyDensityMjPerKg: 40.4,
    conventionalCarbonIntensityGco2ePerMj: 94,
    conventionalEmissionFactorTco2PerMt: 3.114,
    greenPriceUsdPerMt: 680,
    planningTargetGco2ePerMj: 89.34,
    euaPriceEurPerTco2: 75,
    etsCoverage: 0.5,
    usdToEur: 0.92,
    shortfallFactorEurPerGco2eGJ: 0.33,
};

const round = (value: number, decimals = 0) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

const validateInput = (input: ComplianceEstimatorInput) => {
    const errors: string[] = [];
    const positiveFields: Array<[keyof ComplianceEstimatorInput, string]> = [
        ['voyageDays', 'Voyage duration must be greater than zero'],
        ['conventionalDailyConsumptionMt', 'Daily conventional fuel consumption must be greater than zero'],
        ['conventionalPriceUsdPerMt', 'Conventional fuel price must be greater than zero'],
        ['conventionalEnergyDensityMjPerKg', 'Conventional fuel energy density must be greater than zero'],
        ['conventionalCarbonIntensityGco2ePerMj', 'Conventional fuel carbon intensity must be greater than zero'],
        ['conventionalEmissionFactorTco2PerMt', 'Conventional fuel emission factor must be greater than zero'],
        ['greenPriceUsdPerMt', 'Green fuel price must be greater than zero'],
        ['planningTargetGco2ePerMj', 'Planning CI target must be greater than zero'],
        ['euaPriceEurPerTco2', 'EUA price must be greater than zero'],
        ['usdToEur', 'USD/EUR conversion must be greater than zero'],
        ['shortfallFactorEurPerGco2eGJ', 'Shortfall factor must be greater than zero'],
    ];

    positiveFields.forEach(([key, message]) => {
        if (!isPositive(input[key] as number)) errors.push(message);
    });

    if (!isPositive(input.greenFuel.energyDensityMjPerKg)) {
        errors.push('Green fuel energy density must be greater than zero');
    }
    if (!isPositive(input.greenFuel.carbonIntensityGco2ePerMj)) {
        errors.push('Green fuel carbon intensity must be greater than zero');
    }
    if (!Number.isFinite(input.etsCoverage) || input.etsCoverage < 0 || input.etsCoverage > 1) {
        errors.push('EU ETS exposure coverage must be between 0% and 100%');
    }

    return errors;
};

const estimateEtsExposure = (
    emittingFuelMt: number,
    emissionFactorTco2PerMt: number,
    euaPriceEurPerTco2: number,
    coverage: number,
) => {
    const tco2 = emittingFuelMt * emissionFactorTco2PerMt;
    return tco2 * euaPriceEurPerTco2 * coverage;
};

const estimateShortfall = (carbonIntensityGco2ePerMj: number, target: number, totalEnergyGJ: number, factor: number) => (
    Math.max(0, carbonIntensityGco2ePerMj - target) * totalEnergyGJ * factor
);

export function estimateCompliancePlanning(input: ComplianceEstimatorInput): ComplianceEstimatorResult {
    const errors = validateInput(input);

    if (errors.length > 0) {
        return {
            status: 'INVALID',
            errors,
            totalEnergyGJ: 0,
            conventionalFuelMt: 0,
            conventionalFuelCostEur: 0,
            indicativeEtsExposureEur: 0,
            fuelEuStyleShortfallEur: 0,
            totalConventionalEstimateEur: 0,
            blend: {
                feasible: false,
                ratio: null,
                greenFuelMt: 0,
                displacedConventionalMt: 0,
                blendedCarbonIntensityGco2ePerMj: 0,
                blendedFuelCostEur: 0,
                blendedIndicativeEtsExposureEur: 0,
                blendedFuelEuStyleShortfallEur: 0,
                noFeasibleReason: errors[0],
            },
        };
    }

    const totalEnergyGJ = input.conventionalDailyConsumptionMt * input.voyageDays * input.conventionalEnergyDensityMjPerKg;
    const conventionalFuelMt = input.conventionalDailyConsumptionMt * input.voyageDays;
    const conventionalFuelCostEur = conventionalFuelMt * input.conventionalPriceUsdPerMt * input.usdToEur;
    const indicativeEtsExposureEur = estimateEtsExposure(
        conventionalFuelMt,
        input.conventionalEmissionFactorTco2PerMt,
        input.euaPriceEurPerTco2,
        input.etsCoverage,
    );
    const fuelEuStyleShortfallEur = estimateShortfall(
        input.conventionalCarbonIntensityGco2ePerMj,
        input.planningTargetGco2ePerMj,
        totalEnergyGJ,
        input.shortfallFactorEurPerGco2eGJ,
    );

    let ratio: number | null = 0;
    let feasible = true;
    let noFeasibleReason: string | undefined;

    // Energy-weighted blend ratio: CI_blend = fossilCI * (1 - r) + greenCI * r.
    if (input.conventionalCarbonIntensityGco2ePerMj <= input.planningTargetGco2ePerMj) {
        ratio = 0;
    } else if (input.greenFuel.carbonIntensityGco2ePerMj > input.planningTargetGco2ePerMj) {
        ratio = null;
        feasible = false;
        noFeasibleReason = 'Selected fuel CI is above the planning target';
    } else {
        ratio = (input.conventionalCarbonIntensityGco2ePerMj - input.planningTargetGco2ePerMj)
            / (input.conventionalCarbonIntensityGco2ePerMj - input.greenFuel.carbonIntensityGco2ePerMj);
        ratio = Math.min(1, Math.max(0, ratio));
    }

    const greenEnergyGJ = feasible && ratio != null ? totalEnergyGJ * ratio : 0;
    const greenFuelMt = greenEnergyGJ / input.greenFuel.energyDensityMjPerKg;
    const displacedConventionalMt = greenEnergyGJ / input.conventionalEnergyDensityMjPerKg;
    const remainingConventionalMt = Math.max(0, conventionalFuelMt - displacedConventionalMt);
    const blendedCarbonIntensityGco2ePerMj = feasible && ratio != null
        ? (input.conventionalCarbonIntensityGco2ePerMj * (1 - ratio)) + (input.greenFuel.carbonIntensityGco2ePerMj * ratio)
        : input.conventionalCarbonIntensityGco2ePerMj;
    const blendedFuelCostEur = (remainingConventionalMt * input.conventionalPriceUsdPerMt * input.usdToEur)
        + (greenFuelMt * input.greenPriceUsdPerMt * input.usdToEur);
    const blendedIndicativeEtsExposureEur = estimateEtsExposure(
        remainingConventionalMt,
        input.conventionalEmissionFactorTco2PerMt,
        input.euaPriceEurPerTco2,
        input.etsCoverage,
    );
    const blendedFuelEuStyleShortfallEur = estimateShortfall(
        blendedCarbonIntensityGco2ePerMj,
        input.planningTargetGco2ePerMj,
        totalEnergyGJ,
        input.shortfallFactorEurPerGco2eGJ,
    );

    return {
        status: 'READY',
        errors: [],
        totalEnergyGJ: round(totalEnergyGJ),
        conventionalFuelMt: round(conventionalFuelMt, 1),
        conventionalFuelCostEur: round(conventionalFuelCostEur),
        indicativeEtsExposureEur: round(indicativeEtsExposureEur),
        fuelEuStyleShortfallEur: round(fuelEuStyleShortfallEur),
        totalConventionalEstimateEur: round(conventionalFuelCostEur + indicativeEtsExposureEur + fuelEuStyleShortfallEur),
        blend: {
            feasible,
            ratio: ratio == null ? null : round(ratio, 4),
            greenFuelMt: round(greenFuelMt, 1),
            displacedConventionalMt: round(displacedConventionalMt, 1),
            blendedCarbonIntensityGco2ePerMj: round(blendedCarbonIntensityGco2ePerMj, 2),
            blendedFuelCostEur: round(blendedFuelCostEur),
            blendedIndicativeEtsExposureEur: round(blendedIndicativeEtsExposureEur),
            blendedFuelEuStyleShortfallEur: round(blendedFuelEuStyleShortfallEur),
            noFeasibleReason,
        },
    };
}
