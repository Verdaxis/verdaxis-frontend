import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GovernancePage } from '../GovernancePage';

const renderWithRouter = (ui: React.ReactElement, { route = '/governance' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('GovernancePage', () => {
  it('renders page title', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getByText(/governance & trust/i)).toBeTruthy();
    expect(screen.getByText(/before live trading, governance matters more than ui/i)).toBeTruthy();
  });

  it('renders guiding principles (trust, rules, independence)', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getByText(/trust before liquidity/i)).toBeTruthy();
    expect(screen.getByText(/earn credibility before scaling volume/i)).toBeTruthy();
    expect(screen.getByText(/rules before prices/i)).toBeTruthy();
    expect(screen.getByText(/compliance standards, and attribute definitions/i)).toBeTruthy();
    expect(screen.getByText(/independence & neutrality/i)).toBeTruthy();
    expect(screen.getByText(/neutral infrastructure provider/i)).toBeTruthy();
  });

  it('renders structural separation roles', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getAllByText(/structural separation of roles/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/platform operator/i)).toBeTruthy();
    expect(screen.getByText(/technology and registry provider/i)).toBeTruthy();
    expect(screen.getByText(/does not take proprietary trading positions/i)).toBeTruthy();
    expect(screen.getByText(/market participants/i)).toBeTruthy();
    expect(screen.getByText(/producers, buyers, traders, and financiers/i)).toBeTruthy();
    expect(screen.getByText(/verification bodies/i)).toBeTruthy();
    expect(screen.getByText(/independent third-party certifiers/i)).toBeTruthy();
  });

  it('renders data neutrality statement', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getByText(/data neutrality statement/i)).toBeTruthy();
    expect(screen.getByText(/equal confidentiality/i)).toBeTruthy();
    expect(screen.getByText(/aggregated, anonymised market data/i)).toBeTruthy();
    expect(screen.getByText(/never shared with competitors/i)).toBeTruthy();
    expect(screen.getByText(/retain ownership of their data/i)).toBeTruthy();
  });

  it('renders conflict of interest policy', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getByText(/conflict of interest policy/i)).toBeTruthy();
    expect(screen.getByText(/fully disclosed to all participants/i)).toBeTruthy();
    expect(screen.getByText(/no preferential access, no information advantage/i)).toBeTruthy();
    expect(screen.getByText(/independent oversight function/i)).toBeTruthy();
    expect(screen.getByText(/confidential channel/i)).toBeTruthy();
  });

  it('renders advisory board section', () => {
    renderWithRouter(<GovernancePage />);
    expect(screen.getAllByText(/advisory board/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/assembling an advisory board/i)).toBeTruthy();
    expect(screen.getByText(/maritime regulation expert/i)).toBeTruthy();
    expect(screen.getByText(/carbon markets specialist/i)).toBeTruthy();
    expect(screen.getByText(/fuel production advisor/i)).toBeTruthy();
    expect(screen.getByText(/financial compliance advisor/i)).toBeTruthy();
    expect(screen.getByText(/interested in joining our advisory board/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /contact us/i }).getAttribute('href')).toBe('mailto:governance@verdaxis.exchange');
  });
});
