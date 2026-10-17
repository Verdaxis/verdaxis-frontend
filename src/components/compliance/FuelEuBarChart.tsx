import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  type TooltipPayloadEntry,
} from 'recharts';

export interface FuelEuBarDatum {
  /** Axis label (a long vessel name is already shortened by the caller). */
  name: string;
  /** Full vessel name, shown in the tooltip. */
  fullName: string;
  intensity: number;
  target: number;
  score: number;
  /** Traffic-light value; kept for the tooltip and future styling. */
  light: string;
  /** Bar fill, resolved by the caller so this module owns no palette. */
  color: string;
}

/**
 * The FuelEU per-vessel intensity chart.
 *
 * It is split out of `ComplianceDashboard` so Recharts loads when the chart
 * mounts instead of riding in the compliance route chunk. The dashboard owns
 * the data and the colours it passes in.
 */
export const FuelEuBarChart: React.FC<{ data: FuelEuBarDatum[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 11, fill: '#94a3b8' }}
        axisLine={{ stroke: '#e2e8f0' }}
      />
      <YAxis
        tick={{ fontSize: 11, fill: '#94a3b8' }}
        axisLine={{ stroke: '#e2e8f0' }}
        domain={[0, 100]}
      />
      <RechartsTooltip
        contentStyle={{
          backgroundColor: '#1e293b',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px',
        }}
        formatter={(value: number | undefined, _name: string | undefined, entry: TooltipPayloadEntry<number, string>): [string, string] => {
          // The bar data always carries a numeric intensity; keep the label stable if it does not.
          const intensity = Number(value ?? 0).toFixed(1);
          return [
            `${intensity} gCO2eq/MJ`,
            (entry.payload as FuelEuBarDatum).fullName,
          ];
        }}
        labelFormatter={() => ''}
      />
      {/* Reference line for target */}
      <Bar dataKey="intensity" radius={[4, 4, 0, 0]}>
        {data.map((entry, idx) => (
          <Cell key={idx} fill={entry.color} opacity={0.85} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
