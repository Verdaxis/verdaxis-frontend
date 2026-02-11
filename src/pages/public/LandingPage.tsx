import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Layers,
  ShieldAlert,
  TrendingDown,
  Factory,
  Ship,
  ArrowLeftRight,
  Landmark,
  ChevronRight,
} from 'lucide-react';
import { PriceTicker } from '../../components/public/PriceTicker';
import { HeroSection } from '../../components/public/HeroSection';

/* ------------------------------------------------------------------ */
/*  Section: "Why Verdaxis Exists"                                     */
/* ------------------------------------------------------------------ */

const whyCards = [
  {
    icon: AlertTriangle,
    title: 'Scarce Molecules',
    body: 'Low-carbon fuel supply is limited. Every molecule needs verified provenance and transparent pricing.',
  },
  {
    icon: Layers,
    title: 'Fragmented Standards',
    body: 'RED III, 45Z, RenovaBio, FuelEU Maritime, IMO NZF \u2014 different rules, different metrics, one platform.',
  },
  {
    icon: ShieldAlert,
    title: 'Double-Counting Risk',
    body: 'Without chain-of-custody integrity, the same environmental attribute can be claimed multiple times.',
  },
  {
    icon: TrendingDown,
    title: 'Scope 3 Pressure',
    body: 'End-users face increasing pressure to prove real emissions reductions, not just purchase certificates.',
  },
];

/* ------------------------------------------------------------------ */
/*  Section: "Built for Every Participant"                             */
/* ------------------------------------------------------------------ */

const roleCards = [
  {
    icon: Factory,
    title: 'Fuel Producers',
    path: '/for-producers',
    bullets: [
      'Faster offtake',
      'Premium discovery',
      'Compliance-ready sales',
    ],
  },
  {
    icon: Ship,
    title: 'Fuel Buyers',
    path: '/for-buyers',
    bullets: [
      'Verified Scope 3 reductions',
      'Energy-adjusted pricing',
      'Reduced compliance risk',
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Traders',
    path: '/for-traders',
    bullets: [
      'Liquidity access',
      'Standardised deals',
      'Reduced back-office friction',
    ],
  },
  {
    icon: Landmark,
    title: 'Financiers',
    path: '/for-financiers',
    bullets: [
      'Bankable data',
      'Traceable claims',
      'Reduced diligence cost',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: '#0F172A',
  textAlign: 'center',
  marginBottom: 12,
};

const sectionSubtitle: React.CSSProperties = {
  fontSize: 16,
  color: '#64748B',
  textAlign: 'center',
  maxWidth: 600,
  margin: '0 auto 48px',
  lineHeight: 1.6,
};

const cardGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 24,
  maxWidth: 1100,
  margin: '0 auto',
};

const cardBase: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 28,
};

/* ================================================================== */
/*  LandingPage                                                        */
/* ================================================================== */

export const LandingPage: React.FC = () => {
  return (
    <div>
      {/* 1. Price Ticker */}
      <PriceTicker />

      {/* 2. Hero Section */}
      <HeroSection />

      {/* 3. Why Verdaxis Exists */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Why Verdaxis Exists</h2>
        <p style={sectionSubtitle}>
          The transition to low-carbon fuels is hindered by fragmented markets,
          inconsistent data, and compliance uncertainty. Verdaxis solves this.
        </p>
        <div style={cardGrid}>
          {whyCards.map(({ icon: Icon, title, body }) => (
            <div key={title} style={cardBase}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={22} color="#3B82F6" />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Built for Every Participant */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <h2 style={sectionTitle}>Built for Every Participant</h2>
        <p style={sectionSubtitle}>
          Whether you produce, buy, trade, or finance low-carbon fuels,
          Verdaxis gives you the tools and trust layer you need.
        </p>
        <div style={cardGrid}>
          {roleCards.map(({ icon: Icon, title, path, bullets }) => (
            <div key={title} style={{ ...cardBase, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={22} color="#22C55E" />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 12,
                }}
              >
                {title}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 20px',
                  flex: 1,
                }}
              >
                {bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      fontSize: 14,
                      color: '#475569',
                      lineHeight: 1.7,
                      paddingLeft: 16,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        color: '#22C55E',
                      }}
                    >
                      {'\u2713'}
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                to={path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#3B82F6',
                  textDecoration: 'none',
                }}
              >
                Learn more <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CTA Section */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
            }}
          >
            Ready to Define the Market?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.7,
              marginBottom: 36,
            }}
          >
            Verdaxis is onboarding a limited cohort of pilot participants
            \u2014 producers, buyers, traders, and financiers who want to shape
            the standard for low-carbon fuel commerce.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
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
            <a
              href="mailto:info@verdaxis.exchange"
              style={{
                background: 'transparent',
                color: '#F8FAFC',
                padding: '14px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
                border: '2px solid #334155',
                display: 'inline-block',
              }}
            >
              Register Interest
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
