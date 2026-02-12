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
                gap: 8,
                padding: '0 24px',
                fontSize: 13,
                height: 42,
              }}
            >
              <span style={{ color: '#F8FAFC', fontWeight: 600, letterSpacing: '-0.01em' }}>
                {fp.fuel}
              </span>
              <span style={{ color: '#475569', fontSize: 12 }}>
                {fp.region}
              </span>
              <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                ${fp.price}
              </span>
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
                {isPositive ? '+' : ''}{fp.change}%
              </span>
              <span
                style={{
                  color: '#475569',
                  fontSize: 11,
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 4,
                }}
              >
                CI {fp.ci}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
