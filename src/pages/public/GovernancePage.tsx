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
import { useNamespace } from '../../hooks/useNamespace';

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
  const { t, ready } = useNamespace('public');
  if (!ready) return null;

  const guidingPrinciples = [
    {
      icon: Shield,
      title: t('governance.principles.items.0.title'),
      description: t('governance.principles.items.0.description'),
    },
    {
      icon: Scale,
      title: t('governance.principles.items.1.title'),
      description: t('governance.principles.items.1.description'),
    },
    {
      icon: Eye,
      title: t('governance.principles.items.2.title'),
      description: t('governance.principles.items.2.description'),
    },
  ];

  const structuralRoles = [
    {
      icon: Server,
      title: t('governance.roles.items.0.title'),
      description: t('governance.roles.items.0.description'),
    },
    {
      icon: Users,
      title: t('governance.roles.items.1.title'),
      description: t('governance.roles.items.1.description'),
    },
    {
      icon: BadgeCheck,
      title: t('governance.roles.items.2.title'),
      description: t('governance.roles.items.2.description'),
    },
  ];

  const dataNeutralityStatements = [
    t('governance.dataNeutrality.statements.0'),
    t('governance.dataNeutrality.statements.1'),
    t('governance.dataNeutrality.statements.2'),
    t('governance.dataNeutrality.statements.3'),
  ];

  const conflictOfInterestPoints = [
    t('governance.conflictOfInterest.points.0'),
    t('governance.conflictOfInterest.points.1'),
    t('governance.conflictOfInterest.points.2'),
    t('governance.conflictOfInterest.points.3'),
  ];

  const advisoryBoardMembers = [
    { role: t('governance.advisoryBoard.members.0.role'), status: t('governance.advisoryBoard.members.0.status') },
    { role: t('governance.advisoryBoard.members.1.role'), status: t('governance.advisoryBoard.members.1.status') },
    { role: t('governance.advisoryBoard.members.2.role'), status: t('governance.advisoryBoard.members.2.status') },
    { role: t('governance.advisoryBoard.members.3.role'), status: t('governance.advisoryBoard.members.3.status') },
  ];

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
            {t('governance.hero.title')}
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
            {t('governance.hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: Guiding Principles ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>{t('governance.principles.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('governance.principles.subtitle')}</p>
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
          <h2 style={sectionTitle}>{t('governance.roles.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('governance.roles.subtitle')}</p>
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
                {t('governance.dataNeutrality.title')}
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
                {t('governance.conflictOfInterest.title')}
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
            <h2 style={sectionTitle}>{t('governance.advisoryBoard.title')}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={sectionSubtitle}>{t('governance.advisoryBoard.subtitle')}</p>
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
              {t('governance.advisoryBoard.joinText')}{' '}
              <a
                href="mailto:governance@verdaxis.exchange"
                style={{
                  color: '#5DADE2',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                {t('governance.advisoryBoard.contactLink')}
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
              {t('governance.cta.title')}
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
                {t('governance.cta.button')}
                <ArrowRight size={18} />
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
