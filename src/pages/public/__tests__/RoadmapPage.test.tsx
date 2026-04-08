import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoadmapPage } from '../RoadmapPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/roadmap' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('RoadmapPage', () => {
  it('renders page title', () => {
    renderWithRouter(<RoadmapPage />);
    expect(screen.getByText('Platform Roadmap')).toBeTruthy();
    expect(
      screen.getByText(/verdaxis is being built in deliberate phases/i)
    ).toBeTruthy();
  });

  it('renders all 4 phases with titles', () => {
    renderWithRouter(<RoadmapPage />);
    // Each phase title appears twice (desktop + mobile timeline), so use getAllByText
    expect(screen.getAllByText('Registry & Verification').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Matching & Structured Offtake').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Live Bids & Offers').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Compliance Automation & Reporting').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights Phase 1 as current', () => {
    renderWithRouter(<RoadmapPage />);
    expect(screen.getAllByText('CURRENT').length).toBeGreaterThanOrEqual(1);
  });

  it('renders phase features', () => {
    renderWithRouter(<RoadmapPage />);
    // Phase 1 features (appear in both desktop + mobile timelines)
    expect(screen.getAllByText(/fuel \+ attribute registration with ci scoring/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/third-party verification integration/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/producer and buyer onboarding/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/public website with education resources/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/energy value calculator/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/producer project map/i).length).toBeGreaterThanOrEqual(1);

    // Phase 2 features
    expect(screen.getAllByText(/bilateral matchmaking between verified participants/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ci-adjusted pricing display/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/real price discovery from platform activity/i).length).toBeGreaterThanOrEqual(1);

    // Phase 3 features
    expect(screen.getAllByText(/live orderbook with bids and asks/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/real-time price discovery/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/forward contracts and structured offtake/i).length).toBeGreaterThanOrEqual(1);

    // Phase 4 features
    expect(screen.getAllByText(/fueleu maritime declaration automation/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/eu ets surrender calculations/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/green financing module/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders how-we-build principles', () => {
    renderWithRouter(<RoadmapPage />);
    expect(screen.getByText('How We Build')).toBeTruthy();
    expect(screen.getByText('Integrity First')).toBeTruthy();
    expect(screen.getByText(/each feature is tested with real participants/i)).toBeTruthy();
    expect(screen.getByText('Deliberate Scaling')).toBeTruthy();
    expect(screen.getByText(/we add participants and volume gradually/i)).toBeTruthy();
    expect(screen.getByText('Regulatory Alignment')).toBeTruthy();
    expect(screen.getByText(/every feature is designed with compliance in mind/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<RoadmapPage />);
    expect(screen.getByText(/want to be part of the journey/i)).toBeTruthy();
    const ctaLink = screen.getByRole('link', { name: /apply for pilot/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/pilot');
  });
});
