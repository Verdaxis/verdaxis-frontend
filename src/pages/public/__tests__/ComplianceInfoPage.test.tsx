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

  it('renders stewardship section and integrity points', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/the steward of high-integrity supply/i)).toBeTruthy();
    expect(screen.getByText(/single source of truth for every participant in the chain/i)).toBeTruthy();
    expect(screen.getByText(/end-to-end visibility from the point of production to the bunker tank/i)).toBeTruthy();
    expect(screen.getByText(/every transaction is recorded, timestamped, and auditable/i)).toBeTruthy();
    expect(screen.getByText(/verified sustainability data travels with the fuel at every stage/i)).toBeTruthy();
  });

  it('renders the chain-of-custody visual', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText('Producer')).toBeTruthy();
    expect(screen.getByText('Verdaxis')).toBeTruthy();
    expect(screen.getByText('Vessel')).toBeTruthy();
    expect(screen.getByText('Tank')).toBeTruthy();
  });

  it('renders CTA to the process page', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/see how the platform works end-to-end/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /how it works/i }).getAttribute('href')).toBe('/how-it-works');
  });
});
