import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicLayout } from '../PublicLayout';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('PublicLayout', () => {
  it('renders navigation with "Verdaxis" brand', () => {
    renderWithRouter(
      <PublicLayout><div>Page Content</div></PublicLayout>
    );
    // "Verdaxis" appears in both nav and footer
    const elements = screen.getAllByText('Verdaxis');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders key nav links', () => {
    renderWithRouter(
      <PublicLayout><div>Page Content</div></PublicLayout>
    );
    // Some links appear in both nav and footer, so use getAllByText
    expect(screen.getAllByText('How It Works').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fuels').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Compliance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Education').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Roadmap').length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with copyright', () => {
    renderWithRouter(
      <PublicLayout><div>Page Content</div></PublicLayout>
    );
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear}.*Verdaxis`))).toBeTruthy();
  });

  it('renders "Sign In" link', () => {
    renderWithRouter(
      <PublicLayout><div>Page Content</div></PublicLayout>
    );
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders children content', () => {
    renderWithRouter(
      <PublicLayout>
        <div>My Custom Page Content</div>
      </PublicLayout>
    );
    expect(screen.getByText('My Custom Page Content')).toBeTruthy();
  });
});
