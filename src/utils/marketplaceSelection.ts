import type { MarketProduct } from '../types';

export const MARKETPLACE_SELECTION_STORAGE_KEYS = {
    port: 'verdaxis_marketplace_port',
    deliveryPointId: 'verdaxis_marketplace_delivery_point_id',
    product: 'verdaxis_marketplace_product',
    legacyFuel: 'verdaxis_marketplace_fuel',
    availabilityWindow: 'verdaxis_marketplace_window',
} as const;

interface MarketplaceSliceSelection {
    portName: string;
    deliveryPointId: string | null;
    marketProduct: MarketProduct;
    availabilityWindow: string;
}

export function writeMarketplaceSlice(selection: MarketplaceSliceSelection): void {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(MARKETPLACE_SELECTION_STORAGE_KEYS.port, selection.portName);
    window.localStorage.setItem(MARKETPLACE_SELECTION_STORAGE_KEYS.product, selection.marketProduct);
    window.localStorage.removeItem(MARKETPLACE_SELECTION_STORAGE_KEYS.legacyFuel);
    window.localStorage.setItem(
        MARKETPLACE_SELECTION_STORAGE_KEYS.availabilityWindow,
        selection.availabilityWindow,
    );

    if (selection.deliveryPointId) {
        window.localStorage.setItem(
            MARKETPLACE_SELECTION_STORAGE_KEYS.deliveryPointId,
            selection.deliveryPointId,
        );
    } else {
        window.localStorage.removeItem(MARKETPLACE_SELECTION_STORAGE_KEYS.deliveryPointId);
    }
}
