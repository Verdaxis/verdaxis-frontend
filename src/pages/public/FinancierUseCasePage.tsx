import React from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark,
  Database,
  Search,
  Calculator,
  DollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#9333EA';

const valueProps = [
  {
    icon: Database,
    title: 'Bankable Data',
    description:
      'Every transaction on Verdaxis generates verified, timestamped data. Production volumes, CI scores, offtake history \u2014 all available for due diligence.',
  },
  {
    icon: Search,
    title: 'Traceable Claims',
    description:
      'Follow any environmental claim back to its source. Verdaxis provides end-to-end traceability from producer to final consumer retirement.',
  },
  {
    icon: Calculator,
    title: 'Reduced Diligence Cost',
    description:
      'Standard data formats, verified counterparties, and immutable audit trails reduce the time and cost of environmental due diligence.',
  },
  {
    icon: DollarSign,
    title: 'Green Financing Opportunities',
    description:
      'Connect with producers seeking pre-production financing or inventory financing, backed by verified offtake agreements and platform trade history.',
  },
];

const howItWorksSteps = [
  'Access verified production and trade data for due diligence',
  'Review standardised compliance reporting and audit trails',
  'Connect with qualified producers seeking green financing',
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
/*  FinancierUseCasePage                                               */
/* ================================================================== */

export const FinancierUseCasePage: React.FC = () => {
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
            <Landmark size={32} color={ACCENT} />
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
            For Financiers & Auditors
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
            Bankable data, traceable claims, reduced diligence cost. Verdaxis
            provides the transparency green finance demands.
          </p>
        </div>
      </section>

      {/* ---- Value Propositions ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Why Financiers Choose Verdaxis</h2>
        <p style={sectionSubtitle}>
          The data infrastructure that makes green finance auditable.
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
          From data access to financing in three steps.
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
            Ready for transparent green finance?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            Join the Verdaxis pilot programme and access verified data
            for environmental due diligence and green financing.
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
