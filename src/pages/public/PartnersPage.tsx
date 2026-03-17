import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Handshake, Clock, ArrowRight, Building2 } from 'lucide-react';
import { getEducationArticles, type EducationArticle } from '../../data/educationArticles';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  HoverButton,
  CircuitLines,
} from '../../components/public/motionUtils';
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const categoryColors: Record<string, { bg: string; text: string }> = {
  Fundamentals: { bg: 'rgba(93,173,226,0.12)', text: '#5DADE2' },
  Compliance: { bg: 'rgba(76,175,80,0.12)', text: '#4CAF50' },
  Market: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
};

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

/* ------------------------------------------------------------------ */
/*  InsightCard (rebranded ArticleCard)                                */
/* ------------------------------------------------------------------ */

const InsightCard: React.FC<{ article: EducationArticle; readMoreLabel: string; minReadLabel: string }> = ({ article, readMoreLabel, minReadLabel }) => {
  const colors = categoryColors[article.category] ?? { bg: '#F1F5F9', text: '#64748B' };

  return (
    <HoverCard
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div>
        <span
          style={{
            display: 'inline-block',
            background: colors.bg,
            color: colors.text,
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {article.category}
        </span>

        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          {article.title}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: '#64748B',
            lineHeight: 1.7,
            margin: '0 0 20px',
          }}
        >
          {article.summary}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            color: '#94A3B8',
          }}
        >
          <Clock size={14} />
          {article.readTime} {minReadLabel}
        </span>

        <Link
          to={`/education/${article.slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 14,
            fontWeight: 600,
            color: '#5DADE2',
            textDecoration: 'none',
          }}
        >
          {readMoreLabel}
          <ArrowRight size={16} />
        </Link>
      </div>
    </HoverCard>
  );
};

/* ================================================================== */
/*  PartnersPage                                                       */
/* ================================================================== */

export const PartnersPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!ready) return null;

  const categories = [
    t('partners.categories.all'),
    t('partners.categories.fundamentals'),
    t('partners.categories.compliance'),
    t('partners.categories.market'),
  ];

  // Map translated label back to English key for filtering
  const categoryKeyMap: Record<string, string> = {
    [t('partners.categories.all')]: 'All',
    [t('partners.categories.fundamentals')]: 'Fundamentals',
    [t('partners.categories.compliance')]: 'Compliance',
    [t('partners.categories.market')]: 'Market',
  };

  const activeCategoryKey = categoryKeyMap[activeCategory] ?? 'All';

  const filtered =
    activeCategoryKey === 'All'
      ? getEducationArticles()
      : getEducationArticles().filter((a) => a.category === activeCategoryKey);

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
          color="rgba(93,173,226,0.08)"
          size={500}
          style={{ top: -150, right: -100 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.06)"
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
              background: 'rgba(93,173,226,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Handshake size={30} color="#5DADE2" />
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
            {t('partners.hero.title')}
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
            {t('partners.hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ---- Partner Network Coming Soon ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <CircuitLines
          color="rgba(93,173,226,0.05)"
          style={{ width: 260, top: 30, right: -40 }}
        />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '48px 32px',
              }}
            >
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
                <Building2 size={28} color="#5DADE2" />
              </div>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  fontFamily: '"DM Serif Display", serif',
                  color: '#0F172A',
                  marginBottom: 12,
                }}
              >
                {t('partners.network.title')}
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  lineHeight: 1.7,
                  maxWidth: 520,
                  margin: '0 auto 24px',
                }}
              >
                {t('partners.network.subtitle')}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                  color: '#5DADE2',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '8px 20px',
                  borderRadius: 8,
                }}
              >
                {t('partners.network.comingSoon')}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Partner Insights (articles) ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <h2
              style={{
                fontSize: 32,
                fontFamily: '"DM Serif Display", serif',
                fontWeight: 400,
                color: '#0F172A',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {t('partners.insights.title')}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p
              style={{
                fontSize: 16,
                color: '#64748B',
                textAlign: 'center',
                maxWidth: 640,
                margin: '0 auto 40px',
                lineHeight: 1.6,
              }}
            >
              {t('partners.insights.subtitle')}
            </p>
          </Reveal>

          {/* Category filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 40,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: isActive ? '2px solid #5DADE2' : '1px solid #E2E8F0',
                    background: isActive ? 'rgba(93,173,226,0.10)' : '#FFFFFF',
                    color: isActive ? '#5DADE2' : '#64748B',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </motion.button>
              );
            })}
          </div>

          {/* Article grid */}
          <StaggerGrid
            key={activeCategory}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {filtered.map((article) => (
              <StaggerItem key={article.slug}>
                <InsightCard
                  article={article}
                  readMoreLabel={t('partners.insights.readMore')}
                  minReadLabel={t('partners.insights.minRead')}
                />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>
    </div>
  );
};
