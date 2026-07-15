import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CohortRow } from '../../../types/productAnalytics';
import { EmptyNote, cellText } from './AnalyticsStates';

// Triangular weekly cohort grid (§1.6 Retention) with a count/percentage
// toggle. Suppressed cells stay suppressed in both modes; history never
// predates fact coverage.
export const CohortGrid: React.FC<{ rows: CohortRow[]; emptyLabel: string }> = ({
  rows, emptyLabel,
}) => {
  const { t } = useTranslation('admin');
  const [mode, setMode] = useState<'count' | 'pct'>('count');
  const suppressed = t('pa.state.suppressed');
  if (rows.length === 0) return <EmptyNote label={emptyLabel} />;
  const maxOffset = Math.max(0, ...rows.flatMap(row => row.cells.map(cell => cell.offset)));
  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setMode(previous => (previous === 'count' ? 'pct' : 'count'))}
          className="text-xs text-verdaxis-text-muted hover:text-verdaxis-text underline"
          aria-pressed={mode === 'pct'}
        >
          {mode === 'count' ? t('pa.cohort.showPct') : t('pa.cohort.showCount')}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm tabular-nums" data-testid="cohort-grid">
          <thead>
            <tr className="text-left text-xs text-verdaxis-text-muted">
              <th className="py-1 pr-3 font-medium">{t('pa.cohort.week')}</th>
              <th className="py-1 px-2 font-medium text-right">{t('pa.cohort.size')}</th>
              {Array.from({ length: maxOffset + 1 }, (_, offset) => (
                <th key={offset} className="py-1 px-2 font-medium text-right">+{offset}w</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const byOffset = new Map(row.cells.map(cell => [cell.offset, cell]));
              return (
                <tr key={row.cohort_start} className="border-t border-verdaxis-border/60">
                  <td className="py-1 pr-3 text-verdaxis-text-muted">{row.cohort_start}</td>
                  <td className="py-1 px-2 text-right">{cellText(row.size, suppressed)}</td>
                  {Array.from({ length: maxOffset + 1 }, (_, offset) => {
                    const cell = byOffset.get(offset);
                    if (!cell) return <td key={offset} className="py-1 px-2 text-right text-verdaxis-text-muted/50">·</td>;
                    const text = cell.cell.suppressed
                      ? suppressed
                      : mode === 'pct'
                        ? cell.pct !== null ? `${cell.pct}%` : '—'
                        : cellText(cell.cell, suppressed);
                    return (
                      <td key={offset} className="py-1 px-2 text-right">{text}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
