import { queryOptions } from '@tanstack/react-query';
import { orderbookApi, type SnapshotSelection } from './orderbookApi';
import { orderbookKeys } from './orderbookKeys';

export const orderbookQueries = {
    snapshot: (selection: SnapshotSelection) => queryOptions({
        queryKey: orderbookKeys.snapshot(selection.product, selection.deliveryPointId, selection.window),
        queryFn: ({ signal }) => orderbookApi.snapshot(selection, signal),
        staleTime: 9_000, retry: false,
        enabled: Boolean(selection.product && selection.deliveryPointId && selection.window),
    }),
};
