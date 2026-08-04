import React from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab, ReliabilityResponse } from '../../../types/productAnalytics';
import { EmptyNote, SectionHeading, cellText, metricText } from './AnalyticsStates';
import { ReliabilityStatusList } from './ReliabilityStatusList';
import { TrendChart } from './TrendChart';

const CellList: React.FC<{ cells: { key: string; count: number | null; suppressed: boolean }[] }> = ({ cells }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  if (cells.length === 0) return <EmptyNote label={t('pa.state.sparse')} />;
  return (
    <table className="text-sm tabular-nums w-full">
      <tbody>
        {cells.map(cell => (
          <tr key={cell.key}>
            <td className="py-0.5 text-verdaxis-text-muted">{cell.key}</td>
            <td className="py-0.5 text-right">{cellText(cell, suppressed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const ReliabilityTab: React.FC<{
  data: ReliabilityResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading title={t('pa.section.collector')} />
        <ReliabilityStatusList collector={data.collector} meta={data.meta} />
      </div>
      <div>
        <SectionHeading
          title={t('pa.section.loginFailures')}
          hint={t('pa.reliability.total', { total: metricText(data.login_failures.total, suppressed) })}
        />
        <div className="grid md:grid-cols-2 gap-6">
          <CellList cells={data.login_failures.categories} />
          <TrendChart
            height={140}
            emptyLabel={t('pa.state.sparse')}
            series={[{ key: 'failures', label: t('pa.section.loginFailures'), color: 'var(--chart-bad)', points: data.login_failures.trend }]}
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeading
            title={t('pa.section.frontendErrors')}
            hint={t('pa.reliability.total', { total: metricText(data.frontend_errors.total, suppressed) })}
          />
          <CellList cells={data.frontend_errors.by_category} />
          <div className="mt-2">
            <CellList cells={data.frontend_errors.by_route_family} />
          </div>
        </div>
        <div>
          <SectionHeading
            title={t('pa.section.backendUnavailable')}
            hint={t('pa.reliability.total', { total: metricText(data.backend_unavailable.total, suppressed) })}
          />
          <CellList cells={data.backend_unavailable.by_route_family} />
        </div>
      </div>
      <div>
        <SectionHeading title={t('pa.section.navigationLatency')} hint={t('pa.reliability.latencyHint')} />
        {data.navigation_latency.length === 0 ? (
          <EmptyNote label={t('pa.state.sparse')} />
        ) : (
          data.navigation_latency.map(row => (
            <div key={row.destination} className="flex items-center gap-3 text-sm tabular-nums py-0.5">
              <span className="w-24 text-verdaxis-text-muted">
                {row.destination === 'all' ? t('pa.reliability.allDestinations') : row.destination}
              </span>
              {row.buckets.map(bucket => (
                <span key={bucket.key} className="text-xs">
                  <span className="text-verdaxis-text-muted">{bucket.key}:</span>{' '}
                  {cellText(bucket, suppressed)}
                </span>
              ))}
            </div>
          ))
        )}
      </div>
      <div>
        <SectionHeading title={t('pa.section.auditActivity')} hint={t('pa.reliability.auditHint')} />
        {data.audit_activity.length === 0 ? (
          <EmptyNote label={t('pa.state.sparse')} />
        ) : (
          <table className="w-full text-sm" data-testid="audit-activity">
            <tbody>
              {data.audit_activity.map((row, index) => (
                <tr key={`${row.occurred_at}-${index}`} className="border-t border-verdaxis-border/60">
                  <td className="py-1 pr-3 tabular-nums text-verdaxis-text-muted whitespace-nowrap">
                    {row.occurred_at.replace('T', ' ').slice(0, 16)}Z
                  </td>
                  <td className="py-1 pr-3">{row.action}</td>
                  <td className="py-1 pr-3 text-verdaxis-text-muted">{row.resource_type ?? '—'}</td>
                  <td className="py-1 text-verdaxis-text-muted">{row.actor_role ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
