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
    expect(screen.getByText('Deal Flow Analytics & Market Visibility')).toBeTruthy();
    expect(screen.getByText('Pre-Market Future Production')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<ProducerUseCasePage />);
    expect(screen.getByText(/list your production.*current inventory or future capacity/i)).toBeTruthy();
    expect(screen.getByText(/qualified buyers discover your listings and submit bids directly/i)).toBeTruthy();
    expect(screen.getByText(/negotiate terms, agree price, and close deals faster/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<ProducerUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pilot');
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
    expect(screen.getByText('All Sustainable Fuel Types')).toBeTruthy();
    expect(screen.getByText('Hedging & Price Risk Tools')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<BuyerUseCasePage />);
    expect(screen.getByText(/Post your fuel requirements/i)).toBeTruthy();
    expect(screen.getByText(/review matched offers with transparent pricing/i)).toBeTruthy();
    expect(screen.getByText(/execute the trade and optionally hedge your price exposure with swaps/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<BuyerUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pilot');
  });
});

/* ------------------------------------------------------------------ */
/*  TraderUseCasePage                                                  */
/* ------------------------------------------------------------------ */

describe('TraderUseCasePage', () => {
  it('renders title and value propositions', () => {
    renderWithRouter(<TraderUseCasePage />);
    expect(screen.getByText('For Traders & Aggregators')).toBeTruthy();
    expect(screen.getByText('Deep Liquidity Pool')).toBeTruthy();
    expect(screen.getByText('Hedging Tools & Swaps')).toBeTruthy();
    expect(screen.getByText('Price Discovery & Market Intelligence')).toBeTruthy();
    expect(screen.getByText('Integrated Risk Management')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<TraderUseCasePage />);
    expect(screen.getByText(/access the live orderbook/i)).toBeTruthy();
    expect(screen.getByText(/execute spot trades, swaps, or forwards with standardised terms/i)).toBeTruthy();
    expect(screen.getByText(/monitor positions, risk exposure, and market intelligence/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<TraderUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pilot');
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
    expect(screen.getByText(/access bankable, auditable sustainability data/i)).toBeTruthy();
    expect(screen.getByText(/run integrated risk assessments and review standardised compliance reporting/i)).toBeTruthy();
    expect(screen.getByText(/apply market intelligence and forecasting to structure and price green finance deals/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<FinancierUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pilot');
  });
});
