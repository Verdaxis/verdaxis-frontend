import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalePath } from '../../hooks/useLocalePath';

const DARK = '#0F172A';
const BLUE = '#5DADE2';

const FooterColumn: React.FC<{ title: string; links: { label: string; to: string }[] }> = ({ title, links }) => (
  <div>
    <h4
      style={{
        fontSize: 13,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#94A3B8',
        marginBottom: 16,
      }}
    >
      {title}
    </h4>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            style={{
              fontSize: 14,
              color: '#CBD5E1',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = BLUE;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#CBD5E1';
            }}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export const PublicFooter: React.FC = () => {
  const { t } = useTranslation();
  const lp = useLocalePath();

  const PLATFORM_LINKS = [
    { label: t('nav.howItWorks'), to: lp('/how-it-works') },
    { label: t('nav.fuels'), to: lp('/fuels') },
    { label: t('nav.compliance'), to: lp('/compliance') },
    { label: t('nav.education'), to: lp('/education') },
    { label: t('nav.roadmap'), to: lp('/roadmap') },
  ];

  const SOLUTIONS_LINKS = [
    { label: t('nav.forProducers'), to: lp('/for-producers') },
    { label: t('nav.forBuyers'), to: lp('/for-buyers') },
    { label: t('nav.forTraders'), to: lp('/for-traders') },
    { label: t('nav.forFinanciers'), to: lp('/for-financiers') },
  ];

  const TOOLS_LINKS = [
    { label: t('nav.energyCalculator'), to: lp('/tools/energy-calculator') },
  ];

  return (
    <footer
      style={{
        background: DARK,
        color: '#CBD5E1',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Main Footer Grid */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '64px 24px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 40,
        }}
        className="public-footer-grid"
      >
        {/* Brand Column */}
        <div>
          <Link to={lp('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
            <img
              src="/verdaxis-logo-words-right.png"
              alt="Verdaxis"
              style={{
                width: 154,
                height: 42,
                objectFit: 'contain',
                objectPosition: 'left center',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </Link>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94A3B8', maxWidth: 280 }}>
            {t('footer.tagline')}
          </p>
        </div>

        <FooterColumn title={t('footer.platform')} links={PLATFORM_LINKS} />
        <FooterColumn title={t('footer.solutions')} links={SOLUTIONS_LINKS} />
        <FooterColumn title={t('footer.tools')} links={TOOLS_LINKS} />
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '24px 24px',
          borderTop: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 13, color: '#64748B' }}>
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link
            to={lp('/governance')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            {t('nav.governance')}
          </Link>
          <Link
            to={lp('/privacy')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            {t('nav.privacy')}
          </Link>
          <Link
            to={lp('/terms')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            {t('nav.terms')}
          </Link>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 767px) {
          .public-footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .public-footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
