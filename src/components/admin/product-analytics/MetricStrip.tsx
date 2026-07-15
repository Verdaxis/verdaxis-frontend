import React from 'react';

import { MetricValue } from '../../../types/productAnalytics';
import { KpiCell } from './AnalyticsStates';

// One top KPI strip; analytical sections below stay unframed (§1.2).
export const MetricStrip: React.FC<{
  items: { label: string; metric: MetricValue }[];
  compare: boolean;
}> = ({ items, compare }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
    {items.map(item => (
      <KpiCell key={item.label} label={item.label} metric={item.metric} compare={compare} />
    ))}
  </div>
);
