import React, { useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

import { SeriesPoint } from '../../../types/productAnalytics';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
}

const seriesHasData = (points: SeriesPoint[]): boolean =>
  points.some(point => typeof point.value === 'number' && point.value > 0);

const ChartFrame: React.FC<{
  rows: Record<string, string | number | null>[];
  children: React.ReactNode;
}> = ({ rows, children }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
      <CartesianGrid stroke="var(--border-color)" strokeOpacity={0.5} vertical={false} />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
        tickLine={false}
        axisLine={{ stroke: 'var(--border-color)' }}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--text-primary)',
        }}
      />
      {children}
    </LineChart>
  </ResponsiveContainer>
);

const trendLine = (entry: TrendSeries) => (
  <Line
    key={entry.key}
    type="monotone"
    dataKey={entry.key}
    name={entry.label}
    stroke={entry.color}
    dot={false}
    strokeWidth={1.5}
    isAnimationActive={false}
    connectNulls={false}
  />
);

// Identity chip: text wears text tokens; the colored mark carries the series.
const SeriesChip: React.FC<{ color: string }> = ({ color }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
    style={{ backgroundColor: color }}
    aria-hidden
  />
);

// Trend chart with a STABLE height (§1.2); sparse data shows an explicit
// empty note instead of collapsing.
//
// Two layouts:
// - overlay (default): one shared y-axis with series toggles. Only for
//   series in the same unit at comparable scale.
// - facet: small multiples — one mini chart per series with its own y-axis
//   and a direct title. Required when series mix scales (e.g. visitors vs.
//   trades); a shared axis flattens the small series and a dual axis is
//   never acceptable.
export const TrendChart: React.FC<{
  series: TrendSeries[];
  emptyLabel: string;
  height?: number;
  facet?: boolean;
}> = ({ series, emptyLabel, height = 180, facet = false }) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (facet) {
    const populated = series.filter(entry => entry.points.length > 0);
    if (populated.length === 0 || !populated.some(entry => seriesHasData(entry.points))) {
      return (
        <div style={{ height }}>
          <p className="text-sm text-verdaxis-text-muted pt-8 text-center">{emptyLabel}</p>
        </div>
      );
    }
    return (
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4" data-testid="trend-facets">
        {populated.map(entry => (
          <div key={entry.key}>
            <div className="flex items-center gap-1.5 mb-1 text-xs text-verdaxis-text-muted">
              <SeriesChip color={entry.color} />
              {entry.label}
            </div>
            <div style={{ height: Math.round(height * 0.62) }}>
              <ChartFrame
                rows={entry.points.map(point => ({ date: point.date, [entry.key]: point.value }))}
              >
                {trendLine(entry)}
              </ChartFrame>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visible = series.filter(entry => !hidden.has(entry.key) && entry.points.length > 0);
  const dates = series.find(entry => entry.points.length > 0)?.points.map(point => point.date) ?? [];
  const rows = dates.map((date, index) => {
    const row: Record<string, string | number | null> = { date };
    for (const entry of series) row[entry.key] = entry.points[index]?.value ?? null;
    return row;
  });
  const hasData = rows.some(row =>
    visible.some(entry => typeof row[entry.key] === 'number' && (row[entry.key] as number) > 0),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {series.map(entry => (
          <label key={entry.key} className="flex items-center gap-1.5 text-xs text-verdaxis-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={!hidden.has(entry.key)}
              onChange={() =>
                setHidden(previous => {
                  const next = new Set(previous);
                  if (next.has(entry.key)) next.delete(entry.key);
                  else next.add(entry.key);
                  return next;
                })}
            />
            <SeriesChip color={entry.color} />
            {entry.label}
          </label>
        ))}
      </div>
      <div style={{ height }} aria-hidden={!hasData}>
        {rows.length > 0 ? (
          <ChartFrame rows={rows}>{visible.map(trendLine)}</ChartFrame>
        ) : (
          <p className="text-sm text-verdaxis-text-muted pt-8 text-center">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
};
