import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

/* ── Partner Data ── */

interface Partner {
  name: string;
  fullName: string;
  role: string;
  description: string;
  color: string;
  logoUrl: string;
}

const partners: Partner[] = [
  {
    name: 'Methanol Institute',
    fullName: 'Methanol Institute',
    role: 'Industry Standards Body',
    description:
      'Global trade association for the methanol industry. Members gain direct access to verified pricing, compliance data, and marketplace liquidity through the Verdaxis platform.',
    color: '#0078D4',
    logoUrl: 'https://methanol.org/wp-content/themes/methanol/images/logo.png',
  },
  {
    name: 'S&P Global Platts',
    fullName: 'S&P Global Commodity Insights',
    role: 'Pricing & Benchmarks',
    description:
      'The global benchmark for commodity pricing. Verdaxis integrates Platts assessments to provide transparent, reference-grade pricing across all fuel pathways.',
    color: '#E8373E',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/S%26P_Global_Platts_Logo.png',
  },
  {
    name: 'MPA Singapore',
    fullName: 'Maritime and Port Authority of Singapore',
    role: 'Regulatory Authority',
    description:
      'Singapore\'s maritime regulator and the world\'s largest bunkering port authority. Verdaxis aligns with MPA\'s Green Ship Programme and future fuels framework.',
    color: '#1B5E9C',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Maritime_and_Port_Authority_of_Singapore_%28logo%29.png/309px-Maritime_and_Port_Authority_of_Singapore_%28logo%29.png',
  },
  {
    name: 'Gena Solutions',
    fullName: 'GENA Solutions Oy',
    role: 'Analytics & Technology',
    description:
      'Finnish energy technology company providing advanced project analytics, cost curve modelling, and emissions analysis tools for industrial and energy transition projects.',
    color: '#00897B',
    logoUrl: 'https://storage.googleapis.com/b2match-as-1/mCCdjrAQutyQ32CXm4PzfPUF',
  },
];

/* ── Reveal wrapper ── */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ── Partner Card ── */

const PartnerCard: React.FC<{ partner: Partner; index: number }> = ({ partner, index }) => {
  return (
    <Reveal delay={index * 0.12}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 32,
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${partner.color}, ${partner.color}40)`,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo + Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 8,
              }}
            >
              <img src={partner.logoUrl} alt={partner.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: '"Montserrat", system-ui',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                {partner.name}
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: `${partner.color}0A`,
                  border: `1px solid ${partner.color}20`,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: partner.color,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: partner.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {partner.role}
                </span>
              </div>
            </div>
          </div>

          {/* Full name */}
          <p
            style={{
              fontSize: 13,
              color: '#64748B',
              fontWeight: 500,
              marginBottom: 12,
              fontStyle: 'italic',
            }}
          >
            {partner.fullName}
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: '#475569',
              lineHeight: 1.7,
            }}
          >
            {partner.description}
          </p>

          {/* Verification badge */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(76, 175, 80, 0.06)',
              border: '1px solid rgba(76, 175, 80, 0.15)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 2H14L16 4V8L14 10V14L12 16H8L6 14H2L0 12V8L2 6V2L4 0H8Z" fill="#4CAF50" fillOpacity="0.15" />
              <path d="M5 8L7 10L11 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#4CAF50',
                letterSpacing: '0.04em',
              }}
            >
              VERDAXIS VERIFIED PARTNER
            </span>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
};

/* ── Main Page ── */

export const PartnerShowcasePage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        color: '#0F172A',
        fontFamily: '"Montserrat", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            V
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A' }}>
            Verdaxis
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#94A3B8',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Partner Network {'\u2014'} Preview
        </div>
      </div>

      {/* Hero */}
      <section
        style={{
          padding: '80px 24px 60px',
          maxWidth: 900,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <Reveal>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(93,173,226,0.08)',
              border: '1px solid rgba(93,173,226,0.15)',
              padding: '6px 16px',
              borderRadius: 9999,
              marginBottom: 32,
            }}
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#5DADE2',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5DADE2', letterSpacing: '0.06em' }}>
              STRATEGIC ECOSYSTEM
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: 52,
              fontWeight: 400,
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: '-0.02em',
              color: '#0F172A',
            }}
          >
            Trusted by the{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              institutions
            </span>
            <br />
            that shape the market
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            style={{
              fontSize: 17,
              color: '#64748B',
              lineHeight: 1.75,
              maxWidth: 600,
              margin: '0 auto 40px',
            }}
          >
            Verdaxis partners with global pricing agencies, maritime regulators,
            technology providers, and industry standards bodies to build the most
            trusted exchange for low-carbon fuels.
          </p>
        </Reveal>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, #CBD5E1, transparent)',
            transformOrigin: 'center',
            maxWidth: 400,
            margin: '0 auto',
          }}
        />
      </section>

      {/* Partner Grid */}
      <section style={{ padding: '0 24px 96px', maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
          }}
          className="partner-grid"
        >
          {partners.map((p, i) => (
            <PartnerCard key={p.name} partner={p} index={i} />
          ))}
        </div>
      </section>

      {/* How Members Are Represented */}
      <section
        style={{
          padding: '80px 24px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#4CAF50',
                marginBottom: 16,
              }}
            >
              Member Representation
            </p>
            <h2
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: 36,
                fontWeight: 400,
                marginBottom: 20,
                color: '#0F172A',
              }}
            >
              How institute members appear on the platform
            </h2>
            <p
              style={{
                fontSize: 15,
                color: '#64748B',
                lineHeight: 1.75,
                maxWidth: 560,
                margin: '0 auto 48px',
              }}
            >
              Members of partner institutions receive a verified trust badge on their
              marketplace listings, establishing credibility without compromising the
              Verdaxis brand identity.
            </p>
          </Reveal>

          {/* Mock listing card */}
          <Reveal delay={0.2}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: 32,
                textAlign: 'left',
                maxWidth: 600,
                margin: '0 auto',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 16,
                }}
              >
                Example Marketplace Listing
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>Green Methanol {'\u2014'} Rotterdam</h3>
                  <p style={{ fontSize: 14, color: '#64748B' }}>OCI Global &middot; 5,000 MT &middot; Spot</p>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#5DADE2' }}>$485<span style={{ fontSize: 13, color: '#94A3B8' }}>/MT</span></div>
              </div>

              {/* Trust badges row */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '16px 0',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(76,175,80,0.08)',
                    border: '1px solid rgba(76,175,80,0.2)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M5 8L7 10L11 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#4CAF50' }}>Verdaxis Verified</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(0,120,212,0.08)',
                    border: '1px solid rgba(0,120,212,0.2)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#0078D4" strokeWidth="1.2" />
                    <text x="8" y="10.5" textAnchor="middle" fontWeight="800" fontSize="6" fill="#0078D4">MI</text>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0078D4' }}>MI Member</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(232,55,62,0.06)',
                    border: '1px solid rgba(232,55,62,0.15)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#E8373E' }}>Platts-Indexed</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>ISCC EU</span>
                </div>
              </div>

              {/* Info row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {[
                  { label: 'CI Score', value: '14.2 gCO\u2082e/MJ' },
                  { label: 'Energy', value: '19.9 MJ/kg' },
                  { label: 'FuelEU', value: 'Compliant' },
                  { label: 'Pathway', value: 'e-Methanol' },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust strip */}
      <section
        style={{
          padding: '48px 24px',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
          background: '#F8FAFC',
        }}
      >
        <Reveal>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 48,
              flexWrap: 'wrap',
              opacity: 0.5,
            }}
          >
            {partners.map((p) => (
              <img key={p.name} src={p.logoUrl} alt={p.name} style={{ width: 56, height: 56, objectFit: 'contain' }} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '32px 24px',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
          background: '#FFFFFF',
        }}
      >
        <p style={{ fontSize: 12, color: '#94A3B8' }}>
          This is a confidential preview page for internal use and partner discussions.
          Not published on the public Verdaxis website.
        </p>
        <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 8 }}>
          &copy; {new Date().getFullYear()} Verdaxis. All rights reserved.
        </p>
      </footer>

      {/* Responsive + Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Montserrat:wght@400;500;600;700;800&display=swap');

        @media (max-width: 768px) {
          .partner-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
