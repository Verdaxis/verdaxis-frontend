import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Shield,
  Factory,
  Ship,
  Anchor,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import {
  Reveal,
  GradientOrb,
  DotGrid,
  CircuitLines,
  HoverButton,
} from '../../components/public/motionUtils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stewardshipPoints = [
  'End-to-end visibility from the point of production to the bunker tank',
  'Every transaction is recorded, timestamped, and auditable',
  'Verified sustainability data travels with the fuel at every stage',
  'Platform-enforced integrity eliminates gaps in the supply chain',
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

/* ================================================================== */
/*  ComplianceInfoPage                                                  */
/* ================================================================== */

export const ComplianceInfoPage: React.FC = () => {
  return (
    <div>
      {/* ---- Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 72px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GradientOrb
          color="rgba(93,173,226,0.08)"
          size={500}
          style={{ top: -200, left: -150 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.06)"
          size={400}
          style={{ bottom: -180, right: -120 }}
        />
        <CircuitLines
          color="rgba(93,173,226,0.06)"
          style={{ width: 220, top: 40, right: 40 }}
        />
        <DotGrid
          color="rgba(248,250,252,0.04)"
          style={{ bottom: 20, left: 30 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 400,
              fontFamily: '"DM Serif Display", serif',
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Compliance &amp; Integrity
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.7,
              maxWidth: 620,
              margin: '0 auto',
            }}
          >
            Verdaxis is the steward of the sustainable fuel supply chain &mdash; providing
            end-to-end integrity from the producer to the tank.
          </p>
        </motion.div>
      </section>

      {/* ---- Stewardship ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <DotGrid style={{ bottom: 20, left: 20 }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <Shield size={32} color="#5DADE2" />
              </div>
              <h2
                style={{
                  fontSize: 32,
                  fontWeight: 400,
                  fontFamily: '"DM Serif Display", serif',
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                The Steward of High-Integrity Supply
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#64748B',
                  lineHeight: 1.7,
                  maxWidth: 640,
                  margin: '0 auto',
                }}
              >
                Only Verdaxis can safely facilitate the entire journey of sustainable fuel &mdash;
                from the moment it is produced to the moment it reaches the tank. Our platform
                is the single source of truth for every participant in the chain.
              </p>
            </div>
          </Reveal>

          {/* Supply chain visual */}
          <Reveal delay={0.15}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
                marginBottom: 48,
                flexWrap: 'wrap',
              }}
            >
              {[
                { icon: Factory, label: 'Producer', color: '#4CAF50' },
                { icon: null, label: null, color: null },
                { icon: Shield, label: 'Verdaxis', color: '#5DADE2' },
                { icon: null, label: null, color: null },
                { icon: Ship, label: 'Vessel', color: '#4CAF50' },
                { icon: null, label: null, color: null },
                { icon: Anchor, label: 'Tank', color: '#4CAF50' },
              ].map((item, i) =>
                item.icon ? (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: item.label === 'Verdaxis'
                          ? 'linear-gradient(135deg, #5DADE2, #4CAF50)'
                          : `${item.color}14`,
                        border: item.label === 'Verdaxis' ? 'none' : `2px solid ${item.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                      }}
                    >
                      <item.icon
                        size={24}
                        color={item.label === 'Verdaxis' ? '#FFFFFF' : item.color}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: item.label === 'Verdaxis' ? 700 : 500,
                        color: item.label === 'Verdaxis' ? '#0F172A' : '#64748B',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    <ArrowRight size={20} color="#CBD5E1" />
                  </div>
                ),
              )}
            </div>
          </Reveal>

          {/* Integrity points */}
          <Reveal delay={0.25}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 32,
                maxWidth: 640,
                margin: '0 auto',
              }}
            >
              {stewardshipPoints.map((point) => (
                <div
                  key={point}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle
                    size={18}
                    color="#4CAF50"
                    style={{ flexShrink: 0, marginTop: 3 }}
                  />
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={350}
          style={{ top: -120, right: -100 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.05)"
          size={300}
          style={{ bottom: -100, left: -80 }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 400,
                fontFamily: '"DM Serif Display", serif',
                color: '#F8FAFC',
                marginBottom: 16,
              }}
            >
              See how the platform works end-to-end
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
              <Link
                to="/how-it-works"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
                  color: '#FFFFFF',
                  padding: '14px 36px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 12,
                }}
              >
                How It Works
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
