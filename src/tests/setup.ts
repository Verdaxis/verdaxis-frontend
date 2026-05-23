import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { loadNamespace } from '../i18n';

beforeAll(async () => {
  await Promise.all([
    'public',
    'auth',
    'trading',
    'compliance',
    'dashboard',
    'fleet',
    'ai',
    'education',
    'admin',
    'settings',
    'tutorial',
  ].map((ns) => loadNamespace(ns)));
});

afterEach(() => {
  cleanup();
});

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverMock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverMock;
}

if (!window.IntersectionObserver) {
  class IntersectionObserverMock {
    root = null;
    rootMargin = '';
    thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = IntersectionObserverMock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = IntersectionObserverMock;
}

if (!window.scrollTo) {
  window.scrollTo = vi.fn();
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
}
