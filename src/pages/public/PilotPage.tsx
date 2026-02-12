import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  Clock,
  Factory,
  Ship,
  TrendingUp,
  Handshake,
  Calendar,
  Mail,
} from 'lucide-react';
import { PilotApplicationForm } from '../../components/public/PilotApplicationForm';
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

const enabledFeatures = [
  'Read-only market data and price discovery',
  'Bilateral matchmaking between verified participants',
  'Energy value calculator with compliance modelling',
  'Producer map with project data',
  'Compliance documentation and traceability',
];

const notYetLiveFeatures = [
  'Live bids and offers (exchange orderbook)',
  'Automated trade settlement',
  'Futures and forward contracts',
  'Green financing module',
  'API access for programmatic trading',
];

const qualificationCards = [
  {
    icon: Factory,
    title: 'Fuel Producers',
    description:
      'Operational or near-COD facilities producing low-carbon fuels (methanol, ethanol, SAF). Third-party certification preferred.',
  },
  {
    icon: Ship,
    title: 'Fuel Buyers / Operators',
    description:
      'Shipping lines, fleet operators, or industrial buyers with active low-carbon fuel procurement needs. Compliance teams welcome.',
  },
  {
    icon: TrendingUp,
    title: 'Traders / Aggregators',
    description:
      'Established trading houses with existing positions in low-carbon fuels or environmental commodities.',
  },
  {
    icon: Handshake,
    title: 'Strategic Partners',
    description:
      'Top-tier shippers or producers willing to co-develop the platform. Influence how it looks and functions.',
  },
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

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 32,
};

const iconBox: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginBottom: 20,
};

/* ------------------------------------------------------------------ */
/*  Responsive style tag                                               */
/* ------------------------------------------------------------------ */

const responsiveStyles = `
  @media (max-width: 640px) {
    .pilot-grid-2col {
      grid-template-columns: 1fr !important;
    }
  }
`;

/* ================================================================== */
/*  PilotPage                                                          */
/* ================================================================== */

export const PilotPage: React.FC = () => {
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
        <DotGrid
          color="rgba(248,250,252,0.06)"
          style={{ top: 30, right: 40 }}
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
              fontFamily: '"DM Serif Display", serif',
              fontWeight: 400,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Pilot Programme
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
            We are deliberately onboarding select producers, buyers, and traders to ensure a
            professional, error-free launch. Quality over quantity.
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: What the Pilot Includes ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>What the Pilot Includes</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            A focused rollout to validate the platform with real participants and real needs.
          </p>
        </Reveal>

        <StaggerGrid
          className="pilot-grid-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          {/* Enabled Column */}
          <StaggerItem>
            <HoverCard
              style={{
                ...card,
                borderTop: '4px solid #4CAF50',
                height: '100%',
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#4CAF50',
                  marginBottom: 24,
                }}
              >
                What's Enabled
              </h3>
              {enabledFeatures.map((feature) => (
                <div
                  key={feature}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle
                    size={18}
                    color="#4CAF50"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                    {feature}
                  </p>
                </div>
              ))}
            </HoverCard>
          </StaggerItem>

          {/* Not Yet Live Column */}
          <StaggerItem>
            <HoverCard
              style={{
                ...card,
                borderTop: '4px solid #94A3B8',
                background: '#F1F5F9',
                height: '100%',
              }}
            >
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#64748B',
                  marginBottom: 24,
                }}
              >
                What's Not Yet Live
              </h3>
              {notYetLiveFeatures.map((feature) => (
                <div
                  key={feature}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <Clock
                    size={18}
                    color="#94A3B8"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    {feature}
                  </p>
                </div>
              ))}
            </HoverCard>
          </StaggerItem>
        </StaggerGrid>
      </section>

      {/* ---- Section 3: Who Qualifies ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>Who Qualifies</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            We are selectively onboarding participants who can contribute to and benefit from the
            pilot.
          </p>
        </Reveal>

        <StaggerGrid
          className="pilot-grid-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1040,
            margin: '0 auto',
          }}
        >
          {qualificationCards.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <HoverCard
                style={{
                  ...card,
                  background: '#F8FAFC',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    ...iconBox,
                    background:
                      'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                  }}
                >
                  <Icon size={26} color="#5DADE2" />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: 12,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: '#64748B',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {description}
                </p>
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ---- Section 4: Application Form ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>Apply for the Pilot</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Fill in the form below and our team will review your application within 48 hours.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              ...card,
              padding: 40,
            }}
          >
            <PilotApplicationForm />
          </div>
        </Reveal>
      </section>

      {/* ---- Section 5: Timeline ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Calendar size={26} color="#5DADE2" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{ ...sectionTitle, marginBottom: 24 }}>Pilot Phase: Q1-Q2 2026</h2>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              style={{
                ...card,
                background: '#F8FAFC',
                textAlign: 'left',
                maxWidth: 560,
                margin: '0 auto',
              }}
            >
              <div
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
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  Limited onboarding — we are working with select participants to ensure platform
                  quality
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <CheckCircle
                  size={18}
                  color="#4CAF50"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                  Full launch follows successful pilot validation
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Section 6: CTA ---- */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
              Have questions before applying?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
              <a
                href="mailto:info@verdaxis.exchange"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
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
                <Mail size={18} />
                Speak to the Team
              </a>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
