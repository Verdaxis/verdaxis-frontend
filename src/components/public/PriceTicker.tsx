import React, { useEffect, useState } from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchFuelPrices, type FuelPrice } from '../../data/fuelPrices';

const formatPrice = (price: number, unit: string) => {
  if (unit.startsWith('USD/')) {
    return `$${price.toLocaleString(undefined, {
      maximumFractionDigits: price >= 100 ? 0 : 2,
      minimumFractionDigits: price >= 100 ? 0 : 2,
    })}`;
  }

  if (unit === 'USc/bu') {
    return `${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}c`;
  }

  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDate = (value: string) => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
};

export const PriceTicker: React.FC = () => {
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();

    fetchFuelPrices(controller.signal)
      .then((items) => {
        setPrices(items);
        setStatus(items.length > 0 ? 'ready' : 'error');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setStatus('error');
      });

    return () => controller.abort();
  }, []);

  const doubled = [...prices, ...prices];
  const showStatus = status !== 'ready' || doubled.length === 0;

  return (
    <div
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
      {/* Fade edges */}
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

      {showStatus ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 24px',
            color: '#94A3B8',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Activity size={13} color={status === 'loading' ? '#5DADE2' : '#64748B'} />
          {status === 'loading' ? 'Loading market benchmarks' : 'Market benchmarks unavailable'}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            animation: 'ticker-scroll 40s linear infinite',
            whiteSpace: 'nowrap',
          }}
        >
          {doubled.map((fp, i) => {
            const isPositive = (fp.change ?? 0) >= 0;
            return (
              <div
                key={`${fp.fuel}-${fp.region}-${fp.priceDate}-${i}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 24px',
                  fontSize: 13,
                  height: 42,
                }}
              >
                <span style={{ color: '#F8FAFC', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {fp.fuel}
                </span>
                <span style={{ color: '#64748B', fontSize: 12 }}>
                  {fp.region}
                </span>
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                  {formatPrice(fp.price, fp.unit)}
                </span>
                <span style={{ color: '#64748B', fontSize: 11 }}>
                  {fp.unit}
                </span>
                {fp.change !== null && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      color: isPositive ? '#4CAF50' : '#EF4444',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {isPositive ? (
                      <TrendingUp size={11} />
                    ) : (
                      <TrendingDown size={11} />
                    )}
                    {isPositive ? '+' : ''}{fp.change.toFixed(1)}%
                  </span>
                )}
                <span
                  style={{
                    color: '#94A3B8',
                    fontSize: 11,
                    padding: '2px 6px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                  }}
                >
                  {fp.sourceLabel}
                </span>
                <span style={{ color: '#475569', fontSize: 11 }}>
                  {formatDate(fp.priceDate)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
