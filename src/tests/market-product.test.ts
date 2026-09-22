import { describe, expect, it } from 'vitest';

import { getOrderDisplayName, getProductDisplayNameFromReference, isOrderbookProduct } from '../utils/marketProduct';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS, getMarketplaceProductLabel } from '../utils/marketProducts';
import type { Product } from '../types';

describe('market product display resolution', () => {
  const products: Product[] = [
    {
      id: 'prod-bio-met',
      name: 'Bio Methanol',
      market_product: 'BIO_METHANOL',
      fuel_type: 'Methanol',
      fuel_grade: 'Bio',
      unit: 'MT',
      min_lot_size: 500,
      is_active: true,
    },
    {
      id: 'prod-e-met',
      name: 'e-Methanol',
      market_product: 'E_METHANOL',
      fuel_type: 'Methanol',
      fuel_grade: 'E',
      unit: 'MT',
      min_lot_size: 500,
      is_active: true,
    },
  ];

  it('resolves a catalog product id to a human-readable name', () => {
    expect(getProductDisplayNameFromReference('prod-bio-met', products)).toBe('Bio Methanol');
  });

  it('resolves a market product code without catalog lookup', () => {
    expect(getProductDisplayNameFromReference('BIO_METHANOL', [])).toBe('Bio Methanol');
  });

  it('normalizes legacy product labels', () => {
    expect(getProductDisplayNameFromReference('green methanol', [])).toBe('Bio Methanol');
  });

  it('includes UCOME in shared executable product selectors', () => {
    expect(getOrderDisplayName({ market_product: 'UCOME_B100' })).toBe('UCOME B100');
    expect(getMarketplaceProductLabel('UCOME_B100')).toBe('UCOME B100');
    expect(ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.value)).toContain('UCOME_B100');
  });

  it('fails closed for RFQ-only products and preserves old alcohol catalog responses', () => {
    expect(isOrderbookProduct(products[0])).toBe(true);
    expect(isOrderbookProduct({ ...products[0], execution_mode: 'ORDERBOOK' })).toBe(true);
    expect(isOrderbookProduct({ ...products[0], execution_mode: 'RFQ_ONLY' })).toBe(false);
    expect(isOrderbookProduct({ ...products[0], is_active: false })).toBe(false);
    expect(isOrderbookProduct({ ...products[0], market_product: undefined })).toBe(false);
    expect(isOrderbookProduct({ ...products[0], market_product: 'UCOME_B100' })).toBe(false);
    expect(isOrderbookProduct({ ...products[0], market_product: 'UCOME_B100', execution_mode: 'ORDERBOOK' })).toBe(true);
    expect(isOrderbookProduct({ ...products[0], market_product: 'UCOME_B100', execution_mode: 'RFQ_ONLY' })).toBe(false);
  });

  it('accepts a render-time fallback for an unknown order product', () => {
    expect(getOrderDisplayName({}, '未知产品')).toBe('未知产品');
  });
});
