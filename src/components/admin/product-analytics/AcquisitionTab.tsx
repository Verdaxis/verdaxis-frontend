import React from 'react';
import { useTranslation } from 'react-i18next';

import { AcquisitionResponse, AnalyticsTab, RankedRow } from '../../../types/productAnalytics';
import { CoverageNote, EmptyNote, SectionHeading, metricText } from './AnalyticsStates';
import { MetricStrip } from './MetricStrip';
import { TrendChart } from './TrendChart';

const RankedTable: React.FC<{ rows: RankedRow[]; unitLabel: string; empty: string }> = ({
  rows, unitLabel, empty,
}) => {
  const { t } = useTranslation('admin');
  if (rows.length === 0) return <EmptyNote label={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-verdaxis-text-muted">
            <th className="py-1 font-medium">{t('pa.table.name')}</th>
            <th className="py-1 font-medium text-right">{unitLabel}</th>
            <th className="py-1 font-medium text-right">{t('pa.table.share')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className="border-t border-verdaxis-border/60">
              <td className="py-1 pr-4">{row.key === 'direct' ? t('pa.acquisition.direct') : row.label}</td>
              <td className="py-1 text-right">{row.suppressed ? t('pa.state.suppressed') : row.count ?? '—'}</td>
              <td className="py-1 text-right">{row.share_pct ? `${row.share_pct}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AcquisitionTab: React.FC<{
  data: AcquisitionResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data, compare }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  const duration = data.kpis.average_session_duration_seconds;
  return (
    <div className="space-y-6">
      <MetricStrip
        compare={compare}
        items={[
          { label: t('pa.kpi.visitors'), metric: data.kpis.visitors },
          { label: t('pa.kpi.visits'), metric: data.kpis.visits },
          { label: t('pa.kpi.pageviews'), metric: data.kpis.pageviews },
          { label: t('pa.kpi.ctaClicks'), metric: data.kpis.cta_clicks },
        ]}
      />
      <p className="text-sm text-verdaxis-text-muted">
        {t('pa.acquisition.sessionDuration', { seconds: duration.value ?? '—' })}
      </p>
      <div>
        <SectionHeading title={t('pa.section.visitorsTrend')} />
        <TrendChart
          emptyLabel={t('pa.state.sparse')}
          series={[{ key: 'visitors', label: t('pa.series.visitors'), color: '#60a5fa', points: data.visitors_trend }]}
        />
        <CoverageNote meta={data.meta} source="behavioral" />
      </div>
      <div>
        {/* The count unit is the verified Umami metric unit — visits-based,
            never claimed to be unique visitors (§1.6). */}
        <SectionHeading title={t('pa.section.referrers')} hint={t('pa.acquisition.unitHint')} />
        <RankedTable rows={data.referrers} unitLabel={t('pa.acquisition.unit')} empty={t('pa.state.sparse')} />
      </div>
      <div>
        <SectionHeading title={t('pa.section.entryPages')} />
        <RankedTable rows={data.entry_pages} unitLabel={t('pa.acquisition.unit')} empty={t('pa.state.sparse')} />
      </div>
      <div>
        {/* Clicks by dimension — never labelled conversion without
            impression data (§1.6). */}
        <SectionHeading title={t('pa.section.ctaMatrix')} hint={t('pa.acquisition.ctaHint')} />
        {data.cta_matrix.length === 0 ? (
          <EmptyNote label={t('pa.state.sparse')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-verdaxis-text-muted">
                  <th className="py-1 font-medium">{t('pa.cta.cta')}</th>
                  <th className="py-1 font-medium">{t('pa.cta.placement')}</th>
                  <th className="py-1 font-medium text-right">{t('pa.cta.clicks')}</th>
                </tr>
              </thead>
              <tbody>
                {data.cta_matrix.map(row => (
                  <tr key={`${row.cta}|${row.placement}`} className="border-t border-verdaxis-border/60">
                    <td className="py-1">{row.cta}</td>
                    <td className="py-1">{row.placement}</td>
                    <td className="py-1 text-right">{row.suppressed ? suppressed : row.clicks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeading title={t('pa.section.languages')} />
          <RankedTable rows={data.languages} unitLabel={t('pa.cta.clicks')} empty={t('pa.state.sparse')} />
        </div>
        <div>
          <SectionHeading title={t('pa.section.calculator')} />
          <p className="text-sm tabular-nums">
            {t('pa.acquisition.calculatorStarts')}: {metricText(data.calculator.starts, suppressed)}
            {' · '}
            {t('pa.acquisition.calculatorCompletions')}: {metricText(data.calculator.completions, suppressed)}
          </p>
        </div>
      </div>
    </div>
  );
};
