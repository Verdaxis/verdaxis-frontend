import React from 'react';
import { Link } from 'react-router-dom';
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
  const currentYear = new Date().getFullYear();
  const lp = useLocalePath();

  const PLATFORM_LINKS = [
    { label: 'How It Works', to: lp('/how-it-works') },
    { label: 'Fuels', to: lp('/fuels') },
    { label: 'Compliance', to: lp('/compliance') },
    { label: 'Education', to: lp('/education') },
    { label: 'Roadmap', to: lp('/roadmap') },
  ];

  const SOLUTIONS_LINKS = [
    { label: 'For Producers', to: lp('/for-producers') },
    { label: 'For Buyers', to: lp('/for-buyers') },
    { label: 'For Traders', to: lp('/for-traders') },
    { label: 'For Financiers', to: lp('/for-financiers') },
  ];

  const TOOLS_LINKS = [
    { label: 'Energy Calculator', to: lp('/tools/energy-calculator') },
    { label: 'Producer Map', to: lp('/map/producers') },
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
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${BLUE}, #4CAF50)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              V
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Verdaxis
            </span>
          </Link>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94A3B8', maxWidth: 280 }}>
            The trusted marketplace for verified sustainable marine fuels. Connecting producers, buyers, traders, and financiers across the global maritime energy transition.
          </p>
        </div>

        <FooterColumn title="Platform" links={PLATFORM_LINKS} />
        <FooterColumn title="Solutions" links={SOLUTIONS_LINKS} />
        <FooterColumn title="Tools" links={TOOLS_LINKS} />
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
          &copy; {currentYear} Verdaxis. All rights reserved.
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link
            to={lp('/governance')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            Governance
          </Link>
          <Link
            to={lp('/privacy')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            Privacy Policy
          </Link>
          <Link
            to={lp('/terms')}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            Terms of Service
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
