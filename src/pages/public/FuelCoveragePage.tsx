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
import { useNamespace } from '../../hooks/useNamespace';

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
/*  Data — technical values stay hardcoded; display labels translated  */
/* ------------------------------------------------------------------ */

const fuelTypes: FuelType[] = [
  {
    name: 'Methanol',
    icon: Droplets,
    accent: '#5DADE2',
    accentBg: 'rgba(93, 173, 226, 0.1)',
    pathways: ['Bio-methanol (waste/biomass)', 'E-methanol (green H\u2082 + CO\u2082)', 'Fossil (grey)'],
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
    pathways: ['1G (sugarcane/corn)', '2G (cellulosic/bagasse)', 'Waste-based'],
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
    pathways: ['Anaerobic digestion (biogas)', 'Gasification (woody biomass)', 'Landfill gas upgrading'],
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
    pathways: ['UCOME (used cooking oil methyl ester)', 'FAME B20\u2013B100 blends', 'HVO (hydrotreated vegetable oil)'],
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
    pathways: ['Green ammonia (electrolysis)', 'Blue ammonia (SMR + CCS)'],
    ciRange: '0.5\u201330 gCO\u2082e/MJ',
    energyDensity: '18.6 MJ/kg',
    keyMarkets: 'Maritime (next-gen engines), power generation, industrial heat',
    note: 'MAN and W\u00e4rtsil\u00e4 ammonia engines in development. First commercial vessels expected 2026\u20132028.',
    comingSoon: true,
    sectors: ['maritime', 'land'],
  },
  {
    name: 'Sustainable Aviation Fuel (SAF)',
    icon: Plane,
    accent: '#FF9800',
    accentBg: 'rgba(255, 152, 0, 0.1)',
    pathways: ['HEFA (used cooking oil / tallow)', 'Fischer-Tropsch (gasification)', 'Alcohol-to-Jet (AtJ)'],
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
    pathways: ['Used cooking oil collection & processing', 'Waste grease transesterification'],
    ciRange: '10\u201325 gCO\u2082e/MJ',
    energyDensity: '37.5 MJ/kg',
    keyMarkets: 'SAF feedstock (HEFA pathway), biodiesel, maritime',
    note: 'The dominant SAF feedstock today. Supply chain integrity critical \u2014 UCO fraud risk drives need for verified provenance.',
    sectors: ['aviation', 'maritime'],
  },
];

const sectors: Sector[] = ['maritime', 'aviation', 'land'];

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                         */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = { padding: '72px 24px' };

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

interface FuelCardProps {
  fuel: FuelType;
  labels: { comingSoon: string; pathways: string; ciRange: string; energyDensity: string; keyMarkets: string };
}

const FuelCard: React.FC<FuelCardProps> = ({ fuel, labels }) => {
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
          {labels.comingSoon}
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
          {labels.pathways}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            {labels.ciRange}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{ciRange}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            {labels.energyDensity}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{energyDensity}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          {labels.keyMarkets}
        </div>
        <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>{keyMarkets}</div>
      </div>

      <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${accent}` }}>
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
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24 }}>
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

interface SectorConfig {
  label: string;
  icon: React.FC<{ size?: number; color?: string }>;
  color: string;
  headline: string;
  subtitle: string;
}

const SectorTab: React.FC<{
  config: SectorConfig;
  isActive: boolean;
  onClick: () => void;
}> = ({ config, isActive, onClick }) => {
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
      <Icon size={20} color={isActive ? config.color : '#94A3B8'} />
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
  const { t, ready } = useNamespace('public');
  const { sector: urlSector } = useParams<{ sector?: string }>();
  const navigate = useNavigate();

  const activeSector: Sector =
    urlSector && sectors.includes(urlSector as Sector)
      ? (urlSector as Sector)
      : 'maritime';

  if (!ready) return null;

  const sectorConfigs: Record<Sector, SectorConfig> = {
    maritime: {
      label: t('fuelCoverage.sectors.maritime.label'),
      icon: Anchor,
      color: '#5DADE2',
      headline: t('fuelCoverage.sectors.maritime.headline'),
      subtitle: t('fuelCoverage.sectors.maritime.subtitle'),
    },
    aviation: {
      label: t('fuelCoverage.sectors.aviation.label'),
      icon: Plane,
      color: '#FF9800',
      headline: t('fuelCoverage.sectors.aviation.headline'),
      subtitle: t('fuelCoverage.sectors.aviation.subtitle'),
    },
    land: {
      label: t('fuelCoverage.sectors.land.label'),
      icon: Truck,
      color: '#4CAF50',
      headline: t('fuelCoverage.sectors.land.headline'),
      subtitle: t('fuelCoverage.sectors.land.subtitle'),
    },
  };

  const fuelCardLabels = {
    comingSoon: t('fuelCoverage.fuelCard.comingSoon'),
    pathways: t('fuelCoverage.fuelCard.pathways'),
    ciRange: t('fuelCoverage.fuelCard.ciRange'),
    energyDensity: t('fuelCoverage.fuelCard.energyDensity'),
    keyMarkets: t('fuelCoverage.fuelCard.keyMarkets'),
  };

  const attributes: Attribute[] = [
    { title: t('fuelCoverage.attributes.items.0.title'), description: t('fuelCoverage.attributes.items.0.description'), icon: FlaskConical },
    { title: t('fuelCoverage.attributes.items.1.title'), description: t('fuelCoverage.attributes.items.1.description'), icon: Zap },
    { title: t('fuelCoverage.attributes.items.2.title'), description: t('fuelCoverage.attributes.items.2.description'), icon: Globe },
    { title: t('fuelCoverage.attributes.items.3.title'), description: t('fuelCoverage.attributes.items.3.description'), icon: Award },
  ];

  const config = sectorConfigs[activeSector];
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
        <GradientOrb color={`${config.color}14`} size={500} style={{ top: -200, left: -150 }} />
        <GradientOrb color="rgba(76,175,80,0.06)" size={400} style={{ bottom: -180, right: -100 }} />
        <DotGrid color="rgba(248,250,252,0.05)" style={{ top: 30, right: 40 }} />
        <LeafDecor color={`${config.color}08`} style={{ width: 220, height: 220, bottom: -60, left: 20 }} />

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
            {t('fuelCoverage.hero.title')}
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
            {t('fuelCoverage.hero.subtitle')}
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
                config={sectorConfigs[s]}
                isActive={activeSector === s}
                onClick={() => handleSectorChange(s)}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ---- Section 2: Sector intro + Fuel Types Grid ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
        <DotGrid color="rgba(15,23,42,0.03)" style={{ top: 20, left: 30 }} />

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
                    <FuelCard fuel={fuel} labels={fuelCardLabels} />
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerGrid>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ---- Section 3: Key Attributes ---- */}
      <section style={{ ...sectionPadding, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        <LeafDecor color="rgba(76,175,80,0.04)" style={{ width: 180, height: 180, top: -40, right: -30 }} />

        <Reveal>
          <h2 style={sectionTitle}>{t('fuelCoverage.attributes.title')}</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={sectionSubtitle}>{t('fuelCoverage.attributes.subtitle')}</p>
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
        <GradientOrb color="rgba(93,173,226,0.06)" size={350} style={{ top: -120, right: -80 }} />
        <GradientOrb color="rgba(76,175,80,0.05)" size={300} style={{ bottom: -100, left: -60 }} />
        <DotGrid color="rgba(248,250,252,0.04)" style={{ bottom: 20, left: 40 }} />

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
              {t('fuelCoverage.cta.title')}
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
                {t('fuelCoverage.cta.button')}
              </Link>
            </HoverButton>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
