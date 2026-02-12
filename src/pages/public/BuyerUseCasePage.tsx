import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ship,
  Zap,
  ShieldCheck,
  FileCheck,
  ClipboardCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
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

const ACCENT = '#5DADE2';

const valueProps = [
  {
    icon: Zap,
    title: 'Energy-Adjusted Pricing',
    description:
      'Stop comparing fuels by $/tonne alone. Verdaxis shows the true cost including energy content (MJ/kg), so you know what you\u2019re actually buying. A 7% spread in energy density can mean $50-70k difference on a single voyage.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Scope 3 Reductions',
    description:
      'Every fuel purchase on Verdaxis comes with verified CI data and chain-of-custody. Your Scope 3 claims are audit-ready from day one.',
  },
  {
    icon: FileCheck,
    title: 'FuelEU & ETS Compliance',
    description:
      'Know your compliance position before you buy. Verdaxis calculates FuelEU Maritime intensity, EU ETS exposure, and CII impact for each fuel option.',
  },
  {
    icon: ClipboardCheck,
    title: 'MC Declaration Ready',
    description:
      'Take your fuel purchases all the way to the Maritime Declaration. Verdaxis provides the documentation chain needed for FuelEU Maritime reporting.',
  },
];

const howItWorksSteps = [
  'Post your fuel requirements \u2014 type, volume, port, delivery window',
  'Review matched offers with CI, energy content, and compliance impact',
  'Complete the trade with full traceability for compliance reporting',
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: '"DM Serif Display", serif',
  fontSize: 32,
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
/*  BuyerUseCasePage                                                   */
/* ================================================================== */

export const BuyerUseCasePage: React.FC = () => {
  return (
    <div>
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
          size={500}
          color="rgba(93,173,226,0.07)"
          style={{ top: -150, right: -100 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}
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
            <Ship size={32} color={ACCENT} />
          </div>
          <h1
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: 42,
              fontWeight: 400,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            For Fuel Buyers & Operators
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
            Source verified low-carbon fuels with full compliance traceability
            &mdash; from energy-adjusted pricing to MC declaration.
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
          style={{ bottom: 20, right: 20 }}
          color="rgba(15,23,42,0.04)"
        />
        <Reveal>
          <h2 style={sectionTitle}>Why Buyers Choose Verdaxis</h2>
          <p style={sectionSubtitle}>
            Full visibility on what you are buying and how it impacts your compliance position.
          </p>
        </Reveal>
        <StaggerGrid
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
          className="buyer-value-grid"
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
          <p style={sectionSubtitle}>
            From fuel requirement to compliance-ready trade in three steps.
          </p>
        </Reveal>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {howItWorksSteps.map((step, idx) => (
            <Reveal key={idx} delay={idx * 0.15}>
              <div
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
            </Reveal>
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
          size={500}
          color="rgba(76,175,80,0.05)"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: 32,
                fontWeight: 400,
                color: '#F8FAFC',
                marginBottom: 16,
              }}
            >
              Ready to source with confidence?
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
              Join the Verdaxis pilot programme and start sourcing verified
              low-carbon fuels with full compliance traceability.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <HoverButton>
              <Link
                to="/pilot"
                style={{
                  display: 'inline-block',
                  background: `linear-gradient(135deg, ${ACCENT}, #4CAF50)`,
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

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 640px) {
          .buyer-value-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
