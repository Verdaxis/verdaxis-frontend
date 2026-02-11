import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-leaflet to avoid JSDOM issues
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: any) => <div data-testid="circle-marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

// Mock leaflet CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

import { ProducerMapPage } from '../ProducerMapPage';
import { producerProjects } from '../../../data/producerProjects';

const renderWithRouter = (ui: React.ReactElement, { route = '/map/producers' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('ProducerMapPage', () => {
  it('renders page title and stats', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByText('Producer & Project Map')).toBeTruthy();
    expect(
      screen.getByText(/explore low-carbon fuel production facilities worldwide/i)
    ).toBeTruthy();
    // Stats should show project count and country count
    expect(screen.getByText(new RegExp(`${producerProjects.length} projects`))).toBeTruthy();
  });

  it('renders filter sidebar with fuel type checkboxes', () => {
    renderWithRouter(<ProducerMapPage />);
    // Each fuel type appears in both the checkbox filter and legend sections
    expect(screen.getAllByText('Methanol').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Ethanol').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('SAF').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Ammonia').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Biofuel').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Biomethane').length).toBeGreaterThanOrEqual(2);
  });

  it('renders map container', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByTestId('map-container')).toBeTruthy();
  });

  it('renders correct number of markers for default filters', () => {
    renderWithRouter(<ProducerMapPage />);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers.length).toBe(producerProjects.length);
  });

  it('renders status filter options', () => {
    renderWithRouter(<ProducerMapPage />);
    // Status labels appear in filter buttons and may appear in popup badges
    expect(screen.getAllByText('All').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Operational').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Under Construction').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Planned').length).toBeGreaterThanOrEqual(1);
  });

  it('renders showing count', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(
      screen.getByText(new RegExp(`Showing ${producerProjects.length} of ${producerProjects.length}`))
    ).toBeTruthy();
  });

  it('renders CTA with link to pilot page', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByText(/want to list your project/i)).toBeTruthy();
    const ctaLink = screen.getByRole('link', { name: /apply for pilot/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/pilot');
  });

  it('renders search input', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByPlaceholderText(/search.*name.*company/i)).toBeTruthy();
  });
});
