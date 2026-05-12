import { DeliveryPoint, Port } from '../types';

const normalizePortName = (value: string) => value.trim().toLowerCase();

export const filterPortsByActiveDeliveryPoints = (
    ports: Port[],
    deliveryPoints: DeliveryPoint[] | null
): Port[] => {
    if (!deliveryPoints) return ports;

    const activeNames = new Set(
        deliveryPoints
            .filter((deliveryPoint) => deliveryPoint.is_active)
            .map((deliveryPoint) => normalizePortName(deliveryPoint.name))
    );

    return ports.filter((port) => activeNames.has(normalizePortName(port.name)));
};
