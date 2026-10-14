import type { DeliveryPoint, Product } from '../types';

/**
 * The delivery points a catalog product may be traded at.
 *
 * A product that declares no lane (`available_delivery_point_ids` absent or
 * null) may trade everywhere. A product that declares a lane is restricted to
 * those delivery points, in the order the catalog declared them, and the lane
 * fails closed: a declared lane that resolves to no loaded delivery point
 * allows nothing, so a caller never widens a restriction by accident.
 */
export interface TradingLane {
    points: DeliveryPoint[];
}

export const resolveTradingLane = (
    products: readonly Product[],
    deliveryPoints: readonly DeliveryPoint[],
    marketProduct: string | null | undefined,
): TradingLane | null => {
    if (!marketProduct) return null;
    const product = products.find(candidate => candidate.market_product === marketProduct);
    const declaredIds = product?.available_delivery_point_ids;
    if (!Array.isArray(declaredIds)) return null;

    const byId = new Map(deliveryPoints.map(point => [point.id, point]));
    return {
        points: declaredIds.flatMap((id) => {
            const point = byId.get(id);
            return point ? [point] : [];
        }),
    };
};

export const isPointInLane = (lane: TradingLane, portName: string | null | undefined): boolean => {
    const normalized = (portName ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return lane.points.some(point => point.name.trim().toLowerCase() === normalized);
};
