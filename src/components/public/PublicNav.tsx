import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';

const BLUE = '#5DADE2';
const GREEN = '#4CAF50';
const DARK = '#0F172A';

interface DropdownItem {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  to?: string;
  dropdown?: DropdownItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'How It Works', to: '/how-it-works' },
  {
    label: 'Solutions',
    dropdown: [
      { label: 'For Producers', to: '/for-producers' },
      { label: 'For Buyers', to: '/for-buyers' },
      { label: 'For Traders', to: '/for-traders' },
      { label: 'For Financiers', to: '/for-financiers' },
    ],
  },
  { label: 'Fuels', to: '/fuels' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Education', to: '/education' },
  {
    label: 'Tools',
    dropdown: [
      { label: 'Energy Calculator', to: '/tools/energy-calculator' },
      { label: 'Producer Map', to: '/map/producers' },
    ],
  },
  { label: 'Roadmap', to: '/roadmap' },
];

const DropdownMenu: React.FC<{ items: DropdownItem[]; pathname: string }> = ({ items, pathname }) => (
  <div
    style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      minWidth: 200,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      border: '1px solid #E2E8F0',
      padding: '8px 0',
      zIndex: 100,
    }}
  >
    {items.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        style={{
          display: 'block',
          padding: '10px 20px',
          fontSize: 14,
          color: pathname === item.to ? BLUE : '#334155',
          textDecoration: 'none',
          fontWeight: pathname === item.to ? 600 : 400,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {item.label}
      </Link>
    ))}
  </div>
);

export const PublicNav: React.FC = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isActive = (item: NavItem): boolean => {
    if (item.to) return pathname === item.to;
    if (item.dropdown) return item.dropdown.some((d) => pathname === d.to);
    return false;
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            V
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: DARK,
              letterSpacing: '-0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Verdaxis
          </span>
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="public-nav-desktop"
        >
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{ position: 'relative' }}
              onMouseEnter={() => item.dropdown && setOpenDropdown(item.label)}
              onMouseLeave={() => item.dropdown && setOpenDropdown(null)}
            >
              {item.to ? (
                <Link
                  to={item.to}
                  style={{
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: isActive(item) ? 600 : 500,
                    color: isActive(item) ? BLUE : '#475569',
                    textDecoration: 'none',
                    borderRadius: 6,
                    transition: 'color 0.15s, background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item)) (e.currentTarget as HTMLElement).style.color = DARK;
                    (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = isActive(item) ? BLUE : '#475569';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  style={{
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: isActive(item) ? 600 : 500,
                    color: isActive(item) ? BLUE : '#475569',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 6,
                    transition: 'color 0.15s, background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item)) (e.currentTarget as HTMLElement).style.color = DARK;
                    (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = isActive(item) ? BLUE : '#475569';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {item.label}
                  <ChevronDown size={14} />
                </button>
              )}
              {item.dropdown && openDropdown === item.label && (
                <DropdownMenu items={item.dropdown} pathname={pathname} />
              )}
            </div>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="public-nav-ctas">
          <Link
            to="/pilot"
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: DARK,
              border: `1.5px solid ${DARK}`,
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = DARK;
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = DARK;
            }}
          >
            Apply for Pilot
          </Link>
          <Link
            to="/login"
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: DARK,
              border: `1.5px solid ${DARK}`,
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="public-nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            color: DARK,
          }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="public-nav-mobile-menu"
          style={{
            background: '#fff',
            borderTop: '1px solid #E2E8F0',
            padding: '16px 24px',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <div key={item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    padding: '12px 0',
                    fontSize: 16,
                    fontWeight: isActive(item) ? 600 : 500,
                    color: isActive(item) ? BLUE : '#334155',
                    textDecoration: 'none',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 0',
                      fontSize: 16,
                      fontWeight: isActive(item) ? 600 : 500,
                      color: isActive(item) ? BLUE : '#334155',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      size={16}
                      style={{
                        transform: openDropdown === item.label ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>
                  {openDropdown === item.label && item.dropdown && (
                    <div style={{ paddingLeft: 16 }}>
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 0',
                            fontSize: 15,
                            color: pathname === sub.to ? BLUE : '#64748B',
                            textDecoration: 'none',
                            fontWeight: pathname === sub.to ? 600 : 400,
                          }}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Mobile CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <Link
              to="/pilot"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '12px 0',
                fontSize: 16,
                fontWeight: 600,
                color: DARK,
                textAlign: 'center',
                border: `1.5px solid ${DARK}`,
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              Apply for Pilot
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '12px 0',
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                textAlign: 'center',
                background: DARK,
                border: `1.5px solid ${DARK}`,
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* Responsive styles injected via style tag */}
      <style>{`
        @media (min-width: 768px) {
          .public-nav-desktop { display: flex !important; }
          .public-nav-ctas { display: flex !important; }
          .public-nav-hamburger { display: none !important; }
          .public-nav-mobile-menu { display: none !important; }
        }
        @media (max-width: 767px) {
          .public-nav-desktop { display: none !important; }
          .public-nav-ctas { display: none !important; }
          .public-nav-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
};
