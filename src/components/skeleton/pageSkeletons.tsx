import React from 'react';
import { SkeletonBlock, SkeletonRegion, SkeletonText } from './SkeletonBlock';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonTable } from './SkeletonTable';

/** Shared page padding for dashboard skeletons, matching the real pages. */
const PAGE = 'p-6 max-w-7xl mx-auto';

/**
 * Command Center: page heading (title + subtitle + customize button row),
 * then the stacked widget cards the default dashboard layout renders
 * (quick actions, trade summary, attention/radar feeds).
 */
export const CommandCenterSkeleton: React.FC = () => (
  <SkeletonRegion className={PAGE}>
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <SkeletonBlock className="mb-2 h-8 w-64" rounded="lg" />
        <SkeletonBlock className="h-4 w-96 max-w-full" rounded="lg" />
      </div>
      <SkeletonBlock className="h-9 w-28 shrink-0" rounded="lg" />
    </div>
    <div className="space-y-6">
      <SkeletonCard lines={2}>
        <div className="grid gap-2 sm:grid-cols-2">
          <SkeletonBlock className="h-16 rounded-md" />
          <SkeletonBlock className="h-16 rounded-md" />
        </div>
      </SkeletonCard>
      <SkeletonCard heading={false}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <SkeletonBlock className="mb-2 h-2.5 w-20" rounded="sm" />
              <SkeletonBlock className="h-7 w-16" rounded="lg" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard lines={4} />
    </div>
  </SkeletonRegion>
);

/**
 * Watchlist: hero header with the three metric tiles, then the two-column
 * grid of tracked-slice cards.
 */
export const WatchlistSkeleton: React.FC = () => (
  <SkeletonRegion className="h-full overflow-y-auto px-4 pb-8 pt-4 lg:px-10 lg:pt-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <SkeletonBlock className="mb-3 h-3 w-24" rounded="sm" />
        <SkeletonBlock className="mb-2 h-9 w-72 max-w-full" rounded="lg" />
        <SkeletonText lines={2} className="mb-5 max-w-3xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <SkeletonBlock className="mb-2 h-2.5 w-16" rounded="sm" />
              <SkeletonBlock className="h-7 w-12" rounded="lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} className="rounded-2xl p-5">
            <SkeletonBlock className="mb-3 h-5 w-44" rounded="lg" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }, (_, chip) => (
                <SkeletonBlock key={chip} className="h-6 w-20" rounded="full" />
              ))}
            </div>
            <SkeletonBlock className="mt-4 h-12 w-full rounded-xl" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  </SkeletonRegion>
);

/**
 * My Trades / Trade History: page heading with refresh control, tab bar,
 * then the trade blotter table rows.
 */
export const MyTradesSkeleton: React.FC = () => (
  <SkeletonRegion className="max-w-7xl mx-auto p-4 lg:p-10 pb-24">
    <div className="mb-6 lg:mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <SkeletonBlock className="h-8 w-56 rounded-lg" />
        <SkeletonBlock className="mt-2 h-4 w-80 max-w-full rounded-lg" />
      </div>
      <SkeletonBlock className="h-4 w-24 rounded-lg" />
    </div>
    <div className="mb-6 flex w-fit gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {Array.from({ length: 3 }, (_, index) => (
        <SkeletonBlock key={index} className="h-9 w-24 rounded-md" />
      ))}
    </div>
    <div className="v-card overflow-hidden">
      <SkeletonTable rows={8} columns={6} />
    </div>
  </SkeletonRegion>
);

/**
 * Intelligence Map: neutral map area (no map tiles, no data) with the
 * top-left chrome stacked like the real map (market watch strip, layer
 * button + product filter bar, port search) and the right insights panel.
 */
export const BuyerMapSkeleton: React.FC = () => (
  <SkeletonRegion className="relative h-full w-full overflow-hidden">
    {/* Map area: flat neutral surface, deliberately not a map image. */}
    <div className="absolute inset-0 bg-slate-100 dark:bg-[var(--ocean)]" aria-hidden="true" />
    <div className="absolute left-4 top-4 z-[20] w-[calc(100%-2rem)] space-y-2 md:w-[calc(100%-22rem)]">
      <SkeletonBlock className="h-11 w-full max-w-2xl rounded-lg" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
        <SkeletonBlock className="h-9 w-full max-w-md rounded-lg" />
      </div>
      <SkeletonBlock className="h-9 w-36 rounded-lg" />
    </div>
    {/* Right insights panel, matching the real panel's md:w-80 placement. */}
    <div className="absolute bottom-0 right-0 top-0 z-[20] hidden w-80 border-l border-slate-200 bg-white/95 p-5 dark:border-slate-700 dark:bg-slate-900/95 md:block">
      <SkeletonBlock className="mb-2 h-3 w-28" rounded="sm" />
      <SkeletonBlock className="mb-5 h-6 w-44 rounded-lg" />
      <SkeletonBlock className="mb-5 h-7 w-36 rounded-md" />
      <SkeletonText lines={4} className="mb-6" />
      <SkeletonText lines={4} />
    </div>
  </SkeletonRegion>
);

/**
 * Generic dashboard content skeleton for routes without a bespoke one.
 */
export const PageSkeleton: React.FC = () => (
  <SkeletonRegion className={PAGE}>
    <SkeletonBlock className="mb-2 h-8 w-64 rounded-lg" />
    <SkeletonBlock className="mb-6 h-4 w-96 max-w-full rounded-lg" />
    <div className="space-y-6">
      <SkeletonCard lines={3} />
      <SkeletonCard lines={4} />
    </div>
  </SkeletonRegion>
);

/**
 * Public site pages: a simple centered hero block plus stacked content
 * sections, matching the marketing pages' rhythm without page chrome.
 */
export const PublicPageSkeleton: React.FC = () => (
  <SkeletonRegion className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <SkeletonBlock className="mx-auto mb-4 h-6 w-40 rounded-full" />
      <SkeletonBlock className="mx-auto mb-3 h-10 w-full max-w-xl rounded-lg" />
      <SkeletonBlock className="mx-auto h-10 w-2/3 rounded-lg" />
    </div>
    <div className="mt-14 space-y-6">
      <SkeletonCard lines={3} />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonCard key={index} lines={4} />
        ))}
      </div>
    </div>
  </SkeletonRegion>
);
