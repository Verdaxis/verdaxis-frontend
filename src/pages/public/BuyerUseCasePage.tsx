import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ship,
  Zap,
  Globe,
  BarChart2,
  Layers,
  ArrowLeftRight,
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
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ACCENT = '#5DADE2';

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
  const { t, ready } = useNamespace('public');
  if (!ready) return null;

  const valueProps = [
    {
      icon: Globe,
      title: t('buyer.valueProps.items.0.title'),
      description: t('buyer.valueProps.items.0.description'),
    },
    {
      icon: Zap,
      title: t('buyer.valueProps.items.1.title'),
      description: t('buyer.valueProps.items.1.description'),
    },
    {
      icon: Layers,
      title: t('buyer.valueProps.items.2.title'),
      description: t('buyer.valueProps.items.2.description'),
    },
    {
      icon: BarChart2,
      title: t('buyer.valueProps.items.3.title'),
      description: t('buyer.valueProps.items.3.description'),
    },
    {
      icon: ArrowLeftRight,
      title: t('buyer.valueProps.items.4.title'),
      description: t('buyer.valueProps.items.4.description'),
    },
  ];

  const howItWorksSteps = [
    t('buyer.howItWorks.steps.0'),
    t('buyer.howItWorks.steps.1'),
    t('buyer.howItWorks.steps.2'),
  ];

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
            {t('buyer.hero.title')}
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
            {t('buyer.hero.subtitle')}
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
          <h2 style={sectionTitle}>{t('buyer.valueProps.title')}</h2>
          <p style={sectionSubtitle}>{t('buyer.valueProps.subtitle')}</p>
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
          <h2 style={sectionTitle}>{t('buyer.howItWorks.title')}</h2>
          <p style={sectionSubtitle}>{t('buyer.howItWorks.subtitle')}</p>
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
              {t('buyer.cta.title')}
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
              {t('buyer.cta.subtitle')}
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
                {t('buyer.cta.button')}
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
