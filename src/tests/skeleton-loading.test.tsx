import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingScreen } from '../components/LoadingScreen';
import { LazySkeleton } from '../components/skeleton/LazySkeleton';
import {
  BuyerMapSkeleton,
  CommandCenterSkeleton,
  MyTradesSkeleton,
  PageSkeleton,
  PublicPageSkeleton,
  WatchlistSkeleton,
} from '../components/skeleton/pageSkeletons';

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

  it('keeps placeholder blocks free of text so only one status is announced', () => {
    const { container } = render(<MyTradesSkeleton />);
    const blocks = container.querySelectorAll('.skeleton-block');
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((block) => expect(block.textContent).toBe(''));
  });

  it('removes the shimmer under prefers-reduced-motion', () => {
    const css = readFileSync(resolve(__dirname, '../components/skeleton/skeleton.css'), 'utf8');
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.skeleton-block::after \{([^}]*)\}/);
    expect(reduced).not.toBeNull();
    expect(reduced![1]).toContain('animation: none');
  });
});

describe('LazySkeleton', () => {
  it('resolves to the named skeleton with a loading status', async () => {
    render(<LazySkeleton name="watchlist" />);
    const status = await screen.findByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
  });
});

describe('LoadingScreen delay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing before the delay so fast loads do not flash', () => {
    render(<LoadingScreen fullScreen delayMs={300} />);
    act(() => { vi.advanceTimersByTime(299); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the loading screen once the delay has passed', () => {
    render(<LoadingScreen fullScreen label="Restoring" delayMs={300} />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('status').textContent).toContain('Restoring');
  });

  it('shows at once when no delay is set', () => {
    render(<LoadingScreen />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('never shows if unmounted before the delay', () => {
    const { unmount } = render(<LoadingScreen delayMs={300} />);
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
