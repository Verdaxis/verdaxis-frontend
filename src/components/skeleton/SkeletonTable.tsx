import React from 'react';
import { SkeletonBlock } from './SkeletonBlock';

/** Static grid classes: Tailwind's scanner only sees literal class names. */
const GRID_COLUMNS: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

/**
 * Table-shaped skeleton: a header row plus N body rows of placeholder
 * cells. Column widths are relative so the skeleton fills its container
 * the way the real table does.
 */
export const SkeletonTable: React.FC<{
  /** Body rows to draw. */
  rows?: number;
  /** Column count (3–6). */
  columns?: number;
  className?: string;
}> = ({ rows = 6, columns = 5, className = '' }) => {
  const gridClass = GRID_COLUMNS[columns] ?? GRID_COLUMNS[5];
  return (
    <div className={className} aria-hidden="true">
      <div className={`grid ${gridClass} gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 lg:px-6`}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock key={index} className="h-3 w-3/5" rounded="sm" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid ${gridClass} gap-4 px-4 py-4 lg:px-6 ${
            rowIndex < rows - 1 ? 'border-b border-slate-100 dark:border-slate-800/60' : ''
          }`}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <SkeletonBlock
              key={columnIndex}
              className={`h-3.5 ${columnIndex % 3 === 1 ? 'w-4/5' : 'w-3/5'}`}
              rounded="sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
};
