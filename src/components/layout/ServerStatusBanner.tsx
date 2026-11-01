import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wrench, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStreamHealth } from '../../hooks/useStreamHealth';

const dismissalKey = (status: string, message: string | null) => `${status}\u0000${message ?? ''}`;

/**
 * Shows the server status reported by stream heartbeats when it is `degraded`
 * or `maintenance`. The message is rendered as a plain text node, never HTML.
 * A dismissal covers one exact status+message pair for this page session; it is
 * cleared when the server reports `operational`, so a new incident shows again.
 */
export const ServerStatusBanner: React.FC = () => {
    const { t } = useTranslation('common');
    const { serverStatus } = useStreamHealth();
    const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

    const isOperational = serverStatus?.status === 'operational';
    useEffect(() => {
        if (isOperational) setDismissed((current) => (current.size === 0 ? current : new Set()));
    }, [isOperational]);

    if (!serverStatus || serverStatus.status === 'operational') return null;
    const { status, message } = serverStatus;
    const key = dismissalKey(status, message);
    if (dismissed.has(key)) return null;

    const isMaintenance = status === 'maintenance';
    const Icon = isMaintenance ? Wrench : AlertTriangle;
    const tone = isMaintenance
        ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100'
        : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100';

    return (
        <div
            role="status"
            data-testid="server-status-banner"
            data-status={status}
            className={`flex items-start gap-3 border-b px-4 py-3 text-sm shadow-sm ${tone}`}
        >
            <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="font-extrabold">{t(`serverStatus.${status}.title`)}</p>
                <p className="mt-0.5 break-words text-xs">{message ?? t(`serverStatus.${status}.fallback`)}</p>
            </div>
            <button
                type="button"
                onClick={() => setDismissed((current) => new Set(current).add(key))}
                aria-label={t('serverStatus.dismiss')}
                className="shrink-0 rounded p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
};
