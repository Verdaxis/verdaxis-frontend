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
import { useNamespace } from '../../hooks/useNamespace';

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
  const { t, ready } = useNamespace('public');
  if (!ready) return null;

  const enabledFeatures = [
    t('pilot.includes.enabled.features.0'),
    t('pilot.includes.enabled.features.1'),
    t('pilot.includes.enabled.features.2'),
    t('pilot.includes.enabled.features.3'),
    t('pilot.includes.enabled.features.4'),
  ];

  const notYetLiveFeatures = [
    t('pilot.includes.notYetLive.features.0'),
    t('pilot.includes.notYetLive.features.1'),
    t('pilot.includes.notYetLive.features.2'),
    t('pilot.includes.notYetLive.features.3'),
    t('pilot.includes.notYetLive.features.4'),
  ];

  const qualificationCards = [
    {
      icon: Factory,
      title: t('pilot.qualifies.cards.0.title'),
      description: t('pilot.qualifies.cards.0.description'),
    },
    {
      icon: Ship,
      title: t('pilot.qualifies.cards.1.title'),
      description: t('pilot.qualifies.cards.1.description'),
    },
    {
      icon: TrendingUp,
      title: t('pilot.qualifies.cards.2.title'),
      description: t('pilot.qualifies.cards.2.description'),
    },
    {
      icon: Handshake,
      title: t('pilot.qualifies.cards.3.title'),
      description: t('pilot.qualifies.cards.3.description'),
    },
  ];

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
            {t('pilot.hero.title')}
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
            {t('pilot.hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: What the Pilot Includes ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <Reveal>
          <h2 style={sectionTitle}>{t('pilot.includes.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('pilot.includes.subtitle')}</p>
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
                {t('pilot.includes.enabled.title')}
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
                {t('pilot.includes.notYetLive.title')}
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
          <h2 style={sectionTitle}>{t('pilot.qualifies.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('pilot.qualifies.subtitle')}</p>
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
          <h2 style={sectionTitle}>{t('pilot.applyForm.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('pilot.applyForm.subtitle')}</p>
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
            <h2 style={{ ...sectionTitle, marginBottom: 24 }}>{t('pilot.timeline.title')}</h2>
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
                  {t('pilot.timeline.point0')}
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
                  {t('pilot.timeline.point1')}
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
              {t('pilot.cta.title')}
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
                {t('pilot.cta.button')}
              </a>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
