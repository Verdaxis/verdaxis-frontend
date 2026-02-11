import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Globe, Zap, BarChart3 } from 'lucide-react';

const trustSignals = [
  { icon: Shield, label: 'Double-Count Prevention' },
  { icon: Globe, label: 'IMO & EU Aligned' },
  { icon: Zap, label: 'Physical-First Logic' },
  { icon: BarChart3, label: 'CI-Adjusted Pricing' },
];

export const HeroSection: React.FC = () => {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
        padding: '80px 24px 60px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-block',
            background: '#DBEAFE',
            color: '#1D4ED8',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 16px',
            borderRadius: 9999,
            marginBottom: 24,
          }}
        >
          Now accepting pilot applications
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#0F172A',
            marginBottom: 20,
          }}
        >
          The Trusted Exchange for{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #3B82F6, #22C55E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Low-Carbon Fuels
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: '#475569',
            maxWidth: 640,
            margin: '0 auto 36px',
          }}
        >
          Verdaxis is the compliance-first exchange and registry for low-carbon
          fuels and their environmental attributes. Physical trade meets
          regulatory integrity.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 56,
          }}
        >
          <Link
            to="/pilot"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #22C55E)',
              color: '#FFFFFF',
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Apply for Pilot
          </Link>
          <Link
            to="/how-it-works"
            style={{
              background: 'transparent',
              color: '#334155',
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
              border: '2px solid #CBD5E1',
              display: 'inline-block',
            }}
          >
            See How It Works
          </Link>
        </div>

        {/* Trust Signals */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 32,
            borderTop: '1px solid #E2E8F0',
            paddingTop: 28,
          }}
        >
          {trustSignals.map(({ icon: Icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#64748B',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Icon size={18} color="#3B82F6" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
