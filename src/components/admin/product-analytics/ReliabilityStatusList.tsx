import React from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsMeta, CollectorState } from '../../../types/productAnalytics';

const tone = (status: string): string =>
  status === 'available' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-red-400';

// Source freshness and collector state — status is text plus a dot, never
// color alone (§1.7).
export const ReliabilityStatusList: React.FC<{ collector: CollectorState; meta: AnalyticsMeta }> = ({
  collector, meta,
}) => {
  const { t } = useTranslation('admin');
  const rows = [
    { key: 'collector', status: collector.status, observed: collector.last_observation_at, diagnostic: collector.diagnostic },
    { key: 'authoritative', status: meta.coverage.authoritative.status, observed: meta.coverage.authoritative.observed_at, diagnostic: meta.coverage.authoritative.diagnostic },
  ];
  return (
    <ul className="space-y-1.5" data-testid="reliability-status">
      {rows.map(row => (
        <li key={row.key} className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full shrink-0 ${tone(row.status)}`} aria-hidden />
          <span className="text-verdaxis-text-muted">{t(`pa.reliability.source_${row.key}`)}</span>
          <span>{t(`pa.reliability.status_${row.status}`)}</span>
          {row.diagnostic && (
            <span className="text-xs text-verdaxis-text-muted">({row.diagnostic})</span>
          )}
          {row.observed && (
            <span className="text-xs text-verdaxis-text-muted ml-auto tabular-nums">
              {row.observed.replace('T', ' ').slice(0, 16)}Z
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
