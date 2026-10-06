import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock IntersectionObserver for motion/react useInView
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];

  disconnect(): void {}
  observe(_target: Element): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(_target: Element): void {}
}

beforeAll(() => {
  global.IntersectionObserver = IntersectionObserverMock;
});

import { PartnerShowcasePage } from '../PartnerShowcasePage';

const renderWithRouter = (ui: React.ReactElement, { route = '/partners-preview' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('PartnerShowcasePage', () => {
  it('renders page hero with title', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /independent industry resources for market context/i,
      })
    ).toBeTruthy();
  });

  it('renders all four partner cards', () => {
    renderWithRouter(<PartnerShowcasePage />);
    // Methanol Institute appears twice (name === fullName), others are unique
    expect(screen.getAllByText('Methanol Institute').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('S&P Global Platts')).toBeTruthy();
    expect(screen.getByText('MPA Singapore')).toBeTruthy();
    expect(screen.getByText('Gena Solutions')).toBeTruthy();
  });

  it('renders partner role badges', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText('Industry Standards Body')).toBeTruthy();
    expect(screen.getByText('Pricing & Benchmarks')).toBeTruthy();
    expect(screen.getByText('Regulatory Authority')).toBeTruthy();
    expect(screen.getByText('Analytics & Technology')).toBeTruthy();
  });

  it('labels each card as an independent industry resource', () => {
    renderWithRouter(<PartnerShowcasePage />);
    const badges = screen.getAllByText('INDEPENDENT INDUSTRY RESOURCE');
    expect(badges.length).toBe(4);
  });

  it('renders the mock marketplace listing', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText('Example Marketplace Listing')).toBeTruthy();
    expect(screen.getByText(/illustrative methanol listing/i)).toBeTruthy();
    expect(screen.getByText('Membership: Illustrative')).toBeTruthy();
    expect(screen.getByText('Reference: Illustrative')).toBeTruthy();
  });

  it('renders member representation section', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText(/illustrative listing labels/i)).toBeTruthy();
    expect(screen.getByText(/require supporting evidence and are not verified by verdaxis/i)).toBeTruthy();
  });

  it('renders the public preview disclaimer', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText(/inclusion does not state affiliation or endorsement/i)).toBeTruthy();
  });

  it('shows Verdaxis branding in top bar', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getAllByText('Verdaxis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/industry reference — preview/i)).toBeTruthy();
  });
});
