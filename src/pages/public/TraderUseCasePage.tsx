import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeftRight,
  Droplets,
  BarChart3,
  Settings,
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

const ACCENT = '#F59E0B';

const valueProps = [
  {
    icon: Droplets,
    title: 'Deep Liquidity Pool',
    description:
      'Verdaxis aggregates bids and asks across regions and counterparties in real time, giving traders the depth and immediacy they need to execute at scale.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Hedging Tools & Swaps',
    description:
      'Access paper trading instruments — swaps and forwards — alongside physical contracts. Manage exposure and lock in margins with standardised, exchange-grade structures.',
  },
  {
    icon: BarChart3,
    title: 'Price Discovery & Market Intelligence',
    description:
      'Transparent price formation driven by live order flow. Market intelligence and forecasting tools help you anticipate moves and inform strategy ahead of the curve.',
  },
  {
    icon: Settings,
    title: 'Integrated Risk Management',
    description:
      'Monitor open positions, margin exposure, and settlement obligations in one place. Automated workflows reduce manual reconciliation and counterparty risk.',
  },
];

const howItWorksSteps = [
  'Access the live orderbook \u2014 real-time bids, asks, and depth across fuel types and regions',
  'Execute spot trades, swaps, or forwards with standardised terms and verified sustainability data',
  'Monitor positions, risk exposure, and market intelligence \u2014 all in a single dashboard',
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

/* ---- Responsive style tag ---- */
const responsiveCSS = `
@media (max-width: 640px) {
  .trader-value-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

/* ================================================================== */
/*  TraderUseCasePage                                                  */
/* ================================================================== */

export const TraderUseCasePage: React.FC = () => {
  return (
    <div>
      <style>{responsiveCSS}</style>

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
          color="rgba(245,158,11,0.08)"
          size={500}
          style={{ top: -200, right: -150 }}
        />
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={400}
          style={{ bottom: -180, left: -120 }}
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
            <ArrowLeftRight size={32} color={ACCENT} />
          </div>
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
            Deep liquidity. Hedging tools and swaps. Real-time price discovery
            and market intelligence — built for professional fuel traders.
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
        <DotGrid style={{ top: 24, right: 32 }} />
        <DotGrid style={{ bottom: 24, left: 32 }} />

        <Reveal>
          <h2 style={sectionTitle}>Why Traders Choose Verdaxis</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Exchange-grade tools — liquidity, hedging, risk management, and market data — in one integrated platform.
          </p>
        </Reveal>
        <StaggerGrid
          className="trader-value-grid"
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
            From orderbook to settled position in three steps.
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
          color="rgba(245,158,11,0.06)"
          size={350}
          style={{ top: -120, left: -100 }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
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
              Ready to access real liquidity?
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
              Join the Verdaxis pilot programme and trade with institutional liquidity,
              hedging tools, and live market intelligence from day one.
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
