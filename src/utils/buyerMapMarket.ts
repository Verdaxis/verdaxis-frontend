import type { AggregatedOrderbook } from '../types';

export interface PortMarketRow {
    key: string;
    label: string;
    bestBid: number | null;
    bestAsk: number | null;
    orderCount: number;
    spreadPct: number;
}

export interface PortMarketData {
    totalVolume: number;
    fuelRows: PortMarketRow[];
    spreadPct: number;
}

const GREEN_FUELS = new Set(['Methanol', 'Ethanol', 'Biofuel', 'Ammonia', 'Biomethane']);

export const isGreenFuel = (fuel: string): boolean => GREEN_FUELS.has(fuel) || GREEN_FUELS.has(
    Array.from(GREEN_FUELS).find(greenFuel => fuel.toLowerCase().includes(greenFuel.toLowerCase())) ?? ''
);

export const computePortMarketData = (
    aggregated: AggregatedOrderbook[],
    portName: string,
    portCountry: string,
    selectedProduct?: string
): PortMarketData => {
    const portRows = aggregated.filter(
        row => row.delivery_point_name === portName || row.region === portName || row.region === portCountry
    );

    const byProduct: Record<string, { bids: AggregatedOrderbook[]; asks: AggregatedOrderbook[] }> = {};
    portRows.forEach((row) => {
        const productLabel = row.product_name || row.fuel_type;
        if (!isGreenFuel(productLabel)) return;
        if (!byProduct[productLabel]) byProduct[productLabel] = { bids: [], asks: [] };
        if (row.side === 'BID') byProduct[productLabel].bids.push(row);
        else byProduct[productLabel].asks.push(row);
    });

    let totalVolume = 0;
    const fuelRows = Object.entries(byProduct).map(([label, { bids, asks }]) => {
        const bestBid = bids.length > 0 ? Math.max(...bids.map(bid => Number(bid.max_price))) : null;
        const bestAsk = asks.length > 0 ? Math.min(...asks.map(ask => Number(ask.min_price))) : null;
        const orderCount = bids.reduce((sum, bid) => sum + Number(bid.order_count), 0)
            + asks.reduce((sum, ask) => sum + Number(ask.order_count), 0);
        totalVolume += bids.reduce((sum, bid) => sum + Number(bid.total_quantity), 0)
            + asks.reduce((sum, ask) => sum + Number(ask.total_quantity), 0);

        let spreadPct = 999;
        if (bestBid !== null && bestAsk !== null) {
            const mid = (bestBid + bestAsk) / 2;
            if (mid > 0) spreadPct = ((bestAsk - bestBid) / mid) * 100;
        }

        return {
            key: label,
            label,
            bestBid,
            bestAsk,
            orderCount,
            spreadPct,
        };
    }).filter(row => row.orderCount > 0);

    let spreadPct = 999;
    if (fuelRows.length > 0) {
        if (selectedProduct) {
            const match = fuelRows.find(row => row.key === selectedProduct);
            spreadPct = match ? match.spreadPct : Math.min(...fuelRows.map(row => row.spreadPct));
        } else {
            spreadPct = Math.min(...fuelRows.map(row => row.spreadPct));
        }
    }

    return { totalVolume, fuelRows, spreadPct };
};
