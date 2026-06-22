import { DeliveryPoint, Port } from '../types';

const normalizePortName = (value: string) => value.trim().toLowerCase();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCatalogDeliveryPointId = (livePort: Port, deliveryPoints: DeliveryPoint[] | null): string | undefined => {
    if (UUID_PATTERN.test(livePort.id)) return livePort.id;
    if (livePort.catalogDeliveryPointId && UUID_PATTERN.test(livePort.catalogDeliveryPointId)) {
        return livePort.catalogDeliveryPointId;
    }

    const catalogMatch = deliveryPoints
        ?.filter(deliveryPoint => deliveryPoint.is_active !== false)
        .find(deliveryPoint => normalizePortName(deliveryPoint.name) === normalizePortName(livePort.name));

    return catalogMatch && UUID_PATTERN.test(catalogMatch.id) ? catalogMatch.id : undefined;
};

export const resolveApprovedMapPorts = (
    approvedPorts: Port[],
    apiPorts: Port[],
    deliveryPoints: DeliveryPoint[] | null = null
): Port[] => {
    const portsById = new Map(apiPorts.map(port => [port.id, port]));
    const portsByName = new Map(apiPorts.map(port => [normalizePortName(port.name), port]));

    return approvedPorts.map(canonicalPort => {
        const livePort = portsById.get(canonicalPort.id) || portsByName.get(normalizePortName(canonicalPort.name));
        if (!livePort) return canonicalPort;

        return {
            ...canonicalPort,
            catalogDeliveryPointId: getCatalogDeliveryPointId(livePort, deliveryPoints),
            priceMethanol: livePort.priceMethanol > 0 ? livePort.priceMethanol : canonicalPort.priceMethanol,
            priceTrend: livePort.priceTrend || canonicalPort.priceTrend,
            methanolSupply: livePort.methanolSupply !== 'Unknown' ? livePort.methanolSupply : canonicalPort.methanolSupply,
            biofuelSupply: livePort.biofuelSupply !== 'Unknown' ? livePort.biofuelSupply : canonicalPort.biofuelSupply,
            details: {
                ...canonicalPort.details,
                ...livePort.details,
                priceHistory: livePort.details?.priceHistory?.length
                    ? livePort.details.priceHistory
                    : canonicalPort.details?.priceHistory,
                upcomingProjects: canonicalPort.details?.upcomingProjects,
            },
        };
    });
};

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
