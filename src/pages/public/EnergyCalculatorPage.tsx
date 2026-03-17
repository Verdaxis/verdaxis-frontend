import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Wind, ShieldCheck, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import {
  CalculatorInputs,
  VoyageResult,
  defaultInputs,
  calculateVoyage,
} from '../../data/calculatorDefaults';
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

const DropletIcon: React.FC<{ color?: string }> = ({ color = '#5DADE2' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const CompassIcon: React.FC<{ color?: string }> = ({ color = '#64748B' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} opacity="0.2" />
  </svg>
);

const AnchorIcon: React.FC<{ color?: string }> = ({ color = '#64748B' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="22" x2="12" y2="8" />
    <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
  </svg>
);

const ShipIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.15">
    <path d="M4 36l4-16h32l4 16" stroke="#5DADE2" strokeWidth="2" fill="none" />
    <path d="M14 20V10h20v10" stroke="#5DADE2" strokeWidth="2" fill="none" />
    <path d="M20 10V6h8v4" stroke="#5DADE2" strokeWidth="2" fill="none" />
    <path d="M2 40c4-2 8 0 12-2s8 0 12-2 8 0 12-2 8 0 8 0" stroke="#5DADE2" strokeWidth="1.5" fill="none" opacity="0.6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Background Pattern SVGs                                            */
/* ------------------------------------------------------------------ */

const HeroWavePattern: React.FC = () => (
  <svg
    style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '120px', opacity: 0.08 }}
    viewBox="0 0 1440 120"
    preserveAspectRatio="none"
  >
    <path d="M0,40 C360,100 720,0 1080,60 C1260,90 1440,40 1440,40 L1440,120 L0,120 Z" fill="#5DADE2" />
    <path d="M0,70 C360,20 720,100 1080,50 C1260,30 1440,80 1440,80 L1440,120 L0,120 Z" fill="#4CAF50" opacity="0.5" />
  </svg>
);

const HeroGridPattern: React.FC = () => (
  <svg
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.04 }}
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#5DADE2" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#heroGrid)" />
  </svg>
);

const DotGridBg: React.FC = () => (
  <svg
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none' }}
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.8" fill="#334155" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotGrid)" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = { padding: '72px 24px' };

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 24,
};

/* ------------------------------------------------------------------ */
/*  Number formatting helpers                                          */
/* ------------------------------------------------------------------ */

function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtUsd(n: number): string {
  return '$' + fmtNumber(n);
}

function fmtEur(n: number): string {
  return '\u20AC' + fmtNumber(n);
}

/* ------------------------------------------------------------------ */
/*  SliderInput component                                              */
/* ------------------------------------------------------------------ */

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accentColor?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, min, max, step, unit, accentColor }) => {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            letterSpacing: 0.2,
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {label}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(v);
            }}
            step={step}
            min={min}
            max={max}
            style={{
              width: 80,
              padding: '4px 8px',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              color: '#0F172A',
              textAlign: 'right',
              background: '#F8FAFC',
              outline: 'none',
              fontFamily: "'Montserrat', sans-serif",
            }}
          />
          {unit && (
            <span style={{ fontSize: 12, color: '#64748B', minWidth: 44, fontFamily: "'Lato', sans-serif" }}>{unit}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        style={{ width: '100%', accentColor: accentColor || '#5DADE2', cursor: 'pointer' }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DropdownInput for EU ETS coverage                                  */
/* ------------------------------------------------------------------ */

interface DropdownInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { label: string; value: number }[];
}

const DropdownInput: React.FC<DropdownInputProps> = ({ label, value, onChange, options }) => {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#334155',
          letterSpacing: 0.2,
          marginBottom: 6,
          fontFamily: "'Lato', sans-serif",
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          color: '#0F172A',
          background: '#F8FAFC',
          outline: 'none',
          cursor: 'pointer',
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  MetricCard component                                               */
/* ------------------------------------------------------------------ */

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  mainValue: string;
  subLines: string[];
  highlight?: 'red' | 'green' | 'none';
  badge?: string;
  badgeColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  mainValue,
  subLines,
  highlight = 'none',
  badge,
  badgeColor,
}) => {
  const borderColor =
    highlight === 'red'
      ? '#EF4444'
      : highlight === 'green'
        ? '#4CAF50'
        : '#E2E8F0';

  const bgColor =
    highlight === 'red'
      ? 'rgba(239,68,68,0.04)'
      : highlight === 'green'
        ? 'rgba(76,175,80,0.04)'
        : '#FFFFFF';

  return (
    <div
      className="calc-metric-card"
      style={{
        ...card,
        padding: '16px 14px',
        borderColor,
        borderWidth: highlight !== 'none' ? 2 : 1,
        background: bgColor,
        position: 'relative',
        minWidth: 0,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 10,
            fontWeight: 700,
            color: '#FFFFFF',
            background: badgeColor || '#4CAF50',
            padding: '2px 8px',
            borderRadius: 10,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#0F172A',
          marginBottom: 6,
          lineHeight: 1.2,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {mainValue}
      </div>
      {subLines.map((line, i) => (
        <div key={i} style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, fontFamily: "'Lato', sans-serif" }}>
          {line}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  CostComparisonBar                                                  */
/* ------------------------------------------------------------------ */

interface CostComparisonBarProps {
  costA: number;
  costB: number;
  labelA: string;
  labelB: string;
}

const CostComparisonBar: React.FC<CostComparisonBarProps> = ({ costA, costB, labelA, labelB }) => {
  const maxCost = Math.max(costA, costB, 1);
  const pctA = (costA / maxCost) * 100;
  const pctB = (costB / maxCost) * 100;
  const aIsCheaper = costA <= costB;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto 40px', padding: '0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, fontFamily: "'Montserrat', sans-serif" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, minWidth: 56 }}>
          {labelA}
        </span>
        <div style={{ flex: 1, height: 28, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              width: `${pctA}%`,
              height: '100%',
              background: aIsCheaper ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' : 'linear-gradient(90deg, #EF4444, #F87171)',
              borderRadius: 6,
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {fmtUsd(costA)}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'Montserrat', sans-serif" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, minWidth: 56 }}>
          {labelB}
        </span>
        <div style={{ flex: 1, height: 28, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              width: `${pctB}%`,
              height: '100%',
              background: !aIsCheaper ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' : 'linear-gradient(90deg, #EF4444, #F87171)',
              borderRadius: 6,
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {fmtUsd(costB)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  FuelResultRow component                                            */
/* ------------------------------------------------------------------ */

interface FuelResultRowProps {
  label: string;
  result: VoyageResult;
  inputs: CalculatorInputs;
  isCheaper: boolean;
  accentColor: string;
  metricLabels: {
    fuelBurn: string;
    co2Emissions: string;
    euEtsCost: string;
    fuelEu: string;
    ciiProxy: string;
    totalCost: string;
    lowerCost: string;
    compliant: string;
    penalty: string;
  };
}

const FuelResultRow: React.FC<FuelResultRowProps> = ({ label, result, inputs, isCheaper, accentColor, metricLabels }) => {
  const costHighlight = isCheaper ? 'green' : 'red';

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: accentColor }} />
        <DropletIcon color={accentColor} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isCheaper ? '#4CAF50' : '#EF4444',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {label} — {result.energyDensity} MJ/kg
        </span>
        {isCheaper && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#FFFFFF',
              background: '#4CAF50',
              padding: '2px 10px',
              borderRadius: 10,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {metricLabels.lowerCost}
          </span>
        )}
      </div>
      <div
        className="calc-metric-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
      >
        <MetricCard
          icon={<Flame size={14} color="#5DADE2" />}
          title={metricLabels.fuelBurn}
          mainValue={`${fmtNumber(result.fuelBurnT)} t`}
          subLines={[`Eff: ${result.effTperDay} t/d`]}
        />
        <MetricCard
          icon={<Wind size={14} color="#5DADE2" />}
          title={metricLabels.co2Emissions}
          mainValue={`${fmtNumber(result.co2T)} t`}
          subLines={[`EF: ${inputs.emissionFactor}`]}
        />
        <MetricCard
          icon={<DollarSign size={14} color="#5DADE2" />}
          title={metricLabels.euEtsCost}
          mainValue={fmtEur(result.etsCostEur)}
          subLines={[
            `Coverage: ${Math.round(inputs.etsCoverage * 100)}%`,
            `EUA: \u20AC${inputs.euaPrice}/t`,
          ]}
        />
        <MetricCard
          icon={
            result.fueleuCompliant
              ? <ShieldCheck size={14} color="#4CAF50" />
              : <AlertTriangle size={14} color="#EF4444" />
          }
          title={metricLabels.fuelEu}
          mainValue={result.fueleuCompliant ? fmtEur(0) : fmtEur(result.fueleuPenaltyEur)}
          subLines={[`Int: ${result.fueleuIntensity}`, `vs ${inputs.fueleuThreshold}`]}
          badge={result.fueleuCompliant ? metricLabels.compliant : metricLabels.penalty}
          badgeColor={result.fueleuCompliant ? '#4CAF50' : '#EF4444'}
        />
        <MetricCard
          icon={<TrendingDown size={14} color="#5DADE2" />}
          title={metricLabels.ciiProxy}
          mainValue={String(result.ciiProxy)}
          subLines={[isCheaper ? 'Better \u2191' : 'Worse \u2193']}
        />
        <MetricCard
          icon={<DollarSign size={14} color={isCheaper ? '#4CAF50' : '#EF4444'} />}
          title={metricLabels.totalCost}
          mainValue={fmtUsd(result.totalCostUsd)}
          subLines={[`Fuel: ${fmtUsd(result.fuelCostUsd)}`, '+ETS+FuelEU']}
          highlight={costHighlight}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DeltaCard                                                          */
/* ------------------------------------------------------------------ */

interface DeltaCardProps {
  label: string;
  value: number;
  formatter: (n: number) => string;
  maxValue: number;
}

const DeltaCard: React.FC<DeltaCardProps> = ({ label, value, formatter, maxValue }) => {
  const pct = maxValue > 0 ? Math.min((Math.abs(value) / maxValue) * 100, 100) : 0;
  const barColor = value > 0 ? '#4CAF50' : value < 0 ? '#EF4444' : '#94A3B8';

  return (
    <div
      style={{
        ...card,
        padding: '20px 24px',
        textAlign: 'center',
        minWidth: 180,
        flex: '1 1 180px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: value > 0 ? '#4CAF50' : value < 0 ? '#EF4444' : '#64748B',
          marginBottom: 10,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        +{formatter(Math.abs(value))}
      </div>
      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: barColor,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};

/* ================================================================== */
/*  EnergyCalculatorPage                                               */
/* ================================================================== */

export const EnergyCalculatorPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const [inputs, setInputs] = useState<CalculatorInputs>({ ...defaultInputs });

  const update = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const resultA = useMemo(
    () => calculateVoyage(inputs.fuelA_energyDensity, inputs.fuelA_price, inputs.fuelA_dailyConsumption, inputs),
    [inputs]
  );
  const resultB = useMemo(
    () => calculateVoyage(inputs.fuelB_energyDensity, inputs.fuelB_price, inputs.fuelB_dailyConsumption, inputs),
    [inputs]
  );

  const diff = resultA.totalCostUsd - resultB.totalCostUsd;
  const fuelDiff = resultA.fuelCostUsd - resultB.fuelCostUsd;
  const etsDiff = resultA.etsCostEur - resultB.etsCostEur;
  const fueleuDiff = resultA.fueleuPenaltyEur - resultB.fueleuPenaltyEur;

  const totalFuelBurned = (resultA.fuelBurnT + resultB.fuelBurnT) / 2;
  const perTonneLow = totalFuelBurned > 0 ? Math.round(Math.abs(diff) / totalFuelBurned * 0.8) : 0;
  const perTonneHigh = totalFuelBurned > 0 ? Math.round(Math.abs(diff) / totalFuelBurned * 1.2) : 0;

  const aIsCheaper = resultA.totalCostUsd <= resultB.totalCostUsd;
  const maxDelta = Math.max(Math.abs(fuelDiff), Math.abs(etsDiff * inputs.eurToUsd), Math.abs(fueleuDiff * inputs.eurToUsd), 1);

  if (!ready) return null;

  const metricLabels = {
    fuelBurn: t('energyCalculator.metrics.fuelBurn'),
    co2Emissions: t('energyCalculator.metrics.co2Emissions'),
    euEtsCost: t('energyCalculator.metrics.euEtsCost'),
    fuelEu: t('energyCalculator.metrics.fuelEu'),
    ciiProxy: t('energyCalculator.metrics.ciiProxy'),
    totalCost: t('energyCalculator.metrics.totalCost'),
    lowerCost: t('energyCalculator.metrics.lowerCost'),
    compliant: t('energyCalculator.metrics.compliant'),
    penalty: t('energyCalculator.metrics.penalty'),
  };

  return (
    <div>
      {/* ---- Section 1: Hero ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          padding: '96px 24px 80px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <HeroGridPattern />
        <HeroWavePattern />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <ShipIcon />
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 16,
              lineHeight: 1.2,
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t('energyCalculator.hero.title')}
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.7,
              maxWidth: 640,
              margin: '0 auto',
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {t('energyCalculator.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ---- Section 2: Inputs (horizontal) ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC', paddingBottom: 32, position: 'relative' }}>
        <DotGridBg />
        <div
          className="calc-inputs-row"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Fuel A Parameters */}
          <div
            className="calc-input-card"
            style={{ ...card, borderTop: '3px solid #5DADE2', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <DropletIcon color="#5DADE2" />
              {t('energyCalculator.fuelA')}
            </h3>
            <SliderInput label={t('energyCalculator.labels.energyDensity')} value={inputs.fuelA_energyDensity} onChange={(v) => update('fuelA_energyDensity', v)} min={15} max={50} step={0.1} unit="MJ/kg" accentColor="#5DADE2" />
            <SliderInput label={t('energyCalculator.labels.dailyConsumption')} value={inputs.fuelA_dailyConsumption} onChange={(v) => update('fuelA_dailyConsumption', v)} min={10} max={100} step={1} unit="t/day" accentColor="#5DADE2" />
            <SliderInput label={t('energyCalculator.labels.fuelPrice')} value={inputs.fuelA_price} onChange={(v) => update('fuelA_price', v)} min={200} max={1500} step={10} unit="$/mt" accentColor="#5DADE2" />
          </div>

          {/* Fuel B Parameters */}
          <div
            className="calc-input-card"
            style={{ ...card, borderTop: '3px solid #4CAF50', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <DropletIcon color="#4CAF50" />
              {t('energyCalculator.fuelB')}
            </h3>
            <SliderInput label={t('energyCalculator.labels.energyDensity')} value={inputs.fuelB_energyDensity} onChange={(v) => update('fuelB_energyDensity', v)} min={15} max={50} step={0.1} unit="MJ/kg" accentColor="#4CAF50" />
            <SliderInput label={t('energyCalculator.labels.dailyConsumption')} value={inputs.fuelB_dailyConsumption} onChange={(v) => update('fuelB_dailyConsumption', v)} min={10} max={100} step={1} unit="t/day" accentColor="#4CAF50" />
            <SliderInput label={t('energyCalculator.labels.fuelPrice')} value={inputs.fuelB_price} onChange={(v) => update('fuelB_price', v)} min={200} max={1500} step={10} unit="$/mt" accentColor="#4CAF50" />
          </div>

          {/* Voyage & Regulatory Parameters */}
          <div
            className="calc-input-card"
            style={{ ...card, borderTop: '3px solid #64748B', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <CompassIcon color="#64748B" />
              {t('energyCalculator.voyageRegulatory')}
            </h3>
            <SliderInput label={t('energyCalculator.labels.voyageDays')} value={inputs.voyageDays} onChange={(v) => update('voyageDays', v)} min={1} max={60} step={1} unit="days" accentColor="#64748B" />
            <SliderInput label={t('energyCalculator.labels.euaPrice')} value={inputs.euaPrice} onChange={(v) => update('euaPrice', v)} min={20} max={200} step={1} unit={`\u20AC/tCO\u2082`} accentColor="#64748B" />
            <DropdownInput
              label={t('energyCalculator.labels.euEtsCoverage')}
              value={inputs.etsCoverage}
              onChange={(v) => update('etsCoverage', v)}
              options={[
                { label: '40%', value: 0.4 },
                { label: '50%', value: 0.5 },
                { label: '70%', value: 0.7 },
                { label: '100%', value: 1.0 },
              ]}
            />
            <SliderInput label={t('energyCalculator.labels.fueleuThreshold')} value={inputs.fueleuThreshold} onChange={(v) => update('fueleuThreshold', v)} min={50} max={100} step={0.01} unit={`gCO\u2082e/MJ`} accentColor="#64748B" />
            <SliderInput label={t('energyCalculator.labels.eurUsdRate')} value={inputs.eurToUsd} onChange={(v) => update('eurToUsd', v)} min={0.8} max={1.5} step={0.01} unit="" accentColor="#64748B" />
          </div>
        </div>
      </section>

      {/* ---- Section 2b: Visual Cost Comparison Bar ---- */}
      <section style={{ padding: '40px 24px 0', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontFamily: "'Montserrat', sans-serif" }}>
            <AnchorIcon color="#334155" />
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {t('energyCalculator.totalVoyageCostComparison')}
            </h3>
          </div>
        </div>
        <CostComparisonBar
          costA={resultA.totalCostUsd}
          costB={resultB.totalCostUsd}
          labelA={t('energyCalculator.fuelA')}
          labelB={t('energyCalculator.fuelB')}
        />
      </section>

      {/* ---- Section 2c: Detailed Results ---- */}
      <section style={{ padding: '32px 24px 72px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FuelResultRow
            label={t('energyCalculator.fuelA')}
            result={resultA}
            inputs={inputs}
            isCheaper={aIsCheaper}
            accentColor="#5DADE2"
            metricLabels={metricLabels}
          />
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, #CBD5E1 20%, #CBD5E1 80%, transparent)',
              margin: '8px 0 32px',
            }}
          />
          <FuelResultRow
            label={t('energyCalculator.fuelB')}
            result={resultB}
            inputs={inputs}
            isCheaper={!aIsCheaper}
            accentColor="#4CAF50"
            metricLabels={metricLabels}
          />
        </div>
      </section>

      {/* ---- Section 3: Savings Summary ---- */}
      <section
        style={{
          background: '#FFFFFF',
          padding: '64px 24px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 12,
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t('energyCalculator.savings.eyebrow')}
          </p>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: 8,
              lineHeight: 1.1,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            <span style={{ color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF4444' : '#64748B' }}>
              {fmtUsd(Math.abs(Math.round(diff)))}
            </span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: '#64748B',
              marginBottom: 40,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {diff > 0
              ? t('energyCalculator.savings.fuelBSaves')
              : diff < 0
                ? t('energyCalculator.savings.fuelASaves')
                : t('energyCalculator.savings.equal')}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            <DeltaCard label={t('energyCalculator.savings.fuelCostDelta')} value={fuelDiff} formatter={fmtUsd} maxValue={maxDelta} />
            <DeltaCard label={t('energyCalculator.savings.etsCostDelta')} value={etsDiff} formatter={fmtEur} maxValue={maxDelta / inputs.eurToUsd} />
            <DeltaCard label={t('energyCalculator.savings.fueleuPenaltyDelta')} value={fueleuDiff} formatter={fmtEur} maxValue={maxDelta / inputs.eurToUsd} />
          </div>

          <div
            style={{
              display: 'inline-block',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '10px 24px',
            }}
          >
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, fontFamily: "'Lato', sans-serif" }}>
              {'\u2248'} ${perTonneLow}{'\u2013'}${perTonneHigh} per tonne in effective value based on energy alone
            </p>
          </div>
        </div>
      </section>

      {/* ---- Section 4: CTA ---- */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <HeroGridPattern />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 12,
              lineHeight: 1.3,
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t('energyCalculator.cta.title')}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.6,
              marginBottom: 28,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {t('energyCalculator.cta.subtitle')}
          </p>
          <Link
            to="/pilot"
            className="calc-cta-btn"
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
              fontFamily: "'Montserrat', sans-serif",
              boxShadow: '0 4px 16px rgba(93,173,226,0.3)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {t('energyCalculator.cta.button')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ---- Responsive & interaction styles ---- */}
      <style>{`
        @media (max-width: 900px) {
          .calc-inputs-row {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .calc-metric-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        .calc-metric-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .calc-input-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06) !important;
        }
        .calc-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(93,173,226,0.4) !important;
        }
      `}</style>
    </div>
  );
};
