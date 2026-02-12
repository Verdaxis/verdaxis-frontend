import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
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
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  DotGrid,
  CircuitLines,
  LeafDecor,
  HoverButton,
} from '../../components/public/motionUtils';

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
  fontWeight: 400,
  fontFamily: '"DM Serif Display", serif',
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
/*  Responsive style tag                                               */
/* ================================================================== */

const responsiveStyles = `
  @media (max-width: 640px) {
    .compliance-grid-3col {
      grid-template-columns: 1fr !important;
    }
  }
`;

/* ================================================================== */
/*  ComplianceInfoPage                                                  */
/* ================================================================== */

export const ComplianceInfoPage: React.FC = () => {
  return (
    <div>
      <style>{responsiveStyles}</style>

      {/* ---- Section 1: Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 72px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GradientOrb
          color="rgba(93,173,226,0.08)"
          size={500}
          style={{ top: -200, left: -150 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.06)"
          size={400}
          style={{ bottom: -180, right: -120 }}
        />
        <CircuitLines
          color="rgba(93,173,226,0.06)"
          style={{ width: 220, top: 40, right: 40 }}
        />
        <DotGrid
          color="rgba(248,250,252,0.04)"
          style={{ bottom: 20, left: 30 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 400,
              fontFamily: '"DM Serif Display", serif',
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
        </motion.div>
      </section>

      {/* ---- Section 2: Double-Counting Prevention ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <LeafDecor style={{ width: 180, top: -40, right: -30 }} />
        <DotGrid style={{ bottom: 20, left: 20 }} />

        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
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
              <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: '"DM Serif Display", serif', color: '#0F172A', margin: 0 }}>
                Double-Counting Prevention
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
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
          </Reveal>

          <Reveal delay={0.2}>
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
          </Reveal>
        </div>
      </section>

      {/* ---- Section 3: Regulatory Alignment Grid ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        <CircuitLines style={{ width: 200, top: 30, left: -40 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={sectionTitle}>Regulatory Alignment</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={sectionSubtitle}>
              Verdaxis is designed to work within &mdash; not around &mdash; the world&rsquo;s major
              low-carbon fuel regulations.
            </p>
          </Reveal>

          <StaggerGrid
            className="compliance-grid-3col"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
              maxWidth: 1000,
              margin: '0 auto',
            }}
          >
            {regulationCards.map(({ icon: Icon, title, items }) => (
              <StaggerItem key={title}>
                <HoverCard
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 28,
                    height: '100%',
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
                </HoverCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ---- Section 4: Third-Party Verification ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <DotGrid style={{ top: 20, right: 30 }} />
        <LeafDecor color="rgba(93,173,226,0.04)" style={{ width: 160, bottom: -30, left: -40 }} />

        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Reveal>
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
              <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: '"DM Serif Display", serif', color: '#0F172A', margin: 0 }}>
                Third-Party Verification
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
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
          </Reveal>

          <Reveal delay={0.2}>
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
          </Reveal>

          <Reveal delay={0.3}>
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
          </Reveal>
        </div>
      </section>

      {/* ---- Section 5: What Verdaxis Does NOT Allow ---- */}
      <section
        style={{
          ...sectionPadding,
          background: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <DotGrid color="rgba(239,68,68,0.03)" style={{ top: 30, left: 20 }} />

        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
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
              <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: '"DM Serif Display", serif', color: '#0F172A', margin: 0 }}>
                What Verdaxis Does Not Allow
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
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
          </Reveal>
        </div>
      </section>

      {/* ---- Section 6: For Regulators & Auditors ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <CircuitLines style={{ width: 180, top: 20, right: -20 }} />
        <LeafDecor style={{ width: 140, bottom: -30, left: -30 }} />

        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Reveal>
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
              <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: '"DM Serif Display", serif', color: '#0F172A', margin: 0 }}>
                For Regulators &amp; Auditors
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
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
          </Reveal>

          <Reveal delay={0.2}>
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
          </Reveal>

          <Reveal delay={0.3}>
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
          </Reveal>
        </div>
      </section>

      {/* ---- Section 7: CTA ---- */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={350}
          style={{ top: -120, right: -100 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.05)"
          size={300}
          style={{ bottom: -100, left: -80 }}
        />
        <CircuitLines
          color="rgba(248,250,252,0.04)"
          style={{ width: 200, bottom: 20, right: 30 }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 400,
                fontFamily: '"DM Serif Display", serif',
                color: '#F8FAFC',
                marginBottom: 16,
              }}
            >
              See how Verdaxis works end-to-end
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
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
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
