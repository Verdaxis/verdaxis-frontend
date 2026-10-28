import React from 'react';
import { Lock } from 'lucide-react';
import type { AbilityDenial } from '../../types/abilities';

interface AbilityDenialNoteProps {
    denial: AbilityDenial;
    /** Lets the disabled control point at this text with `aria-describedby`. */
    id?: string;
    className?: string;
}

/**
 * Visible explanation shown next to a control the server has denied. Pair it
 * with `disabled` and `title={denial.message}` on the control itself, because a
 * native tooltip alone is not reachable by keyboard or touch.
 */
export const AbilityDenialNote: React.FC<AbilityDenialNoteProps> = ({ denial, id, className = '' }) => (
    <p
        id={id}
        data-testid="ability-denial-note"
        data-reason-code={denial.reasonCode ?? undefined}
        className={`flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 ${className}`}
    >
        <Lock size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{denial.message}</span>
    </p>
);
