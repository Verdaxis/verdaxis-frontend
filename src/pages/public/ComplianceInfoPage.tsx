import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  XOctagon,
  Eye,
  Anchor,
  Globe,
  Flag,
  CheckCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const doubleCountingBullets = [
  'Attributes are cryptographically locked to physical fuel batches at registration',
  'Once an attribute is claimed or transferred, it is permanently retired from the registry',
  'No attribute can exist independently of its underlying fuel',
  'Full audit trail from production to retirement',
];

const regulationCards = [
  {
    icon: Anchor,
    title: 'International Maritime (IMO)',
    items: [
      'FuelEU Maritime intensity targets (89.34 gCO\u2082e/MJ in 2025, declining)',
      'IMO Net-Zero Framework trajectory',
      'GHG Fuel Standard alignment',
      'CII rating integration',
    ],
  },
  {
    icon: Globe,
    title: 'European Union',
    items: [
      'EU ETS maritime coverage (50% in 2025, scaling to 100%)',
      'CBAM interface for fuel imports',
      'RED III sustainability criteria',
      'EU taxonomy alignment for green financing',
    ],
  },
  {
    icon: Flag,
    title: 'National Schemes',
    items: [
      'US 45Z Clean Fuel Production Credit',
      'Brazil RenovaBio (CBio credits)',
      'UK RTFO (Renewable Transport Fuel Obligation)',
      'Additional schemes added as platform expands',
    ],
  },
];

const verificationSchemes = ['ISCC EU', 'ISCC PLUS', 'RSB', 'RenovaBio'];

const exclusions = [
  'Decoupled environmental credits without physical fuel backing',
  'Self-certified or unverified environmental claims',
  'Retroactive attribute modification after verification',
  'Transfer of attributes without corresponding physical delivery (unless explicitly book-and-claim, clearly labeled)',
  'Trading by unverified or non-KYC\u2019d participants',
];

const regulatorPoints = [
  'Read-only audit access for authorised regulators',
  'Standardised reporting formats (FuelEU, ETS, national schemes)',
  'Tamper-evident record keeping',
  'Data export in regulatory-compatible formats',
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
/*  ComplianceInfoPage                                                  */
/* ================================================================== */

export const ComplianceInfoPage: React.FC = () => {
  return (
    <div>
      {/* ---- Section 1: Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 72px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Compliance &amp; Integrity
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
            Verdaxis is built on a simple principle: trust before liquidity, rules before prices. Every
            design decision prioritises regulatory certainty over transaction speed.
          </p>
        </div>
      </section>

      {/* ---- Section 2: Double-Counting Prevention ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield size={24} color="#5DADE2" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Double-Counting Prevention
            </h2>
          </div>

          <p
            style={{
              fontSize: 16,
              color: '#64748B',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 32px',
            }}
          >
            The single greatest risk in environmental attribute markets is double-counting &mdash; the
            same emission reduction claimed by multiple parties. Verdaxis eliminates this through:
          </p>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: 28,
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            {doubleCountingBullets.map((bullet) => (
              <div
                key={bullet}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <CheckCircle
                  size={18}
                  color="#4CAF50"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  {bullet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Section 3: Regulatory Alignment Grid ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Regulatory Alignment</h2>
        <p style={sectionSubtitle}>
          Verdaxis is designed to work within &mdash; not around &mdash; the world&rsquo;s major
          low-carbon fuel regulations.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {regulationCards.map(({ icon: Icon, title, items }) => (
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
                  background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={22} color="#5DADE2" />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                {title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 14,
                      color: '#64748B',
                      lineHeight: 1.6,
                      marginBottom: 10,
                      paddingLeft: 20,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        color: '#5DADE2',
                        fontWeight: 700,
                      }}
                    >
                      &bull;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Section 4: Third-Party Verification ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={24} color="#5DADE2" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Third-Party Verification
            </h2>
          </div>

          <p
            style={{
              fontSize: 16,
              color: '#64748B',
              lineHeight: 1.7,
              maxWidth: 640,
              margin: '0 auto 32px',
            }}
          >
            Verdaxis does not self-certify. All environmental attributes on the platform must be
            verified by accredited third-party bodies.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 16,
              marginBottom: 32,
            }}
          >
            {verificationSchemes.map((scheme) => (
              <div
                key={scheme}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                {scheme}
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 15,
              color: '#64748B',
              lineHeight: 1.7,
              maxWidth: 600,
              margin: '0 auto',
              fontStyle: 'italic',
            }}
          >
            Verdaxis acts as the registry and marketplace &mdash; never as the certifier. This
            separation of roles is fundamental to platform integrity.
          </p>
        </div>
      </section>

      {/* ---- Section 5: What Verdaxis Does NOT Allow ---- */}
      <section
        style={{
          ...sectionPadding,
          background: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <XOctagon size={24} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              What Verdaxis Does Not Allow
            </h2>
          </div>

          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 12,
              padding: 28,
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            {exclusions.map((exclusion) => (
              <div
                key={exclusion}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <XOctagon
                  size={16}
                  color="#EF4444"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <p style={{ fontSize: 15, color: '#7F1D1D', lineHeight: 1.6, margin: 0 }}>
                  {exclusion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Section 6: For Regulators & Auditors ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Eye size={24} color="#5DADE2" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              For Regulators &amp; Auditors
            </h2>
          </div>

          <p
            style={{
              fontSize: 16,
              color: '#64748B',
              lineHeight: 1.7,
              maxWidth: 640,
              margin: '0 auto 32px',
            }}
          >
            Verdaxis is designed to support regulatory oversight, not circumvent it.
          </p>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: 28,
              maxWidth: 640,
              margin: '0 auto 32px',
              textAlign: 'left',
            }}
          >
            {regulatorPoints.map((point) => (
              <div
                key={point}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <CheckCircle
                  size={18}
                  color="#5DADE2"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  {point}
                </p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
            Interested in regulatory partnership?{' '}
            <a
              href="mailto:compliance@verdaxis.exchange"
              style={{
                color: '#5DADE2',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Contact us
            </a>
          </p>
        </div>
      </section>

      {/* ---- Section 7: CTA ---- */}
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
            See how Verdaxis works end-to-end
          </h2>
          <Link
            to="/how-it-works"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
              color: '#FFFFFF',
              padding: '14px 36px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
              marginTop: 12,
            }}
          >
            How It Works
          </Link>
        </div>
      </section>
    </div>
  );
};
