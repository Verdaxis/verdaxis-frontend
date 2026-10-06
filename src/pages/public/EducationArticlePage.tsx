import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { EDUCATION_CATEGORY_KEYS, getEducationArticles } from '../../data/educationArticles';
import { Reveal, GradientOrb, HoverButton } from '../../components/public/motionUtils';
import { useNamespace } from '../../hooks/useNamespace';
import { useLocalePath } from '../../hooks/useLocalePath';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const categoryColors: Record<string, { bg: string; text: string }> = {
  Fundamentals: { bg: 'rgba(93,173,226,0.12)', text: '#5DADE2' },
  Compliance: { bg: 'rgba(76,175,80,0.12)', text: '#4CAF50' },
  Market: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
};

/* ================================================================== */
/*  EducationArticlePage                                                */
/* ================================================================== */

export const EducationArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, ready: publicReady } = useNamespace('public');
  const { t: educationT, ready: educationReady } = useNamespace('education');
  const localePath = useLocalePath();

  if (!publicReady || !educationReady) return null;

  const article = getEducationArticles().find((a) => a.slug === slug);

  /* ---- Not found ---- */
  if (!article) {
    return (
      <div
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: 16,
          }}
        >
          {t('educationArticle.notFound.title')}
        </h1>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24 }}>
          {t('educationArticle.notFound.message')}
        </p>
        <HoverButton>
          <Link
            to={localePath('/education')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 15,
              fontWeight: 600,
              color: '#5DADE2',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            {t('educationArticle.backToEducation')}
          </Link>
        </HoverButton>
      </div>
    );
  }

  /* ---- Article found ---- */
  const colors = categoryColors[article.category] ?? { bg: '#F1F5F9', text: '#64748B' };
  const paragraphs = article.content.split('\n\n');

  return (
    <div>
      {/* ---- Header ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 64px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient orbs */}
        <GradientOrb
          color="rgba(93,173,226,0.08)"
          size={500}
          style={{ top: -180, right: -120 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.06)"
          size={350}
          style={{ bottom: -100, left: -80 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}
        >
          {/* Back link */}
          <HoverButton>
            <Link
              to={localePath('/education')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                color: '#94A3B8',
                textDecoration: 'none',
                marginBottom: 24,
              }}
            >
              <ArrowLeft size={16} />
              {t('educationArticle.backToEducation')}
            </Link>
          </HoverButton>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 16, marginTop: 24 }}
          >
            <span
              style={{
                display: 'inline-block',
                background: colors.bg,
                color: colors.text,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 6,
              }}
            >
              {t(`education.categories.${EDUCATION_CATEGORY_KEYS[article.category]}`)}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 38,
              fontFamily: '"DM Serif Display", serif',
              fontWeight: 400,
              color: '#F8FAFC',
              lineHeight: 1.25,
              marginBottom: 16,
            }}
          >
            {article.title}
          </motion.h1>

          {/* Article provenance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: '#94A3B8',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} />
              {article.readTime} {t('educationArticle.minRead')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{educationT('articleMeta.maintainedBy', { name: article.maintainer })}</span>
            <span aria-hidden="true">·</span>
            <span>{educationT('articleMeta.sourcesChecked', { date: article.sourcesCheckedOn })}</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ---- Content ---- */}
      <section
        style={{
          padding: '56px 24px 96px',
          background: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {paragraphs.map((para, idx) => (
            <Reveal key={idx} delay={idx < 4 ? idx * 0.08 : 0}>
              <p
                style={{
                  fontSize: 16,
                  color: '#334155',
                  lineHeight: 1.8,
                  marginBottom: 24,
                }}
              >
                {para}
              </p>
            </Reveal>
          ))}

          <Reveal>
            <section
              aria-labelledby="education-primary-references"
              style={{
                borderTop: '1px solid #E2E8F0',
                paddingTop: 28,
                marginTop: 32,
              }}
            >
              <h2
                id="education-primary-references"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 12,
                }}
              >
                {educationT('articleMeta.primaryReferences')}
              </h2>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {article.references.map((reference) => (
                  <li key={reference.url} style={{ marginBottom: 8, color: '#475569' }}>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563EB', textDecoration: 'underline' }}
                    >
                      {reference.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          {/* Back link at bottom */}
          <Reveal>
            <div
              style={{
                borderTop: '1px solid #E2E8F0',
                paddingTop: 32,
                marginTop: 32,
              }}
            >
              <HoverButton>
                <Link
                  to={localePath('/education')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#5DADE2',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={16} />
                  {t('educationArticle.backToEducation')}
                </Link>
              </HoverButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
