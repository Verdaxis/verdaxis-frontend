import type { MarketProduct, OrderBookOrder, Product } from '../types';

export const MARKET_PRODUCT_LABELS: Record<MarketProduct, string> = {
    BIO_METHANOL: 'Bio Methanol',
    E_METHANOL: 'e-Methanol',
    BIO_ETHANOL: 'Bio Ethanol',
    SYNTHETIC_ETHANOL: 'Synthetic Ethanol',
};

export function formatMarketProduct(value: MarketProduct | string | null | undefined): string {
    if (!value) return '';
    return MARKET_PRODUCT_LABELS[value as MarketProduct] ?? String(value);
}

export function getProductDisplayName(product: Partial<Product> | null | undefined): string {
    if (!product) return '';
    if (product.name) return product.name;
    return formatMarketProduct(product.market_product);
}

export function getOrderDisplayName(order: Partial<OrderBookOrder> | null | undefined): string {
    if (!order) return '';
    if (order.product_name) return order.product_name;
    if (order.market_product) return formatMarketProduct(order.market_product);

    const fuelType = order.fuel_type ?? '';
    const fuelGrade = order.fuel_grade ?? '';
    return [fuelGrade !== 'Conventional' ? fuelGrade : '', fuelType].filter(Boolean).join(' ').trim();
}
