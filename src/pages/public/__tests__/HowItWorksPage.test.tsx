import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowItWorksPage } from '../HowItWorksPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/how-it-works' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('HowItWorksPage', () => {
  it('renders page title', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/how verdaxis works/i)).toBeTruthy();
  });

  it('renders platform benefit columns', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/benefits of the verdaxis platform/i)).toBeTruthy();
    expect(screen.getByText('Sellers')).toBeTruthy();
    expect(screen.getByText('Verdaxis Platform')).toBeTruthy();
    expect(screen.getByText('Buyers')).toBeTruthy();
  });

  it('renders key principles', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/key principles/i)).toBeTruthy();
    expect(screen.getByText(/physical-first logic/i)).toBeTruthy();
    expect(screen.getAllByText(/verified sustainability data/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/chain of custody/i)).toBeTruthy();
  });

  it('renders current process capabilities', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/real-time aggregation and matching/i)).toBeTruthy();
    expect(screen.getByText(/drives price discovery/i)).toBeTruthy();
    expect(screen.getByText(/ai-powered market intelligence/i)).toBeTruthy();
  });

  it('renders CTA with link to fuels page', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/explore fuel coverage/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore fuel coverage/i });
    expect(link.getAttribute('href')).toBe('/fuels');
  });

  it('renders benefit details', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/direct access to qualified buyers/i)).toBeTruthy();
    expect(screen.getByText(/access to a unified market/i)).toBeTruthy();
    expect(screen.getByText(/integrated risk management tools/i)).toBeTruthy();
  });
});
