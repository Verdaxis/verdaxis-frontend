import { describe, expect, it } from 'vitest';

import { buildPrimarySidebarItems } from '../components/layout/sidebarConfig';

const t = (key: string) => key;

describe('sidebar config', () => {
  it('keeps buyer and supplier nav labels in the same order', () => {
    const buyer = buildPrimarySidebarItems(t as any, 'BUYER');
    const supplier = buildPrimarySidebarItems(t as any, 'SUPPLIER');

    expect(buyer.map((item) => item.key)).toEqual(supplier.map((item) => item.key));
    expect(buyer.map((item) => item.label)).toEqual(supplier.map((item) => item.label));
  });

  it('routes analytics to the correct page for each role', () => {
    const buyerAnalytics = buildPrimarySidebarItems(t as any, 'BUYER').find((item) => item.key === 'ANALYTICS');
    const supplierAnalytics = buildPrimarySidebarItems(t as any, 'SUPPLIER').find((item) => item.key === 'ANALYTICS');

    expect(buyerAnalytics?.page).toBe('DATA_ANALYTICS');
    expect(supplierAnalytics?.page).toBe('ANALYTICS');
  });
});
