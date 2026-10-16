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
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener)),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    // The gate registers a plain listener function; the DOM signature also allows an object.
    const dispatchChange = () => {
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent;
      listeners.forEach((listener) => {
        if (typeof listener === 'function') listener(event);
        else listener.handleEvent(event);
      });
    };

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
      dispatchChange();
    });
    expect(screen.getByText('workspace')).toBeTruthy();
    expect(mounted).toHaveBeenCalledTimes(1);

    act(() => {
      matches = false;
      dispatchChange();
    });
    expect(screen.queryByText('workspace')).toBeNull();
    expect(unmounted).toHaveBeenCalledTimes(1);
  });
});
