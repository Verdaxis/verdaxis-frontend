import React from 'react';
import { Link } from 'react-router-dom';
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

/* ------------------------------------------------------------------ */
/*  Flow Step Component                                                */
/* ------------------------------------------------------------------ */

const StepCard: React.FC<{
  icon: React.FC<{ size?: number; color?: string }>;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div
    style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      padding: 24,
      display: 'inline-block',
      textAlign: 'left',
      maxWidth: 320,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color="#5DADE2" />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
    </div>
    <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{description}</p>
  </div>
);

const FlowStep: React.FC<{
  step: (typeof flowSteps)[number];
  isLeft: boolean;
  isLast: boolean;
}> = ({ step, isLeft, isLast }) => {
  const { number, icon, title, description } = step;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        position: 'relative',
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      {/* Left content area */}
      <div
        style={{
          flex: 1,
          textAlign: 'right',
          paddingRight: 32,
        }}
      >
        {isLeft && <StepCard icon={icon} title={title} description={description} />}
      </div>

      {/* Center timeline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
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
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              height: 60,
              background: 'linear-gradient(180deg, #5DADE2, #4CAF50)',
              opacity: 0.3,
            }}
          />
        )}
      </div>

      {/* Right content area */}
      <div
        style={{
          flex: 1,
          textAlign: 'left',
          paddingLeft: 32,
        }}
      >
        {!isLeft && <StepCard icon={icon} title={title} description={description} />}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Mobile Flow Step Component (single column)                         */
/* ------------------------------------------------------------------ */

const MobileFlowStep: React.FC<{
  step: (typeof flowSteps)[number];
  isLast: boolean;
}> = ({ step, isLast }) => {
  const { number, icon: Icon, title, description } = step;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      {/* Timeline column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 24,
              background: 'linear-gradient(180deg, #5DADE2, #4CAF50)',
              opacity: 0.3,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: 20,
          flex: 1,
          marginBottom: isLast ? 0 : 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={16} color="#5DADE2" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{description}</p>
      </div>
    </div>
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
            How Verdaxis Works
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
            From physical fuel production to verified downstream claims &mdash; every step traceable,
            every attribute locked.
          </p>
        </div>
      </section>

      {/* ---- Section 2: 5-Step Visual Flow ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <h2 style={sectionTitle}>The Verdaxis Flow</h2>
        <p style={sectionSubtitle}>
          Five steps from fuel production to verifiable downstream claims.
        </p>

        {isMobile ? (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {flowSteps.map((step, idx) => (
              <MobileFlowStep key={step.number} step={step} isLast={idx === flowSteps.length - 1} />
            ))}
          </div>
        ) : (
          <div>
            {flowSteps.map((step, idx) => (
              <FlowStep
                key={step.number}
                step={step}
                isLeft={idx % 2 === 0}
                isLast={idx === flowSteps.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Section 3: Key Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <h2 style={sectionTitle}>Key Principles</h2>
        <p style={sectionSubtitle}>
          The design choices that make Verdaxis different from existing environmental credit systems.
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
          {principles.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 28,
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
            </div>
          ))}
        </div>
      </section>

      {/* ---- Section 4: Verdaxis vs Traditional ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <h2 style={sectionTitle}>Verdaxis vs Traditional</h2>
        <p style={sectionSubtitle}>
          How Verdaxis compares to legacy approaches to environmental attribute tracking.
        </p>

        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFFFF',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            <thead>
              <tr style={{ background: '#0F172A' }}>
                <th
                  style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#94A3B8',
                    borderBottom: '1px solid #1E293B',
                  }}
                />
                <th
                  style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#94A3B8',
                    borderBottom: '1px solid #1E293B',
                  }}
                >
                  Traditional
                </th>
                <th
                  style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#5DADE2',
                    borderBottom: '1px solid #1E293B',
                  }}
                >
                  Verdaxis
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(({ label, traditional, verdaxis }, idx) => (
                <tr
                  key={label}
                  style={{
                    background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    borderBottom: idx < comparisonRows.length - 1 ? '1px solid #E2E8F0' : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: 14,
                      color: '#64748B',
                    }}
                  >
                    {traditional}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      fontSize: 14,
                      color: '#4CAF50',
                      fontWeight: 600,
                    }}
                  >
                    {verdaxis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Section 5: CTA ---- */}
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
            See what fuels are supported on the platform
          </h2>
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
        </div>
      </section>
    </div>
  );
};
