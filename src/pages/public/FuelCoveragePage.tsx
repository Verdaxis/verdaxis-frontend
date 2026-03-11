import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Wheat,
  Plane,
  Atom,
  Zap,
  Globe,
  FlaskConical,
  Award,
  Anchor,
  Truck,
  Fuel,
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
  sectors: ('maritime' | 'aviation' | 'land')[];
}

interface Attribute {
  title: string;
  description: string;
  icon: React.FC<{ size?: number; color?: string }>;
}

type Sector = 'maritime' | 'aviation' | 'land';

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const fuelTypes: FuelType[] = [
  /* ── Maritime fuels ── */
  {
    name: 'Methanol',
    icon: Droplets,
    accent: '#5DADE2',
    accentBg: 'rgba(93, 173, 226, 0.1)',
    pathways: [
      'Bio-methanol (waste/biomass)',
      'E-methanol (green H\u2082 + CO\u2082)',
      'Fossil (grey)',
    ],
    ciRange: '3\u201394 gCO\u2082e/MJ',
    energyDensity: '19.9 MJ/kg',
    keyMarkets: 'Maritime bunkering, chemical feedstock',
    note: '\u223C2M mt expected production in 2026. Key producers: CRI (Iceland), GoldWind (China), MGC (Japan)',
    sectors: ['maritime', 'aviation'],
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
    sectors: ['maritime', 'aviation', 'land'],
  },
  {
    name: 'Bio-LNG',
    icon: Fuel,
    accent: '#26A69A',
    accentBg: 'rgba(38, 166, 154, 0.1)',
    pathways: [
      'Anaerobic digestion (biogas)',
      'Gasification (woody biomass)',
      'Landfill gas upgrading',
    ],
    ciRange: '10\u201340 gCO\u2082e/MJ',
    energyDensity: '49.0 MJ/kg',
    keyMarkets: 'Maritime bunkering, LNG-fuelled vessels',
    note: 'Drop-in for the growing LNG-fuelled fleet. 700+ LNG-capable vessels in service or on order.',
    sectors: ['maritime'],
  },
  {
    name: 'Bio-MGO / FAME Blends',
    icon: Droplets,
    accent: '#7CB342',
    accentBg: 'rgba(124, 179, 66, 0.1)',
    pathways: [
      'UCOME (used cooking oil methyl ester)',
      'FAME B20\u2013B100 blends',
      'HVO (hydrotreated vegetable oil)',
    ],
    ciRange: '15\u201355 gCO\u2082e/MJ',
    energyDensity: '37.0 MJ/kg',
    keyMarkets: 'Maritime bunkering, drop-in blending',
    note: 'Lowest-barrier entry for existing fleet. UCOME widely available at major bunkering hubs.',
    sectors: ['maritime'],
  },
  {
    name: 'Ammonia',
    icon: Atom,
    accent: '#9C27B0',
    accentBg: 'rgba(156, 39, 176, 0.1)',
    pathways: [
      'Green ammonia (electrolysis)',
      'Blue ammonia (SMR + CCS)',
    ],
    ciRange: '0.5\u201330 gCO\u2082e/MJ',
    energyDensity: '18.6 MJ/kg',
    keyMarkets: 'Maritime (next-gen engines), power generation, industrial heat',
    note: 'MAN and W\u00e4rtsil\u00e4 ammonia engines in development. First commercial vessels expected 2026\u20132028. Also a key vector for clean power generation.',
    comingSoon: true,
    sectors: ['maritime', 'land'],
  },
  /* ── Aviation fuels ── */
  {
    name: 'Sustainable Aviation Fuel (SAF)',
    icon: Plane,
    accent: '#FF9800',
    accentBg: 'rgba(255, 152, 0, 0.1)',
    pathways: [
      'HEFA (used cooking oil / tallow)',
      'Fischer-Tropsch (gasification)',
      'Alcohol-to-Jet (AtJ)',
    ],
    ciRange: '12\u201350 gCO\u2082e/MJ',
    energyDensity: '44.0 MJ/kg',
    keyMarkets: 'Aviation, blending mandates (EU ReFuelEU)',
    note: 'Global SAF mandates accelerating: EU 2% (2025), 6% (2030), 70% (2050). CORSIA Phase 1 starts 2027.',
    sectors: ['aviation'],
  },
  {
    name: 'UCOME',
    icon: Droplets,
    accent: '#8D6E63',
    accentBg: 'rgba(141, 110, 99, 0.1)',
    pathways: [
      'Used cooking oil collection & processing',
      'Waste grease transesterification',
    ],
    ciRange: '10\u201325 gCO\u2082e/MJ',
    energyDensity: '37.5 MJ/kg',
    keyMarkets: 'SAF feedstock (HEFA pathway), biodiesel, maritime',
    note: 'The dominant SAF feedstock today. Supply chain integrity critical \u2014 UCO fraud risk drives need for verified provenance.',
    sectors: ['aviation', 'maritime'],
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
    title: 'Geography & Price Discovery',
    description:
      'Verdaxis is headquartered in Singapore but enables price discovery for any point in the world. Physical trades can take place at any port or delivery location globally.',
    icon: Globe,
  },
  {
    title: 'Certification Scheme',
    description:
      'Third-party certifications that verify fuel claims. Supported schemes: ISCC EU, ISCC PLUS, RSB, RenovaBio, RED III compliance.',
    icon: Award,
  },
];

/* ------------------------------------------------------------------ */
/*  Sector configuration                                                */
/* ------------------------------------------------------------------ */

const sectorConfig: Record<Sector, {
  label: string;
  icon: React.FC<{ size?: number; color?: string }>;
  color: string;
  headline: string;
  subtitle: string;
}> = {
  maritime: {
    label: 'Maritime',
    icon: Anchor,
    color: '#5DADE2',
    headline: 'Maritime Fuels',
    subtitle: 'Low-carbon bunker fuels for the global fleet \u2014 from drop-in biofuel blends to next-generation ammonia and e-methanol.',
  },
  aviation: {
    label: 'Aviation',
    icon: Plane,
    color: '#FF9800',
    headline: 'Aviation Fuels',
    subtitle: 'Sustainable Aviation Fuel (SAF) and its feedstock pathways \u2014 meeting ReFuelEU, CORSIA, and Scope 3 mandates.',
  },
  land: {
    label: 'Land',
    icon: Truck,
    color: '#4CAF50',
    headline: 'Land & Power',
    subtitle: 'Ethanol for road transport and ammonia for clean power generation \u2014 the bridge fuels for terrestrial decarbonisation.',
  },
};

const sectors: Sector[] = ['maritime', 'aviation', 'land'];

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
    .sector-tabs {
      flex-direction: column !important;
      gap: 8px !important;
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

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Key Markets
        </div>
        <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>{keyMarkets}</div>
      </div>

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

/* ------------------------------------------------------------------ */
/*  SectorTab Component                                                 */
/* ------------------------------------------------------------------ */

const SectorTab: React.FC<{
  sector: Sector;
  isActive: boolean;
  onClick: () => void;
}> = ({ sector, isActive, onClick }) => {
  const config = sectorConfig[sector];
  const Icon = config.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 28px',
        borderRadius: 12,
        border: isActive ? `2px solid ${config.color}` : '2px solid rgba(248,250,252,0.15)',
        background: isActive ? `${config.color}20` : 'rgba(248,250,252,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Icon
        size={20}
        color={isActive ? config.color : '#94A3B8'}
      />
      <span
        style={{
          fontSize: 15,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? config.color : '#94A3B8',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {config.label}
      </span>
    </motion.button>
  );
};

/* ================================================================== */
/*  FuelCoveragePage                                                    */
/* ================================================================== */

export const FuelCoveragePage: React.FC = () => {
  const { sector: urlSector } = useParams<{ sector?: string }>();
  const navigate = useNavigate();

  const activeSector: Sector =
    urlSector && sectors.includes(urlSector as Sector)
      ? (urlSector as Sector)
      : 'maritime';

  const config = sectorConfig[activeSector];
  const filteredFuels = fuelTypes.filter((f) => f.sectors.includes(activeSector));

  const handleSectorChange = (sector: Sector) => {
    navigate(`/fuels/${sector}`, { replace: true });
  };

  return (
    <div>
      <style>{responsiveStyles}</style>

      {/* ---- Section 1: Hero with sector tabs ---- */}
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
          color={`${config.color}14`}
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
          color={`${config.color}08`}
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
            Fuel Coverage
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.7,
              maxWidth: 620,
              margin: '0 auto 40px',
            }}
          >
            Verdaxis supports sustainable fuels across maritime, aviation, and land transport.
            Explore fuel types, pathways, and environmental attributes by sector.
          </p>

          {/* Sector tabs */}
          <div
            className="sector-tabs"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {sectors.map((s) => (
              <SectorTab
                key={s}
                sector={s}
                isActive={activeSector === s}
                onClick={() => handleSectorChange(s)}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ---- Section 2: Sector intro + Fuel Types Grid ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <DotGrid
          color="rgba(15,23,42,0.03)"
          style={{ top: 20, left: 30 }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSector}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Reveal>
              <h2 style={{ ...sectionTitle, color: config.color }}>{config.headline}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={sectionSubtitle}>{config.subtitle}</p>
            </Reveal>

            <StaggerGrid
              className="fuel-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: filteredFuels.length <= 2 ? 'repeat(auto-fit, minmax(340px, 1fr))' : 'repeat(2, 1fr)',
                gap: 24,
                maxWidth: 1100,
                margin: '0 auto',
              }}
            >
              {filteredFuels.map((fuel) => (
                <StaggerItem key={fuel.name}>
                  <HoverCard>
                    <FuelCard fuel={fuel} />
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerGrid>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ---- Section 3: Key Attributes ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        <LeafDecor
          color="rgba(76,175,80,0.04)"
          style={{ width: 180, height: 180, top: -40, right: -30 }}
        />

        <Reveal>
          <h2 style={sectionTitle}>Key Attributes</h2>
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
