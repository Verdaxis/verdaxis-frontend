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

interface PortMarketIdentity {
    id?: string | null;
    catalogDeliveryPointId?: string | null;
    name: string;
}

const CANONICAL_PRODUCT_LABELS: Record<string, string> = {
    BIO_METHANOL: 'Bio Methanol',
    E_METHANOL: 'e-Methanol',
    BIO_ETHANOL: 'Bio Ethanol',
    SYNTHETIC_ETHANOL: 'e-Ethanol',
};

const canonicalProductLabels = new Map([
    ...Object.values(CANONICAL_PRODUCT_LABELS).map(label => [label.toLowerCase(), label] as const),
    ['synthetic ethanol', CANONICAL_PRODUCT_LABELS.SYNTHETIC_ETHANOL],
]);

const resolveCanonicalProductLabel = (row: AggregatedOrderbook): string | null => {
    if (typeof row.market_product === 'string' && CANONICAL_PRODUCT_LABELS[row.market_product]) {
        return CANONICAL_PRODUCT_LABELS[row.market_product];
    }

    const productName = row.product_name?.trim();
    if (!productName) return null;

    return canonicalProductLabels.get(productName.toLowerCase()) ?? null;
};

const normalizeLocation = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const computePortMarketData = (
    aggregated: AggregatedOrderbook[],
    port: string | PortMarketIdentity,
    selectedProduct?: string
): PortMarketData => {
    const identity = typeof port === 'string' ? { name: port } : port;
    const approvedNames = new Set([normalizeLocation(identity.name)].filter(Boolean));
    const approvedIds = new Set([
        normalizeLocation(identity.id),
        normalizeLocation(identity.catalogDeliveryPointId),
    ].filter(Boolean));
    const portRows = aggregated.filter(
        row => approvedNames.has(normalizeLocation(row.delivery_point_name))
            || approvedNames.has(normalizeLocation(row.region))
            || approvedIds.has(normalizeLocation(row.delivery_point_id))
    );

    const byProduct: Record<string, { bids: AggregatedOrderbook[]; asks: AggregatedOrderbook[] }> = {};
    portRows.forEach((row) => {
        const productLabel = resolveCanonicalProductLabel(row);
        if (!productLabel) return;
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
