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

  it('renders double-counting prevention section', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/double-counting prevention/i)).toBeTruthy();
    expect(screen.getByText(/cryptographically locked/i)).toBeTruthy();
    expect(screen.getByText(/permanently retired/i)).toBeTruthy();
    expect(screen.getByText(/full audit trail from production to retirement/i)).toBeTruthy();
  });

  it('renders IMO/FuelEU regulatory references', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/international maritime/i)).toBeTruthy();
    expect(screen.getByText(/fueleu maritime/i)).toBeTruthy();
    expect(screen.getByText(/89\.34 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/imo net-zero framework/i)).toBeTruthy();
    expect(screen.getByText(/cii rating integration/i)).toBeTruthy();
  });

  it('renders EU ETS and CBAM references', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/european union/i)).toBeTruthy();
    expect(screen.getByText(/eu ets maritime coverage/i)).toBeTruthy();
    expect(screen.getByText(/cbam interface/i)).toBeTruthy();
    expect(screen.getByText(/red iii sustainability/i)).toBeTruthy();
    expect(screen.getByText(/eu taxonomy alignment/i)).toBeTruthy();
  });

  it('renders national schemes (45Z, RED III, RenovaBio)', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getAllByText(/national schemes/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/us 45z clean fuel production credit/i)).toBeTruthy();
    expect(screen.getAllByText(/renovabio/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/uk rtfo/i)).toBeTruthy();
  });

  it('renders third-party verification section', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/third-party verification/i)).toBeTruthy();
    expect(screen.getByText(/does not self-certify/i)).toBeTruthy();
    expect(screen.getByText(/iscc eu/i)).toBeTruthy();
    expect(screen.getByText(/iscc plus/i)).toBeTruthy();
    expect(screen.getByText(/rsb/i)).toBeTruthy();
    expect(screen.getByText(/never as the certifier/i)).toBeTruthy();
  });

  it('renders "what Verdaxis does not allow" exclusions', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/what verdaxis does not allow/i)).toBeTruthy();
    expect(screen.getByText(/decoupled environmental credits/i)).toBeTruthy();
    expect(screen.getByText(/self-certified or unverified/i)).toBeTruthy();
    expect(screen.getByText(/retroactive attribute modification/i)).toBeTruthy();
    expect(screen.getByText(/non-kyc.d participants/i)).toBeTruthy();
  });

  it('renders regulators section', () => {
    renderWithRouter(<ComplianceInfoPage />);
    expect(screen.getByText(/for regulators & auditors/i)).toBeTruthy();
    expect(screen.getByText(/read-only audit access/i)).toBeTruthy();
    expect(screen.getByText(/tamper-evident record keeping/i)).toBeTruthy();
    expect(screen.getByText(/regulatory partnership/i)).toBeTruthy();
  });
});
