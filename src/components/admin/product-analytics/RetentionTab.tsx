import React from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab, RetentionResponse } from '../../../types/productAnalytics';
import { CoverageNote, SectionHeading, cellText } from './AnalyticsStates';
import { CohortGrid } from './CohortGrid';
import { MetricStrip } from './MetricStrip';

export const RetentionTab: React.FC<{
  data: RetentionResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data, compare }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  return (
    <div className="space-y-6">
      <MetricStrip
        compare={compare}
        items={[
          { label: t('pa.kpi.returningMembers'), metric: data.kpis.returning_members },
          { label: t('pa.kpi.retainedOrganizations'), metric: data.kpis.retained_organizations },
          { label: t('pa.kpi.reactivatedOrganizations'), metric: data.kpis.reactivated_organizations },
          { label: t('pa.kpi.dormantMembers'), metric: data.kpis.dormant_approved_members },
        ]}
      />
      <CoverageNote meta={data.meta} source="login_history" />
      <div>
        <SectionHeading title={t('pa.section.memberCohorts')} hint={t('pa.retention.memberHint')} />
        <CohortGrid rows={data.member_cohorts} emptyLabel={t('pa.retention.noCohorts')} />
      </div>
      <div>
        <SectionHeading title={t('pa.section.orgCohorts')} hint={t('pa.retention.orgHint')} />
        <CohortGrid rows={data.organization_cohorts} emptyLabel={t('pa.state.sparse')} />
      </div>
      <div>
        <SectionHeading title={t('pa.section.repeatParticipation')} />
        <table className="text-sm tabular-nums" data-testid="repeat-participation">
          <tbody>
            {data.repeat_participation.map(cell => (
              <tr key={cell.key}>
                <td className="pr-8 py-1 text-verdaxis-text-muted">
                  {t(`pa.retention.days_${cell.key}`)}
                </td>
                <td className="text-right">{cellText(cell, suppressed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
