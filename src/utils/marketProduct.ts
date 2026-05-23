import type { Product } from '../types';

export type ProductReference = string | Product | null | undefined;

const MARKET_PRODUCT_LABELS: Record<string, string> = {
  BIO_METHANOL: 'Bio Methanol',
  BIO_ETHANOL: 'Bio Ethanol',
  E_METHANOL: 'E-Methanol',
  SYNTHETIC_METHANOL: 'Synthetic Methanol',
  E_ETHANOL: 'E-Ethanol',
  SYNTHETIC_ETHANOL: 'Synthetic Ethanol',
  CONVENTIONAL_METHANOL: 'Conventional Methanol',
  GREEN_ETHANOL: 'Green Ethanol',
};

export function formatMarketProduct(value: string | null | undefined): string {
  if (!value) return '';

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (MARKET_PRODUCT_LABELS[normalized]) return MARKET_PRODUCT_LABELS[normalized];
  if (normalized === 'GREEN_METHANOL' || normalized === 'BIOMETHANOL') {
    return MARKET_PRODUCT_LABELS.BIO_METHANOL;
  }
  if (normalized === 'GREEN_ETHANOL') {
    return MARKET_PRODUCT_LABELS.BIO_ETHANOL;
  }

  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getProductDisplayName(product: ProductReference): string {
  if (!product) return '';
  if (typeof product === 'string') return product;

  const name = product.name || product.fuel_type || product.id;
  if (!product.fuel_grade) return name;

  return name.toLowerCase().includes(product.fuel_grade.toLowerCase())
    ? name
    : `${product.fuel_grade} ${name}`;
}

export function getProductDisplayNameFromReference(
  reference: ProductReference,
  products: Product[] = []
): string {
  if (!reference) return '';
  if (typeof reference !== 'string') return getProductDisplayName(reference);

  const product = products.find((candidate) => (
    candidate.id === reference
    || candidate.name === reference
    || candidate.fuel_type === reference
  ));

  return product ? getProductDisplayName(product) : formatMarketProduct(reference);
}

export function getOrderDisplayName(order: {
  product_name?: string;
  market_product?: string;
  fuel_type?: string;
}): string {
  return order.product_name
    || formatMarketProduct(order.market_product)
    || order.fuel_type
    || 'Unknown product';
}
