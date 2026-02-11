import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../LandingPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('LandingPage', () => {
  it('renders hero headline', () => {
    renderWithRouter(<LandingPage />);
    // Text appears in hero headline and also in section subtitles
    const matches = screen.getAllByText(/Low-Carbon Fuels/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 role cards', () => {
    renderWithRouter(<LandingPage />);
    expect(screen.getByText('Fuel Producers')).toBeTruthy();
    expect(screen.getByText('Fuel Buyers')).toBeTruthy();
    expect(screen.getByText('Traders')).toBeTruthy();
    expect(screen.getByText('Financiers')).toBeTruthy();
  });

  it('renders price ticker with fuel data', () => {
    renderWithRouter(<LandingPage />);
    // Bio-Methanol appears in the doubled ticker array
    const elements = screen.getAllByText('Bio-Methanol');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<LandingPage />);
    // "Apply for Pilot" appears in hero and CTA section
    const applyButtons = screen.getAllByText('Apply for Pilot');
    expect(applyButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Register Interest')).toBeTruthy();
  });
});
