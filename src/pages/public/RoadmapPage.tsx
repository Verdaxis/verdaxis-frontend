import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Shield, TrendingUp, Scale } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Phase {
  number: number;
  label: string;
  title: string;
  description: string;
  features: string[];
  isCurrent: boolean;
}

const phases: Phase[] = [
  {
    number: 1,
    label: 'Phase 1',
    title: 'Registry & Verification',
    description:
      'Establishing the foundation: fuel registration, attribute verification, and participant onboarding.',
    features: [
      'Fuel + attribute registration with CI scoring',
      'Third-party verification integration',
      'Producer and buyer onboarding',
      'Public website with education resources',
      'Energy value calculator',
      'Producer project map',
    ],
    isCurrent: true,
  },
  {
    number: 2,
    label: 'Phase 2',
    title: 'Matching & Structured Offtake',
    description:
      'Connecting participants: bilateral matchmaking with verified data and compliance-aware pricing.',
    features: [
      'Bilateral matchmaking between verified participants',
      'CI-adjusted pricing display',
      'Real price discovery from platform activity',
      'Enhanced producer map with live data',
      'Supplier demand signals',
      'Regional fuel availability mapping',
    ],
    isCurrent: false,
  },
  {
    number: 3,
    label: 'Phase 3',
    title: 'Live Bids & Offers',
    description:
      'Opening the market: live orderbook exchange with transparent price formation.',
    features: [
      'Live orderbook with bids and asks',
      'Real-time price discovery',
      'Forward contracts and structured offtake',
      'Assessment agency data feeds (Platts)',
      'Scope 3 monetisation tools',
      'Automated compliance reporting',
    ],
    isCurrent: false,
  },
  {
    number: 4,
    label: 'Phase 4',
    title: 'Compliance Automation & Reporting',
    description:
      'Full integration: automated regulatory reporting, green financing, and complete exchange capabilities.',
    features: [
      'FuelEU Maritime declaration automation',
      'EU ETS surrender calculations',
      'Green financing module',
      'Partner APIs for programmatic access',
      'Multi-fuel cross-pollination tools',
      'Full exchange with settlement and clearing',
    ],
    isCurrent: false,
  },
];

const designPrinciples = [
  {
    icon: Shield,
    title: 'Integrity First',
    description:
      "Each feature is tested with real participants before expanding. We don't launch features until they're production-ready.",
  },
  {
    icon: TrendingUp,
    title: 'Deliberate Scaling',
    description:
      'We add participants and volume gradually. A platform that works perfectly for 10 users is better than one that crashes for 1,000.',
  },
  {
    icon: Scale,
    title: 'Regulatory Alignment',
    description:
      'Every feature is designed with compliance in mind. We build within regulatory frameworks, not around them.',
  },
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
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

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 32,
};

/* ------------------------------------------------------------------ */
/*  Pulsing keyframes (injected once)                                  */
/* ------------------------------------------------------------------ */

const pulseKeyframes = `
@keyframes roadmap-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(93,173,226,0.5); }
  50% { box-shadow: 0 0 0 10px rgba(93,173,226,0); }
}
`;

/* ------------------------------------------------------------------ */
/*  PhaseCard sub-component                                            */
/* ------------------------------------------------------------------ */

const PhaseCard: React.FC<{ phase: Phase; index: number }> = ({ phase, index }) => {
  const isLeft = index % 2 === 0;

  /* --- Marker styles --- */
  const markerBase: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 800,
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  };

  const activeMarker: React.CSSProperties = {
    ...markerBase,
    background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
    color: '#FFFFFF',
    animation: 'roadmap-pulse 2s ease-in-out infinite',
  };

  const inactiveMarker: React.CSSProperties = {
    ...markerBase,
    background: '#FFFFFF',
    border: '3px solid #CBD5E1',
    color: '#94A3B8',
  };

  /* --- Card styles --- */
  const cardStyle: React.CSSProperties = {
    ...card,
    flex: 1,
    maxWidth: 460,
    borderLeft: phase.isCurrent ? '4px solid #5DADE2' : '1px solid #E2E8F0',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        position: 'relative',
        marginBottom: index < phases.length - 1 ? 0 : 0,
      }}
    >
      {/* Desktop layout: alternate left/right */}
      {/* Left side content (even indices) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          paddingRight: 24,
        }}
        className="roadmap-left-col"
      >
        {isLeft && (
          <div style={cardStyle}>
            <PhaseCardContent phase={phase} />
          </div>
        )}
      </div>

      {/* Center timeline marker */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          width: 44,
        }}
      >
        <div style={phase.isCurrent ? activeMarker : inactiveMarker}>
          {phase.number}
        </div>
      </div>

      {/* Right side content (odd indices) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          paddingLeft: 24,
        }}
        className="roadmap-right-col"
      >
        {!isLeft && (
          <div style={cardStyle}>
            <PhaseCardContent phase={phase} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  PhaseCardContent sub-component                                     */
/* ------------------------------------------------------------------ */

const PhaseCardContent: React.FC<{ phase: Phase }> = ({ phase }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: phase.isCurrent ? '#5DADE2' : '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {phase.label}
      </span>
      {phase.isCurrent && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
            padding: '2px 10px',
            borderRadius: 20,
            letterSpacing: 0.5,
          }}
        >
          CURRENT
        </span>
      )}
    </div>

    <h3
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: 10,
        lineHeight: 1.3,
      }}
    >
      {phase.title}
    </h3>

    <p
      style={{
        fontSize: 15,
        color: '#64748B',
        lineHeight: 1.6,
        marginBottom: 20,
      }}
    >
      {phase.description}
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {phase.features.map((feature) => (
        <div
          key={feature}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <CheckCircle
            size={16}
            color={phase.isCurrent ? '#4CAF50' : '#94A3B8'}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span
            style={{
              fontSize: 14,
              color: phase.isCurrent ? '#334155' : '#64748B',
              lineHeight: 1.5,
            }}
          >
            {feature}
          </span>
        </div>
      ))}
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/*  Mobile PhaseCard (stacked right of the line)                       */
/* ------------------------------------------------------------------ */

const MobilePhaseCard: React.FC<{ phase: Phase; index: number }> = ({ phase, index }) => {
  const markerBase: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 800,
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  };

  const activeMarker: React.CSSProperties = {
    ...markerBase,
    background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
    color: '#FFFFFF',
    animation: 'roadmap-pulse 2s ease-in-out infinite',
  };

  const inactiveMarker: React.CSSProperties = {
    ...markerBase,
    background: '#FFFFFF',
    border: '3px solid #CBD5E1',
    color: '#94A3B8',
  };

  const cardStyle: React.CSSProperties = {
    ...card,
    flex: 1,
    borderLeft: phase.isCurrent ? '4px solid #5DADE2' : '1px solid #E2E8F0',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        position: 'relative',
        paddingBottom: index < phases.length - 1 ? 0 : 0,
      }}
    >
      {/* Timeline marker */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          width: 36,
        }}
      >
        <div style={phase.isCurrent ? activeMarker : inactiveMarker}>
          {phase.number}
        </div>
      </div>

      {/* Card content */}
      <div style={cardStyle}>
        <PhaseCardContent phase={phase} />
      </div>
    </div>
  );
};

/* ================================================================== */
/*  RoadmapPage                                                        */
/* ================================================================== */

export const RoadmapPage: React.FC = () => {
  return (
    <div>
      {/* Inject pulse animation keyframes */}
      <style>{pulseKeyframes}</style>

      {/* ---- Section 1: Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '96px 24px 72px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Platform Roadmap
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
            Verdaxis is being built in deliberate phases. Each phase builds on the last,
            expanding capability while maintaining integrity. No dates — just sequence and
            commitment.
          </p>
        </div>
      </section>

      {/* ---- Section 2: Vertical Timeline ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* ---- Desktop Timeline ---- */}
          <div className="roadmap-desktop" style={{ position: 'relative' }}>
            {/* Vertical connecting line */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 22,
                bottom: 22,
                width: 3,
                transform: 'translateX(-50%)',
                background: 'linear-gradient(to bottom, #5DADE2 0%, #CBD5E1 35%, #CBD5E1 100%)',
                zIndex: 1,
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {phases.map((phase, index) => (
                <PhaseCard key={phase.number} phase={phase} index={index} />
              ))}
            </div>
          </div>

          {/* ---- Mobile Timeline ---- */}
          <div className="roadmap-mobile" style={{ position: 'relative', display: 'none' }}>
            {/* Vertical connecting line */}
            <div
              style={{
                position: 'absolute',
                left: 18,
                top: 18,
                bottom: 18,
                width: 3,
                background: 'linear-gradient(to bottom, #5DADE2 0%, #CBD5E1 35%, #CBD5E1 100%)',
                zIndex: 1,
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {phases.map((phase, index) => (
                <MobilePhaseCard key={phase.number} phase={phase} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Section 3: Design Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>How We Build</h2>
        <p style={sectionSubtitle}>
          Three principles guide every feature decision on the Verdaxis platform.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {designPrinciples.map(({ icon: Icon, title, description }) => (
            <div key={title} style={card}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background:
                    'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginBottom: 20,
                }}
              >
                <Icon size={26} color="#5DADE2" />
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: 12,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: '#64748B',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Section 4: CTA ---- */}
      <section
        style={{
          background: '#0F172A',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
            }}
          >
            Want to be part of the journey?
          </h2>
          <Link
            to="/pilot"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
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
            Apply for Pilot
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ---- Responsive styles ---- */}
      <style>{`
        .roadmap-desktop { display: block; }
        .roadmap-mobile { display: none !important; }

        @media (max-width: 768px) {
          .roadmap-desktop { display: none !important; }
          .roadmap-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
};
