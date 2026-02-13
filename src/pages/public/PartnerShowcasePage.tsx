import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import gsap from 'gsap';

/* ── Partner Data ── */

interface Partner {
  name: string;
  fullName: string;
  role: string;
  description: string;
  color: string;
  logoSvg: React.ReactNode;
}

const partners: Partner[] = [
  {
    name: 'Methanol Institute',
    fullName: 'Methanol Institute',
    role: 'Industry Standards Body',
    description:
      'Global trade association for the methanol industry. Members gain direct access to verified pricing, compliance data, and marketplace liquidity through the Verdaxis platform.',
    color: '#0078D4',
    logoSvg: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="12" width="64" height="56" rx="4" stroke="#0078D4" strokeWidth="2.5" fill="none" />
        <text x="40" y="48" textAnchor="middle" fontFamily="'Montserrat', system-ui" fontWeight="800" fontSize="28" fill="#0078D4">MI</text>
        <line x1="8" y1="24" x2="72" y2="24" stroke="#0078D4" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'S&P Global Platts',
    fullName: 'S&P Global Commodity Insights',
    role: 'Pricing & Benchmarks',
    description:
      'The global benchmark for commodity pricing. Verdaxis integrates Platts assessments to provide transparent, reference-grade pricing across all fuel pathways.',
    color: '#E8373E',
    logoSvg: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="30" stroke="#E8373E" strokeWidth="2.5" fill="none" />
        <text x="40" y="36" textAnchor="middle" fontFamily="'Montserrat', system-ui" fontWeight="800" fontSize="14" fill="#E8373E">S&amp;P</text>
        <text x="40" y="52" textAnchor="middle" fontFamily="'Montserrat', system-ui" fontWeight="600" fontSize="10" fill="#E8373E">PLATTS</text>
      </svg>
    ),
  },
  {
    name: 'MPA Singapore',
    fullName: 'Maritime and Port Authority of Singapore',
    role: 'Regulatory Authority',
    description:
      'Singapore\'s maritime regulator and the world\'s largest bunkering port authority. Verdaxis aligns with MPA\'s Green Ship Programme and future fuels framework.',
    color: '#1B5E9C',
    logoSvg: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 50 L40 18 L60 50 Z" stroke="#1B5E9C" strokeWidth="2.5" fill="none" />
        <line x1="12" y1="56" x2="68" y2="56" stroke="#1B5E9C" strokeWidth="2" />
        <line x1="16" y1="62" x2="64" y2="62" stroke="#1B5E9C" strokeWidth="1.5" />
        <text x="40" y="48" textAnchor="middle" fontFamily="'Montserrat', system-ui" fontWeight="800" fontSize="12" fill="#1B5E9C">MPA</text>
      </svg>
    ),
  },
  {
    name: 'Ghana',
    fullName: 'Republic of Ghana — Ministry of Energy',
    role: 'Sovereign Partner',
    description:
      'Strategic partnership with Ghana\'s Ministry of Energy to develop low-carbon fuel supply chains across West Africa, supporting the country\'s energy transition ambitions.',
    color: '#006B3F',
    logoSvg: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="50" height="12" fill="#CE1126" rx="2" />
        <rect x="15" y="32" width="50" height="12" fill="#FCD116" rx="0" />
        <rect x="15" y="44" width="50" height="12" fill="#006B3F" rx="2" />
        <polygon points="40,34 42,38 46,38 43,41 44,45 40,43 36,45 37,41 34,38 38,38" fill="#0D0D0D" />
      </svg>
    ),
  },
];

/* ── Animated grid background ── */

const GridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(93, 173, 226, 0.04)';
      ctx.lineWidth = 0.5;
      const spacing = 60;
      for (let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animated nodes at intersections
      const t = frame * 0.005;
      for (let x = spacing; x < canvas.width; x += spacing * 3) {
        for (let y = spacing; y < canvas.height; y += spacing * 3) {
          const pulse = Math.sin(t + x * 0.01 + y * 0.008) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(93, 173, 226, ${0.05 + pulse * 0.08})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5 + pulse * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    };
    const animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

/* ── Reveal wrapper ── */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ── Partner Card ── */

const PartnerCard: React.FC<{ partner: Partner; index: number }> = ({ partner, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--glow-x', `${x}px`);
      el.style.setProperty('--glow-y', `${y}px`);
    };

    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <Reveal delay={index * 0.12}>
      <motion.div
        ref={cardRef}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="partner-card"
        style={{
          position: 'relative',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid rgba(${partner.color === '#E8373E' ? '232,55,62' : partner.color === '#0078D4' ? '0,120,212' : partner.color === '#1B5E9C' ? '27,94,156' : '0,107,63'}, 0.2)`,
          borderRadius: 16,
          padding: 32,
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {/* Hover glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(300px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${partner.color}08, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 32,
            right: 32,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${partner.color}60, transparent)`,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo + Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${partner.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ width: 48, height: 48 }}>{partner.logoSvg}</div>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: '"Montserrat", system-ui',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#F8FAFC',
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                {partner.name}
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: `${partner.color}15`,
                  border: `1px solid ${partner.color}25`,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: partner.color,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: partner.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {partner.role}
                </span>
              </div>
            </div>
          </div>

          {/* Full name */}
          <p
            style={{
              fontSize: 13,
              color: '#94A3B8',
              fontWeight: 500,
              marginBottom: 12,
              fontStyle: 'italic',
            }}
          >
            {partner.fullName}
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: '#CBD5E1',
              lineHeight: 1.7,
            }}
          >
            {partner.description}
          </p>

          {/* Verification badge */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(76, 175, 80, 0.06)',
              border: '1px solid rgba(76, 175, 80, 0.15)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 2H14L16 4V8L14 10V14L12 16H8L6 14H2L0 12V8L2 6V2L4 0H8Z" fill="#4CAF50" fillOpacity="0.15" />
              <path d="M5 8L7 10L11 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#4CAF50',
                letterSpacing: '0.04em',
              }}
            >
              VERDAXIS VERIFIED PARTNER
            </span>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
};

/* ── Main Page ── */

export const PartnerShowcasePage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    gsap.fromTo(
      el.querySelectorAll('.hero-line'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060A13',
        color: '#F8FAFC',
        fontFamily: '"Montserrat", system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GridBackground />

      {/* Gradient overlays */}
      <div
        style={{
          position: 'fixed',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(93,173,226,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: -300,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76,175,80,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top bar */}
        <div
          style={{
            padding: '20px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Verdaxis
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#64748B',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Partner Network — Preview
          </div>
        </div>

        {/* Hero */}
        <section
          ref={heroRef}
          style={{
            padding: '100px 24px 72px',
            maxWidth: 900,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div className="hero-line">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(93,173,226,0.08)',
                border: '1px solid rgba(93,173,226,0.15)',
                padding: '6px 16px',
                borderRadius: 9999,
                marginBottom: 32,
              }}
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#5DADE2',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#5DADE2', letterSpacing: '0.06em' }}>
                STRATEGIC ECOSYSTEM
              </span>
            </div>
          </div>

          <h1
            className="hero-line"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: 52,
              fontWeight: 400,
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: '-0.02em',
            }}
          >
            Trusted by the{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              institutions
            </span>
            <br />
            that shape the market
          </h1>

          <p
            className="hero-line"
            style={{
              fontSize: 17,
              color: '#94A3B8',
              lineHeight: 1.75,
              maxWidth: 600,
              margin: '0 auto 40px',
            }}
          >
            Verdaxis partners with sovereign governments, global pricing agencies,
            maritime regulators, and industry standards bodies to build the most
            trusted exchange for low-carbon fuels.
          </p>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(93,173,226,0.3), transparent)',
              transformOrigin: 'center',
              maxWidth: 400,
              margin: '0 auto',
            }}
          />
        </section>

        {/* Partner Grid */}
        <section style={{ padding: '0 24px 96px', maxWidth: 1000, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
            }}
            className="partner-grid"
          >
            {partners.map((p, i) => (
              <PartnerCard key={p.name} partner={p} index={i} />
            ))}
          </div>
        </section>

        {/* How Members Are Represented */}
        <section
          style={{
            padding: '80px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#4CAF50',
                  marginBottom: 16,
                }}
              >
                Member Representation
              </p>
              <h2
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: 36,
                  fontWeight: 400,
                  marginBottom: 20,
                }}
              >
                How institute members appear on the platform
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: '#94A3B8',
                  lineHeight: 1.75,
                  maxWidth: 560,
                  margin: '0 auto 48px',
                }}
              >
                Members of partner institutions receive a verified trust badge on their
                marketplace listings, establishing credibility without compromising the
                Verdaxis brand identity.
              </p>
            </Reveal>

            {/* Mock listing card showing badge integration */}
            <Reveal delay={0.2}>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(93,173,226,0.12)',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'left',
                  maxWidth: 600,
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 16,
                  }}
                >
                  Example Marketplace Listing
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Green Methanol — Rotterdam</h3>
                    <p style={{ fontSize: 14, color: '#94A3B8' }}>OCI Global &middot; 5,000 MT &middot; Spot</p>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#5DADE2' }}>$485<span style={{ fontSize: 13, color: '#64748B' }}>/MT</span></div>
                </div>

                {/* Trust badges row */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    padding: '16px 0',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Verdaxis verified */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(76,175,80,0.08)',
                      border: '1px solid rgba(76,175,80,0.2)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M5 8L7 10L11 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#4CAF50' }}>Verdaxis Verified</span>
                  </div>

                  {/* Methanol Institute member */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(0,120,212,0.08)',
                      border: '1px solid rgba(0,120,212,0.2)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#0078D4" strokeWidth="1.2" />
                      <text x="8" y="10.5" textAnchor="middle" fontWeight="800" fontSize="6" fill="#0078D4">MI</text>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0078D4' }}>MI Member</span>
                  </div>

                  {/* S&P Platts indexed */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(232,55,62,0.06)',
                      border: '1px solid rgba(232,55,62,0.15)',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#E8373E' }}>Platts-Indexed</span>
                  </div>

                  {/* ISCC certified */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>ISCC EU</span>
                  </div>
                </div>

                {/* Info row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {[
                    { label: 'CI Score', value: '14.2 gCO\u2082e/MJ' },
                    { label: 'Energy', value: '19.9 MJ/kg' },
                    { label: 'FuelEU', value: 'Compliant' },
                    { label: 'Pathway', value: 'e-Methanol' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Trust strip */}
        <section
          style={{
            padding: '48px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            textAlign: 'center',
          }}
        >
          <Reveal>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 48,
                flexWrap: 'wrap',
                opacity: 0.4,
              }}
            >
              {partners.map((p) => (
                <div key={p.name} style={{ width: 56, height: 56 }}>{p.logoSvg}</div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: '32px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: '#475569' }}>
            This is a confidential preview page for internal use and partner discussions.
            Not published on the public Verdaxis website.
          </p>
          <p style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>
            &copy; {new Date().getFullYear()} Verdaxis. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Responsive */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Montserrat:wght@400;500;600;700;800&display=swap');

        @media (max-width: 768px) {
          .partner-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
