import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Base building block for layout skeletons: a neutral rounded block that
 * stands in for content that is not loaded yet. It carries no values —
 * only shape — and is always `aria-hidden`; the enclosing `SkeletonRegion`
 * carries the accessible loading status for the whole group.
 */
const ROUNDED: Record<string, string> = {
  sm: 'rounded-sm',
  md: 'rounded',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export const SkeletonBlock: React.FC<{
  /** Tailwind size classes, e.g. `h-4 w-32`. */
  className?: string;
  /** Corner rounding to match the element being stood in for. */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}> = ({ className = 'h-4 w-full', rounded = 'md' }) => (
  <div className={`skeleton-block ${ROUNDED[rounded]} ${className}`} aria-hidden="true" />
);

/**
 * One or more text lines with the last line shorter, like a paragraph.
 * Widths are relative (percent) so the skeleton scales with its container
 * the way real text reflows.
 */
export const SkeletonText: React.FC<{
  /** Number of lines. */
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }, (_, index) => (
      <div
        key={index}
        className={`skeleton-block h-3 rounded ${index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

/**
 * The single accessible root of a skeleton: `role="status"` plus the
 * translated "Loading" text for screen readers. Blocks inside a region
 * are `aria-hidden` so assistive tech announces one status, not dozens.
 */
export const SkeletonRegion: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  // Common translations are bundled at startup, so a Suspense fallback cannot suspend.
  const { t } = useTranslation('common', { useSuspense: false });

  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('loading')}</span>
      {children}
    </div>
  );
};
