import React from 'react';
import { useNamespace } from '../../hooks/useNamespace';

import { describeMarketActivity, marketActivityBadgeClass } from '../../utils/marketActivity';
import type { MarketActivityInput } from '../../utils/marketActivity';

interface MarketActivityBadgeProps {
    activity: MarketActivityInput | null | undefined;
    className?: string;
    showLive?: boolean;
    showUnknown?: boolean;
}

export const MarketActivityBadge: React.FC<MarketActivityBadgeProps> = ({ activity, className = '', showLive = false, showUnknown = false }) => {
    const { t, ready } = useNamespace('trading');
    if (!ready) return null;
    const descriptor = describeMarketActivity(activity, t);
    if (!showLive && (descriptor.tone === 'live' || descriptor.tone === 'empty')) return null;
    if (!showUnknown && descriptor.tone === 'unknown') return null;

    return (
        <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${marketActivityBadgeClass(descriptor.tone)} ${className}`}
            aria-label={descriptor.detail}
            title={descriptor.detail}
        >
            {descriptor.shortLabel}
        </span>
    );
};
