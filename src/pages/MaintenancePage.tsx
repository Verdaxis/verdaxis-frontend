import React from 'react';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';

interface MaintenancePageProps {
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ onRetry, isRetrying = false }) => {
  return (
    <main className="min-h-screen bg-[#07110f] text-white relative overflow-hidden flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(20,184,166,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <section className="relative w-full max-w-3xl border border-emerald-300/20 bg-slate-950/78 backdrop-blur-xl shadow-2xl shadow-emerald-950/40 rounded-xl overflow-hidden">
        <div className="border-b border-emerald-300/15 px-5 py-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-emerald-200/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.85)]" />
            Platform status
          </div>
          <span>Maintenance</span>
        </div>

        <div className="px-6 py-10 sm:px-10 sm:py-12">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/10">
            <Activity className="text-emerald-200" size={26} />
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white max-w-2xl">
            Verdaxis is temporarily under maintenance.
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-7 text-slate-300 max-w-2xl">
            Core platform services are currently unavailable. The system is under maintenance and will be back shortly.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Trading</div>
              <div className="mt-2 text-sm font-medium text-slate-200">Temporarily paused</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Sessions</div>
              <div className="mt-2 text-sm font-medium text-slate-200">Protected safely</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Access</div>
              <div className="mt-2 text-sm font-medium text-slate-200">Retry shortly</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {onRetry ? (
              <button
                type="button"
                onClick={() => void onRetry()}
                disabled={isRetrying}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
                Check again
              </button>
            ) : null}
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <ShieldCheck size={16} className="text-emerald-300" />
              Existing actions are not being submitted while services are unavailable.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default MaintenancePage;

