import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Layers,
  ShieldAlert,
  TrendingDown,
  Factory,
  Ship,
  ArrowLeftRight,
  Landmark,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PriceTicker } from '../../components/public/PriceTicker';
import { HeroSection } from '../../components/public/HeroSection';

gsap.registerPlugin(ScrollTrigger);

/* ── Partner Data ── */

const partners = [
  {
    name: 'Methanol Institute',
    role: 'Industry Standards Body',
    logoUrl: 'https://methanol.org/wp-content/themes/methanol/images/logo.png',
    color: '#0078D4',
  },
  {
    name: 'S&P Global Platts',
    role: 'Pricing & Benchmarks',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/S%26P_Global_Platts_Logo.png',
    color: '#E8373E',
  },
  {
    name: 'MPA Singapore',
    role: 'Regulatory Authority',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Maritime_and_Port_Authority_of_Singapore_%28logo%29.png/309px-Maritime_and_Port_Authority_of_Singapore_%28logo%29.png',
    color: '#1B5E9C',
  },
  {
    name: 'Gena Solutions',
    role: 'Analytics & Technology',
    logoUrl: 'https://storage.googleapis.com/b2match-as-1/mCCdjrAQutyQ32CXm4PzfPUF',
    color: '#00897B',
  },
];

/* ── Landing page data (mirrored from LandingPage) ── */

const whyCards = [
  {
    icon: AlertTriangle,
    title: 'Scarce Molecules',
    body: 'Low-carbon fuel supply is limited. Every molecule needs verified provenance and transparent pricing.',
  },
  {
    icon: Layers,
    title: 'Fragmented Standards',
    body: 'RED III, 45Z, RenovaBio, FuelEU Maritime, IMO NZF \u2014 different rules, different metrics, one platform.',
  },
  {
    icon: ShieldAlert,
    title: 'Double-Counting Risk',
    body: 'Without chain-of-custody integrity, the same environmental attribute can be claimed multiple times.',
  },
  {
    icon: TrendingDown,
    title: 'Scope 3 Pressure',
    body: 'End-users face increasing pressure to prove real emissions reductions, not just purchase certificates.',
  },
];

const howSteps = [
  {
    num: '01',
    icon: ClipboardCheck,
    title: 'Register & Verify',
    body: 'Producers register fuel batches with feedstock pathway, CI score, and certifications. Third-party verification locks the attributes.',
  },
  {
    num: '02',
    icon: ShieldCheck,
    title: 'Trade with Integrity',
    body: 'Buyers and traders discover fuel on the marketplace with energy-adjusted pricing, compliance scoring, and full chain-of-custody.',
  },
  {
    num: '03',
    icon: BarChart3,
    title: 'Claim with Confidence',
    body: 'Downstream claims are traceable to source. Every environmental attribute is locked, auditable, and impossible to double-count.',
  },
];

const roleCards = [
  {
    icon: Factory,
    title: 'Fuel Producers',
    path: '/for-producers',
    bullets: ['Faster offtake', 'Premium discovery', 'Compliance-ready sales'],
  },
  {
    icon: Ship,
    title: 'Fuel Buyers',
    path: '/for-buyers',
    bullets: ['Verified Scope 3 reductions', 'Energy-adjusted pricing', 'Reduced compliance risk'],
  },
  {
    icon: ArrowLeftRight,
    title: 'Traders',
    path: '/for-traders',
    bullets: ['Liquidity access', 'Standardised deals', 'Reduced back-office friction'],
  },
  {
    icon: Landmark,
    title: 'Financiers',
    path: '/for-financiers',
    bullets: ['Bankable data', 'Traceable claims', 'Reduced diligence cost'],
  },
];

const stats = [
  { value: 10, suffix: '+', label: 'Fuel Pathways' },
  { value: 6, suffix: '', label: 'Regulatory Frameworks' },
  { value: 100, suffix: '%', label: 'Chain-of-Custody' },
  { value: 0, suffix: '', label: 'Double-Counting' },
];

const frameworks = ['FuelEU Maritime', 'RED III', 'IMO NZF', '45Z Tax Credit', 'RenovaBio', 'CORSIA'];

/* ── Animated counter component ── */
const AnimatedStat: React.FC<{ value: number; suffix: string; label: string }> = ({ value, suffix, label }) => {
  const numRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + suffix;
          },
        });
      },
    });
  }, [value, suffix]);

  return (
    <div>
      <div
        ref={numRef}
        style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: 42,
          fontWeight: 400,
          color: '#FFFFFF',
          marginBottom: 6,
        }}
      >
        0{suffix}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#64748B',
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ── RevealSection ── */
const RevealSection: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════ */
/*  PartnerLandingPage                                                */
/* ════════════════════════════════════════════════════════════════════ */

export const PartnerLandingPage: React.FC = () => {
  const howSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = howSectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 769px)', () => {
      const track = section.querySelector('.how-track') as HTMLElement;
      if (!track) return;

      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth + 200),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${track.scrollWidth - window.innerWidth + 200}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* 1. Price Ticker */}
      <PriceTicker />

      {/* 2. Hero Section */}
      <HeroSection />

      {/* 3. Stats Bar */}
      <section
        style={{
          background: '#0F172A',
          padding: '52px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            textAlign: 'center',
          }}
          className="landing-stats-grid"
        >
          {stats.map((s) => (
            <AnimatedStat key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </section>

      {/* ★ PARTNER SECTION — Trusted By ★ */}
      <section
        style={{
          background: '#FAFDF7',
          padding: '72px 24px',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #5DADE2, #4CAF50)',
          }}
        />

        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: '#94A3B8',
                  marginBottom: 14,
                }}
              >
                Trusted by leading institutions
              </p>
              <h2
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: 34,
                  fontWeight: 400,
                  color: '#0F172A',
                  marginBottom: 12,
                }}
              >
                Built with the market, not just for it
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  maxWidth: 560,
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}
              >
                Verdaxis partners with sovereign governments, global pricing agencies,
                maritime regulators, and industry standards bodies.
              </p>
            </div>
          </RevealSection>

          {/* Partner logos row */}
          <RevealSection delay={0.15}>
            <div
              className="partner-logo-row"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 56,
                flexWrap: 'wrap',
              }}
            >
              {partners.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                  whileHover={{ y: -4 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 16,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    <img
                      src={p.logoUrl}
                      alt={p.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0F172A',
                        marginBottom: 2,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: p.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {p.role}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </RevealSection>

          {/* Verdaxis Verified badge strip */}
          <RevealSection delay={0.3}>
            <div
              style={{
                marginTop: 48,
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {partners.map((p) => (
                <div
                  key={p.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(76,175,80,0.06)',
                    border: '1px solid rgba(76,175,80,0.12)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M5 8L7 10L11 6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#4CAF50' }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* 4. Why Verdaxis Exists */}
      <section
        style={{
          padding: '96px 24px',
          background: '#FFFFFF',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #4CAF50, #5DADE2)',
          }}
        />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#4CAF50',
                  marginBottom: 12,
                }}
              >
                The Problem
              </p>
              <h2
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: 38,
                  fontWeight: 400,
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                Why Verdaxis Exists
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  maxWidth: 560,
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}
              >
                The transition to low-carbon fuels is hindered by fragmented markets,
                inconsistent data, and compliance uncertainty.
              </p>
            </div>
          </RevealSection>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {whyCards.map(({ icon: Icon, title, body }, i) => (
              <RevealSection key={title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(76,175,80,0.1)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    background: '#FAFDF7',
                    border: '1px solid #E8F0E3',
                    borderRadius: 14,
                    padding: 28,
                    cursor: 'default',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'rgba(93,173,226,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={20} color="#5DADE2" />
                  </div>
                  <h3
                    style={{
                      fontFamily: '"Montserrat", sans-serif',
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: 8,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>
                    {body}
                  </p>
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works — Pinned Horizontal Scroll */}
      <section
        ref={howSectionRef}
        style={{
          background: '#F8FAFC',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="how-track"
          style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '0 100px',
            gap: 0,
          }}
        >
          <div
            style={{
              minWidth: 420,
              maxWidth: 420,
              paddingRight: 80,
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#5DADE2',
                marginBottom: 12,
              }}
            >
              The Solution
            </p>
            <h2
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: 42,
                fontWeight: 400,
                color: '#0F172A',
                marginBottom: 16,
                lineHeight: 1.15,
              }}
            >
              How Verdaxis
              <br />
              Works
            </h2>
            <p
              style={{
                fontSize: 16,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Three steps from fuel production to verifiable downstream claims.
            </p>
            <Link
              to="/how-it-works"
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
              See full process <ArrowRight size={16} />
            </Link>
          </div>

          {howSteps.map(({ num, icon: Icon, title, body }) => (
            <div
              key={num}
              style={{
                minWidth: 380,
                maxWidth: 380,
                flexShrink: 0,
                marginRight: 32,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 36,
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(76,175,80,0.08), rgba(93,173,226,0.08))',
                    border: '2px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  <Icon size={24} color="#4CAF50" />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#94A3B8',
                    letterSpacing: '0.1em',
                    marginBottom: 10,
                  }}
                >
                  STEP {num}
                </div>
                <h3
                  style={{
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: 12,
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile fallback: vertical stack */}
        <div className="how-mobile-fallback" style={{ display: 'none', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#5DADE2', marginBottom: 12 }}>
              The Solution
            </p>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 34, fontWeight: 400, color: '#0F172A', marginBottom: 16 }}>
              How Verdaxis Works
            </h2>
          </div>
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {howSteps.map(({ num, icon: Icon, title, body }) => (
              <div key={num} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(76,175,80,0.08)', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color="#4CAF50" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em' }}>STEP {num}</div>
                    <h3 style={{ fontFamily: '"Montserrat", sans-serif', fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{title}</h3>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link to="/how-it-works" style={{ fontSize: 15, fontWeight: 600, color: '#5DADE2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                See full process <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Built for Every Participant */}
      <section
        style={{
          padding: '96px 24px',
          background: '#FFFFFF',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#4CAF50',
                  marginBottom: 12,
                }}
              >
                For Every Role
              </p>
              <h2
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: 38,
                  fontWeight: 400,
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                Built for Every Participant
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  maxWidth: 560,
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}
              >
                Whether you produce, buy, trade, or finance low-carbon fuels,
                Verdaxis gives you the tools and trust layer you need.
              </p>
            </div>
          </RevealSection>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 20,
            }}
          >
            {roleCards.map(({ icon: Icon, title, path, bullets }, i) => (
              <RevealSection key={title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(15,23,42,0.08)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: 28,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'rgba(76,175,80,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={20} color="#4CAF50" />
                  </div>
                  <h3
                    style={{
                      fontFamily: '"Montserrat", sans-serif',
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#0F172A',
                      marginBottom: 14,
                    }}
                  >
                    {title}
                  </h3>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 20px',
                      flex: 1,
                    }}
                  >
                    {bullets.map((b) => (
                      <li
                        key={b}
                        style={{
                          fontSize: 14,
                          color: '#475569',
                          lineHeight: 1.8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CheckCircle2 size={14} color="#4CAF50" style={{ flexShrink: 0 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={path}
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
                    Learn more <ChevronRight size={16} />
                  </Link>
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Regulatory Frameworks Strip */}
      <section
        style={{
          padding: '56px 24px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <RevealSection>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#94A3B8',
                marginBottom: 28,
              }}
            >
              Built for global compliance frameworks
            </p>
          </RevealSection>
          <RevealSection delay={0.15}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              {frameworks.map((name) => (
                <motion.div
                  key={name}
                  whileHover={{ y: -2, borderColor: '#CBD5E1' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    padding: '10px 20px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#334155',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {name}
                </motion.div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* 8. CTA Section */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#0F172A',
          padding: '100px 24px',
          textAlign: 'center',
        }}
      >
        <div
          className="float-slow"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(76,175,80,0.06) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <RevealSection>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#4CAF50',
                marginBottom: 16,
              }}
            >
              Join the Pilot
            </p>
          </RevealSection>
          <RevealSection delay={0.1}>
            <h2
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: 42,
                fontWeight: 400,
                color: '#F8FAFC',
                marginBottom: 20,
              }}
            >
              Ready to define the market?
            </h2>
          </RevealSection>
          <RevealSection delay={0.2}>
            <p
              style={{
                fontSize: 16,
                color: '#94A3B8',
                lineHeight: 1.75,
                marginBottom: 40,
              }}
            >
              Verdaxis is onboarding a limited cohort of pilot participants
              {' \u2014 '}producers, buyers, traders, and financiers who want to shape
              the standard for low-carbon fuel commerce.
            </p>
          </RevealSection>
          <RevealSection delay={0.3}>
            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <motion.div whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <Link
                  to="/pilot"
                  className="cta-gradient"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50, #5DADE2)',
                    color: '#FFFFFF',
                    padding: '15px 36px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Apply for Pilot
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <a
                  href="mailto:info@verdaxis.exchange"
                  className="cta-secondary"
                  style={{
                    background: 'transparent',
                    color: '#F8FAFC',
                    padding: '15px 36px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1.5px solid #334155',
                    display: 'inline-block',
                  }}
                >
                  Register Interest
                </a>
              </motion.div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .landing-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .how-track {
            display: none !important;
          }
          .how-mobile-fallback {
            display: block !important;
          }
          .partner-logo-row {
            gap: 32px !important;
          }
        }
        @media (min-width: 769px) {
          .how-mobile-fallback {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
