import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Wind, ShieldCheck, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import {
  CalculatorInputs,
  VoyageResult,
  defaultInputs,
  calculateVoyage,
} from '../../data/calculatorDefaults';

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const sectionPadding: React.CSSProperties = {
  padding: '72px 24px',
};

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
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, min, max, step, unit }) => {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            letterSpacing: 0.2,
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
            }}
          />
          {unit && (
            <span style={{ fontSize: 12, color: '#64748B', minWidth: 44 }}>{unit}</span>
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
        style={{ width: '100%', accentColor: '#5DADE2', cursor: 'pointer' }}
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
      style={{
        ...card,
        padding: '16px 14px',
        borderColor,
        borderWidth: highlight !== 'none' ? 2 : 1,
        background: bgColor,
        position: 'relative',
        minWidth: 0,
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
        }}
      >
        {mainValue}
      </div>
      {subLines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: '#64748B',
            lineHeight: 1.5,
          }}
        >
          {line}
        </div>
      ))}
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
}

const FuelResultRow: React.FC<FuelResultRowProps> = ({ label, result, inputs, isCheaper }) => {
  const costHighlight = isCheaper ? 'green' : 'red';

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: isCheaper ? '#4CAF50' : '#EF4444',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 12,
        }}
      >
        {label} — {result.energyDensity} MJ/kg
      </div>
      <div
        className="calc-metric-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <MetricCard
          icon={<Flame size={14} color="#5DADE2" />}
          title="Fuel Burn"
          mainValue={`${fmtNumber(result.fuelBurnT)} t`}
          subLines={[`Eff: ${result.effTperDay} t/d`]}
        />
        <MetricCard
          icon={<Wind size={14} color="#5DADE2" />}
          title={`CO\u2082 Emissions`}
          mainValue={`${fmtNumber(result.co2T)} t`}
          subLines={[`EF: ${inputs.emissionFactor}`]}
        />
        <MetricCard
          icon={<DollarSign size={14} color="#5DADE2" />}
          title="EU ETS Cost"
          mainValue={fmtEur(result.etsCostEur)}
          subLines={[
            `Coverage: ${Math.round(inputs.etsCoverage * 100)}%`,
            `EUA: \u20AC${inputs.euaPrice}/t`,
          ]}
        />
        <MetricCard
          icon={
            result.fueleuCompliant ? (
              <ShieldCheck size={14} color="#4CAF50" />
            ) : (
              <AlertTriangle size={14} color="#EF4444" />
            )
          }
          title="FuelEU"
          mainValue={
            result.fueleuCompliant
              ? fmtEur(0)
              : fmtEur(result.fueleuPenaltyEur)
          }
          subLines={[
            `Int: ${result.fueleuIntensity}`,
            `vs ${inputs.fueleuThreshold}`,
          ]}
          badge={result.fueleuCompliant ? 'Compliant' : 'Penalty'}
          badgeColor={result.fueleuCompliant ? '#4CAF50' : '#EF4444'}
        />
        <MetricCard
          icon={<TrendingDown size={14} color="#5DADE2" />}
          title="CII Proxy"
          mainValue={String(result.ciiProxy)}
          subLines={[isCheaper ? 'Better \u2191' : 'Worse \u2193']}
        />
        <MetricCard
          icon={<DollarSign size={14} color={isCheaper ? '#4CAF50' : '#EF4444'} />}
          title="Total Cost"
          mainValue={fmtUsd(result.totalCostUsd)}
          subLines={[
            `Fuel: ${fmtUsd(result.fuelCostUsd)}`,
            '+ETS+FuelEU',
          ]}
          highlight={costHighlight}
        />
      </div>
    </div>
  );
};

/* ================================================================== */
/*  EnergyCalculatorPage                                               */
/* ================================================================== */

export const EnergyCalculatorPage: React.FC = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({ ...defaultInputs });

  const update = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const resultA = useMemo(
    () => calculateVoyage(inputs.fuelA_energyDensity, inputs),
    [inputs]
  );
  const resultB = useMemo(
    () => calculateVoyage(inputs.fuelB_energyDensity, inputs),
    [inputs]
  );

  const diff = resultA.totalCostUsd - resultB.totalCostUsd;
  const fuelDiff = resultA.fuelCostUsd - resultB.fuelCostUsd;
  const etsDiff = resultA.etsCostEur - resultB.etsCostEur;
  const fueleuDiff = resultA.fueleuPenaltyEur - resultB.fueleuPenaltyEur;

  // Per-tonne effective value difference
  const totalFuelBurned = (resultA.fuelBurnT + resultB.fuelBurnT) / 2;
  const perTonneLow = totalFuelBurned > 0 ? Math.round(Math.abs(diff) / totalFuelBurned * 0.8) : 0;
  const perTonneHigh = totalFuelBurned > 0 ? Math.round(Math.abs(diff) / totalFuelBurned * 1.2) : 0;

  const aIsCheaper = resultA.totalCostUsd <= resultB.totalCostUsd;

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
            Energy Calculator
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.7,
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            Compare fuels by energy content, not just price per tonne. See the real economic
            difference including EU ETS exposure, FuelEU Maritime compliance, and total voyage cost.
          </p>
        </div>
      </section>

      {/* ---- Section 2: Input Panel + Results Panel ---- */}
      <section style={{ ...sectionPadding, background: '#F8FAFC' }}>
        <div
          className="calc-layout"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            gap: 32,
            alignItems: 'flex-start',
          }}
        >
          {/* Left: Input Panel (sticky on desktop) */}
          <div
            className="calc-input-panel"
            style={{
              width: 340,
              flexShrink: 0,
              position: 'sticky',
              top: 100,
            }}
          >
            {/* Voyage Parameters */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '2px solid #E2E8F0',
                }}
              >
                Voyage Parameters
              </h3>
              <SliderInput
                label="Voyage Days"
                value={inputs.voyageDays}
                onChange={(v) => update('voyageDays', v)}
                min={1}
                max={60}
                step={1}
                unit="days"
              />
              <SliderInput
                label="Daily Consumption"
                value={inputs.dailyConsumption}
                onChange={(v) => update('dailyConsumption', v)}
                min={10}
                max={100}
                step={1}
                unit="t/day"
              />
              <SliderInput
                label="Fuel Price"
                value={inputs.fuelPrice}
                onChange={(v) => update('fuelPrice', v)}
                min={200}
                max={1500}
                step={10}
                unit="$/mt"
              />
            </div>

            {/* Fuel Comparison */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '2px solid #E2E8F0',
                }}
              >
                Fuel Comparison
              </h3>
              <SliderInput
                label="Fuel A Energy Density"
                value={inputs.fuelA_energyDensity}
                onChange={(v) => update('fuelA_energyDensity', v)}
                min={15}
                max={50}
                step={0.1}
                unit="MJ/kg"
              />
              <SliderInput
                label="Fuel B Energy Density"
                value={inputs.fuelB_energyDensity}
                onChange={(v) => update('fuelB_energyDensity', v)}
                min={15}
                max={50}
                step={0.1}
                unit="MJ/kg"
              />
            </div>

            {/* Regulatory Parameters */}
            <div style={card}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '2px solid #E2E8F0',
                }}
              >
                Regulatory Parameters
              </h3>
              <SliderInput
                label={`EUA Price`}
                value={inputs.euaPrice}
                onChange={(v) => update('euaPrice', v)}
                min={20}
                max={200}
                step={1}
                unit={`\u20AC/tCO\u2082`}
              />
              <DropdownInput
                label="EU ETS Coverage"
                value={inputs.etsCoverage}
                onChange={(v) => update('etsCoverage', v)}
                options={[
                  { label: '40%', value: 0.4 },
                  { label: '50%', value: 0.5 },
                  { label: '70%', value: 0.7 },
                  { label: '100%', value: 1.0 },
                ]}
              />
              <SliderInput
                label={`FuelEU Threshold`}
                value={inputs.fueleuThreshold}
                onChange={(v) => update('fueleuThreshold', v)}
                min={50}
                max={100}
                step={0.01}
                unit={`gCO\u2082e/MJ`}
              />
              <SliderInput
                label="EUR/USD Rate"
                value={inputs.eurToUsd}
                onChange={(v) => update('eurToUsd', v)}
                min={0.8}
                max={1.5}
                step={0.01}
                unit=""
              />
            </div>
          </div>

          {/* Right: Results Panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <FuelResultRow
              label="Fuel A"
              result={resultA}
              inputs={inputs}
              isCheaper={aIsCheaper}
            />
            <FuelResultRow
              label="Fuel B"
              result={resultB}
              inputs={inputs}
              isCheaper={!aIsCheaper}
            />
          </div>
        </div>
      </section>

      {/* ---- Section 3: Savings Summary ---- */}
      <section
        style={{
          background: '#FFFFFF',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            Net Difference:{' '}
            <span style={{ color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF4444' : '#64748B' }}>
              {fmtUsd(Math.abs(Math.round(diff)))}
            </span>
            {' '}per voyage
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#64748B',
              marginBottom: 32,
            }}
          >
            {diff > 0
              ? 'Fuel B saves this amount compared to Fuel A'
              : diff < 0
                ? 'Fuel A saves this amount compared to Fuel B'
                : 'Both fuels are equal in total voyage cost'}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                ...card,
                padding: '20px 28px',
                textAlign: 'center',
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                Fuel Cost Delta
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: fuelDiff > 0 ? '#4CAF50' : '#EF4444',
                }}
              >
                +{fmtUsd(Math.abs(fuelDiff))}
              </div>
            </div>
            <div
              style={{
                ...card,
                padding: '20px 28px',
                textAlign: 'center',
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                ETS Cost Delta
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: etsDiff > 0 ? '#4CAF50' : '#EF4444',
                }}
              >
                +{fmtEur(Math.abs(etsDiff))}
              </div>
            </div>
            <div
              style={{
                ...card,
                padding: '20px 28px',
                textAlign: 'center',
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                FuelEU Penalty Delta
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: fueleuDiff > 0 ? '#4CAF50' : fueleuDiff < 0 ? '#EF4444' : '#64748B',
                }}
              >
                +{fmtEur(Math.abs(fueleuDiff))}
              </div>
            </div>
          </div>

          <p
            style={{
              fontSize: 15,
              color: '#64748B',
              lineHeight: 1.6,
            }}
          >
            {'\u2248'} ${perTonneLow}\u2013${perTonneHigh} per tonne in effective value based on energy alone
          </p>
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
              fontSize: 28,
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: 12,
              lineHeight: 1.3,
            }}
          >
            Want to see energy-adjusted prices from real suppliers?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            Join the Verdaxis pilot to access verified energy density data, CI scoring, and
            compliance-aware pricing from vetted fuel producers.
          </p>
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
            }}
          >
            Apply for Pilot
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ---- Responsive styles ---- */}
      <style>{`
        @media (max-width: 1024px) {
          .calc-layout {
            flex-direction: column !important;
          }
          .calc-input-panel {
            width: 100% !important;
            position: static !important;
          }
        }
        @media (max-width: 640px) {
          .calc-metric-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};
