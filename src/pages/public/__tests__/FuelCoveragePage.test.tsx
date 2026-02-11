import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FuelCoveragePage } from '../FuelCoveragePage';

const renderWithRouter = (ui: React.ReactElement, { route = '/fuels' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('FuelCoveragePage', () => {
  it('renders page title', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/fuel.*attribute coverage/i)).toBeTruthy();
  });

  it('renders all fuel types', () => {
    renderWithRouter(<FuelCoveragePage />);
    // Use getAllByText for terms that appear in multiple places (e.g. notes mentioning other fuels)
    expect(screen.getAllByText(/methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ethanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/sustainable aviation fuel/i)).toBeTruthy();
    expect(screen.getByText(/hydrogen derivatives/i)).toBeTruthy();
  });

  it('renders CI ranges', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/3–94 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/8–65 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/12–50 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/0\.5–30 gCO₂e\/MJ/)).toBeTruthy();
  });

  it('renders attribute definitions', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/carbon intensity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/feedstock pathway/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/book.*claim/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/^Geography$/)).toBeTruthy();
    expect(screen.getByText(/^Certification Scheme$/)).toBeTruthy();
  });

  it('renders energy density values', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/19\.9 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/26\.8 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/44\.0 MJ\/kg/)).toBeTruthy();
  });

  it('renders key markets for each fuel', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/maritime bunkering/i)).toBeTruthy();
    expect(screen.getByText(/road transport blending/i)).toBeTruthy();
    expect(screen.getAllByText(/aviation/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Coming Soon badge for hydrogen derivatives', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it('renders CTA with link to producer map', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/explore producer map/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore producer map/i });
    expect(link.getAttribute('href')).toBe('/map/producers');
  });

  it('renders subtitle text', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/verdaxis supports a growing range/i)).toBeTruthy();
  });

  it('renders fuel pathway information', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/e-methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/cellulosic/i)).toBeTruthy();
    expect(screen.getByText(/HEFA/)).toBeTruthy();
    expect(screen.getByText(/green ammonia/i)).toBeTruthy();
  });
});
