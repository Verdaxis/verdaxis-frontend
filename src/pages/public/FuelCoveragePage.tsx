import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Droplets,
  Wheat,
  Plane,
  Atom,
  Zap,
  Globe,
  FlaskConical,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  Reveal,
  HoverCard,
  StaggerGrid,
  StaggerItem,
  GradientOrb,
  DotGrid,
  LeafDecor,
  HoverButton,
} from '../../components/public/motionUtils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface FuelType {
  name: string;
  icon: React.FC<{ size?: number; color?: string }>;
  accent: string;
  accentBg: string;
  pathways: string[];
  ciRange: string;
  energyDensity: string;
  keyMarkets: string;
  note: string;
  comingSoon?: boolean;
}

interface Attribute {
  title: string;
  description: string;
  icon: React.FC<{ size?: number; color?: string }>;
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const fuelTypes: FuelType[] = [
  {
    name: 'Methanol',
    icon: Droplets,
    accent: '#5DADE2',
    accentBg: 'rgba(93, 173, 226, 0.1)',
    pathways: [
      'Fossil (grey)',
      'Bio-methanol (waste/biomass)',
      'E-methanol (green H\u2082 + CO\u2082)',
    ],
    ciRange: '3\u201394 gCO\u2082e/MJ',
    energyDensity: '19.9 MJ/kg',
    keyMarkets: 'Maritime bunkering, chemical feedstock',
    note: '\u223C2M mt expected production in 2026. Key producers: CRI (Iceland), GoldWind (China), MGC (Japan)',
  },
  {
    name: 'Ethanol',
    icon: Wheat,
    accent: '#4CAF50',
    accentBg: 'rgba(76, 175, 80, 0.1)',
    pathways: [
      '1G (sugarcane/corn)',
      '2G (cellulosic/bagasse)',
      'Waste-based',
    ],
    ciRange: '8\u201365 gCO\u2082e/MJ',
    energyDensity: '26.8 MJ/kg',
    keyMarkets: 'Road transport blending, SAF feedstock, maritime',
    note: 'Production could match methanol volumes. Cross-pollination with SAF pathways.',
  },
  {
    name: 'Sustainable Aviation Fuel (SAF)',
    icon: Plane,
    accent: '#FF9800',
    accentBg: 'rgba(255, 152, 0, 0.1)',
    pathways: [
      'HEFA (used cooking oil)',
      'Fischer-Tropsch',
      'Alcohol-to-Jet (AtJ)',
    ],
    ciRange: '12\u201350 gCO\u2082e/MJ',
    energyDensity: '44.0 MJ/kg',
    keyMarkets: 'Aviation, blending mandates',
    note: 'Feedstock cross-pollination with ethanol and methanol pathways',
  },
  {
    name: 'Hydrogen Derivatives',
    icon: Atom,
    accent: '#9C27B0',
    accentBg: 'rgba(156, 39, 176, 0.1)',
    pathways: [
      'Green ammonia (electrolysis)',
      'Blue ammonia (CCS)',
      'Green hydrogen',
    ],
    ciRange: '0.5\u201330 gCO\u2082e/MJ',
    energyDensity: 'Varies (ammonia: 18.6 MJ/kg)',
    keyMarkets: 'Maritime (future), power generation, fertilizer',
    note: 'Roadmap \u2014 available as platform coverage expands',
    comingSoon: true,
  },
];

const attributes: Attribute[] = [
  {
    title: 'Carbon Intensity (CI)',
    description:
      'Measured in gCO\u2082e/MJ. The primary metric for comparing the environmental impact of different fuels and pathways. Lower CI = lower lifecycle emissions.',
    icon: FlaskConical,
  },
  {
    title: 'Feedstock Pathway',
    description:
      'The production route from raw material to finished fuel. Determines CI, regulatory eligibility, and premium potential. Examples: waste cooking oil, sugarcane bagasse, green hydrogen + CO\u2082.',
    icon: Zap,
  },
  {
    title: 'Geography',
    description:
      'Where the fuel is produced and where it will be consumed. Affects regulatory applicability (RED III for EU, 45Z for US, RenovaBio for Brazil) and logistics costs.',
    icon: Globe,
  },
  {
    title: 'Certification Scheme',
    description:
      'Third-party certifications that verify fuel claims. Supported schemes: ISCC EU, ISCC PLUS, RSB, RenovaBio, RED III compliance.',
    icon: Award,
  },
  {
    title: 'Book & Claim vs Physical',
    description:
      'Verdaxis clearly separates physical delivery from book-and-claim mechanisms. Physical trades maintain chain-of-custody. Book-and-claim is supported but distinctly labeled to prevent confusion.',
    icon: BookOpen,
  },
];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                         */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 32,
  fontFamily: '"DM Serif Display", serif',
  fontWeight: 400,
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
/*  Responsive style tag                                                */
/* ------------------------------------------------------------------ */

const responsiveStyles = `
  @media (max-width: 640px) {
    .fuel-grid {
      grid-template-columns: 1fr !important;
    }
    .attribute-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  FuelCard Component                                                  */
/* ------------------------------------------------------------------ */

const FuelCard: React.FC<{ fuel: FuelType }> = ({ fuel }) => {
  const { name, icon: Icon, accent, accentBg, pathways, ciRange, energyDensity, keyMarkets, note, comingSoon } = fuel;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 28,
        position: 'relative',
        borderTop: `3px solid ${accent}`,
      }}
    >
      {/* Coming Soon badge */}
      {comingSoon && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: accent,
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Coming Soon
        </div>
      )}

      {/* Header: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={24} color={accent} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>{name}</h3>
      </div>

      {/* Pathways */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          Pathways
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pathways.map((pathway) => (
            <span
              key={pathway}
              style={{
                display: 'inline-block',
                background: accentBg,
                color: accent,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              {pathway}
            </span>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            CI Range
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{ciRange}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Energy Density
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{energyDensity}</div>
        </div>
      </div>

      {/* Key Markets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Key Markets
        </div>
        <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>{keyMarkets}</div>
      </div>

      {/* Note */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: 8,
          padding: '12px 14px',
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
          {note}
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AttributeCard Component                                             */
/* ------------------------------------------------------------------ */

const AttributeCard: React.FC<{ attribute: Attribute }> = ({ attribute }) => {
  const { title, description, icon: Icon } = attribute;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(93,173,226,0.12), rgba(76,175,80,0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color="#5DADE2" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
      </div>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{description}</p>
    </div>
  );
};

/* ================================================================== */
/*  FuelCoveragePage                                                    */
/* ================================================================== */

export const FuelCoveragePage: React.FC = () => {
  return (
    <div>
      <style>{responsiveStyles}</style>

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
          color="rgba(93,173,226,0.08)"
          size={500}
          style={{ top: -200, left: -150 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.06)"
          size={400}
          style={{ bottom: -180, right: -100 }}
        />
        <DotGrid
          color="rgba(248,250,252,0.05)"
          style={{ top: 30, right: 40 }}
        />
        <LeafDecor
          color="rgba(93,173,226,0.04)"
          style={{ width: 220, height: 220, bottom: -60, left: 20 }}
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
              fontFamily: '"DM Serif Display", serif',
              fontWeight: 400,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Fuel & Attribute Coverage
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
            Verdaxis supports a growing range of low-carbon fuels and their verified environmental
            attributes. Here's what can be registered, traded, and tracked on the platform.
          </p>
        </motion.div>
      </section>

      {/* ---- Section 2: Fuel Types Grid ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <DotGrid
          color="rgba(15,23,42,0.03)"
          style={{ top: 20, left: 30 }}
        />

        <Reveal>
          <h2 style={sectionTitle}>Supported Fuel Types</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Each fuel type has distinct pathways, carbon intensity profiles, and market applications.
          </p>
        </Reveal>

        <StaggerGrid
          className="fuel-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {fuelTypes.map((fuel) => (
            <StaggerItem key={fuel.name}>
              <HoverCard>
                <FuelCard fuel={fuel} />
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ---- Section 3: Attributes Supported ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        <LeafDecor
          color="rgba(76,175,80,0.04)"
          style={{ width: 180, height: 180, top: -40, right: -30 }}
        />

        <Reveal>
          <h2 style={sectionTitle}>Attributes Tracked</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>
            Every fuel registered on Verdaxis carries verified environmental data across these dimensions.
          </p>
        </Reveal>

        <StaggerGrid
          className="attribute-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {attributes.map((attr) => (
            <StaggerItem key={attr.title}>
              <HoverCard>
                <AttributeCard attribute={attr} />
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ---- Section 4: CTA ---- */}
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
          style={{ top: -120, right: -80 }}
        />
        <GradientOrb
          color="rgba(76,175,80,0.05)"
          size={300}
          style={{ bottom: -100, left: -60 }}
        />
        <DotGrid
          color="rgba(248,250,252,0.04)"
          style={{ bottom: 20, left: 40 }}
        />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2
              style={{
                fontSize: 32,
                fontFamily: '"DM Serif Display", serif',
                fontWeight: 400,
                color: '#F8FAFC',
                marginBottom: 16,
              }}
            >
              See how these fuels are produced around the world
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <HoverButton>
              <Link
                to="/map/producers"
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
                Explore Producer Map
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
