import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComplianceInfoPage } from '../ComplianceInfoPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/compliance' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('ComplianceInfoPage', () => {
  it('renders page title', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/compliance & integrity/i)).toBeTruthy();
  });

  it('renders the market-record sustainability disclosure', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/sustainability information in market records/i)).toBeTruthy();
    expect(screen.getByText(/fields are not independent verification or a regulatory determination/i)).toBeTruthy();
  });

  it('renders the market record lifecycle', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText('Supplier')).toBeTruthy();
    expect(screen.getByText('Market Record')).toBeTruthy();
    expect(screen.getByText('Order or Trade')).toBeTruthy();
    expect(screen.getByText('Lifecycle Status')).toBeTruthy();
  });

  it('renders the disclosed-information limits', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/supplier-declared certification information is labelled as a declaration/i)).toBeTruthy();
    expect(screen.getByText(/review disclosed fields before making a market decision/i)).toBeTruthy();
  });

  it('renders CTA to how it works', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/see how the platform works end-to-end/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /how it works/i });
    expect(link.getAttribute('href')).toBe('/en/how-it-works');
  });
});
