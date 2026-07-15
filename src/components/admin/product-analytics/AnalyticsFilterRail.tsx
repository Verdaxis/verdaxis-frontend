import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../../../services/api';
import {
  AnalyticsPeriod,
  ProductAnalyticsFilters,
} from '../../../hooks/useProductAnalyticsFilters';
import { AnalyticsActivity, AnalyticsAudience } from '../../../types/productAnalytics';

// One sticky filter rail below the tabs (§1.3): period and comparison stay in
// place across tabs; irrelevant filters are hidden, never disabled.

const PERIODS: readonly Exclude<AnalyticsPeriod, 'custom'>[] = ['7d', '30d', '90d'];
const WINDOWS = ['SPOT', '2026-Q3', '2026-Q4', '2027-CAL'];

interface CatalogOption { id: string; name: string }

export const AnalyticsFilterRail: React.FC<{
  filters: ProductAnalyticsFilters;
  onChange: (changes: Partial<ProductAnalyticsFilters>) => void;
}> = ({ filters, onChange }) => {
  const { t } = useTranslation('admin');
  const [products, setProducts] = useState<CatalogOption[]>([]);
  const [points, setPoints] = useState<CatalogOption[]>([]);
  const marketplace = filters.tab === 'marketplace';
  const audienceTab = ['activation', 'engagement', 'retention'].includes(filters.tab);

  useEffect(() => {
    if (!marketplace || products.length) return;
    let cancelled = false;
    Promise.all([api.catalog.products(), api.catalog.deliveryPoints()])
      .then(([productRows, pointRows]) => {
        if (cancelled) return;
        setProducts(productRows.map(row => ({ id: String(row.id), name: row.name })));
        setPoints(pointRows.map(row => ({ id: String(row.id), name: row.name })));
      })
      .catch(() => { /* filters degrade to period-only; data still loads */ });
    return () => { cancelled = true; };
  }, [marketplace, products.length]);

  // Deliberately NOT v-input: rail controls are compact and inline —
  // v-input's w-full would stack them into full-width rows.
  const select =
    'w-auto text-xs font-medium py-1.5 px-2 bg-verdaxis-input text-verdaxis-text border border-verdaxis-border rounded focus:outline-none focus:ring-1 focus:ring-verdaxis';

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2.5 bg-verdaxis-bg/95 backdrop-blur border-b border-verdaxis-border"
      data-testid="pa-filter-rail"
    >
      <div className="flex rounded border border-verdaxis-border overflow-hidden" role="group" aria-label={t('pa.filter.period')}>
        {PERIODS.map(period => (
          <button
            key={period}
            onClick={() => onChange({ period, from: null, to: null })}
            aria-pressed={filters.period === period}
            className={`px-3 py-1.5 text-xs font-semibold ${
              filters.period === period
                ? 'bg-verdaxis text-white'
                : 'text-verdaxis-text-muted hover:text-verdaxis-text'
            }`}
          >
            {t(`pa.filter.period_${period}`)}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-verdaxis-text-muted">
        <input
          type="date"
          aria-label={t('pa.filter.from')}
          value={filters.from ?? ''}
          onChange={event =>
            onChange({ period: 'custom', from: event.target.value || null })}
          className={select}
        />
        <span>–</span>
        <input
          type="date"
          aria-label={t('pa.filter.to')}
          value={filters.to ?? ''}
          onChange={event =>
            onChange({ period: 'custom', to: event.target.value || null })}
          className={select}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-verdaxis-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={filters.compare}
          onChange={event => onChange({ compare: event.target.checked })}
        />
        {t('pa.filter.compare')}
      </label>

      {audienceTab && (
        <select
          aria-label={t('pa.filter.audience')}
          value={filters.audience}
          onChange={event => onChange({ audience: event.target.value as AnalyticsAudience })}
          className={select}
        >
          <option value="ALL">{t('pa.filter.audienceAll')}</option>
          <option value="BUYER">{t('pa.filter.audienceBuyer')}</option>
          <option value="SUPPLIER">{t('pa.filter.audienceSupplier')}</option>
        </select>
      )}

      {marketplace && (
        <>
          <select
            aria-label={t('pa.filter.activity')}
            value={filters.activity}
            onChange={event => onChange({ activity: event.target.value as AnalyticsActivity })}
            className={select}
          >
            <option value="LIVE">{t('pa.filter.activityLive')}</option>
            <option value="DEMO">{t('pa.filter.activityDemo')}</option>
            <option value="REFERENCE">{t('pa.filter.activityReference')}</option>
            <option value="ALL">{t('pa.filter.activityAll')}</option>
          </select>
          <select
            aria-label={t('pa.filter.product')}
            value={filters.productId ?? ''}
            onChange={event => onChange({ productId: event.target.value || null })}
            className={select}
          >
            <option value="">{t('pa.filter.anyProduct')}</option>
            {products.map(option => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <select
            aria-label={t('pa.filter.port')}
            value={filters.deliveryPointId ?? ''}
            onChange={event => onChange({ deliveryPointId: event.target.value || null })}
            className={select}
          >
            <option value="">{t('pa.filter.anyPort')}</option>
            {points.map(option => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <select
            aria-label={t('pa.filter.window')}
            value={filters.availabilityWindow ?? ''}
            onChange={event => onChange({ availabilityWindow: event.target.value || null })}
            className={select}
          >
            <option value="">{t('pa.filter.anyWindow')}</option>
            {WINDOWS.map(window => (
              <option key={window} value={window}>{window}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
};
