import { describe, expect, it } from 'vitest';

import { getProductDisplayNameFromReference } from '../utils/marketProduct';

describe('market product display resolution', () => {
  const products = [
    {
      id: 'prod-bio-met',
      name: 'Bio Methanol',
      market_product: 'BIO_METHANOL',
    },
    {
      id: 'prod-e-met',
      name: 'e-Methanol',
      market_product: 'E_METHANOL',
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
