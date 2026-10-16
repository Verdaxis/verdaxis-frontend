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
    expect(screen.getByText(/market records can carry product/i)).toBeTruthy();
    expect(screen.getByText(/end-to-end integrity/i)).toBeTruthy();
  });

  it('renders current process capabilities', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/aggregate bids and asks/i)).toBeTruthy();
    expect(screen.getByText(/display price and depth/i)).toBeTruthy();
    expect(screen.getByText(/market news and selected-market activity/i)).toBeTruthy();
  });

  it('renders CTA with link to fuels page', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/explore fuel coverage/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore fuel coverage/i });
    expect(link.getAttribute('href')).toBe('/en/fuels');
  });

  it('renders benefit details', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/place physical asks by product/i)).toBeTruthy();
    expect(screen.getByText(/compare physical bids and asks/i)).toBeTruthy();
    expect(screen.getByText(/forward-curve, watchlist, and trade monitoring/i)).toBeTruthy();
  });
});
