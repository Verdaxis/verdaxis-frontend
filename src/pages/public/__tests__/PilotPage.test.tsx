import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders application form with all fields', () => {
    renderWithRouter(<PilotPage />);
    expect(screen.getByLabelText(/company name/i)).toBeTruthy();
    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
    expect(screen.getByLabelText(/estimated annual volume/i)).toBeTruthy();
    expect(screen.getByLabelText(/what interests you about verdaxis/i)).toBeTruthy();

    // Fuel type checkboxes
    expect(screen.getByLabelText('Methanol')).toBeTruthy();
    expect(screen.getByLabelText('Ethanol')).toBeTruthy();
    expect(screen.getByLabelText('SAF')).toBeTruthy();
    expect(screen.getByLabelText('Ammonia')).toBeTruthy();
    expect(screen.getByLabelText('Biofuel')).toBeTruthy();
    expect(screen.getByLabelText('Other')).toBeTruthy();

    // Submit button
    expect(screen.getByRole('button', { name: /submit application/i })).toBeTruthy();
  });

  it('shows validation on empty submit', () => {
    renderWithRouter(<PilotPage />);
    const submitButton = screen.getByRole('button', { name: /submit application/i });
    fireEvent.click(submitButton);

    // Should not show success message
    expect(screen.queryByText(/thank you/i)).toBeNull();
  });

  it('saves to localStorage on valid submit', () => {
    renderWithRouter(<PilotPage />);

    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Acme Fuels' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@acme.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    const stored = JSON.parse(localStorage.getItem('verdaxis_pilot_applications') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].companyName).toBe('Acme Fuels');
    expect(stored[0].yourName).toBe('Jane Doe');
    expect(stored[0].email).toBe('jane@acme.com');
  });

  it('shows success message after submit', () => {
    renderWithRouter(<PilotPage />);

    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Acme Fuels' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@acme.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    expect(screen.getByText(/thank you! we'll be in touch within 48 hours/i)).toBeTruthy();
    expect(screen.getByText(/pilot@verdaxis.exchange/i)).toBeTruthy();
  });
});
