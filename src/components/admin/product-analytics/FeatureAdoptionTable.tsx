import React from 'react';
import { useTranslation } from 'react-i18next';

import { FeatureAdoptionRow } from '../../../types/productAnalytics';
import { EmptyNote } from './AnalyticsStates';

export const FeatureAdoptionTable: React.FC<{ rows: FeatureAdoptionRow[] }> = ({ rows }) => {
  const { t } = useTranslation('admin');
  const populated = rows.filter(row => row.events !== null);
  if (populated.length === 0) return <EmptyNote label={t('pa.state.sparse')} />;
  const max = Math.max(1, ...populated.map(row => row.events ?? 0));
  return (
    <ol className="space-y-1" data-testid="feature-adoption">
      {populated.map(row => (
        <li key={row.family} className="grid grid-cols-[190px_1fr_70px] items-center gap-3 text-sm">
          <span className="text-verdaxis-text-muted truncate">{t(`pa.feature.${row.family}`)}</span>
          <span className="h-2.5 bg-verdaxis-dim rounded overflow-hidden" aria-hidden>
            <span className="block h-full bg-blue-400/70" style={{ width: `${((row.events ?? 0) / max) * 100}%` }} />
          </span>
          <span className="tabular-nums text-right">
            {row.suppressed ? t('pa.state.suppressed') : row.events}
          </span>
        </li>
      ))}
    </ol>
  );
};
