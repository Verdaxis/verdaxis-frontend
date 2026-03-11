import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Factory,
  ClipboardCheck,
  ShieldCheck,
  ArrowLeftRight,
  FileCheck,
  Package,
  Ban,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  CircuitLines,
  HoverButton,
} from '../../components/public/motionUtils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const flowSteps = [
  {
    number: 1,
    icon: Factory,
    title: 'Fuel is Produced',
    description:
      'Physical low-carbon fuel is produced at a verified facility. Feedstock, pathway, and carbon intensity are documented at source.',
  },
  {
    number: 2,
    icon: ClipboardCheck,
    title: 'Fuel + Attributes Registered',
    description:
      'The fuel and its environmental attributes are registered on Verdaxis. CI score, feedstock pathway, geography, and certifications are locked to the physical batch.',
  },
  {
    number: 3,
    icon: ShieldCheck,
    title: 'Attributes Verified & Locked',
    description:
      'Third-party verification confirms the claimed attributes. Once verified, attributes cannot be modified or duplicated \u2014 preventing double-counting.',
  },
  {
    number: 4,
    icon: ArrowLeftRight,
    title: 'Trades Occur',
    description:
      'Buyers and sellers are matched through the Verdaxis marketplace. Bilateral deals progress toward structured exchange as liquidity builds.',
  },
  {
    number: 5,
    icon: FileCheck,
    title: 'Claims Flow with Audit Trail',
    description:
      'Environmental claims follow the fuel downstream. Every transfer, every claim, every retirement is recorded with full traceability.',
  },
];

const principles = [
  {
    icon: Package,
    title: 'Physical-First Logic',
    description:
      'Every attribute on Verdaxis is tied to a physical fuel batch. There are no decoupled paper credits or synthetic environmental instruments.',
  },
  {
    icon: Ban,
    title: 'No Decoupled Paper Credits',
    description:
      'Unlike voluntary carbon markets, Verdaxis does not allow environmental claims to be separated from the underlying fuel. This eliminates the risk of phantom credits.',
  },
  {
    icon: LinkIcon,
    title: 'Chain-of-Custody Preserved',
    description:
      'From production through bunkering to final consumption, the chain-of-custody is maintained. Downstream users can trace claims back to the original producer.',
  },
];

const comparisonRows = [
  { label: 'Attribute tracking', traditional: 'Paper-based, manual', verdaxis: 'Digital, automated' },
  { label: 'Double-counting risk', traditional: 'High', verdaxis: 'Eliminated' },
  { label: 'Verification', traditional: 'Periodic, delayed', verdaxis: 'Real-time, locked' },
  { label: 'Price discovery', traditional: 'Opaque, bilateral', verdaxis: 'Transparent, market-based' },
  { label: 'Compliance reporting', traditional: 'Manual assembly', verdaxis: 'Auto-generated' },
  { label: 'Audit trail', traditional: 'Fragmented', verdaxis: 'End-to-end' },
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 400,
  fontFamily: '"DM Serif Display", serif',
  color: '#0F172A',
  textAlign: 'center',
  marginBottom: 12,
};

const sectionSubtitle: React.CSSProperties = {
  fontSize: 16,
  color: '#64748B',
  textAlign: 'center',
  maxWidth: 640,
  margin: '0 auto 48px',
  lineHeight: 1.6,
};

/* ------------------------------------------------------------------ */
/*  Flow Step Component                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Flow Step Components — connected horizontal pipeline (desktop)      */
/*  and vertical timeline (mobile)                                      */
/* ------------------------------------------------------------------ */

const FlowStepCard: React.FC<{
  step: (typeof flowSteps)[number];
  index: number;
}> = ({ step, index }) => {
  const { number, icon: Icon, title, description } = step;

  return (
    <Reveal delay={index * 0.12}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
        {/* Number badge */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(93,173,226,0.25)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {number}
        </motion.div>

        {/* Card */}
        <HoverCard
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 24,
            textAlign: 'center',
            width: '100%',
            maxWidth: 220,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(93,173,226,0.1), rgba(76,175,80,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Icon size={20} color="#5DADE2" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.3 }}>{title}</h3>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{description}</p>
        </HoverCard>
      </div>
    </Reveal>
  );
};

/** SVG connecting line between step badges on desktop */
const FlowConnector: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 24,
    left: '10%',
    right: '10%',
    height: 2,
    zIndex: 1,
  }}>
    <svg width="100%" height="2" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5DADE2" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#4CAF50" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5DADE2" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <line x1="0" y1="1" x2="100%" y2="1" stroke="url(#flow-grad)" strokeWidth="2" strokeDasharray="6 4" />
    </svg>
    {/* Animated pulse traveling along the line */}
    <div className="flow-pulse" style={{
      position: 'absolute',
      top: -3,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
      boxShadow: '0 0 10px rgba(93,173,226,0.5)',
    }} />
  </div>
);

const MobileFlowStep: React.FC<{
  step: (typeof flowSteps)[number];
  isLast: boolean;
  index: number;
}> = ({ step, isLast, index }) => {
  const { number, icon: Icon, title, description } = step;

  return (
    <Reveal delay={index * 0.12}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
        {/* Timeline column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
              boxShadow: '0 3px 12px rgba(93,173,226,0.25)',
            }}
          >
            {number}
          </motion.div>
          {!isLast && (
            <div style={{
              width: 2,
              flex: 1,
              minHeight: 20,
              background: 'linear-gradient(180deg, #5DADE2 0%, #4CAF50 100%)',
              opacity: 0.3,
              borderRadius: 1,
            }} />
          )}
        </div>

        {/* Content card */}
        <HoverCard
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: 20,
            flex: 1,
            marginBottom: isLast ? 0 : 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(93,173,226,0.1), rgba(76,175,80,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16} color="#5DADE2" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
          </div>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{description}</p>
        </HoverCard>
      </div>
    </Reveal>
  );
};

/* ================================================================== */
/*  HowItWorksPage                                                     */
/* ================================================================== */

export const HowItWorksPage: React.FC = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <div>
      {/* ---- Section 1: Hero ---- */}
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
          color="rgba(76,175,80,0.08)"
          size={500}
          style={{ top: -150, right: -100 }}
        />
        <GradientOrb
          color="rgba(93,173,226,0.06)"
          size={350}
          style={{ bottom: -120, left: -80 }}
        />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
              How Verdaxis Works
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <p
              style={{
                fontSize: 18,
                color: '#94A3B8',
                lineHeight: 1.7,
                maxWidth: 620,
                margin: '0 auto',
              }}
            >
              From physical fuel production to verified downstream claims &mdash; every step traceable,
              every attribute locked.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Section 2: 5-Step Visual Flow ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <CircuitLines
          color="rgba(93,173,226,0.06)"
          style={{ width: 300, top: 40, right: -60 }}
        />
        <CircuitLines
          color="rgba(76,175,80,0.05)"
          style={{ width: 260, bottom: 60, left: -40, transform: 'scaleX(-1)' }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={sectionTitle}>The Verdaxis Flow</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={sectionSubtitle}>
              Five steps from fuel production to verifiable downstream claims.
            </p>
          </Reveal>

          {isMobile ? (
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              {flowSteps.map((step, idx) => (
                <MobileFlowStep
                  key={step.number}
                  step={step}
                  isLast={idx === flowSteps.length - 1}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
              {/* Connecting line behind the badges */}
              <FlowConnector />
              {/* Step cards in a horizontal row */}
              <div style={{
                display: 'flex',
                gap: 20,
                justifyContent: 'center',
                position: 'relative',
                zIndex: 2,
              }}>
                {flowSteps.map((step, idx) => (
                  <FlowStepCard key={step.number} step={step} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Animated pulse keyframes */}
          <style>{`
            @keyframes flowPulseTravel {
              0% { left: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { left: 100%; opacity: 0; }
            }
            .flow-pulse {
              animation: flowPulseTravel 4s ease-in-out infinite;
            }
          `}</style>
        </div>
      </section>

      {/* ---- Section 3: Key Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>Key Principles</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p style={sectionSubtitle}>
            The design choices that make Verdaxis different from existing environmental credit systems.
          </p>
        </Reveal>

        <StaggerGrid
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {principles.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <HoverCard
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 28,
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} color="#5DADE2" />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: 8,
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  {description}
                </p>
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ---- Section 4: Verdaxis vs Traditional (REMOVED FROM PAGE — kept in code for deck use) ---- */}
      {/* See git history or comparisonRows data above for the comparison table content */}

      {/* ---- Section 5: CTA ---- */}
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
          color="rgba(76,175,80,0.06)"
          size={400}
          style={{ top: -120, left: '50%', transform: 'translateX(-50%)' }}
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
              See what fuels are supported on the platform
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <HoverButton>
              <Link
                to="/fuels"
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
                Explore Fuel Coverage
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
