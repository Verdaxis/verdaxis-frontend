import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { PublicLayout } from '../PublicLayout';

const renderWithRouter = (route = '/') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<div>Page Content</div>} />
          <Route path="custom" element={<div>My Custom Page Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('PublicLayout', () => {
  it('renders navigation with Verdaxis brand logo', () => {
    renderWithRouter('/');
    const logos = screen.getAllByRole('img', { name: 'Verdaxis' });
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders key nav links', () => {
    renderWithRouter('/');
    // Some links appear in both nav and footer, so use getAllByText
    expect(screen.getAllByText('How It Works').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fuels').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Compliance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Education').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Roadmap').length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with copyright', () => {
    renderWithRouter('/');
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear}.*Verdaxis`))).toBeTruthy();
  });

  it('renders the confirmed public contact details and privacy controls', async () => {
    renderWithRouter('/');

    expect((await screen.findByRole('link', { name: 'info@verdaxis.exchange' })).getAttribute('href')).toBe('mailto:info@verdaxis.exchange');
    expect(screen.getByText('71 Ayer Rajah Crescent,')).toBeTruthy();
    expect(screen.getByText('#02-15, Singapore 139951')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cookie settings' })).toBeTruthy();
  });

  it('renders "Sign In" link', () => {
    renderWithRouter('/');
    const signIn = screen.getByText('Sign In');
    expect(signIn).toBeTruthy();
    expect(signIn.closest('a')?.getAttribute('href')).toBe('https://app.verdaxis.exchange/login?lang=en');
  });

  it('renders outlet content', () => {
    renderWithRouter('/custom');
    expect(screen.getByText('My Custom Page Content')).toBeTruthy();
  });

  it('cancels its smooth-scroll animation frame on cleanup', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const view = renderWithRouter('/');
    expect(requestFrame).toHaveBeenCalled();
    view.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(42);

    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });

  it('does not start smooth scrolling when reduced motion is requested', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');

    const view = renderWithRouter('/');
    expect(requestFrame).not.toHaveBeenCalled();
    view.unmount();
    expect(document.body.style.overflow).toBe('');

    matchMedia.mockRestore();
    requestFrame.mockRestore();
  });
});
