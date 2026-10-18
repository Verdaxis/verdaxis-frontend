import { api } from '../../../services/api';

export interface SnapshotSelection {
    product: string;
    deliveryPointId: string;
    window: string;
}

export const orderbookApi = {
    snapshot: (selection: SnapshotSelection, signal?: AbortSignal) => api.orderbook.snapshot({
        market_product: selection.product, delivery_point_id: selection.deliveryPointId,
        availability_window: selection.window,
    }, { cacheOwner: 'query', signal }),
};
