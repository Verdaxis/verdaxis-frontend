import { describe, expect, it } from 'vitest';

import { getProductDisplayNameFromReference } from '../utils/marketProduct';
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
});
