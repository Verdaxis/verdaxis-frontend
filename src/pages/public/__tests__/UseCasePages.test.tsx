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
    expect(screen.getByText('Supported Market Visibility')).toBeTruthy();
    expect(screen.getByText('Standard Order Entry')).toBeTruthy();
    expect(screen.getByText('Market Monitoring')).toBeTruthy();
    expect(screen.getByText('Future Availability Windows')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<ProducerUseCasePage />);
    expect(screen.getByText(/choose a supported product, quantity, delivery point/i)).toBeTruthy();
    expect(screen.getByText(/review the selected market's visible bids, asks, and source labels/i)).toBeTruthy();
    expect(screen.getByText(/place a physical ask and monitor its order and trade lifecycle status/i)).toBeTruthy();
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
    expect(screen.getByText('Visible Bids, Asks & Data Labels')).toBeTruthy();
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
    expect(screen.getByText('Market Data & Context')).toBeTruthy();
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
    expect(screen.getByText('Disclosed Sustainability Fields')).toBeTruthy();
    expect(screen.getByText('Structured Market Context')).toBeTruthy();
    expect(screen.getByText('Consistent Market Records')).toBeTruthy();
    expect(screen.getByText('Source-Labelled Monitoring')).toBeTruthy();
  });

  it('renders how-it-works steps', () => {
    renderWithRouter(<FinancierUseCasePage />);
    expect(screen.getByText(/review sustainability fields disclosed for the selected physical market/i)).toBeTruthy();
    expect(screen.getByText(/compare bids and asks for the exact product/i)).toBeTruthy();
    expect(screen.getByText(/use source and status labels as inputs to your own review/i)).toBeTruthy();
  });

  it('renders CTA to pilot', () => {
    renderWithRouter(<FinancierUseCasePage />);
    const link = screen.getByRole('link', { name: /apply for pilot/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });
});
