import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import {
  buildFuelTickerItems,
  DEMO_FUEL_PRICES,
  fetchFuelPrices,
  type FuelPrice,
  type FuelTickerItem,
} from '../../data/fuelPrices';
import { formatAvailabilityWindowPeriod } from '../../utils/availabilityWindow';

const priceDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatPrice = (price: number, kind: FuelTickerItem['kind']) => {
  const amount = Math.abs(price).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  if (kind === 'price') return `$${amount}`;
  return `${price >= 0 ? '+' : '-'}$${amount}`;
};

const formatWindow = (value: string) => (
  value === 'Preview' ? value : formatAvailabilityWindowPeriod(value)
);

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return 'Undated';
  return priceDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
};

const describeItem = (item: FuelTickerItem) => {
  const metric = item.kind === 'price'
    ? 'midpoint'
    : item.kind === 'pathway-premium' ? 'pathway premium' : 'location spread';
  return `Illustrative ${metric} derived from disclosed Verdaxis Demo marketplace bids and asks for the same delivery window. Non-executable. Observed ${formatDate(item.priceDate)}.`;
};

export const PriceTicker: React.FC = () => {
  const [prices, setPrices] = useState<FuelPrice[]>(DEMO_FUEL_PRICES);

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

  const items = buildFuelTickerItems(prices);
  const doubled = [...items, ...items];
  const midpoint = items.length;

  return (
    <div
      className="public-price-ticker"
      tabIndex={0}
      aria-label="Verdaxis Demo marketplace price ticker with like-for-like spreads. Illustrative, non-executable values. Focus or hover to pause scrolling."
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
        style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
      >
        {doubled.map((price, index) => {
          const duplicate = index >= midpoint;
          return (
            <div
              key={`${price.kind}-${price.fuel}-${price.region}-${index}`}
              aria-hidden={duplicate ? true : undefined}
              data-ticker-sequence={duplicate ? 'duplicate' : 'primary'}
              title={describeItem(price)}
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
              <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{formatPrice(price.price, price.kind)}</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>{price.unit}</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>{formatWindow(price.availabilityWindow)}</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>Verdaxis</span>
              <span style={{ color: '#64748B', fontSize: 11 }}>{formatDate(price.priceDate)}</span>
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
                {price.sourceLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
