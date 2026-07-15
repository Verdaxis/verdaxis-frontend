import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab, LifecycleStage } from '../../../types/productAnalytics';

// Clickable lifecycle spine (§1.6 Overview). Stages mix anonymous visitors,
// people, and organizations, so counts and deltas only — no cross-stage
// conversion percentages. Clicking a stage opens its detail tab.
export const LifecycleSpine: React.FC<{
  stages: LifecycleStage[];
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ stages, onSelectTab }) => {
  const { t } = useTranslation('admin');
  return (
    <ol className="flex flex-wrap items-stretch gap-1" data-testid="lifecycle-spine">
      {stages.map((stage, index) => {
        const delta =
          stage.count !== null && stage.previous !== null ? stage.count - stage.previous : null;
        return (
          <li key={stage.key} className="flex items-center gap-1">
            <button
              onClick={() => onSelectTab(stage.detail_tab as AnalyticsTab)}
              className="group min-w-[96px] text-left rounded px-2.5 py-1.5 border-b-2 border-transparent hover:border-verdaxis hover:bg-verdaxis-dim transition-colors"
              aria-label={t('pa.lifecycle.openDetail', { stage: t(`pa.lifecycle.${stage.key}`) })}
            >
              <div className="text-[11px] uppercase tracking-wider text-verdaxis-text-muted">
                {t(`pa.lifecycle.${stage.key}`)}
              </div>
              <div className="text-xl font-mono font-semibold tabular-nums group-hover:text-verdaxis transition-colors">
                {stage.count === null ? '—' : stage.count.toLocaleString()}
              </div>
              <div className="text-[11px] tabular-nums text-verdaxis-text-muted">
                {delta === null
                  ? t('pa.state.noComparison')
                  : `${delta > 0 ? '+' : ''}${delta.toLocaleString()}`}
                {stage.coverage !== 'available' && (
                  <span className="ml-1 text-amber-500" title={t('pa.lifecycle.limitedCoverage')}>◦</span>
                )}
              </div>
            </button>
            {index < stages.length - 1 && (
              <ChevronRight size={14} className="text-verdaxis-text-muted/60 shrink-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
};
