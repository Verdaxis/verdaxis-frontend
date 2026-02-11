import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { educationArticles } from '../../data/educationArticles';

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
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Back link */}
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

          {/* Category badge */}
          <div style={{ marginBottom: 16 }}>
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
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#F8FAFC',
              lineHeight: 1.25,
              marginBottom: 16,
            }}
          >
            {article.title}
          </h1>

          {/* Read time */}
          <span
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
          </span>
        </div>
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
            <p
              key={idx}
              style={{
                fontSize: 16,
                color: '#334155',
                lineHeight: 1.8,
                marginBottom: 24,
              }}
            >
              {para}
            </p>
          ))}

          {/* Back link at bottom */}
          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: 32,
              marginTop: 32,
            }}
          >
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
          </div>
        </div>
      </section>
    </div>
  );
};
