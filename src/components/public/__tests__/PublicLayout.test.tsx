import { describe, it, expect } from 'vitest';
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

  it('renders "Sign In" link', () => {
    renderWithRouter('/');
    const signIn = screen.getByText('Sign In');
    expect(signIn).toBeTruthy();
    expect(signIn.closest('a')?.getAttribute('href')).toBe('/login?lang=en');
  });

  it('renders outlet content', () => {
    renderWithRouter('/custom');
    expect(screen.getByText('My Custom Page Content')).toBeTruthy();
  });
});
