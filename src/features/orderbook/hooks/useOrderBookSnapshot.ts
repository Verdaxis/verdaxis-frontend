import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderbookApi, type SnapshotSelection } from '../api/orderbookApi';
import { orderbookQueries } from '../api/orderbookQueries';
import { createSnapshotRequests } from '../../../lib/query/snapshotRequests';
import { useVisibleDocument } from '../../../lib/query/useVisibleDocument';

type Snapshot = Awaited<ReturnType<typeof orderbookApi.snapshot>>;
type Requests = ReturnType<typeof createSnapshotRequests<Snapshot>>;
const POLL_INTERVAL_MS = 10_000;

export function useOrderBookSnapshot(selection: SnapshotSelection, enabled: boolean, scope: string) {
    const client = useQueryClient();
    const visible = useVisibleDocument();
    const options = useMemo(() => orderbookQueries.snapshot(selection),
        [selection.product, selection.deliveryPointId, selection.window]);
    const requests = useRef<Requests | null>(null);
    const [presentation, setPresentation] = useState({ scope, accepted: false,
        loading: enabled, refreshing: false, error: false });

    useLayoutEffect(() => {
        let accepted = false;
        setPresentation({ scope, accepted, loading: enabled, refreshing: false, error: false });
        const lifecycle = createSnapshotRequests<Snapshot>({
            read: signal => orderbookApi.snapshot(selection, signal),
            apply: value => {
                accepted = true;
                client.setQueryData(options.queryKey, value);
            },
            change: status => setPresentation({ scope, accepted, ...status }),
        });
        requests.current = lifecycle;
        return () => {
            lifecycle.dispose();
            if (requests.current === lifecycle) requests.current = null;
            void client.cancelQueries({ queryKey: options.queryKey, exact: true });
        };
    }, [client, scope, enabled, options]);

    useQuery({
        ...options,
        queryFn: () => requests.current!.ordinary(),
        enabled: enabled && visible,
        // A workspace re-entry starts a new presentation/check even if this
        // public value remains fresh. Other ordinary reads retain the 9s TTL.
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // The lifecycle applies data and presentation together. Do not schedule
        // a second workspace render for Query's fetch-status notifications.
        notifyOnChangeProps: [],
    });
    const refresh = useCallback(async (force = false) => {
        if (!enabled || document.hidden) return;
        try {
            if (force) await requests.current?.force();
            else await client.fetchQuery({ ...options, queryFn: () => requests.current!.ordinary() });
        } catch { /* The lifecycle reports failure without discarding last-good depth. */ }
    }, [client, enabled, options]);

    useEffect(() => {
        const interval = window.setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
        const resume = () => { void refresh(true); };
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('online', resume);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', resume);
            window.removeEventListener('online', resume);
        };
    }, [refresh]);

    const current = presentation.scope === scope ? presentation : {
        accepted: false, loading: enabled, refreshing: false, error: false,
    };
    return {
        snapshot: current.accepted && enabled ? client.getQueryData<Snapshot>(options.queryKey) : undefined,
        loading: current.loading,
        refreshing: current.refreshing,
        error: current.error,
        refresh,
    };
}
