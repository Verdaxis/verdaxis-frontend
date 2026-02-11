import React from 'react';
import { Link } from 'react-router-dom';
import {
  Factory,
  Zap,
  TrendingUp,
  BarChart3,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#4CAF50';

const valueProps = [
  {
    icon: Zap,
    title: 'Faster Offtake',
    description:
      'Connect directly with qualified fuel buyers through the Verdaxis marketplace. No intermediary delays, no opaque negotiations.',
  },
  {
    icon: TrendingUp,
    title: 'Premium Discovery',
    description:
      'Low-CI fuels command a premium. Verdaxis makes this premium visible and verifiable, so you capture the full value of your production quality.',
  },
  {
    icon: BarChart3,
    title: 'Scope 3 Monetisation',
    description:
      'Your fuel reduces downstream Scope 3 emissions for buyers. Verdaxis quantifies this value, helping you price it into your offtake agreements.',
  },
  {
    icon: Calendar,
    title: 'Forward Selling',
    description:
      'Lock in future sales at agreed prices. Forward contracts on Verdaxis give you revenue certainty and bankable offtake for financing.',
  },
];

const howItWorksSteps = [
  'Register your facility and fuel production on Verdaxis',
  'Attributes are verified by accredited third parties',
  'Receive bids from qualified buyers and negotiate offtake',
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
  maxWidth: 640,
  margin: '0 auto 48px',
  lineHeight: 1.6,
};

/* ================================================================== */
/*  ProducerUseCasePage                                                */
/* ================================================================== */

export const ProducerUseCasePage: React.FC = () => {
  return (
    <div>
      {/* ---- Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 72px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${ACCENT}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Factory size={32} color={ACCENT} />
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            For Fuel Producers
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.7,
              maxWidth: 620,
              margin: '0 auto',
            }}
          >
            Reach verified buyers, discover premium pricing for low-CI fuels,
            and simplify compliance documentation.
          </p>
        </div>
      </section>

      {/* ---- Value Propositions ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Why Producers Choose Verdaxis</h2>
        <p style={sectionSubtitle}>
          Capture the full value of your low-carbon fuel production.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {valueProps.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 28,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${ACCENT}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={22} color={ACCENT} />
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
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How It Works For You ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <h2 style={sectionTitle}>How It Works For You</h2>
        <p style={sectionSubtitle}>
          Three steps from registration to revenue.
        </p>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {howItWorksSteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                marginBottom: idx < howItWorksSteps.length - 1 ? 32 : 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: ACCENT,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <p
                style={{
                  fontSize: 16,
                  color: '#334155',
                  lineHeight: 1.6,
                  margin: 0,
                  paddingTop: 8,
                }}
              >
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
            }}
          >
            Ready to reach new buyers?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            Join the Verdaxis pilot programme and start connecting with
            verified fuel buyers today.
          </p>
          <Link
            to="/pilot"
            style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, ${ACCENT}, #5DADE2)`,
              color: '#FFFFFF',
              padding: '14px 36px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Apply for Pilot
          </Link>
        </div>
      </section>
    </div>
  );
};
