import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DelayedLoadingScreen } from '../components/DelayedLoadingScreen';
import {
  BuyerMapSkeleton,
  CommandCenterSkeleton,
  MyTradesSkeleton,
  PageSkeleton,
  PublicPageSkeleton,
  WatchlistSkeleton,
} from '../components/skeleton';

const PAGE_SKELETONS: Array<[string, React.FC]> = [
  ['CommandCenterSkeleton', CommandCenterSkeleton],
  ['WatchlistSkeleton', WatchlistSkeleton],
  ['MyTradesSkeleton', MyTradesSkeleton],
  ['BuyerMapSkeleton', BuyerMapSkeleton],
  ['PageSkeleton', PageSkeleton],
  ['PublicPageSkeleton', PublicPageSkeleton],
];

describe('layout skeletons', () => {
  it.each(PAGE_SKELETONS)('%s exposes one busy status with the loading text', (_name, Skeleton) => {
    render(<Skeleton />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toMatch(/loading/i);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('hides placeholder blocks from assistive technology', () => {
    const { container } = render(<MyTradesSkeleton />);
    const blocks = container.querySelectorAll('.skeleton-block');
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((block) => {
      expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });

  it('removes the shimmer under prefers-reduced-motion', () => {
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.skeleton-block::after \{([^}]*)\}/);
    expect(reduced).not.toBeNull();
    expect(reduced![1]).toContain('animation: none');
  });
});

describe('DelayedLoadingScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing before the delay so fast loads do not flash', () => {
    render(<DelayedLoadingScreen fullScreen />);
    act(() => { vi.advanceTimersByTime(299); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the loading screen once the delay has passed', () => {
    render(<DelayedLoadingScreen fullScreen label="Restoring" />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('status').textContent).toContain('Restoring');
  });

  it('never shows if unmounted before the delay', () => {
    const { unmount } = render(<DelayedLoadingScreen />);
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
