import type { DeliveryPoint, MapCompactMarket, Port, Product } from '../types';
import { isOrderbookMarketProduct, isOrderbookProduct } from './marketProduct';

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
    reference: PortMarketReference | null;
}

export interface PortMarketReference {
    productLabel: string;
    price: number;
    source: 'DEMO' | 'MIXED' | 'MARKET';
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
    UCOME_B100: 'UCOME B100',
};

const canonicalProductLabels = new Map([
    ...Object.values(CANONICAL_PRODUCT_LABELS).map(label => [label.toLowerCase(), label] as const),
    ['synthetic ethanol', CANONICAL_PRODUCT_LABELS.SYNTHETIC_ETHANOL],
]);

const resolveCanonicalProductLabel = (row: MapCompactMarket): string | null => {
    if (row.market_product) {
        return isOrderbookMarketProduct(row.market_product)
            ? CANONICAL_PRODUCT_LABELS[row.market_product]
            : null;
    }

    const productName = row.product_name?.trim();
    if (!productName) return null;

    return canonicalProductLabels.get(productName.toLowerCase()) ?? null;
};

const normalizeLocation = (value?: string | null) => (value ?? '').trim().toLowerCase();
const isDemo = (row: MapCompactMarket) => (
    row.source_kind === 'DEMO_SEED'
    || row.demo_status === 'DEMO_ONLY'
    || row.evidence_class === 'DEMO'
);

const referenceSource = (rows: MapCompactMarket[]): PortMarketReference['source'] => {
    const hasDemo = rows.some(isDemo);
    const hasNonDemo = rows.some(row => !isDemo(row));
    const explicitlyMixed = rows.some(row => (
        row.source_kind === 'MIXED_SOURCE' || row.demo_status === 'MIXED'
    ));
    if (explicitlyMixed || (hasDemo && hasNonDemo)) return 'MIXED';
    return hasDemo ? 'DEMO' : 'MARKET';
};

/** Catalog coverage defines which ports can list a product; it is not liquidity. */
export const getMarketProductMapPorts = (
    marketProduct: string | undefined,
    products: Product[],
    deliveryPoints: DeliveryPoint[],
    ports: Port[],
): Port[] => {
    if (!marketProduct) return ports;
    const productsForMarket = products.filter(candidate => (
        isOrderbookProduct(candidate) && candidate.market_product === marketProduct
    ));
    // Legacy alcohol catalogs may omit coverage. B100 requires its approved lane.
    if (productsForMarket.length === 0) return marketProduct === 'UCOME_B100' ? [] : ports;
    if (marketProduct !== 'UCOME_B100' && productsForMarket.some(product => !product.available_delivery_point_ids)) return ports;
    const availablePointIds = new Set(productsForMarket.flatMap(product => product.available_delivery_point_ids ?? []));
    const availablePointNames = new Set(deliveryPoints
        .filter(point => point.is_active && availablePointIds.has(point.id))
        .map(point => normalizeLocation(point.name)));
    return ports.filter(port => availablePointNames.has(normalizeLocation(port.name)));
};

const maxPrice = (values: Array<string | null>): number | null => values.reduce<number | null>(
    (best, value) => value === null ? best : Math.max(best ?? Number(value), Number(value)),
    null,
);

const minPrice = (values: Array<string | null>): number | null => values.reduce<number | null>(
    (best, value) => value === null ? best : Math.min(best ?? Number(value), Number(value)),
    null,
);

export const computePortMarketData = (
    markets: MapCompactMarket[],
    port: string | PortMarketIdentity,
    selectedProduct?: string,
): PortMarketData => {
    const selectedLabel = selectedProduct
        ? CANONICAL_PRODUCT_LABELS[selectedProduct] ?? canonicalProductLabels.get(selectedProduct.toLowerCase())
        : undefined;
    const identity = typeof port === 'string' ? { name: port } : port;
    const approvedNames = new Set([normalizeLocation(identity.name)].filter(Boolean));
    const approvedIds = new Set([
        normalizeLocation(identity.id),
        normalizeLocation(identity.catalogDeliveryPointId),
    ].filter(Boolean));
    const portRows = markets.filter(
        row => approvedNames.has(normalizeLocation(row.delivery_point_name))
            || approvedIds.has(normalizeLocation(row.delivery_point_id)),
    );

    const byProduct: Record<string, MapCompactMarket[]> = {};
    portRows.forEach((row) => {
        const productLabel = resolveCanonicalProductLabel(row);
        if (!productLabel || (selectedLabel && productLabel !== selectedLabel)) return;
        if (!byProduct[productLabel]) byProduct[productLabel] = [];
        byProduct[productLabel].push(row);
    });

    let totalVolume = 0;
    const references: PortMarketReference[] = [];
    const fuelRows = Object.entries(byProduct).map(([label, rows]) => {
        const bestBid = maxPrice(rows.map(row => row.bid_max_price));
        const bestAsk = minPrice(rows.map(row => row.ask_min_price));
        const orderCount = rows.reduce(
            (sum, row) => sum + row.bid_order_count + row.ask_order_count,
            0,
        );
        totalVolume += rows.reduce(
            (sum, row) => sum + Number(row.bid_total_quantity) + Number(row.ask_total_quantity),
            0,
        );

        const spotRows = rows.filter(row => row.spot_best_bid !== null || row.spot_best_ask !== null);
        const spotBid = maxPrice(spotRows.map(row => row.spot_best_bid));
        const spotAsk = minPrice(spotRows.map(row => row.spot_best_ask));
        const spotPrice = spotBid !== null && spotAsk !== null
            ? (spotBid + spotAsk) / 2
            : spotBid ?? spotAsk;
        if (spotPrice !== null) {
            references.push({
                productLabel: label,
                price: spotPrice,
                source: referenceSource(spotRows),
            });
        }

        let spreadPct = 999;
        if (bestBid !== null && bestAsk !== null) {
            const mid = (bestBid + bestAsk) / 2;
            if (mid > 0) spreadPct = ((bestAsk - bestBid) / mid) * 100;
        }

        return { key: label, label, bestBid, bestAsk, orderCount, spreadPct };
    }).filter(row => row.orderCount > 0);

    const spreadPct = fuelRows.length > 0
        ? Math.min(...fuelRows.map(row => row.spreadPct))
        : 999;
    const referenceProduct = selectedLabel || CANONICAL_PRODUCT_LABELS.BIO_METHANOL;
    const reference = references.find(item => item.productLabel === referenceProduct)
        ?? references[0]
        ?? null;

    return { totalVolume, fuelRows, spreadPct, reference };
};
