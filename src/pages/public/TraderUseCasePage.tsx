import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Droplets,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#F59E0B';

const valueProps = [
  {
    icon: Droplets,
    title: 'Liquidity Access',
    description:
      'Low-carbon fuels are scarce and fragmented. Verdaxis aggregates supply and demand across regions, creating the liquidity pool the market needs.',
  },
  {
    icon: FileText,
    title: 'Standardised Structures',
    description:
      'No more bespoke term sheets for every deal. Verdaxis provides standardised contract templates, attribute definitions, and settlement workflows.',
  },
  {
    icon: BarChart3,
    title: 'Price Discovery',
    description:
      'Contribute to \u2014 and benefit from \u2014 transparent price formation. Verdaxis-derived pricing feeds inform the market, including assessment agencies.',
  },
  {
    icon: Settings,
    title: 'Reduced Back-Office',
    description:
      'Automated trade confirmation, attribute transfer, and commission tracking. Less manual reconciliation, faster settlement.',
  },
];

const howItWorksSteps = [
  'Access the orderbook \u2014 see live bids and asks across fuel types',
  'Execute trades with standardised terms and automated settlement',
  'Track positions, commissions, and compliance attributes in real-time',
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
/*  TraderUseCasePage                                                  */
/* ================================================================== */

export const TraderUseCasePage: React.FC = () => {
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
            <ArrowLeftRight size={32} color={ACCENT} />
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
            For Traders & Aggregators
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
            Access liquidity for scarce low-carbon molecules. Standardised deal
            structures. Transparent price discovery.
          </p>
        </div>
      </section>

      {/* ---- Value Propositions ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Why Traders Choose Verdaxis</h2>
        <p style={sectionSubtitle}>
          The infrastructure the low-carbon fuel trading market has been missing.
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
          From orderbook to settlement in three steps.
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
            Ready to trade with transparency?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            Join the Verdaxis pilot programme and access standardised
            low-carbon fuel trading infrastructure.
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
