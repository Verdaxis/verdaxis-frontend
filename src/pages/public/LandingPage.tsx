import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  Zap,
  ArrowLeftRight,
  Factory,
  Ship,
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
import { useNamespace } from '../../hooks/useNamespace';

gsap.registerPlugin(ScrollTrigger);

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

/* ── Section wrapper with motion inView ── */
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

/* ── Main Component ── */

export const LandingPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
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

  if (!ready) return null;

  const whyCards = [
    { icon: TrendingUp, title: t('landing.why.cards.0.title'), body: t('landing.why.cards.0.body') },
    { icon: Eye, title: t('landing.why.cards.1.title'), body: t('landing.why.cards.1.body') },
    { icon: Zap, title: t('landing.why.cards.2.title'), body: t('landing.why.cards.2.body') },
    { icon: ArrowLeftRight, title: t('landing.why.cards.3.title'), body: t('landing.why.cards.3.body') },
  ];

  const howSteps = [
    { num: '01', icon: ClipboardCheck, title: t('landing.how.steps.0.title'), body: t('landing.how.steps.0.body') },
    { num: '02', icon: ShieldCheck, title: t('landing.how.steps.1.title'), body: t('landing.how.steps.1.body') },
    { num: '03', icon: BarChart3, title: t('landing.how.steps.2.title'), body: t('landing.how.steps.2.body') },
  ];

  const roleCards = [
    {
      icon: Factory,
      title: t('landing.roles.cards.0.title'),
      path: '/for-producers',
      bullets: [
        t('landing.roles.cards.0.bullets.0'),
        t('landing.roles.cards.0.bullets.1'),
        t('landing.roles.cards.0.bullets.2'),
      ],
    },
    {
      icon: Ship,
      title: t('landing.roles.cards.1.title'),
      path: '/for-buyers',
      bullets: [
        t('landing.roles.cards.1.bullets.0'),
        t('landing.roles.cards.1.bullets.1'),
        t('landing.roles.cards.1.bullets.2'),
      ],
    },
    {
      icon: ArrowLeftRight,
      title: t('landing.roles.cards.2.title'),
      path: '/for-traders',
      bullets: [
        t('landing.roles.cards.2.bullets.0'),
        t('landing.roles.cards.2.bullets.1'),
        t('landing.roles.cards.2.bullets.2'),
      ],
    },
    {
      icon: Landmark,
      title: t('landing.roles.cards.3.title'),
      path: '/for-financiers',
      bullets: [
        t('landing.roles.cards.3.bullets.0'),
        t('landing.roles.cards.3.bullets.1'),
        t('landing.roles.cards.3.bullets.2'),
      ],
    },
  ];

  const stats = [
    { value: 10, suffix: '+', label: t('landing.stats.fuelPathways') },
    { value: 6, suffix: '', label: t('landing.stats.regulatoryFrameworks') },
    { value: 100, suffix: '%', label: t('landing.stats.chainOfCustody') },
    { value: 0, suffix: '', label: t('landing.stats.doubleCounting') },
  ];

  const frameworks = ['FuelEU Maritime', 'RED III', 'IMO NZF', '45Z Tax Credit', 'RenovaBio', 'CORSIA'];

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
                {t('landing.why.eyebrow')}
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
                {t('landing.why.title')}
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
                {t('landing.why.subtitle')}
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
          {/* Intro panel */}
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
              {t('landing.how.eyebrow')}
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
              {t('landing.how.title')}
            </h2>
            <p
              style={{
                fontSize: 16,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              {t('landing.how.subtitle')}
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
              {t('landing.how.seeFullProcess')} <ArrowRight size={16} />
            </Link>
          </div>

          {/* Step cards */}
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
                  {t('landing.how.stepLabel')} {num}
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
              {t('landing.how.eyebrow')}
            </p>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 34, fontWeight: 400, color: '#0F172A', marginBottom: 16 }}>
              {t('landing.how.title')}
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em' }}>{t('landing.how.stepLabel')} {num}</div>
                    <h3 style={{ fontFamily: '"Montserrat", sans-serif', fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{title}</h3>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link to="/how-it-works" style={{ fontSize: 15, fontWeight: 600, color: '#5DADE2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {t('landing.how.seeFullProcess')} <ArrowRight size={16} />
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
                {t('landing.roles.eyebrow')}
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
                {t('landing.roles.title')}
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
                {t('landing.roles.subtitle')}
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
                    {t('landing.roles.learnMore')} <ChevronRight size={16} />
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
              {t('landing.frameworks.label')}
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
              {t('landing.cta.eyebrow')}
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
              {t('landing.cta.title')}
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
              {t('landing.cta.subtitle')}
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
                  {t('landing.cta.applyButton')}
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
                  {t('landing.cta.registerButton')}
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
