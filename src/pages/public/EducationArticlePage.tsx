import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { educationArticles } from '../../data/educationArticles';
import { Reveal, GradientOrb, HoverButton } from '../../components/public/motionUtils';

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
  const article = educationArticles.find((a) => a.slug === slug);

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
          Article not found
        </h1>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24 }}>
          The article you are looking for does not exist or has been moved.
        </p>
        <HoverButton>
          <Link
            to="/education"
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
            Back to Education
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
              to="/education"
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
              Back to Education
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
              {article.category}
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

          {/* Read time */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              color: '#94A3B8',
            }}
          >
            <Clock size={15} />
            {article.readTime} min read
          </motion.span>
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
                  to="/education"
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
                  Back to Education
                </Link>
              </HoverButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
