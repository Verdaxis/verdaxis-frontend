import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  AnalyticsTab,
  MarketActivitySection,
  MarketplaceResponse,
} from '../../../types/productAnalytics';
import { EmptyNote, SectionHeading, cellText } from './AnalyticsStates';
import { MarketActivityMatrix } from './MarketActivityMatrix';
import { MetricStrip } from './MetricStrip';
import { TrendChart } from './TrendChart';

const decimal = (value: string | null): string => (value === null ? '—' : value);

const ActivitySection: React.FC<{
  label: string;
  section: MarketActivitySection;
  compare: boolean;
  live: boolean;
}> = ({ label, section, compare, live }) => {
  const { t, i18n } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  const statusLabel = (status: string) => t(`pa.status.${status}`, {
    defaultValue: i18n.resolvedLanguage?.startsWith('zh') ? t('pa.status.unknown') : status,
  });
  const execution = section.kpis.execution_rate;
  const liquidity = section.liquidity;
  return (
    <div className="space-y-5" data-testid={`market-section-${label}`}>
      <MetricStrip
        compare={compare}
        items={[
          { label: t('pa.kpi.participatingOrganizations'), metric: section.kpis.participating_organizations },
          { label: t('pa.kpi.openBids'), metric: section.kpis.open_bids },
          { label: t('pa.kpi.openAsks'), metric: section.kpis.open_asks },
          { label: t('pa.kpi.confirmedTrades'), metric: section.kpis.confirmed_trades },
        ]}
      />
      <p className="text-sm tabular-nums text-verdaxis-text-muted">
        {t('pa.market.volume', { volume: decimal(section.kpis.confirmed_volume_mt.value) })}
        {' · '}
        {t('pa.market.execution', {
          numerator: execution.numerator ?? '—',
          denominator: execution.denominator ?? '—',
          rate: execution.rate_pct ?? '—',
        })}
        {!execution.cohort_complete && (
          <span className="ml-1 text-amber-500" data-testid="cohort-incomplete">
            {t('pa.market.cohortIncomplete')}
          </span>
        )}
      </p>
      <div>
        <SectionHeading title={t('pa.section.liquidity')} hint={t('pa.market.liquidityHint')} />
        <p className="text-sm tabular-nums text-verdaxis-text-muted mb-2">
          {t('pa.market.slices', {
            twoSided: liquidity.two_sided_slices ?? '—',
            oneSided: liquidity.one_sided_slices ?? '—',
            crossed: liquidity.crossed_slices ?? '—',
          })}
          {' · '}
          {t('pa.market.medianAge', { hours: decimal(liquidity.median_open_order_age_hours) })}
          {liquidity.median_hours_to_first_fill !== null &&
            ` · ${t('pa.market.medianFill', { hours: liquidity.median_hours_to_first_fill })}`}
        </p>
        {liquidity.slices.length === 0 ? (
          <EmptyNote label={t('pa.state.sparse')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums" data-testid="liquidity-slices">
              <thead>
                <tr className="text-left text-xs text-verdaxis-text-muted">
                  <th className="py-1 pr-3 font-medium">{t('pa.market.slice')}</th>
                  <th className="py-1 px-2 font-medium text-right">{t('pa.market.bestBid')}</th>
                  <th className="py-1 px-2 font-medium text-right">{t('pa.market.bestAsk')}</th>
                  <th className="py-1 px-2 font-medium text-right">{t('pa.market.spread')}</th>
                  <th className="py-1 px-2 font-medium text-right">{t('pa.market.depth')}</th>
                </tr>
              </thead>
              <tbody>
                {liquidity.slices.map(slice => (
                  <tr
                    key={`${slice.product_key}|${slice.delivery_point_key}|${slice.availability_window}`}
                    className="border-t border-verdaxis-border/60"
                  >
                    <td className="py-1 pr-3">
                      {slice.product_label} · {slice.delivery_point_label} · {slice.availability_window_label}
                      {slice.crossed && (
                        <span className="ml-1 text-red-400 text-xs">{t('pa.market.crossed')}</span>
                      )}
                    </td>
                    {slice.suppressed ? (
                      <td colSpan={4} className="py-1 px-2 text-right text-verdaxis-text-muted">
                        {suppressed}
                      </td>
                    ) : (
                      <>
                        <td className="py-1 px-2 text-right">{decimal(slice.best_bid_usd_per_mt)}</td>
                        <td className="py-1 px-2 text-right">{decimal(slice.best_ask_usd_per_mt)}</td>
                        <td className="py-1 px-2 text-right">
                          {decimal(slice.spread_usd_per_mt)}
                          {slice.spread_bps !== null && (
                            <span className="text-xs text-verdaxis-text-muted ml-1">({slice.spread_bps} bps)</span>
                          )}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {decimal(slice.one_percent_bid_depth_mt)} / {decimal(slice.one_percent_ask_depth_mt)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {live && (
        <>
          <div>
            <SectionHeading title={t('pa.section.balanceTrend')} />
            <TrendChart
              emptyLabel={t('pa.state.sparse')}
              series={[
                { key: 'bids', label: t('pa.balance.bids'), color: 'var(--chart-2)', points: section.balance_trend.bids },
                { key: 'asks', label: t('pa.balance.asks'), color: 'var(--chart-4)', points: section.balance_trend.asks },
                { key: 'buyers', label: t('pa.balance.buyerOrgs'), color: 'var(--chart-1)', points: section.balance_trend.buyer_organizations },
                { key: 'suppliers', label: t('pa.balance.supplierOrgs'), color: 'var(--chart-3)', points: section.balance_trend.supplier_organizations },
              ]}
            />
          </div>
          <div>
            <SectionHeading title={t('pa.section.matrix')} />
            <MarketActivityMatrix cells={section.product_port_matrix} />
          </div>
        </>
      )}
      <div className="grid md:grid-cols-3 gap-6 text-sm tabular-nums">
        <div>
          <SectionHeading title={t('pa.section.windows')} />
          {section.window_distribution.map(row => (
            <div key={row.key} className="flex justify-between py-0.5">
              <span className="text-verdaxis-text-muted">{row.label}</span>
              <span>{row.suppressed ? suppressed : row.count ?? '—'}</span>
            </div>
          ))}
        </div>
        <div>
          <SectionHeading title={t('pa.section.orderStatuses')} />
          {section.order_status_distribution.map(cell => (
            <div key={cell.key} className="flex justify-between py-0.5">
              <span className="text-verdaxis-text-muted">{statusLabel(cell.key)}</span>
              <span>{cellText(cell, suppressed)}</span>
            </div>
          ))}
        </div>
        <div>
          <SectionHeading title={t('pa.section.tradeStatuses')} />
          {section.trade_status_distribution.map(cell => (
            <div key={cell.key} className="flex justify-between py-0.5">
              <span className="text-verdaxis-text-muted">{statusLabel(cell.key)}</span>
              <span>{cellText(cell, suppressed)}</span>
            </div>
          ))}
        </div>
      </div>
      {section.concentration.hhi_band && (
        <p className="text-sm text-verdaxis-text-muted">
          {t('pa.market.concentration', { band: t(`pa.market.band_${section.concentration.hhi_band}`) })}
        </p>
      )}
    </div>
  );
};

export const MarketplaceTab: React.FC<{
  data: MarketplaceResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data, compare }) => {
  const { t } = useTranslation('admin');
  const sections: { key: string; section: MarketActivitySection | null; live: boolean }[] = [
    { key: 'live', section: data.live, live: true },
    { key: 'demo', section: data.demo, live: false },
    { key: 'unknown', section: data.unknown, live: false },
  ];
  return (
    <div className="space-y-8">
      {sections.filter(entry => entry.section).map(entry => (
        <div key={entry.key}>
          {/* Sources render separately and are never summed (§1.4 rule 15). */}
          <SectionHeading title={t(`pa.market.source_${entry.key}`)} />
          <ActivitySection
            label={entry.key}
            section={entry.section as MarketActivitySection}
            compare={compare}
            live={entry.live}
          />
        </div>
      ))}
      {data.commercial && (
        <div>
          <SectionHeading title={t('pa.section.commercial')} hint={t('pa.market.commercialHint')} />
          <p className="text-sm tabular-nums">
            {t('pa.market.gmv', { gmv: decimal(data.commercial.realized_gmv_usd.value) })}
            {' · '}
            {t('pa.market.revenue', { revenue: decimal(data.commercial.realized_revenue_usd.value) })}
            {' · '}
            {t('pa.market.commissionOutstanding', {
              pending: decimal(data.commercial.commission_pending_usd),
              invoiced: decimal(data.commercial.commission_invoiced_usd),
            })}
          </p>
        </div>
      )}
      {data.reference && (
        <div>
          {/* Reference is market data coverage, never activity (§1.6). */}
          <SectionHeading title={t('pa.market.source_reference')} hint={t('pa.market.referenceHint')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums" data-testid="reference-coverage">
              <thead>
                <tr className="text-left text-xs text-verdaxis-text-muted">
                  <th className="py-1 pr-3 font-medium">{t('pa.market.slice')}</th>
                  <th className="py-1 px-2 font-medium text-right">{t('pa.market.benchmark')}</th>
                  <th className="py-1 px-2 font-medium">{t('pa.market.sourceLabel')}</th>
                  <th className="py-1 px-2 font-medium">{t('pa.market.coverage')}</th>
                </tr>
              </thead>
              <tbody>
                {data.reference.rows.map(row => (
                  <tr
                    key={`${row.product_key}|${row.delivery_point_key}|${row.availability_window}`}
                    className="border-t border-verdaxis-border/60"
                  >
                    <td className="py-1 pr-3">
                      {row.product_label} · {row.delivery_point_label} · {row.availability_window_label}
                    </td>
                    <td className="py-1 px-2 text-right">{decimal(row.benchmark_price_usd_per_mt)}</td>
                    <td className="py-1 px-2 text-verdaxis-text-muted">
                      {t(`pa.market.ref_${row.source_label}`)}
                    </td>
                    <td className="py-1 px-2">
                      <span
                        className={
                          row.coverage_status === 'current'
                            ? 'text-emerald-500'
                            : row.coverage_status === 'stale'
                              ? 'text-amber-500'
                              : 'text-verdaxis-text-muted'
                        }
                      >
                        {t(`pa.market.coverage_${row.coverage_status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
