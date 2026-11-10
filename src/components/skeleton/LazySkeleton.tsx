import React, { Suspense, lazy } from 'react';
import type { SkeletonName } from './pageSkeletons';

/**
 * Entry-bundle-safe access to the page skeletons. The app entry and the public
 * wrapper load on every route, so they must not statically import the kit
 * (its markup and CSS would count toward every route's first load). Instead
 * the kit is one lazy chunk, preloaded once the dashboard mounts so a skeleton
 * is ready before a route needs it. Pages that load in their own chunks
 * import the kit directly instead.
 */
const loadKit = () => import('./pageSkeletons');
const NamedSkeleton = lazy(() => loadKit().then((kit) => ({ default: kit.NamedSkeleton })));

/** Starts downloading the skeleton chunk so later fallbacks render at once. */
export const preloadSkeletons = (): void => {
  void loadKit();
};

/** Renders nothing for the instant it takes the skeleton chunk to resolve. */
export const LazySkeleton: React.FC<{ name: SkeletonName }> = ({ name }) => (
  <Suspense fallback={null}>
    <NamedSkeleton name={name} />
  </Suspense>
);
