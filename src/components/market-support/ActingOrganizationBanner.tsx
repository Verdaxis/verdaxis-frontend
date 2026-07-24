import React from 'react';
import { AlertTriangle, LogOut, ShieldCheck } from 'lucide-react';
import type { MarketSupportSession } from '../../types/marketSupport';

interface ActingOrganizationBannerProps {
  context: MarketSupportSession;
  onExit: () => void;
}

const formatExpiry = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const ActingOrganizationBanner: React.FC<ActingOrganizationBannerProps> = ({ context, onExit }) => (
  <section
    role="status"
    aria-label="Assisted order entry context"
    className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100"
  >
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-500 p-2 text-white shadow-sm">
          <AlertTriangle size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Acting for {context.organization.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-800 dark:text-amber-200">
            <span>Admin: {context.actor.name} ({context.actor.email})</span>
            <span>Case: {context.supportReference || 'Not provided'}</span>
            <span>Expires: {formatExpiry(context.expiresAt)}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900"
      >
        <LogOut size={14} aria-hidden="true" />
        Exit
      </button>
    </div>
  </section>
);
