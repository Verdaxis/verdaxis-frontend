import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Factory,
  Users,
  BarChart3,
  ShieldCheck,
  Brain,
  TrendingUp,
  ArrowRight,
  Handshake,
  Eye,
  Zap,
  LineChart,
  Globe,
  Package,
  Link as LinkIcon,
  Shield,
} from 'lucide-react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  CircuitLines,
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

/* ------------------------------------------------------------------ */
/*  Three-Column Platform Benefits                                     */
/* ------------------------------------------------------------------ */

const BenefitColumn: React.FC<{
  title: string;
  subtitle: string;
  items: { icon: React.FC<any>; text: string }[];
  accentColor: string;
  delay: number;
  isCenter?: boolean;
}> = ({ title, subtitle, items, accentColor, delay, isCenter }) => (
  <Reveal delay={delay}>
    <div
      style={{
        background: isCenter
          ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
          : '#FFFFFF',
        border: isCenter ? 'none' : '1px solid #E2E8F0',
        borderRadius: 16,
        padding: 32,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(isCenter
          ? { boxShadow: '0 8px 32px rgba(15,23,42,0.2)' }
          : {}),
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: '"DM Serif Display", serif',
            color: isCenter ? '#F8FAFC' : '#0F172A',
            marginBottom: 4,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: '#94A3B8',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {items.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: isCenter ? 0 : -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay + i * 0.08, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isCenter
                  ? `${accentColor}20`
                  : `${accentColor}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Icon size={16} color={accentColor} />
            </div>
            <p
              style={{
                fontSize: 14,
                color: isCenter ? '#CBD5E1' : '#475569',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/*  Arrow Connector Between Columns                                    */
/* ------------------------------------------------------------------ */

const ColumnArrow: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
    }}
    className="hiw-column-arrow"
  >
    <motion.div
      animate={{ x: [0, 6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ArrowRight size={24} color="#CBD5E1" />
    </motion.div>
  </div>
);

/* ================================================================== */
/*  HowItWorksPage                                                     */
/* ================================================================== */

export const HowItWorksPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
  if (!ready) return null;

  const sellerBenefits = [
    { icon: Users, text: t('howItWorks.benefits.sellers.items.0') },
    { icon: TrendingUp, text: t('howItWorks.benefits.sellers.items.1') },
    { icon: Handshake, text: t('howItWorks.benefits.sellers.items.2') },
    { icon: Eye, text: t('howItWorks.benefits.sellers.items.3') },
    { icon: Factory, text: t('howItWorks.benefits.sellers.items.4') },
  ];

  const platformCapabilities = [
    { icon: BarChart3, text: t('howItWorks.benefits.platform.items.0') },
    { icon: TrendingUp, text: t('howItWorks.benefits.platform.items.1') },
    { icon: ShieldCheck, text: t('howItWorks.benefits.platform.items.2') },
    { icon: Shield, text: t('howItWorks.benefits.platform.items.3') },
    { icon: Brain, text: t('howItWorks.benefits.platform.items.4') },
  ];

  const buyerBenefits = [
    { icon: Globe, text: t('howItWorks.benefits.buyers.items.0') },
    { icon: Eye, text: t('howItWorks.benefits.buyers.items.1') },
    { icon: Zap, text: t('howItWorks.benefits.buyers.items.2') },
    { icon: LineChart, text: t('howItWorks.benefits.buyers.items.3') },
    { icon: Handshake, text: t('howItWorks.benefits.buyers.items.4') },
  ];

  const principles = [
    {
      icon: Package,
      title: t('howItWorks.principles.items.0.title'),
      description: t('howItWorks.principles.items.0.description'),
    },
    {
      icon: Shield,
      title: t('howItWorks.principles.items.1.title'),
      description: t('howItWorks.principles.items.1.description'),
    },
    {
      icon: LinkIcon,
      title: t('howItWorks.principles.items.2.title'),
      description: t('howItWorks.principles.items.2.description'),
    },
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
          color="rgba(76,175,80,0.08)"
          size={500}
          style={{ top: -150, right: -100 }}
        />
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={350}
          style={{ bottom: -120, left: -80 }}
        />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
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
              {t('howItWorks.hero.title')}
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <p
              style={{
                fontSize: 18,
                color: '#94A3B8',
                lineHeight: 1.7,
                maxWidth: 620,
                margin: '0 auto',
              }}
            >
              {t('howItWorks.hero.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Section 2: Three-Column Platform Benefits ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <CircuitLines
          color="rgba(93,173,226,0.06)"
          style={{ width: 300, top: 40, right: -60 }}
        />
        <CircuitLines
          color="rgba(76,175,80,0.05)"
          style={{ width: 260, bottom: 60, left: -40, transform: 'scaleX(-1)' }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={sectionTitle}>{t('howItWorks.benefits.title')}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={sectionSubtitle}>
              {t('howItWorks.benefits.subtitle')}
            </p>
          </Reveal>

          {/* Three columns with arrows */}
          <div
            className="hiw-benefits-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1.1fr auto 1fr',
              gap: 0,
              maxWidth: 1100,
              margin: '0 auto',
              alignItems: 'stretch',
            }}
          >
            <BenefitColumn
              title={t('howItWorks.benefits.sellers.title')}
              subtitle={t('howItWorks.benefits.sellers.subtitle')}
              items={sellerBenefits}
              accentColor="#4CAF50"
              delay={0}
            />
            <ColumnArrow />
            <BenefitColumn
              title={t('howItWorks.benefits.platform.title')}
              subtitle={t('howItWorks.benefits.platform.subtitle')}
              items={platformCapabilities}
              accentColor="#5DADE2"
              delay={0.15}
              isCenter
            />
            <ColumnArrow />
            <BenefitColumn
              title={t('howItWorks.benefits.buyers.title')}
              subtitle={t('howItWorks.benefits.buyers.subtitle')}
              items={buyerBenefits}
              accentColor="#5DADE2"
              delay={0.3}
            />
          </div>
        </div>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 900px) {
            .hiw-benefits-grid {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
              max-width: 480px !important;
            }
            .hiw-column-arrow {
              transform: rotate(90deg);
              padding: 8px 0 !important;
            }
          }
        `}</style>
      </section>

      {/* ---- Section 3: Key Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>{t('howItWorks.principles.title')}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p style={sectionSubtitle}>
            {t('howItWorks.principles.subtitle')}
          </p>
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
          {principles.map(({ icon: Icon, title, description }) => (
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
                    background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} color="#5DADE2" />
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

      {/* ---- Section 5: CTA ---- */}
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
          color="rgba(76,175,80,0.06)"
          size={400}
          style={{ top: -120, left: '50%', transform: 'translateX(-50%)' }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
              {t('howItWorks.cta.title')}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
              <Link
                to="/fuels"
                style={{
                  display: 'inline-block',
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
                {t('howItWorks.cta.button')}
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
