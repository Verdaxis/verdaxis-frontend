import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Factory,
  Zap,
  TrendingUp,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  DotGrid,
  LeafDecor,
  HoverButton,
} from '../../components/public/motionUtils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#4CAF50';

const valueProps = [
  {
    icon: Zap,
    title: 'Maximum Market Reach',
    description:
      'List your production once and get it in front of the largest pool of qualified fuel buyers on the market. More eyeballs means more competitive bids and faster deal flow.',
  },
  {
    icon: TrendingUp,
    title: 'Lower Customer Acquisition Cost',
    description:
      'Stop spending on trade shows, cold outreach, and broker commissions. Verdaxis brings motivated buyers directly to your listings — dramatically cutting the cost of finding your next offtake partner.',
  },
  {
    icon: BarChart3,
    title: 'Deal Flow Analytics & Market Visibility',
    description:
      'See how your listings perform: views, bid activity, and price benchmarks across the market. Know where you stand and price with confidence.',
  },
  {
    icon: Calendar,
    title: 'Pre-Market Future Production',
    description:
      'Sell forward before the first barrel is produced. List upcoming production capacity today to secure committed buyers and give your project bankable revenue certainty.',
  },
];

const howItWorksSteps = [
  'List your production — current inventory or future capacity — on the Verdaxis marketplace',
  'Qualified buyers discover your listings and submit bids directly, with no intermediary friction',
  'Negotiate terms, agree price, and close deals faster with built-in contract tooling',
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
/*  ProducerUseCasePage                                                */
/* ================================================================== */

export const ProducerUseCasePage: React.FC = () => {
  return (
    <div>
      {/* ---- Responsive style override ---- */}
      <style>{`
        @media (max-width: 640px) {
          .producer-grid {
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
          color="rgba(76,175,80,0.08)"
          size={500}
          style={{ top: -150, right: -100 }}
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
            <Factory size={32} color={ACCENT} />
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
            Put your fuel production in front of the largest pool of qualified buyers.
            More reach, lower acquisition costs, and faster deal flow — all in one marketplace.
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
          style={{ top: 24, right: 24 }}
        />
        <Reveal>
          <h2 style={sectionTitle}>Why Producers Choose Verdaxis</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            The exchange built around your need for reach, visibility, and lower friction — from first listing to signed contract.
          </p>
        </Reveal>
        <StaggerGrid
          className="producer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
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
            Three steps from listing to closed deal.
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
        <LeafDecor
          style={{ width: 260, bottom: -60, left: -60 }}
          color="rgba(76,175,80,0.06)"
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
              Ready to grow your buyer network?
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
              Join the Verdaxis pilot programme and get your production in front of
              the market's most active fuel buyers today.
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
