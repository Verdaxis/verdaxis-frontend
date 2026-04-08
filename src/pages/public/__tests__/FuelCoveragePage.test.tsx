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
    expect(screen.getByText('Fuel Coverage')).toBeTruthy();
  });

  it('renders maritime sector content by default', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText('Maritime Fuels')).toBeTruthy();
    expect(screen.getByText(/low-carbon bunker fuels for the global fleet/i)).toBeTruthy();
    expect(screen.getAllByText(/methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bio-LNG')).toBeTruthy();
    expect(screen.getByText('Bio-MGO / FAME Blends')).toBeTruthy();
    expect(screen.getByText('Ammonia')).toBeTruthy();
    expect(screen.getByText('UCOME')).toBeTruthy();
  });

  it('renders CI ranges', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/3–94 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/10–40 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/15–55 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/0\.5–30 gCO₂e\/MJ/)).toBeTruthy();
  });

  it('renders attribute definitions', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/carbon intensity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/feedstock pathway/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/geography & price discovery/i)).toBeTruthy();
    expect(screen.getByText(/^Certification Scheme$/)).toBeTruthy();
  });

  it('renders energy density values', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/19\.9 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/49\.0 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/37\.0 MJ\/kg/)).toBeTruthy();
  });

  it('renders key markets for each fuel', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/maritime bunkering/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/lng-fuelled vessels/i)).toBeTruthy();
    expect(screen.getByText(/next-gen engines/i)).toBeTruthy();
  });

  it('renders Coming Soon badge for hydrogen derivatives', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it('renders CTA with the current pilot link', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/explore producer map/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore producer map/i });
    expect(link.getAttribute('href')).toBe('/en/pilot');
  });

  it('renders subtitle text', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/verdaxis supports sustainable fuels across maritime, aviation, and land transport/i)).toBeTruthy();
  });

  it('renders fuel pathway information', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/e-methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/green ammonia/i)).toBeTruthy();
    expect(screen.getByText(/hvo/i)).toBeTruthy();
  });
});
