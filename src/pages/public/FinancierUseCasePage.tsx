import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Landmark,
  Database,
  TrendingUp,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  DotGrid,
  HoverButton,
} from '../../components/public/motionUtils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#9333EA';

const valueProps = [
  {
    icon: Database,
    title: 'Verified Sustainability Data',
    description:
      'Every data point on Verdaxis is independently verified and timestamped. Production volumes, CI scores, and compliance certifications — audit-ready from day one.',
  },
  {
    icon: ShieldCheck,
    title: 'Integrated Risk Management',
    description:
      'Built-in risk tools flag counterparty exposure, compliance gaps, and regulatory drift before they affect your portfolio — all from a single dashboard.',
  },
  {
    icon: Calculator,
    title: 'Reduced Diligence Cost',
    description:
      'Platform-verified counterparties, standardised data formats, and immutable audit trails cut the time and cost of sustainability due diligence significantly.',
  },
  {
    icon: TrendingUp,
    title: 'Market Intelligence & Forecasting',
    description:
      'Access forward price curves, supply/demand signals, and regulatory trend analysis to inform investment decisions and stress-test green finance structures.',
  },
];

const howItWorksSteps = [
  'Access bankable, auditable sustainability data across all platform participants',
  'Run integrated risk assessments and review standardised compliance reporting',
  'Apply market intelligence and forecasting to structure and price green finance deals',
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 32,
  fontFamily: '"DM Serif Display", serif',
  fontWeight: 400,
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
      {/* ---- Responsive override ---- */}
      <style>{`
        @media (max-width: 640px) {
          .financier-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ---- Hero ---- */}
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
          color="rgba(147,51,234,0.08)"
          size={500}
          style={{ top: -150, right: -100 }}
        />
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={400}
          style={{ bottom: -120, left: -80 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}
        >
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
              fontFamily: '"DM Serif Display", serif',
              fontWeight: 400,
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
            Verified data. Integrated risk management. Reduced diligence cost.
            Verdaxis gives green finance the intelligence it needs.
          </p>
        </motion.div>
      </section>

      {/* ---- Value Propositions ---- */}
      <section
        style={{
          ...sectionPadding,
          background: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <DotGrid
          color="rgba(147,51,234,0.06)"
          style={{ top: 20, right: 30 }}
        />
        <DotGrid
          color="rgba(147,51,234,0.04)"
          style={{ bottom: 20, left: 30 }}
        />

        <Reveal>
          <h2 style={sectionTitle}>Why Financiers Choose Verdaxis</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Verified data, integrated risk tools, and market forecasting — the investment intelligence green finance requires.
          </p>
        </Reveal>
        <StaggerGrid
          className="financier-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {valueProps.map(({ icon: Icon, title, description }) => (
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
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ---- How It Works For You ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>How It Works For You</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            From verified data to confident investment decisions in three steps.
          </p>
        </Reveal>
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
              <Reveal delay={idx * 0.15}>
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
              </Reveal>
              <Reveal delay={idx * 0.15 + 0.05}>
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
              </Reveal>
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
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GradientOrb
          color="rgba(147,51,234,0.06)"
          size={350}
          style={{ top: -100, left: -80 }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <h2
              style={{
                fontSize: 32,
                fontFamily: '"DM Serif Display", serif',
                fontWeight: 400,
                color: '#F8FAFC',
                marginBottom: 16,
              }}
            >
              Ready to invest with verified intelligence?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p
              style={{
                fontSize: 16,
                color: '#94A3B8',
                lineHeight: 1.7,
                marginBottom: 32,
              }}
            >
              Join the Verdaxis pilot programme and access bankable sustainability data,
              integrated risk management, and market forecasting — all in one platform.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <HoverButton>
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
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
