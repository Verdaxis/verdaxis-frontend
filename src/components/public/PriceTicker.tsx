import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fuelPrices } from '../../data/fuelPrices';

export const PriceTicker: React.FC = () => {
  // Double the array to create a seamless loop
  const doubled = [...fuelPrices, ...fuelPrices];

  return (
    <div
      style={{
        background: '#0F172A',
        height: 40,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          animation: 'ticker-scroll 40s linear infinite',
          whiteSpace: 'nowrap',
        }}
      >
        {doubled.map((fp, i) => {
          const isPositive = fp.change >= 0;
          return (
            <div
              key={`${fp.fuel}-${fp.region}-${i}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 20px',
                fontSize: 13,
                borderRight: '1px solid #1E293B',
                height: 40,
              }}
            >
              <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                {fp.fuel}
              </span>
              <span style={{ color: '#64748B' }}>
                {fp.region}
              </span>
              <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                ${fp.price}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  color: isPositive ? '#22C55E' : '#EF4444',
                }}
              >
                {isPositive ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {isPositive ? '+' : ''}{fp.change}%
              </span>
              <span style={{ color: '#64748B', fontSize: 11 }}>
                CI {fp.ci}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
