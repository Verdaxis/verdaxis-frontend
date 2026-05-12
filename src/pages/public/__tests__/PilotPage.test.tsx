import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PilotPage } from '../PilotPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/pilot' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

/* ---- localStorage mock ---- */
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

describe('PilotPage', () => {
  beforeEach(() => {
    storageMock.clear();
  });

  it('renders page title', () => {
    renderWithRouter(<PilotPage />);
    expect(screen.getByText('Pilot Programme')).toBeTruthy();
    expect(
      screen.getByText(/deliberately onboarding select producers, buyers, and traders/i)
    ).toBeTruthy();
  });

  it('renders what is enabled and what is not', () => {
    renderWithRouter(<PilotPage />);
    // Enabled items
    expect(screen.getByText(/read-only market data and price discovery/i)).toBeTruthy();
    expect(screen.getByText(/bilateral matchmaking between verified participants/i)).toBeTruthy();
    expect(screen.getByText(/energy value calculator with compliance modelling/i)).toBeTruthy();
    expect(screen.getByText(/producer map with project data/i)).toBeTruthy();
    expect(screen.getByText(/compliance documentation and traceability/i)).toBeTruthy();

    // Not yet live items
    expect(screen.getByText(/live bids and offers/i)).toBeTruthy();
    expect(screen.getByText(/automated trade settlement/i)).toBeTruthy();
    expect(screen.getByText(/futures and forward contracts/i)).toBeTruthy();
    expect(screen.getByText(/green financing module/i)).toBeTruthy();
    expect(screen.getByText(/api access for programmatic trading/i)).toBeTruthy();
  });

  it('renders qualification criteria', () => {
    renderWithRouter(<PilotPage />);
    expect(screen.getByText('Fuel Producers')).toBeTruthy();
    expect(screen.getByText(/operational or near-cod facilities/i)).toBeTruthy();
    expect(screen.getByText('Fuel Buyers / Operators')).toBeTruthy();
    expect(screen.getByText(/shipping lines, fleet operators/i)).toBeTruthy();
    expect(screen.getByText('Traders / Aggregators')).toBeTruthy();
    expect(screen.getByText(/established trading houses/i)).toBeTruthy();
    expect(screen.getByText('Strategic Partners')).toBeTruthy();
    expect(screen.getByText(/top-tier shippers or producers/i)).toBeTruthy();
  });

  it('renders signup CTA above the fold instead of the legacy application form', () => {
    renderWithRouter(<PilotPage />);
    const cta = screen.getByRole('link', { name: /go to signup/i });
    expect(cta.getAttribute('href')).toBe('/register');
    expect(screen.queryByLabelText(/company name/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /submit application/i })).toBeNull();
  });

  it('renders timeline copy from the current locale keys', () => {
    renderWithRouter(<PilotPage />);
    expect(screen.getByText(/limited onboarding/i)).toBeTruthy();
    expect(screen.getByText(/full launch follows successful pilot validation/i)).toBeTruthy();
  });
});
