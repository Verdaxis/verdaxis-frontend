// Fixed specifications keep each biofuel product on one executable contract.
export const B30_SPECIFICATION_STANDARD = 'ISO 8217:2024 RF 380';
export const B100_SPECIFICATION_STANDARD = 'ISO 8217:2024 DFA';

export const isB30MarketProduct = (marketProduct: string | null | undefined): boolean => marketProduct === 'B30';
export const isB100MarketProduct = (marketProduct: string | null | undefined): boolean => marketProduct === 'B100';

export function getBiofuelSpecification(marketProduct: string | null | undefined): string | undefined {
    if (isB30MarketProduct(marketProduct)) return B30_SPECIFICATION_STANDARD;
    if (isB100MarketProduct(marketProduct)) return B100_SPECIFICATION_STANDARD;
    return undefined;
}
