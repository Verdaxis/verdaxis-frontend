import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProducerUseCasePage } from '../ProducerUseCasePage';
import { BuyerUseCasePage } from '../BuyerUseCasePage';
import { TraderUseCasePage } from '../TraderUseCasePage';
import { FinancierUseCasePage } from '../FinancierUseCasePage';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

/* ------------------------------------------------------------------ */
/*  ProducerUseCasePage                                                */
/* ------------------------------------------------------------------ */

describe('ProducerUseCasePage', () => {
  it('renders title and value propositions', () => {
    renderWithRouter(<ProducerUseCasePage />);
    expect(screen.getByText('For Fuel Producers')).toBeTruthy();
    expect(screen.getByText('Maximum Market Reach')).toBeTruthy();
    expect(screen.getByText('Lower Customer Acquisition Cost')).toBeTruthy();
    expect(screen.getByText(/Deal Flow Analytics/)).toBeTruthy();
    expect(screen.getByText('Pre-Market Future Production')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<ProducerUseCasePage />);
    expect(screen.getAllByText(/List your production/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Qualified buyers discover/i)).toBeTruthy();
    expect(screen.getByText(/Negotiate terms/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<ProducerUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });
});

/* ------------------------------------------------------------------ */
/*  BuyerUseCasePage                                                   */
/* ------------------------------------------------------------------ */

describe('BuyerUseCasePage', () => {
  it('renders title and value propositions', () => {
    renderWithRouter(<BuyerUseCasePage />);
    expect(screen.getByText('For Owners & Charterers')).toBeTruthy();
    expect(screen.getByText('Unified Market Access')).toBeTruthy();
    expect(screen.getByText('Transparent, Reliable Pricing')).toBeTruthy();
    expect(screen.getByText('Supported Marine Fuel Products')).toBeTruthy();
    expect(screen.getByText('Forward Market Monitoring')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<BuyerUseCasePage />);
    expect(screen.getByText(/Choose a market product/i)).toBeTruthy();
    expect(screen.getByText(/Review the selected market's bids/i)).toBeTruthy();
    expect(screen.getByText(/Place a physical bid/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<BuyerUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });
});

/* ------------------------------------------------------------------ */
/*  TraderUseCasePage                                                  */
/* ------------------------------------------------------------------ */

describe('TraderUseCasePage', () => {
  it('renders title and value propositions', () => {
    renderWithRouter(<TraderUseCasePage />);
    expect(screen.getByText('For Traders & Aggregators')).toBeTruthy();
    expect(screen.getByText('Physical Orderbook')).toBeTruthy();
    expect(screen.getByText('Forward-Curve Monitoring')).toBeTruthy();
    expect(screen.getByText('Price Discovery & Market Intelligence')).toBeTruthy();
    expect(screen.getByText('Orders & Trade History')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<TraderUseCasePage />);
    expect(screen.getByText(/Select a product, delivery point/i)).toBeTruthy();
    expect(screen.getByText(/Place a physical bid or ask/i)).toBeTruthy();
    expect(screen.getByText(/Monitor open orders/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<TraderUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });
});

/* ------------------------------------------------------------------ */
/*  FinancierUseCasePage                                               */
/* ------------------------------------------------------------------ */

describe('FinancierUseCasePage', () => {
  it('renders title and value propositions', () => {
    renderWithRouter(<FinancierUseCasePage />);
    expect(screen.getByText('For Financiers & Auditors')).toBeTruthy();
    expect(screen.getByText('Verified Sustainability Data')).toBeTruthy();
    expect(screen.getByText('Integrated Risk Management')).toBeTruthy();
    expect(screen.getByText('Reduced Diligence Cost')).toBeTruthy();
    expect(screen.getByText('Market Intelligence & Forecasting')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<FinancierUseCasePage />);
    expect(screen.getByText(/Access bankable, auditable sustainability data/i)).toBeTruthy();
    expect(screen.getByText(/Run integrated risk assessments/i)).toBeTruthy();
    expect(screen.getByText(/Apply market intelligence and forecasting/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<FinancierUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });
});
