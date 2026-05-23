import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock GSAP and ScrollTrigger
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    set: vi.fn(),
    registerPlugin: vi.fn(),
    context: vi.fn(() => ({ revert: vi.fn(), kill: vi.fn() })),
    matchMedia: vi.fn(() => ({
      add: vi.fn(),
      revert: vi.fn(),
      kill: vi.fn(),
    })),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: vi.fn(),
    refresh: vi.fn(),
    getAll: vi.fn(() => []),
    killAll: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    batch: vi.fn(),
  },
}));

vi.mock('lenis', () => ({ default: vi.fn() }));

// Mock motion/react to render plain elements
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: any, prop: string) => {
      return React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, whileInView, whileHover, whileTap, variants, transition, viewport, ...rest } = props;
        return React.createElement(prop, { ...rest, ref });
      });
    },
  }),
  useInView: () => true,
  AnimatePresence: ({ children }: any) => children,
}));

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
    expect(screen.getByText(/market benchmarks/i)).toBeTruthy();
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<LandingPage />);
    // "Apply for Pilot" appears in hero and CTA section
    const applyButtons = screen.getAllByText('Apply for Pilot');
    expect(applyButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Register Interest')).toBeTruthy();
  });
});
