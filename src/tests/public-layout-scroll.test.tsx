import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PublicLayout } from '../components/public/PublicLayout';

const lenis = vi.hoisted(() => ({
  load: vi.fn(),
  construct: vi.fn(),
  destroy: vi.fn(),
  raf: vi.fn(),
}));
vi.mock('lenis', () => {
  lenis.load();
  return { default: class {
    constructor() { lenis.construct(); }
    destroy = lenis.destroy;
    raf = lenis.raf;
  } };
});
vi.mock('../components/public/PublicNav', () => ({ PublicNav: () => null }));
vi.mock('../components/public/PublicFooter', () => ({ PublicFooter: () => null }));

const renderLayout = () => render(<MemoryRouter><PublicLayout /></MemoryRouter>);
beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  lenis.construct.mockClear();
});
afterEach(() => vi.restoreAllMocks());

it('keeps native scrolling without loading Lenis for reduced motion', async () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const view = renderLayout();
  await act(() => vi.dynamicImportSettled());
  expect(lenis.load).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('auto');
  view.unmount();
  expect(document.body.style.overflow).toBe('');
});

it('does not start smooth scrolling if the layout unmounts during the import', async () => {
  const view = renderLayout();
  view.unmount();
  await act(() => vi.dynamicImportSettled());
  expect(lenis.construct).not.toHaveBeenCalled();
});

it('cancels the frame and restores body styles on exit', async () => {
  const request = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const view = renderLayout();
  await act(() => vi.dynamicImportSettled());
  expect(request).toHaveBeenCalled();
  view.unmount();
  expect(cancel).toHaveBeenCalledWith(42);
  expect(lenis.destroy).toHaveBeenCalled();
  expect(document.body.style.height).toBe('');
});
