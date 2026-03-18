import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Globe, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DataOcean } from './DataOcean';
import { useNamespace } from '../../hooks/useNamespace';
import { useLocalePath } from '../../hooks/useLocalePath';

gsap.registerPlugin(ScrollTrigger);

const trustSignalIcons = [Shield, Globe, Zap, BarChart3];

export const HeroSection: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const localePath = useLocalePath();
  const sectionRef = useRef<HTMLElement>(null);
  const orbGreenRef = useRef<HTMLDivElement>(null);
  const orbBlueRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Parallax: orbs drift up slower than scroll
    const ctx = gsap.context(() => {
      gsap.to(orbGreenRef.current, {
        y: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
      gsap.to(orbBlueRef.current, {
        y: -50,
        x: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
      // Grid fades out as you scroll down
      gsap.to(gridRef.current, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'center center',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  if (!ready) return null;

  const trustSignalKeys = [
    'doubleCounting',
    'imoAligned',
    'physicalFirst',
    'ciPricing',
  ] as const;

  const trustSignals = trustSignalKeys.map((key, i) => ({
    icon: trustSignalIcons[i],
    label: t(`hero.trustSignals.${key}`),
  }));

  return (
    <section
      ref={sectionRef}
      className="hero-section"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#FAFDF7',
        padding: '110px 24px 88px',
      }}
    >
      {/* Background orbs with GSAP parallax */}
      <div
        ref={orbGreenRef}
        style={{
          position: 'absolute',
          top: -100,
          right: -60,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76,175,80,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      <div
        ref={orbBlueRef}
        style={{
          position: 'absolute',
          bottom: -40,
          left: -80,
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(93,173,226,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      {/* Procedural data-ocean canvas */}
      <div ref={gridRef} style={{ position: 'absolute', inset: 0 }}>
        <DataOcean />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(76,175,80,0.08)',
            color: '#2E7D32',
            fontSize: 13,
            fontWeight: 600,
            padding: '7px 18px',
            borderRadius: 9999,
            marginBottom: 32,
            border: '1px solid rgba(76,175,80,0.15)',
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4CAF50',
              display: 'inline-block',
            }}
          />
          {t('hero.badge')}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 62,
            fontWeight: 400,
            lineHeight: 1.08,
            color: '#0F172A',
            marginBottom: 24,
            letterSpacing: '-0.015em',
          }}
        >
          {t('hero.titleLine1')}
          <br />
          for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #4CAF50, #5DADE2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('hero.titleLine2')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hero-subtitle"
          style={{
            fontSize: 18,
            lineHeight: 1.75,
            color: '#475569',
            maxWidth: 580,
            marginBottom: 44,
          }}
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hero-cta"
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 64,
          }}
        >
          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <Link
              to={localePath('/pilot')}
              className="cta-primary"
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '15px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t('hero.applyPilot')}
              <ArrowRight size={16} />
            </Link>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <Link
              to={localePath('/how-it-works')}
              className="cta-secondary"
              style={{
                background: 'transparent',
                color: '#334155',
                padding: '15px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1.5px solid #CBD5E1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t('hero.exploreHowItWorks')}
            </Link>
          </motion.div>
        </motion.div>

        {/* Shimmer divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="shimmer-line"
          style={{ height: 1, marginBottom: 32, transformOrigin: 'left' }}
        />

        {/* Trust Signals */}
        <div
          className="trust-signals"
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            gap: 36,
          }}
        >
          {trustSignals.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#64748B',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(93,173,226,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} color="#5DADE2" />
              </div>
              {label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .hero-section { padding: 80px 20px 60px !important; }
          .hero-section h1 { font-size: 36px !important; line-height: 1.12 !important; margin-bottom: 18px !important; }
          .hero-section .hero-subtitle { font-size: 16px !important; margin-bottom: 32px !important; }
          .hero-section .hero-cta { margin-bottom: 40px !important; }
          .hero-section .hero-cta > div { width: 100%; }
          .hero-section .hero-cta a { width: 100%; justify-content: center; }
          .hero-section .trust-signals { gap: 16px !important; }
        }
        @media (max-width: 480px) {
          .hero-section h1 { font-size: 30px !important; }
        }
      `}</style>
    </section>
  );
};
