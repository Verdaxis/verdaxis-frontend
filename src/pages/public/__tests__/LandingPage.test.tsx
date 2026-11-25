import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import gsap from 'gsap';
import publicZh from '../../../locales/zh/public.json';

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
      add: (query: string, setup: () => void) => {
        if (window.matchMedia(query).matches) setup();
      },
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

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('../../../services/analytics', () => ({
  analytics: { track },
}));

// Mock motion/react to render plain elements
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target: any, prop: string) => {
      return React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, whileInView, whileHover, whileTap, variants, transition, viewport, ...rest } = props;
        return React.createElement(prop, {
          ...rest,
          ref,
          style: initial?.opacity === undefined ? rest.style : { ...rest.style, opacity: initial.opacity },
          'data-tap-scale': whileTap?.scale,
        });
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
  beforeEach(() => {
    track.mockClear();
  });

  it('renders hero headline', () => {
    renderWithRouter(<LandingPage />);
    // Text appears in hero headline and also in section subtitles
    const matches = screen.getAllByText(/Low-Carbon Fuels/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('states the neutral exchange mission accurately', () => {
    renderWithRouter(<LandingPage />);
    expect(screen.getByText(
      'Verdaxis is a neutral marketplace for physical low-carbon fuel bids and asks. Participants remain anonymous until confirmation and can review supplier-declared sustainability fields and source-labelled market data.'
    )).toBeTruthy();
    expect(publicZh.hero.subtitle).toBe(
      'Verdaxis 是一个中立的实物低碳燃料 BID 与 ASK 市场。参与者在确认前保持匿名，并可查看供应商申报的可持续发展字段和标明来源的市场数据。'
    );
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
    expect(screen.getByLabelText(/demo marketplace price ticker/i)).toBeTruthy();
  });

  it('renders stable scope facts and working internal links without animation', () => {
    renderWithRouter(<LandingPage />);

    const fuelProducts = screen.getByText('Active Fuel Products');
    expect(fuelProducts.previousElementSibling?.textContent).toBe('8');
    expect(screen.getByText('Supported Delivery Points').previousElementSibling?.textContent).toBe('8');
    expect(screen.getAllByRole('link', { name: /see full process/i })[0].getAttribute('href')).toBe('/en/how-it-works');
    expect(screen.getAllByRole('link', { name: /learn more/i })[0].getAttribute('href')).toBe('/en/for-producers');
  });

  it('shows static steps and visible sections when reduced motion is enabled', () => {
    const preference = new EventTarget();
    let reduced = false;
    const matchMedia = window.matchMedia;
    window.matchMedia = (query) => ({
      get matches() {
        if (query === '(prefers-reduced-motion: reduce)') return reduced;
        return query.includes('min-width') && (!query.includes('no-preference') || !reduced);
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: preference.addEventListener.bind(preference),
      removeEventListener: preference.removeEventListener.bind(preference),
      dispatchEvent: preference.dispatchEvent.bind(preference),
    });
    const setReduced = (enabled: boolean) => {
      reduced = enabled;
      act(() => { preference.dispatchEvent(new Event('change')); });
    };
    const expectStaticContent = () => {
      for (const name of ['List & Document', 'Discover & Trade', 'Manage & Optimise']) {
        expect(screen.getByRole('heading', { name })).toBeTruthy();
      }
      const roles = screen.getByRole('heading', { name: 'Built for Every Participant' });
      expect(roles.closest('[style*="opacity: 0"]')).toBeNull();
      const cta = screen.getByRole('link', { name: 'Register Interest' });
      expect(cta.closest('[data-tap-scale]')).toBeNull();
    };

    try {
      const view = renderWithRouter(<LandingPage />);
      expect(gsap.to).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
        scrollTrigger: expect.objectContaining({ pin: true }),
      }));
      setReduced(true);
      expectStaticContent();
      view.unmount();

      vi.mocked(gsap.to).mockClear();
      renderWithRouter(<LandingPage />);
      expectStaticContent();
      expect(gsap.to).not.toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
        scrollTrigger: expect.objectContaining({ pin: true }),
      }));
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('renders CTA buttons', () => {
    renderWithRouter(<LandingPage />);
    // "Apply for Pilot" appears in hero and CTA section
    const applyButtons = screen.getAllByText('Apply for Pilot');
    expect(applyButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Register Interest')).toBeTruthy();
  });

  it('tracks the distinct bottom CTAs without document-wide capture', () => {
    renderWithRouter(<LandingPage />);
    const applyButtons = screen.getAllByText('Apply for Pilot');
    const bottomPilotLink = applyButtons[applyButtons.length - 1].closest('a');
    const registerInterestLink = screen.getByText('Register Interest').closest('a');
    bottomPilotLink?.addEventListener('click', event => event.preventDefault());
    registerInterestLink?.addEventListener('click', event => event.preventDefault());

    fireEvent.click(bottomPilotLink!);
    fireEvent.click(registerInterestLink!);

    expect(track).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'pilot', placement: 'landing_bottom', language: 'en',
    });
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'register_interest', placement: 'landing_bottom', language: 'en',
    });
  });
});
