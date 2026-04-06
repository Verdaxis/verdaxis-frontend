import React from 'react';

// ─── Status definitions ────────────────────────────────────────
// Covers: order book, trade, RFQ, and negotiation statuses in one place.
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Order book
  OPEN:                 { label: 'Open',         color: '#22D37A' },
  PARTIALLY_FILLED:     { label: 'Partial',       color: '#60A5FA' },
  FILLED:               { label: 'Filled',        color: '#60A5FA' },

  // Trade / confirmation
  PENDING_CONFIRMATION: { label: 'Pending',       color: '#F59E0B' },
  CONFIRMED:            { label: 'Confirmed',     color: '#22D37A' },
  AGREED:               { label: 'Agreed',        color: '#60A5FA' },

  // RFQ
  QUOTED:               { label: 'Quoted',        color: '#60A5FA' },
  ACCEPTED:             { label: 'Accepted',      color: '#22D37A' },

  // Negotiation
  COUNTERED:            { label: 'Countered',     color: '#F59E0B' },

  // Terminal states
  DECLINED:             { label: 'Declined',      color: '#F87171' },
  CANCELLED:            { label: 'Cancelled',     color: '#8BA4C4' },
  EXPIRED:              { label: 'Expired',       color: '#8BA4C4' },
  WITHDRAWN:            { label: 'Withdrawn',     color: '#8BA4C4' },
  PENDING:              { label: 'Pending',       color: '#F59E0B' },
};

interface StatusBadgeProps {
  status: string;
  /** Override display label */
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, color: '#8BA4C4' };
  const display = label ?? config.label;
  const color = config.color;

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${padding}`}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 5, height: 5, backgroundColor: color }}
      />
      {display}
    </span>
  );
};
