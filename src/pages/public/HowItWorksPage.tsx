import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Factory,
  Users,
  BarChart3,
  ShieldCheck,
  Brain,
  TrendingUp,
  ArrowRight,
  Handshake,
  Eye,
  Zap,
  LineChart,
  Globe,
  Package,
  Link as LinkIcon,
  Shield,
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

const sellerBenefits = [
  { icon: Users, text: 'Direct access to qualified buyers' },
  { icon: TrendingUp, text: 'Reduced customer acquisition costs' },
  { icon: Handshake, text: 'Lower friction for contract negotiation' },
  { icon: Eye, text: 'Market visibility and deal flow analytics' },
  { icon: Factory, text: 'Ability to pre-market future production' },
];

const platformCapabilities = [
  { icon: BarChart3, text: 'Real-time aggregation and matching delivering liquidity in the market' },
  { icon: TrendingUp, text: 'Drives price discovery in the market' },
  { icon: ShieldCheck, text: 'Verified sustainability data and reporting' },
  { icon: Shield, text: 'Integrated risk management tools' },
  { icon: Brain, text: 'AI-powered market intelligence and forecasting' },
];

const buyerBenefits = [
  { icon: Globe, text: 'Access to a unified market of verified sustainable fuel suppliers' },
  { icon: Eye, text: 'Transparent, reliable pricing via exchange' },
  { icon: Zap, text: 'One-stop access to all sustainable fuel types' },
  { icon: LineChart, text: 'Transparency and price discovery' },
  { icon: Handshake, text: 'Access to hedging tools (SWAPs)' },
];

const principles = [
  {
    icon: Package,
    title: 'Physical-First Logic',
    description:
      'Every listing on Verdaxis is tied to a physical fuel batch. No decoupled paper credits or synthetic instruments \u2014 real fuel, real trades.',
  },
  {
    icon: Shield,
    title: 'End-to-End Integrity',
    description:
      'From production through bunkering to final consumption, the chain of custody is maintained. Sustainability data travels with the fuel at every stage.',
  },
  {
    icon: LinkIcon,
    title: 'Singapore-Hosted, Global Reach',
    description:
      'Backed by SGX and MPA Singapore, Verdaxis provides price discovery for any point in the world while maintaining the highest standards of market integrity.',
  },
];

/* kept in code for deck use */
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
/*  Three-Column Platform Benefits                                     */
/* ------------------------------------------------------------------ */

const BenefitColumn: React.FC<{
  title: string;
  subtitle: string;
  items: { icon: React.FC<any>; text: string }[];
  accentColor: string;
  delay: number;
  isCenter?: boolean;
}> = ({ title, subtitle, items, accentColor, delay, isCenter }) => (
  <Reveal delay={delay}>
    <div
      style={{
        background: isCenter
          ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
          : '#FFFFFF',
        border: isCenter ? 'none' : '1px solid #E2E8F0',
        borderRadius: 16,
        padding: 32,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(isCenter
          ? { boxShadow: '0 8px 32px rgba(15,23,42,0.2)' }
          : {}),
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: '"DM Serif Display", serif',
            color: isCenter ? '#F8FAFC' : '#0F172A',
            marginBottom: 4,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: '#94A3B8',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {items.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: isCenter ? 0 : -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay + i * 0.08, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isCenter
                  ? `${accentColor}20`
                  : `${accentColor}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Icon size={16} color={accentColor} />
            </div>
            <p
              style={{
                fontSize: 14,
                color: isCenter ? '#CBD5E1' : '#475569',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/*  Arrow Connector Between Columns                                    */
/* ------------------------------------------------------------------ */

const ColumnArrow: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
    }}
    className="hiw-column-arrow"
  >
    <motion.div
      animate={{ x: [0, 6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ArrowRight size={24} color="#CBD5E1" />
    </motion.div>
  </div>
);

/* ================================================================== */
/*  HowItWorksPage                                                     */
/* ================================================================== */

export const HowItWorksPage: React.FC = () => {
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
              Verdaxis connects sustainable fuel producers with buyers and traders through
              a transparent exchange &mdash; delivering liquidity, price discovery, and
              verified sustainability data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Section 2: Three-Column Platform Benefits ---- */}
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
            <h2 style={sectionTitle}>Benefits of the Verdaxis Platform</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={sectionSubtitle}>
              A two-sided marketplace connecting sustainable fuel supply with global demand.
            </p>
          </Reveal>

          {/* Three columns with arrows */}
          <div
            className="hiw-benefits-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1.1fr auto 1fr',
              gap: 0,
              maxWidth: 1100,
              margin: '0 auto',
              alignItems: 'stretch',
            }}
          >
            <BenefitColumn
              title="Sellers"
              subtitle="Producers & Traders"
              items={sellerBenefits}
              accentColor="#4CAF50"
              delay={0}
            />
            <ColumnArrow />
            <BenefitColumn
              title="Verdaxis Platform"
              subtitle="The Exchange"
              items={platformCapabilities}
              accentColor="#5DADE2"
              delay={0.15}
              isCenter
            />
            <ColumnArrow />
            <BenefitColumn
              title="Buyers"
              subtitle="Owners & Charterers"
              items={buyerBenefits}
              accentColor="#5DADE2"
              delay={0.3}
            />
          </div>
        </div>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 900px) {
            .hiw-benefits-grid {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
              max-width: 480px !important;
            }
            .hiw-column-arrow {
              transform: rotate(90deg);
              padding: 8px 0 !important;
            }
          }
        `}</style>
      </section>

      {/* ---- Section 3: Key Principles ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF' }}>
        <Reveal>
          <h2 style={sectionTitle}>Key Principles</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p style={sectionSubtitle}>
            The design choices that make Verdaxis a trusted and transparent marketplace.
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
