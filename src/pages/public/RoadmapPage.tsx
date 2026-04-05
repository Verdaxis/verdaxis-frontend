import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Shield, TrendingUp, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  HoverButton,
} from '../../components/public/motionUtils';
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Data types                                                         */
/* ------------------------------------------------------------------ */

interface Phase {
  number: number;
  label: string;
  title: string;
  description: string;
  features: string[];
  isCurrent: boolean;
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

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 32,
};

/* ------------------------------------------------------------------ */
/*  Pulsing keyframes (injected once)                                  */
/* ------------------------------------------------------------------ */

const pulseKeyframes = `
@keyframes roadmap-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(93,173,226,0.5); }
  50% { box-shadow: 0 0 0 10px rgba(93,173,226,0); }
}
`;

/* ------------------------------------------------------------------ */
/*  PhaseCardContent sub-component                                     */
/* ------------------------------------------------------------------ */

const PhaseCardContent: React.FC<{ phase: Phase; currentLabel: string }> = ({ phase, currentLabel }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: phase.isCurrent ? '#5DADE2' : '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {phase.label}
      </span>
      {phase.isCurrent && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
            padding: '2px 10px',
            borderRadius: 20,
            letterSpacing: 0.5,
          }}
        >
          {currentLabel}
        </span>
      )}
    </div>

    <h3
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: 10,
        lineHeight: 1.3,
      }}
    >
      {phase.title}
    </h3>

    <p
      style={{
        fontSize: 15,
        color: '#64748B',
        lineHeight: 1.6,
        marginBottom: 20,
      }}
    >
      {phase.description}
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {phase.features.map((feature) => (
        <div
          key={feature}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <CheckCircle
            size={16}
            color={phase.isCurrent ? '#4CAF50' : '#94A3B8'}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span
            style={{
              fontSize: 14,
              color: phase.isCurrent ? '#334155' : '#64748B',
              lineHeight: 1.5,
            }}
          >
            {feature}
          </span>
        </div>
      ))}
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/*  PhaseCard sub-component                                            */
/* ------------------------------------------------------------------ */

const PhaseCard: React.FC<{ phase: Phase; index: number; totalPhases: number; currentLabel: string }> = ({
  phase,
  index,
  totalPhases,
  currentLabel,
}) => {
  const isLeft = index % 2 === 0;

  const markerBase: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 800,
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  };

  const activeMarker: React.CSSProperties = {
    ...markerBase,
    background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
    color: '#FFFFFF',
    animation: 'roadmap-pulse 2s ease-in-out infinite',
  };

  const inactiveMarker: React.CSSProperties = {
    ...markerBase,
    background: '#FFFFFF',
    border: '3px solid #CBD5E1',
    color: '#94A3B8',
  };

  const cardStyle: React.CSSProperties = {
    ...card,
    flex: 1,
    maxWidth: 460,
    borderLeft: phase.isCurrent ? '4px solid #5DADE2' : '1px solid #E2E8F0',
  };

  return (
    <Reveal delay={index * 0.12}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
          position: 'relative',
          marginBottom: index < totalPhases - 1 ? 0 : 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            paddingRight: 24,
          }}
          className="roadmap-left-col"
        >
          {isLeft && (
            <div style={cardStyle}>
              <PhaseCardContent phase={phase} currentLabel={currentLabel} />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            width: 44,
          }}
        >
          <div style={phase.isCurrent ? activeMarker : inactiveMarker}>
            {phase.number}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-start',
            paddingLeft: 24,
          }}
          className="roadmap-right-col"
        >
          {!isLeft && (
            <div style={cardStyle}>
              <PhaseCardContent phase={phase} currentLabel={currentLabel} />
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
};

/* ------------------------------------------------------------------ */
/*  Mobile PhaseCard                                                   */
/* ------------------------------------------------------------------ */

const MobilePhaseCard: React.FC<{ phase: Phase; index: number; totalPhases: number; currentLabel: string }> = ({
  phase,
  index,
  totalPhases,
  currentLabel,
}) => {
  const markerBase: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 800,
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  };

  const activeMarker: React.CSSProperties = {
    ...markerBase,
    background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
    color: '#FFFFFF',
    animation: 'roadmap-pulse 2s ease-in-out infinite',
  };

  const inactiveMarker: React.CSSProperties = {
    ...markerBase,
    background: '#FFFFFF',
    border: '3px solid #CBD5E1',
    color: '#94A3B8',
  };

  const cardStyle: React.CSSProperties = {
    ...card,
    flex: 1,
    borderLeft: phase.isCurrent ? '4px solid #5DADE2' : '1px solid #E2E8F0',
  };

  return (
    <Reveal delay={index * 0.12}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          position: 'relative',
          paddingBottom: index < totalPhases - 1 ? 0 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            width: 36,
          }}
        >
          <div style={phase.isCurrent ? activeMarker : inactiveMarker}>
            {phase.number}
          </div>
        </div>

        <div style={cardStyle}>
          <PhaseCardContent phase={phase} currentLabel={currentLabel} />
        </div>
      </div>
    </Reveal>
  );
};

/* ================================================================== */
/*  RoadmapPage                                                        */
/* ================================================================== */

export const RoadmapPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
  if (!ready) return null;

  const currentLabel = t('roadmap.phases.current');

  const phases: Phase[] = [
    {
      number: 1,
      label: t('roadmap.phases.0.label'),
      title: t('roadmap.phases.0.title'),
      description: t('roadmap.phases.0.description'),
      features: [
        t('roadmap.phases.0.features.0'),
        t('roadmap.phases.0.features.1'),
        t('roadmap.phases.0.features.2'),
        t('roadmap.phases.0.features.3'),
        t('roadmap.phases.0.features.4'),
        t('roadmap.phases.0.features.5'),
      ],
      isCurrent: true,
    },
    {
      number: 2,
      label: t('roadmap.phases.1.label'),
      title: t('roadmap.phases.1.title'),
      description: t('roadmap.phases.1.description'),
      features: [
        t('roadmap.phases.1.features.0'),
        t('roadmap.phases.1.features.1'),
        t('roadmap.phases.1.features.2'),
        t('roadmap.phases.1.features.3'),
        t('roadmap.phases.1.features.4'),
        t('roadmap.phases.1.features.5'),
      ],
      isCurrent: false,
    },
    {
      number: 3,
      label: t('roadmap.phases.2.label'),
      title: t('roadmap.phases.2.title'),
      description: t('roadmap.phases.2.description'),
      features: [
        t('roadmap.phases.2.features.0'),
        t('roadmap.phases.2.features.1'),
        t('roadmap.phases.2.features.2'),
        t('roadmap.phases.2.features.3'),
        t('roadmap.phases.2.features.4'),
        t('roadmap.phases.2.features.5'),
      ],
      isCurrent: false,
    },
    {
      number: 4,
      label: t('roadmap.phases.3.label'),
      title: t('roadmap.phases.3.title'),
      description: t('roadmap.phases.3.description'),
      features: [
        t('roadmap.phases.3.features.0'),
        t('roadmap.phases.3.features.1'),
        t('roadmap.phases.3.features.2'),
        t('roadmap.phases.3.features.3'),
        t('roadmap.phases.3.features.4'),
        t('roadmap.phases.3.features.5'),
      ],
      isCurrent: false,
    },
  ];

  const designPrinciples = [
    {
      icon: Shield,
      title: t('roadmap.howWeBuild.principles.0.title'),
      description: t('roadmap.howWeBuild.principles.0.description'),
    },
    {
      icon: TrendingUp,
      title: t('roadmap.howWeBuild.principles.1.title'),
      description: t('roadmap.howWeBuild.principles.1.description'),
    },
    {
      icon: Scale,
      title: t('roadmap.howWeBuild.principles.2.title'),
      description: t('roadmap.howWeBuild.principles.2.description'),
    },
  ];

  return (
    <div>
      {/* Inject pulse animation keyframes */}
      <style>{pulseKeyframes}</style>

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
          size={500}
          color="rgba(93,173,226,0.08)"
          style={{ top: -150, left: -100 }}
        />
        <GradientOrb
          size={400}
          color="rgba(76,175,80,0.06)"
          style={{ bottom: -120, right: -80 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
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
            {t('roadmap.hero.title')}
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
            {t('roadmap.hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: Vertical Timeline ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* ---- Desktop Timeline ---- */}
          <div className="roadmap-desktop" style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 22,
                bottom: 22,
                width: 3,
                transform: 'translateX(-50%)',
                background: 'linear-gradient(to bottom, #5DADE2 0%, #CBD5E1 35%, #CBD5E1 100%)',
                zIndex: 1,
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {phases.map((phase, index) => (
                <PhaseCard
                  key={phase.number}
                  phase={phase}
                  index={index}
                  totalPhases={phases.length}
                  currentLabel={currentLabel}
                />
              ))}
            </div>
          </div>

          {/* ---- Mobile Timeline ---- */}
          <div className="roadmap-mobile" style={{ position: 'relative', display: 'none' }}>
            <div
              style={{
                position: 'absolute',
                left: 18,
                top: 18,
                bottom: 18,
                width: 3,
                background: 'linear-gradient(to bottom, #5DADE2 0%, #CBD5E1 35%, #CBD5E1 100%)',
                zIndex: 1,
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {phases.map((phase, index) => (
                <MobilePhaseCard
                  key={phase.number}
                  phase={phase}
                  index={index}
                  totalPhases={phases.length}
                  currentLabel={currentLabel}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Section 3: Design Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>{t('roadmap.howWeBuild.title')}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p style={sectionSubtitle}>{t('roadmap.howWeBuild.subtitle')}</p>
        </Reveal>

        <StaggerGrid
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {designPrinciples.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <HoverCard style={card}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background:
                      'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginBottom: 20,
                  }}
                >
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

      {/* ---- Section 4: CTA ---- */}
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
              {t('roadmap.cta.title')}
            </h2>
          </Reveal>
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
              {t('roadmap.cta.button')}
              <ArrowRight size={18} />
            </Link>
          </HoverButton>
        </div>
      </section>

      {/* ---- Responsive styles ---- */}
      <style>{`
        .roadmap-desktop { display: block; }
        .roadmap-mobile { display: none !important; }

        @media (max-width: 768px) {
          .roadmap-desktop { display: none !important; }
          .roadmap-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
};
