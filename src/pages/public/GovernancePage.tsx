import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Shield,
  Scale,
  Eye,
  Server,
  Users,
  BadgeCheck,
  CheckCircle,
  AlertTriangle,
  UserCircle,
  ArrowRight,
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

const guidingPrinciples = [
  {
    icon: Shield,
    title: 'Trust Before Liquidity',
    description:
      'The platform must earn credibility before scaling volume. We prioritise verified participants, auditable processes, and regulatory alignment over rapid growth.',
  },
  {
    icon: Scale,
    title: 'Rules Before Prices',
    description:
      'Market rules, compliance standards, and attribute definitions are established before trading begins. This ensures every participant operates under the same framework.',
  },
  {
    icon: Eye,
    title: 'Independence & Neutrality',
    description:
      'Verdaxis operates as a neutral infrastructure provider. Platform interests are structurally separated from participant interests.',
  },
];

const structuralRoles = [
  {
    icon: Server,
    title: 'Platform Operator',
    description:
      'Verdaxis as the technology and registry provider. Responsible for platform integrity, rule enforcement, and data security. Does not take proprietary trading positions.',
  },
  {
    icon: Users,
    title: 'Market Participants',
    description:
      'Producers, buyers, traders, and financiers who use the platform. Subject to platform rules, KYC requirements, and compliance standards.',
  },
  {
    icon: BadgeCheck,
    title: 'Verification Bodies',
    description:
      'Independent third-party certifiers who verify environmental attributes. Accredited by recognised standards bodies. Not affiliated with Verdaxis.',
  },
];

const dataNeutralityStatements = [
  'Verdaxis treats all participant data with equal confidentiality and does not use individual trading data to advantage any party.',
  'Aggregated, anonymised market data may be published for price discovery purposes.',
  'Individual trade data is never shared with competitors or used for proprietary analysis.',
  'Participants retain ownership of their data and can export it at any time.',
];

const conflictOfInterestPoints = [
  'If Verdaxis, its affiliates, or its principals engage in fuel trading activity, this is fully disclosed to all participants.',
  'Any affiliated trading activity is subject to the same rules as all other participants \u2014 no preferential access, no information advantage.',
  'An independent oversight function monitors for potential conflicts.',
  'Participants can report concerns through a confidential channel.',
];

const advisoryBoardMembers = [
  { role: 'Maritime Regulation Expert', status: 'To be announced' },
  { role: 'Carbon Markets Specialist', status: 'To be announced' },
  { role: 'Fuel Production Advisor', status: 'To be announced' },
  { role: 'Financial Compliance Advisor', status: 'To be announced' },
];

/* ------------------------------------------------------------------ */
/*  Responsive CSS                                                     */
/* ------------------------------------------------------------------ */

const responsiveStyleId = 'governance-responsive';

const responsiveCSS = `
@media (max-width: 640px) {
  .governance-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

/* Inject responsive styles once */
if (typeof document !== 'undefined' && !document.getElementById(responsiveStyleId)) {
  const style = document.createElement('style');
  style.id = responsiveStyleId;
  style.textContent = responsiveCSS;
  document.head.appendChild(style);
}

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

const iconBox: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginBottom: 20,
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 32,
};

/* ================================================================== */
/*  GovernancePage                                                      */
/* ================================================================== */

export const GovernancePage: React.FC = () => {
  return (
    <div>
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
        <DotGrid color="rgba(255,255,255,0.04)" style={{ top: 40, right: 60 }} />

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
            Governance &amp; Trust
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
            Before live trading, governance matters more than UI. Verdaxis is built on transparency,
            independence, and structural separation of roles.
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: Guiding Principles ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>Guiding Principles</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Three foundational principles guide every decision at Verdaxis.
          </p>
        </Reveal>

        <StaggerGrid
          className="governance-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {guidingPrinciples.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <HoverCard style={card}>
                <div style={iconBox}>
                  <Icon size={26} color="#5DADE2" />
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: 12,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
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

      {/* ---- Section 3: Structural Separation ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>Structural Separation of Roles</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Verdaxis maintains clear boundaries between platform operation, market participation, and
            verification to prevent conflicts of interest.
          </p>
        </Reveal>

        <StaggerGrid
          className="governance-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {structuralRoles.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <HoverCard
                style={{
                  ...card,
                  background: '#F8FAFC',
                  textAlign: 'center',
                }}
              >
                <div style={{ ...iconBox, margin: '0 auto 20px' }}>
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

      {/* ---- Section 4: Data Neutrality ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
              <h2 style={{ fontSize: 28, fontFamily: '"DM Serif Display", serif', fontWeight: 400, color: '#0F172A', margin: 0 }}>
                Data Neutrality Statement
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                ...card,
                maxWidth: 640,
                margin: '32px auto 0',
              }}
            >
              {dataNeutralityStatements.map((statement) => (
                <div
                  key={statement}
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
                    {statement}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Section 5: Conflict of Interest Policy ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
                  background: 'rgba(245, 158, 11, 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} color="#F59E0B" />
              </div>
              <h2 style={{ fontSize: 28, fontFamily: '"DM Serif Display", serif', fontWeight: 400, color: '#0F172A', margin: 0 }}>
                Conflict of Interest Policy
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                ...card,
                maxWidth: 640,
                margin: '32px auto 0',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
              }}
            >
              {conflictOfInterestPoints.map((point) => (
                <div
                  key={point}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color="#F59E0B"
                    style={{ flexShrink: 0, marginTop: 3 }}
                  />
                  <p style={{ fontSize: 15, color: '#78350F', lineHeight: 1.6, margin: 0 }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Section 6: Advisory Board ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <h2 style={sectionTitle}>Advisory Board</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={sectionSubtitle}>
              Verdaxis is assembling an advisory board of independent industry experts to guide
              platform governance.
            </p>
          </Reveal>

          <StaggerGrid
            className="governance-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginBottom: 40,
            }}
          >
            {advisoryBoardMembers.map(({ role, status }) => (
              <StaggerItem key={role}>
                <HoverCard
                  style={{
                    ...card,
                    background: '#FFFFFF',
                    textAlign: 'center',
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <UserCircle size={28} color="#94A3B8" />
                  </div>
                  <h4
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: 6,
                    }}
                  >
                    {role}
                  </h4>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#94A3B8',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    {status}
                  </p>
                </HoverCard>
              </StaggerItem>
            ))}
          </StaggerGrid>

          <Reveal>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
              Interested in joining our advisory board?{' '}
              <a
                href="mailto:governance@verdaxis.exchange"
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
        <DotGrid color="rgba(255,255,255,0.04)" style={{ bottom: 20, left: 40 }} />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
              Learn about our pilot programme and early access
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
              <Link
                to="/pilot"
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
                Pilot Programme
                <ArrowRight size={18} />
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
