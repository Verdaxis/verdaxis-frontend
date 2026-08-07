import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical } from 'lucide-react';
import { DEMO_FUEL_PRICES, fetchFuelPrices, type FuelPrice } from '../../data/fuelPrices';
import { useNamespace } from '../../hooks/useNamespace';
import { formatAvailabilityWindowPeriod } from '../../utils/availabilityWindow';

const formatLocalizedAvailabilityWindowPeriod = formatAvailabilityWindowPeriod as (
  value: string | null | undefined,
  locale?: string,
) => string;

const formatPrice = (price: number) => `$${price.toLocaleString(undefined, {
  maximumFractionDigits: 0,
})}`;

export const PriceTicker: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const { i18n } = useTranslation();
  const [prices, setPrices] = useState<FuelPrice[]>(DEMO_FUEL_PRICES);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  useEffect(() => {
    const controller = new AbortController();

    fetchFuelPrices(controller.signal)
      .then(setPrices)
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Keep the visible, explicitly labelled Demo snapshot on feed failure.
      });

    return () => controller.abort();
  }, []);

  const doubled = [...prices, ...prices];
  const midpoint = prices.length;

  if (!ready) return null;

  return (
    <div
      className="public-price-ticker"
      tabIndex={0}
      aria-label={t('priceTicker.ariaLabel')}
      style={{
        background: '#0F172A',
        height: 42,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        borderBottom: '1px solid #1E293B',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 60,
          background: 'linear-gradient(90deg, #0F172A, transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 60,
          background: 'linear-gradient(270deg, #0F172A, transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      <div
        className="public-price-ticker__track"
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animationDuration: `${Math.max(40, prices.length * 5)}s`,
        }}
      >
        {doubled.map((price, index) => {
          const duplicate = index >= midpoint;
          return (
            <div
              key={`${price.fuel}-${price.region}-${index}`}
              aria-hidden={duplicate ? true : undefined}
              data-ticker-sequence={duplicate ? 'duplicate' : 'primary'}
              title={t('priceTicker.tooltip')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 24px',
                fontSize: 13,
                height: 42,
              }}
            >
              <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{price.fuel}</span>
              <span style={{ color: '#64748B', fontSize: 12 }}>{price.region}</span>
              <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{formatPrice(price.price)}</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>{price.unit}</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>
                {price.availabilityWindow === 'Preview'
                  ? t('priceTicker.preview')
                  : formatLocalizedAvailabilityWindowPeriod(price.availabilityWindow, currentLanguage)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: '#F59E0B',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <FlaskConical size={11} aria-hidden="true" />
                {price.source === 'marketplace-demo' ? t('priceTicker.demo') : price.sourceLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
