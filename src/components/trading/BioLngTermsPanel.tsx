import React from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import i18n from '../../i18n';
import { bioLngTermsRows } from '../../utils/bioLngTermsDisplay';
import type { LngVisibleTerms } from '../../types/lngOrder';

interface BioLngTermsPanelProps {
    terms: LngVisibleTerms | null | undefined;
    className?: string;
}

/**
 * Renders the bio-LNG terms of an order or a trade.
 *
 * The server decides how much detail a client may see: an ask that still
 * carries its certificate number and physical supplier is a confirmed-trade
 * snapshot, while the order book projection omits them. The panel shows the
 * identity rows only when the payload supplies them.
 */
export const BioLngTermsPanel: React.FC<BioLngTermsPanelProps> = ({ terms, className = '' }) => {
    const { t } = useNamespace('trading');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const display = bioLngTermsRows(terms, t, locale);

    if (!display) return null;

    return (
        <div className={className} data-testid="bio-lng-terms">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{display.title}</p>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-2">
                {display.rows.map(({ label, value, note }) => (
                    <div key={label}>
                        <dt className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
                        <dd className="text-slate-600 dark:text-slate-300">{value}</dd>
                        {note && <dd className="mt-0.5 text-slate-500 dark:text-slate-400">{note}</dd>}
                    </div>
                ))}
            </dl>
        </div>
    );
};
