import React from 'react';
import { Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStreamHealth } from '../../hooks/useStreamHealth';
import type { ConnectionState } from '../../services/streamHealth';

type VisibleState = Exclude<ConnectionState, 'none'>;

// The header is dark in both themes, so these colors need no `dark:` variants.
const STATE_STYLE: Record<VisibleState, { text: string; Icon: React.ElementType; spin?: boolean }> = {
    live: { text: 'text-emerald-400', Icon: Wifi },
    stale: { text: 'text-amber-300', Icon: Clock },
    connecting: { text: 'text-slate-400', Icon: RefreshCw, spin: true },
    reconnecting: { text: 'text-amber-300', Icon: RefreshCw, spin: true },
    offline: { text: 'text-red-400', Icon: WifiOff },
};

/**
 * Live-connection indicator for the dashboard header. The text label is always
 * in the DOM: visible from the md breakpoint up, screen-reader-only below it.
 */
export const StreamStatusIndicator: React.FC = () => {
    const { t } = useTranslation('common');
    const { connection } = useStreamHealth();
    if (connection === 'none') return null;

    const { text, Icon, spin } = STATE_STYLE[connection];
    return (
        <div
            role="status"
            data-testid="stream-status-indicator"
            data-state={connection}
            title={t(`streamStatus.${connection}.detail`)}
            className={`flex items-center gap-1.5 text-xs font-semibold ${text}`}
        >
            <Icon size={14} aria-hidden="true" className={spin ? 'motion-safe:animate-spin' : undefined} />
            <span className="sr-only md:not-sr-only">{t(`streamStatus.${connection}.label`)}</span>
        </div>
    );
};
