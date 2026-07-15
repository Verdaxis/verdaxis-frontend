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

// Small-multiple line chart with a STABLE height (§1.2) and real series
// toggles; sparse data shows an explicit empty note instead of collapsing.
export const TrendChart: React.FC<{ series: TrendSeries[]; emptyLabel: string; height?: number }> = ({
  series, emptyLabel, height = 180,
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
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
            <span style={{ color: entry.color }}>{entry.label}</span>
          </label>
        ))}
      </div>
      <div style={{ height }} aria-hidden={!hasData}>
        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              {visible.map(entry => (
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
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-verdaxis-text-muted pt-8 text-center">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
};
