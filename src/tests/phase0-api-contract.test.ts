import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { MARKET_PRODUCTS } from '../types';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../utils/marketProducts';
import { isOrderbookProduct } from '../utils/marketProduct';
import { getBiofuelSpecification } from '../utils/biofuelSpecification';
import { invalidateReadCache } from '../services/readCache';

const products = [
  ['B30', 'c4cecebc-3d2d-5840-8021-57a9a11bc673', 200, 'ISO 8217:2024 RF 380'],
  ['B100', '74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5', 200, 'ISO 8217:2024 DFA'],
  ['UCOME_B100', 'e561e43f-d9b2-598e-981c-f1d28d515ddc', 1, undefined],
] as const;

afterEach(() => { vi.restoreAllMocks(); invalidateReadCache(); });

it.each(products)('keeps %s as a separate executable catalog identity', async (code, id, minimum, standard) => {
  expect(MARKET_PRODUCTS).toContain(code);
  expect(ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map(option => option.value)).toContain(code);
  expect(getBiofuelSpecification(code)).toBe(standard);
  const product = { id, name: code, market_product: code, min_lot_size: minimum,
    fuel_grade: code, fuel_type: code === 'UCOME_B100' ? 'FAME' : 'Biofuel', unit: 'MT', is_active: true,
    execution_mode: 'ORDERBOOK' as const };
  expect(isOrderbookProduct(product)).toBe(true);
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([product])));
  const catalog = await api.catalog.products();
  expect(catalog).toContainEqual(product);
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/catalog\/products/);
});

it('has exactly eight products without aliasing scalar B100 to typed UCOME', () => {
  expect(new Set(MARKET_PRODUCTS).size).toBe(8);
  expect(new Set(products.map(product => product[1])).size).toBe(3);
});
