import React from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab, OverviewResponse } from '../../../types/productAnalytics';
import { CoverageNote, EmptyNote, SectionHeading, metricText } from './AnalyticsStates';
import { LifecycleSpine } from './LifecycleSpine';
import { MetricStrip } from './MetricStrip';
import { TrendChart } from './TrendChart';

export const OverviewTab: React.FC<{
  data: OverviewResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data, compare, onSelectTab }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  return (
    <div className="space-y-6">
      <MetricStrip
        compare={compare}
        items={[
          { label: t('pa.kpi.qualifiedOrganizations'), metric: data.kpis.qualified_organizations },
          { label: t('pa.kpi.activeMembers'), metric: data.kpis.active_members },
          { label: t('pa.kpi.participatingOrganizations'), metric: data.kpis.participating_organizations },
          { label: t('pa.kpi.liveOrders'), metric: data.kpis.live_orders },
          { label: t('pa.kpi.confirmedTrades'), metric: data.kpis.confirmed_trades },
        ]}
      />
      <div>
        <SectionHeading title={t('pa.section.lifecycle')} hint={t('pa.section.lifecycleHint')} />
        <LifecycleSpine stages={data.lifecycle} onSelectTab={onSelectTab} />
        <CoverageNote meta={data.meta} source="login_history" />
        <CoverageNote meta={data.meta} source="status_history" />
      </div>
      <div>
        <SectionHeading title={t('pa.section.activityTrend')} />
        {/* Faceted: visitors and trades differ by orders of magnitude, so a
            shared y-axis would flatten the business series. */}
        <TrendChart
          facet
          emptyLabel={t('pa.state.sparse')}
          series={[
            { key: 'visitors', label: t('pa.series.visitors'), color: 'var(--chart-1)', points: data.activity_trend.visitors },
            { key: 'active_members', label: t('pa.series.activeMembers'), color: 'var(--chart-2)', points: data.activity_trend.active_members },
            { key: 'orders', label: t('pa.series.orders'), color: 'var(--chart-3)', points: data.activity_trend.orders },
            { key: 'confirmed_trades', label: t('pa.series.confirmedTrades'), color: 'var(--chart-4)', points: data.activity_trend.confirmed_trades },
          ]}
        />
        <CoverageNote meta={data.meta} source="behavioral" />
      </div>
      <div>
        <SectionHeading title={t('pa.section.balance')} />
        <table className="text-sm tabular-nums">
          <tbody>
            <tr>
              <td className="pr-6 py-1 text-verdaxis-text-muted">{t('pa.balance.buyerOrgs')}</td>
              <td>{metricText(data.marketplace_balance.buyer_organizations, suppressed)}</td>
              <td className="pl-8 pr-6 text-verdaxis-text-muted">{t('pa.balance.bids')}</td>
              <td>{metricText(data.marketplace_balance.bid_orders, suppressed)}</td>
            </tr>
            <tr>
              <td className="pr-6 py-1 text-verdaxis-text-muted">{t('pa.balance.supplierOrgs')}</td>
              <td>{metricText(data.marketplace_balance.supplier_organizations, suppressed)}</td>
              <td className="pl-8 pr-6 text-verdaxis-text-muted">{t('pa.balance.asks')}</td>
              <td>{metricText(data.marketplace_balance.ask_orders, suppressed)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <SectionHeading title={t('pa.section.needsAttention')} />
        {data.needs_attention.length === 0 ? (
          <EmptyNote label={t('pa.attention.none')} />
        ) : (
          <ul className="space-y-1.5" data-testid="needs-attention">
            {data.needs_attention.map(item => (
              <li key={item.rule} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
                {t(`pa.attention.${item.rule}`, { count: item.count ?? 0 })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
