import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock canvas and IntersectionObserver for JSDOM
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
  })) as any;

  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock gsap
vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

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
    expect(screen.getAllByText(/institutions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/that shape the market/i)).toBeTruthy();
  });

  it('renders all four partner cards', () => {
    renderWithRouter(<PartnerShowcasePage />);
    // Methanol Institute appears twice (name === fullName), others are unique
    expect(screen.getAllByText('Methanol Institute').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('S&P Global Platts')).toBeTruthy();
    expect(screen.getByText('MPA Singapore')).toBeTruthy();
    expect(screen.getByText('Ghana')).toBeTruthy();
  });

  it('renders partner role badges', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText('Industry Standards Body')).toBeTruthy();
    expect(screen.getByText('Pricing & Benchmarks')).toBeTruthy();
    expect(screen.getByText('Regulatory Authority')).toBeTruthy();
    expect(screen.getByText('Sovereign Partner')).toBeTruthy();
  });

  it('renders verified partner badges', () => {
    renderWithRouter(<PartnerShowcasePage />);
    const badges = screen.getAllByText('VERDAXIS VERIFIED PARTNER');
    expect(badges.length).toBe(4);
  });

  it('renders the mock marketplace listing', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText('Example Marketplace Listing')).toBeTruthy();
    expect(screen.getByText(/green methanol/i)).toBeTruthy();
    expect(screen.getByText('MI Member')).toBeTruthy();
    expect(screen.getByText('Platts-Indexed')).toBeTruthy();
  });

  it('renders member representation section', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText(/how institute members appear/i)).toBeTruthy();
  });

  it('renders confidential preview footer', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getByText(/confidential preview page/i)).toBeTruthy();
  });

  it('shows Verdaxis branding in top bar', () => {
    renderWithRouter(<PartnerShowcasePage />);
    expect(screen.getAllByText('Verdaxis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/partner network/i)).toBeTruthy();
  });
});
