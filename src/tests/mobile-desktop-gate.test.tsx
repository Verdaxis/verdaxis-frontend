import React, { useEffect } from 'react';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileDesktopGate } from '../components/MobileDesktopGate';
import { renderWithProviders } from './test-utils';

describe('MobileDesktopGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts the workspace only while the viewport is at least 768px wide', () => {
    let matches = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const mounted = vi.fn();
    const unmounted = vi.fn();
    const Workspace = () => {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <div>workspace</div>;
    };

    renderWithProviders(<MobileDesktopGate><Workspace /></MobileDesktopGate>);

    expect(screen.queryByText('workspace')).toBeNull();
    expect(mounted).not.toHaveBeenCalled();

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener({ matches, media: mediaQuery.media } as MediaQueryListEvent));
    });
    expect(screen.getByText('workspace')).toBeTruthy();
    expect(mounted).toHaveBeenCalledTimes(1);

    act(() => {
      matches = false;
      listeners.forEach((listener) => listener({ matches, media: mediaQuery.media } as MediaQueryListEvent));
    });
    expect(screen.queryByText('workspace')).toBeNull();
    expect(unmounted).toHaveBeenCalledTimes(1);
  });
});
