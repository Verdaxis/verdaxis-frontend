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
    expect(screen.getByText('Faster Offtake')).toBeTruthy();
    expect(screen.getByText('Premium Discovery')).toBeTruthy();
    expect(screen.getByText(/Scope 3 Monetisation/)).toBeTruthy();
    expect(screen.getByText('Forward Selling')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<ProducerUseCasePage />);
    expect(screen.getByText(/Register your facility/i)).toBeTruthy();
    expect(screen.getByText(/Attributes are verified/i)).toBeTruthy();
    expect(screen.getByText(/Receive bids from qualified buyers/i)).toBeTruthy();
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
    expect(screen.getByText('For Fuel Buyers & Operators')).toBeTruthy();
    expect(screen.getByText('Energy-Adjusted Pricing')).toBeTruthy();
    expect(screen.getByText('Verified Scope 3 Reductions')).toBeTruthy();
    expect(screen.getByText('FuelEU & ETS Compliance')).toBeTruthy();
    expect(screen.getByText('MC Declaration Ready')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<BuyerUseCasePage />);
    expect(screen.getByText(/Post your fuel requirements/i)).toBeTruthy();
    expect(screen.getByText(/Review matched offers/i)).toBeTruthy();
    expect(screen.getByText(/Complete the trade/i)).toBeTruthy();
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
    expect(screen.getByText('Liquidity Access')).toBeTruthy();
    expect(screen.getByText('Standardised Structures')).toBeTruthy();
    expect(screen.getByText('Price Discovery')).toBeTruthy();
    expect(screen.getByText('Reduced Back-Office')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<TraderUseCasePage />);
    expect(screen.getByText(/Access the orderbook/i)).toBeTruthy();
    expect(screen.getByText(/Execute trades with standardised terms/i)).toBeTruthy();
    expect(screen.getByText(/Track positions, commissions/i)).toBeTruthy();
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
    expect(screen.getByText('Bankable Data')).toBeTruthy();
    expect(screen.getByText('Traceable Claims')).toBeTruthy();
    expect(screen.getByText('Reduced Diligence Cost')).toBeTruthy();
    expect(screen.getByText('Green Financing Opportunities')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<FinancierUseCasePage />);
    expect(screen.getByText(/Access verified production/i)).toBeTruthy();
    expect(screen.getByText(/Review standardised compliance/i)).toBeTruthy();
    expect(screen.getByText(/Connect with qualified producers/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<FinancierUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pilot');
  });
});
