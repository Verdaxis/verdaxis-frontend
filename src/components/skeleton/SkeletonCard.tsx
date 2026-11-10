import React from 'react';
import { SkeletonBlock, SkeletonText } from './SkeletonBlock';

/**
 * Card-shaped skeleton matching the app's `.v-card` idiom: bordered card
 * surface, optional heading block, then text lines.
 */
export const SkeletonCard: React.FC<{
  /** Height of the heading block, or `null` for no heading. */
  heading?: boolean;
  /** Paragraph lines under the heading. */
  lines?: number;
  /** Extra Tailwind classes for the card surface (padding overrides etc.). */
  className?: string;
  /** Contents for the card body when lines are not the right shape. */
  children?: React.ReactNode;
}> = ({ heading = true, lines = 3, className = '', children }) => (
  <div
    className={`v-card p-5 ${className}`}
  >
    {heading && <SkeletonBlock className="mb-4 h-5 w-1/3" />}
    {children ?? <SkeletonText lines={lines} />}
  </div>
);
