import React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivationResponse, AnalyticsTab, DurationDistribution } from '../../../types/productAnalytics';
import { CoverageNote, SectionHeading, cellText } from './AnalyticsStates';
import { AggregateJourney } from './AggregateJourney';

const DurationBlock: React.FC<{ title: string; distribution: DurationDistribution }> = ({
  title, distribution,
}) => {
  const { t } = useTranslation('admin');
  return (
    <div className="border border-verdaxis-border rounded px-4 py-3">
      <div className="text-xs text-verdaxis-text-muted mb-1">{title}</div>
      {distribution.suppressed ? (
        <div className="text-sm">{t('pa.state.suppressed')}</div>
      ) : distribution.median_hours === null ? (
        <div className="text-sm text-verdaxis-text-muted">{t('pa.state.sparse')}</div>
      ) : (
        <div className="text-sm tabular-nums">
          {t('pa.activation.medianHours', { hours: distribution.median_hours })}
          {distribution.sample_size !== null && (
            <span className="text-verdaxis-text-muted"> · n={distribution.sample_size}</span>
          )}
        </div>
      )}
    </div>
  );
};

export const ActivationTab: React.FC<{
  data: ActivationResponse;
  compare: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
}> = ({ data }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading title={t('pa.section.journey')} hint={t('pa.activation.journeyHint')} />
        <AggregateJourney stages={data.journey} />
        <CoverageNote meta={data.meta} source="behavioral" />
        <CoverageNote meta={data.meta} source="status_history" />
        <CoverageNote meta={data.meta} source="login_history" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <DurationBlock title={t('pa.activation.timeToFirstLogin')} distribution={data.time_to_first_login} />
        <DurationBlock title={t('pa.activation.timeToFirstOrder')} distribution={data.time_to_first_live_order} />
      </div>
      <div>
        <SectionHeading title={t('pa.section.dropOff')} />
        <table className="text-sm tabular-nums" data-testid="drop-off">
          <tbody>
            {data.drop_off.map(cell => (
              <tr key={cell.key}>
                <td className="pr-8 py-1 text-verdaxis-text-muted">{t(`pa.dropOff.${cell.key}`)}</td>
                <td className="text-right">{cellText(cell, suppressed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <SectionHeading title={t('pa.section.ratios')} hint={t('pa.activation.ratioHint')} />
        <ul className="space-y-1 text-sm tabular-nums">
          {data.ratios.map(ratio => (
            <li key={ratio.key}>
              <span className="text-verdaxis-text-muted">{t(`pa.ratio.${ratio.key}`)}</span>{' '}
              {ratio.ratio.rate_pct !== null ? `${ratio.ratio.rate_pct}%` : '—'}
              <span className="ml-1 text-[10px] uppercase text-verdaxis-text-muted/60">
                {t(`pa.ratio.kind_${ratio.kind}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
