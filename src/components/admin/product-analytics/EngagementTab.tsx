import React from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab, EngagementResponse } from '../../../types/productAnalytics';
import { CoverageNote, SectionHeading, cellText } from './AnalyticsStates';
import { FeatureAdoptionTable } from './FeatureAdoptionTable';
import { MetricStrip } from './MetricStrip';
import { TrendChart } from './TrendChart';

export const EngagementTab: React.FC<{
  data: EngagementResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data, compare }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  const loginCoverage = data.meta.coverage.login_history;
  return (
    <div className="space-y-6">
      {loginCoverage.status === 'available' || loginCoverage.status === 'partial' ? (
        <MetricStrip
          compare={compare}
          items={[
            { label: t('pa.kpi.dau'), metric: data.kpis.dau },
            { label: t('pa.kpi.wau'), metric: data.kpis.wau },
            { label: t('pa.kpi.mau'), metric: data.kpis.mau },
          ]}
        />
      ) : (
        <p className="text-sm text-amber-500/90" data-testid="engagement-coverage-message">
          {t('pa.engagement.coverageMessage')}
        </p>
      )}
      {data.kpis.stickiness_pct !== null && (
        <p className="text-sm text-verdaxis-text-muted tabular-nums">
          {t('pa.engagement.stickiness', { pct: data.kpis.stickiness_pct })}
        </p>
      )}
      <div>
        <SectionHeading title={t('pa.section.activeMembersTrend')} />
        <TrendChart
          emptyLabel={t('pa.state.sparse')}
          series={[{ key: 'members', label: t('pa.series.activeMembers'), color: '#34d399', points: data.active_members_trend }]}
        />
        <CoverageNote meta={data.meta} source="login_history" />
      </div>
      <div>
        <SectionHeading title={t('pa.section.featureAdoption')} />
        <FeatureAdoptionTable rows={data.feature_adoption} />
      </div>
      <div>
        <SectionHeading title={t('pa.section.workflowRatios')} hint={t('pa.activation.ratioHint')} />
        <ul className="space-y-1 text-sm tabular-nums">
          {data.workflow_ratios.map(ratio => (
            <li key={ratio.key}>
              <span className="text-verdaxis-text-muted">{t(`pa.ratio.${ratio.key}`)}</span>{' '}
              {ratio.ratio.rate_pct !== null ? `${ratio.ratio.rate_pct}%` : '—'}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeading title={t('pa.section.navigation')} hint={t('pa.engagement.navigationHint')} />
          <table className="w-full text-sm tabular-nums">
            <tbody>
              {data.navigation_destinations.map(row => (
                <tr key={row.destination} className="border-t border-verdaxis-border/60">
                  <td className="py-1 text-verdaxis-text-muted">{row.destination}</td>
                  <td className="py-1 text-right">{cellText(row.total, suppressed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <SectionHeading title={t('pa.section.tutorialSteps')} />
          <table className="w-full text-sm tabular-nums" data-testid="tutorial-steps">
            <thead>
              <tr className="text-left text-xs text-verdaxis-text-muted">
                <th className="py-1 font-medium">{t('pa.tutorial.step')}</th>
                <th className="py-1 font-medium text-right">{t('pa.tutorial.completed')}</th>
                <th className="py-1 font-medium text-right">{t('pa.tutorial.skipped')}</th>
              </tr>
            </thead>
            <tbody>
              {data.tutorial_steps.map(row => (
                <tr key={row.step} className="border-t border-verdaxis-border/60">
                  <td className="py-1">{row.step}</td>
                  <td className="py-1 text-right">{cellText(row.completed, suppressed)}</td>
                  <td className="py-1 text-right">{cellText(row.skipped, suppressed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
