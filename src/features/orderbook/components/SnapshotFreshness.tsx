import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SnapshotFreshnessProps {
    generatedAt: string | null;
    refreshing: boolean;
    error: string | null;
}

// Snapshot freshness is a display warning, independent of the read cache TTL.
const STALE_AFTER_SECONDS = 20;

export const SnapshotFreshness = ({ generatedAt, refreshing, error }: SnapshotFreshnessProps) => {
    const { t } = useTranslation('trading');
    const [, setClock] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setClock(Date.now()), 1_000);
        return () => window.clearInterval(interval);
    }, []);

    const generatedAtMs = generatedAt ? Date.parse(generatedAt) : Number.NaN;
    const snapshotAgeSeconds = Number.isFinite(generatedAtMs)
        ? Math.max(0, Math.floor((Date.now() - generatedAtMs) / 1_000))
        : null;
    const snapshotIsStale = snapshotAgeSeconds !== null && snapshotAgeSeconds > STALE_AFTER_SECONDS;
    const age = snapshotAgeSeconds ?? 0;
    const freshnessText = refreshing
        ? t('orderBook.refreshing', { age })
        : error
            ? t('orderBook.refreshFailed', { age })
            : snapshotIsStale
                ? t('orderBook.stale', { age })
                : t('orderBook.updated', { age });
    const freshnessTone = error
        ? 'text-red-600 dark:text-red-400'
        : snapshotIsStale
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-400';

    return (
        <span
            role={error ? 'alert' : 'status'}
            data-testid="orderbook-freshness"
            className={`text-[11px] font-medium ${freshnessTone}`}
        >
            {freshnessText}
        </span>
    );
};
