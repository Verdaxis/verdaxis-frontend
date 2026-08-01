import type { MarketProduct } from '../types';

export type MarketplaceProductFilter = 'All' | MarketProduct;

export interface MarketplaceProductOption {
    value: MarketplaceProductFilter;
    label: string;
    fuelType?: string;
}

export const MARKETPLACE_PRODUCT_OPTIONS: MarketplaceProductOption[] = [
    { value: 'All', label: 'All' },
    { value: 'BIO_METHANOL', label: 'Bio Methanol', fuelType: 'Methanol' },
    { value: 'E_METHANOL', label: 'e-Methanol', fuelType: 'Methanol' },
    { value: 'BIO_ETHANOL', label: 'Bio Ethanol', fuelType: 'Ethanol' },
    { value: 'SYNTHETIC_ETHANOL', label: 'e-Ethanol', fuelType: 'Ethanol' },
];

export const ACTIVE_MARKETPLACE_PRODUCT_OPTIONS = MARKETPLACE_PRODUCT_OPTIONS.filter(
    (option): option is MarketplaceProductOption & { value: MarketProduct } => option.value !== 'All'
);

export const isMarketplaceProductFilter = (value: string | null): value is MarketplaceProductFilter =>
    MARKETPLACE_PRODUCT_OPTIONS.some((option) => option.value === value);

export const getMarketplaceProductOption = (value: string | null | undefined): MarketplaceProductOption | undefined =>
    MARKETPLACE_PRODUCT_OPTIONS.find((option) => option.value === value);

export const getMarketplaceProductValue = (value: string | null | undefined): MarketProduct | undefined => {
    if (!value || value === 'All') return undefined;
    const normalized = value.trim().toLowerCase();
    return ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.find(
        (option) =>
            option.value.toLowerCase() === normalized ||
            option.label.toLowerCase() === normalized
    )?.value;
};

export const getMarketplaceFuelType = (value: string | null | undefined): string | undefined => {
    if (!value || value === 'All') return undefined;
    const normalized = value.trim().toLowerCase();
    const matchedProduct = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.find(
        (option) =>
            option.value.toLowerCase() === normalized ||
            option.label.toLowerCase() === normalized
    );
    if (matchedProduct) return matchedProduct.fuelType;
    if (normalized.includes('methanol')) return 'Methanol';
    if (normalized.includes('ethanol')) return 'Ethanol';
    return undefined;
};

export const getMarketplaceProductLabel = (
    marketProduct: string | null | undefined,
    fallbackFuelType?: string
): string => {
    const option = getMarketplaceProductOption(marketProduct);
    if (option && option.value !== 'All') return option.label;
    return fallbackFuelType || 'Unknown';
};
