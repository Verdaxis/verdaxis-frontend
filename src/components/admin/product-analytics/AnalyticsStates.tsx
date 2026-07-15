import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AggregateCell, MetricValue, AnalyticsMeta } from '../../../types/productAnalytics';

// Shared telemetry-console atoms (plan §1.2): quiet, one-level panels,
// explicit empty/suppressed/unavailable states, stable heights.

export const TabLoading: React.FC = () => {
  const { t } = useTranslation('admin');
  return (
    <div className="flex items-center justify-center min-h-[320px]" role="status">
      <Loader2 className="w-6 h-6 animate-spin text-verdaxis" />
      <span className="ml-3 text-sm text-verdaxis-text-muted">{t('pa.state.loading')}</span>
    </div>
  );
};

export const TabError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-3" role="alert">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-verdaxis-text">{message}</p>
      <button onClick={onRetry} className="v-btn-primary text-sm px-4 py-2">
        {t('pa.state.retry')}
      </button>
    </div>
  );
};

export const EmptyNote: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-sm text-verdaxis-text-muted py-6 text-center">{label}</p>
);

export const SectionHeading: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex items-baseline gap-2 mb-3">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-verdaxis-text-muted">{title}</h3>
    {hint && <span className="text-xs text-verdaxis-text-muted/70">{hint}</span>}
  </div>
);

// A privacy-suppressed or unavailable value renders as an explicit marker,
// never a fabricated zero (§1.4 rules 8 and 12).
export const cellText = (cell: AggregateCell | null | undefined, suppressedLabel: string): string => {
  if (!cell) return '—';
  if (cell.suppressed) return suppressedLabel;
  if (cell.count === null) return '—';
  return String(cell.count);
};

export const metricText = (metric: MetricValue | null | undefined, suppressedLabel: string): string => {
  if (!metric) return '—';
  if (metric.suppressed) return suppressedLabel;
  if (metric.value === null) return '—';
  return metric.value.toLocaleString();
};

export const DeltaBadge: React.FC<{ metric: MetricValue }> = ({ metric }) => {
  const { t } = useTranslation('admin');
  if (metric.suppressed || metric.value === null || metric.previous === null) {
    return <span className="text-xs text-verdaxis-text-muted/70">{t('pa.state.noComparison')}</span>;
  }
  const delta = metric.value - metric.previous;
  const tone = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-amber-500' : 'text-verdaxis-text-muted';
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`text-xs font-medium tabular-nums ${tone}`}>
      {sign}{delta.toLocaleString()} {t('pa.state.vsPrevious')}
    </span>
  );
};

export const KpiCell: React.FC<{ label: string; metric: MetricValue; compare: boolean }> = ({
  label, metric, compare,
}) => {
  const { t } = useTranslation('admin');
  return (
    <div className="border border-verdaxis-border rounded-lg px-4 py-3 bg-verdaxis-surface/40">
      <div className="text-xs text-verdaxis-text-muted mb-1">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-verdaxis-text" data-testid={`kpi-${label}`}>
        {metricText(metric, t('pa.state.suppressed'))}
      </div>
      {compare && <DeltaBadge metric={metric} />}
    </div>
  );
};

export const CoverageNote: React.FC<{ meta: AnalyticsMeta; source: keyof AnalyticsMeta['coverage'] }> = ({
  meta, source,
}) => {
  const { t } = useTranslation('admin');
  const coverage = meta.coverage[source];
  if (coverage.status === 'available' || coverage.status === 'not_applicable') return null;
  return (
    <p className="text-xs text-amber-500/90 mt-2" data-testid={`coverage-${source}`}>
      {t(`pa.coverage.${source}`, {
        start: coverage.coverage_start ? coverage.coverage_start.slice(0, 10) : '—',
      })}
    </p>
  );
};
