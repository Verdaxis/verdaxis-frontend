import type { MarketProduct, OrderBookOrder, Product } from '../types';

export const MARKET_PRODUCT_LABELS: Record<MarketProduct, string> = {
    BIO_METHANOL: 'Bio Methanol',
    E_METHANOL: 'e-Methanol',
    BIO_ETHANOL: 'Bio Ethanol',
    SYNTHETIC_ETHANOL: 'Synthetic Ethanol',
};

const LEGACY_PRODUCT_LABELS: Record<string, string> = {
    'methanol green': 'Bio Methanol',
    'green methanol': 'Bio Methanol',
    'ethanol green': 'Bio Ethanol',
    'green ethanol': 'Bio Ethanol',
    'e-methanol': 'e-Methanol',
};

export function formatMarketProduct(value: MarketProduct | string | null | undefined): string {
    if (!value) return '';
    return MARKET_PRODUCT_LABELS[value as MarketProduct] ?? String(value);
}

export function normalizeProductDisplayName(value: string | null | undefined): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    return LEGACY_PRODUCT_LABELS[normalized] ?? value;
}

export function getProductDisplayName(product: Partial<Product> | null | undefined): string {
    if (!product) return '';
    if (product.market_product) return formatMarketProduct(product.market_product);
    if (product.name) return normalizeProductDisplayName(product.name);
    return '';
}

export function getOrderDisplayName(order: Partial<OrderBookOrder> | null | undefined): string {
    if (!order) return '';
    if (order.market_product) return formatMarketProduct(order.market_product);
    if (order.product_name) return normalizeProductDisplayName(order.product_name);

    const fuelType = order.fuel_type ?? '';
    const fuelGrade = order.fuel_grade ?? '';
    return [fuelGrade !== 'Conventional' ? fuelGrade : '', fuelType].filter(Boolean).join(' ').trim();
}
