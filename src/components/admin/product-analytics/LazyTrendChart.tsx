import React, { Suspense, lazy } from 'react';

import type { TrendSeries } from './TrendChart';

// Recharts is this workspace's heaviest dependency and the trend chart is its
// only consumer, so the chart loads when a tab renders it instead of sitting in
// the admin route chunk's static imports.
const TrendChart = lazy(() => import('./TrendChart').then((module) => ({ default: module.TrendChart })));

interface LazyTrendChartProps {
  series: TrendSeries[];
  emptyLabel: string;
  height?: number;
  facet?: boolean;
}

/** One facet cell: the mini chart plus its `text-xs` label block, above the row gap. */
const FACET_LABEL_HEIGHT = 20;
const FACET_ROW_GAP = 16;

/**
 * `TrendChart` behind a lazy boundary.
 *
 * The fallback reserves the exact box the chart occupies so the surrounding
 * layout does not move while the chunk arrives: `height` for the overlay
 * layout, and the populated row count times the cell height for the facet
 * layout (the same split `TrendChart` uses — only series with points get a
 * facet).
 */
export const LazyTrendChart: React.FC<LazyTrendChartProps> = ({ series, emptyLabel, height = 180, facet = false }) => {
  let fallbackHeight = height;
  if (facet) {
    const populated = series.filter((entry) => entry.points.length > 0).length;
    const rows = Math.ceil(populated / 2);
    fallbackHeight = rows * (Math.round(height * 0.62) + FACET_LABEL_HEIGHT) + Math.max(0, rows - 1) * FACET_ROW_GAP;
  }

  return (
    <Suspense fallback={<div style={{ height: fallbackHeight }} />}>
      <TrendChart series={series} emptyLabel={emptyLabel} height={height} facet={facet} />
    </Suspense>
  );
};
