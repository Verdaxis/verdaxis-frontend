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

  it('renders stewardship section', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/steward of high-integrity supply/i)).toBeTruthy();
    expect(screen.getByText(/single source of truth/i)).toBeTruthy();
    expect(screen.getByText(/end-to-end visibility/i)).toBeTruthy();
    expect(screen.getByText(/recorded, timestamped, and auditable/i)).toBeTruthy();
  });

  it('renders supply chain roles', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText('Producer')).toBeTruthy();
    expect(screen.getByText('Verdaxis')).toBeTruthy();
    expect(screen.getByText('Vessel')).toBeTruthy();
    expect(screen.getByText('Tank')).toBeTruthy();
  });

  it('renders integrity points', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/verified sustainability data travels with the fuel/i)).toBeTruthy();
    expect(screen.getByText(/platform-enforced integrity eliminates gaps/i)).toBeTruthy();
  });

  it('renders CTA to how it works', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/see how the platform works end-to-end/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /how it works/i });
    expect(link.getAttribute('href')).toBe('/how-it-works');
  });
});
