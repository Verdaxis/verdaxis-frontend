import React from 'react';
import { useTranslation } from 'react-i18next';

import { JourneyStage } from '../../../types/productAnalytics';
import { cellText } from './AnalyticsStates';

// Aggregate journey bars (§1.6 Activation): behavioral stages are aggregate
// event signals; authoritative stages come from the database. This is never
// a user-level funnel.
export const AggregateJourney: React.FC<{ stages: JourneyStage[] }> = ({ stages }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  const max = Math.max(1, ...stages.map(stage => stage.total.count ?? 0));
  return (
    <ol className="space-y-1.5" data-testid="aggregate-journey">
      {stages.map(stage => (
        <li key={stage.key} className="grid grid-cols-[150px_1fr_120px] items-center gap-3 text-sm">
          <span className="text-verdaxis-text-muted truncate">
            {t(`pa.journey.${stage.key}`)}
            <span className="ml-1 text-[10px] uppercase text-verdaxis-text-muted/60">
              {t(`pa.journey.source_${stage.source}`)}
            </span>
          </span>
          <span className="h-3 bg-verdaxis-dim rounded overflow-hidden" aria-hidden>
            <span
              className="block h-full bg-emerald-500/70"
              style={{ width: `${((stage.total.count ?? 0) / max) * 100}%` }}
            />
          </span>
          <span className="tabular-nums text-right">
            {cellText(stage.total, suppressed)}
            {stage.buyer && stage.supplier && (
              <span className="ml-2 text-xs text-verdaxis-text-muted">
                {t('pa.journey.buyer')} {cellText(stage.buyer, suppressed)} / {t('pa.journey.supplier')} {cellText(stage.supplier, suppressed)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
};
