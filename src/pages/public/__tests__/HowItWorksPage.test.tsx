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

  it('renders benefits across sellers, platform, and buyers', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText('Benefits of the Verdaxis Platform')).toBeTruthy();
    expect(screen.getByText('Sellers')).toBeTruthy();
    expect(screen.getByText('Verdaxis Platform')).toBeTruthy();
    expect(screen.getByText('Buyers')).toBeTruthy();
    expect(screen.getByText(/direct access to qualified buyers/i)).toBeTruthy();
    expect(screen.getByText(/real-time aggregation and matching delivering liquidity/i)).toBeTruthy();
    expect(screen.getByText(/access to a unified market of verified sustainable fuel suppliers/i)).toBeTruthy();
  });

  it('renders key principles', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/physical-first/i)).toBeTruthy();
    expect(screen.getByText(/no decoupled paper credits or synthetic instruments/i)).toBeTruthy();
    expect(screen.getByText(/chain of custody is maintained/i)).toBeTruthy();
    expect(screen.getByText(/singapore-hosted, global reach/i)).toBeTruthy();
  });

  it('renders CTA with link to fuels page', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/explore fuel coverage/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore fuel coverage/i });
    expect(link.getAttribute('href')).toBe('/fuels');
  });
});
