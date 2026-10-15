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
      screen.getByText(/current physical-market features and planned extensions/i)
    ).toBeTruthy();
  });

  it('renders all 4 phases with titles', () => {
    renderWithRouter(<RoadmapPage />);
    // Each phase title appears twice (desktop + mobile timeline), so use getAllByText
    expect(screen.getAllByText('Physical Fuel Markets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Evidence and Data Quality').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Market Workflow Integrations').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Compliance Automation & Reporting').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights Phase 1 as current', () => {
    renderWithRouter(<RoadmapPage />);
    expect(screen.getAllByText('CURRENT').length).toBeGreaterThanOrEqual(1);
  });

  it('renders phase features', () => {
    renderWithRouter(<RoadmapPage />);
    // Phase 1 features (appear in both desktop + mobile timelines)
    expect(screen.getAllByText(/supplier-declared fuel and sustainability fields/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/account and organization onboarding/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/physical bids and asks in supported markets/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/public website and sourced education resources/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/shared-energy fuel-cost comparison tool/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/compiled producer index with data limits/i).length).toBeGreaterThanOrEqual(1);

    // Phase 2 features
    expect(screen.getAllByText(/third-party verification integrations/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pathway-specific pricing context/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/additional eligible market observations/i).length).toBeGreaterThanOrEqual(1);

    // Phase 3 features
    expect(screen.getAllByText(/orderbook workflow extensions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/broader eligible price observations/i).length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByText(/validate features before broader rollout/i)).toBeTruthy();
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
    expect(ctaLink.getAttribute('href')).toBe('/en/pilot');
  });
});
