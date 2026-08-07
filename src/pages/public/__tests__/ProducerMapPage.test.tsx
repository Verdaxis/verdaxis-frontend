import { describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n, { loadNamespace } from '../../../i18n';

const leafletMockState = vi.hoisted(() => ({ popupProps: [] as any[] }));

// Mock react-leaflet to avoid JSDOM issues
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  ZoomControl: ({ zoomInTitle, zoomOutTitle }: any) => (
    <div>
      <button type="button" aria-label={zoomInTitle} title={zoomInTitle}>+</button>
      <button type="button" aria-label={zoomOutTitle} title={zoomOutTitle}>−</button>
    </div>
  ),
  CircleMarker: ({ children }: any) => <div data-testid="circle-marker">{children}</div>,
  Popup: (props: any) => {
    leafletMockState.popupProps.push(props);
    return <div data-testid="popup">{props.children}</div>;
  },
}));

// Mock leaflet CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock producerProjects with a small representative subset to avoid JSDOM timeout
// when rendering 274 markers. Covers all 3 fuel types and all 4 statuses.
vi.mock('../../../data/producerProjects', () => {
  const projects = [
    { id: 'proj-001', name: 'George Olah', company: 'CRI', fuelType: 'E-Methanol', pathway: 'CO2 + H2 (renewable)', status: 'Operational', capacityKtpa: 10, codYear: 2012, lat: 63.84, lng: -22.43, country: 'Iceland', city: 'Grindavik' },
    { id: 'proj-002', name: 'Ecoplanta', company: 'Repsol', fuelType: 'Biomethanol', pathway: 'Residual waste', status: 'Under Construction', capacityKtpa: 240, codYear: 2029, lat: 41.19, lng: 1.21, country: 'Spain', city: 'El Morell' },
    { id: 'proj-003', name: 'Project AIR', company: 'Perstorp', fuelType: 'Biomethanol', pathway: 'Biomethane', status: 'Engineering', capacityKtpa: 200, codYear: 2029, lat: 58.08, lng: 11.92, country: 'Sweden', city: 'Stenungsund' },
    { id: 'proj-004', name: 'Shunli CO2-to-methanol', company: 'Henan Shuncheng', fuelType: 'Low-Carbon Methanol', pathway: 'CO2 + H2', status: 'Operational', capacityKtpa: 110, codYear: 2022, lat: 35.99, lng: 114.51, country: 'China', city: 'Anyang' },
    { id: 'proj-005', name: 'Carbon Iceland', company: 'Carbon Iceland', fuelType: 'E-Methanol', pathway: 'CO2 + H2 (renewable)', status: 'Pre-Feasibility', capacityKtpa: 300, codYear: 2029, lat: 64.36, lng: -21.78, country: 'Iceland', city: 'Grundartangi' },
    { id: 'proj-006', name: 'Triskelion', company: 'Forestal del Atlantico', fuelType: 'E-Methanol', pathway: 'CO2 + H2 (renewable)', status: 'Engineering', capacityKtpa: 57, codYear: 2028, lat: 43.46, lng: -8.26, country: 'Spain', city: 'Mugardos' },
  ];
  return {
    producerProjects: projects,
    fuelTypeColors: {
      'E-Methanol': '#5DADE2',
      'Biomethanol': '#4CAF50',
      'Low-Carbon Methanol': '#FF9800',
    },
  };
});

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
      screen.getByText(/explore methanol production projects worldwide/i)
    ).toBeTruthy();
    // Stats should show project count and country count
    expect(screen.getByText(new RegExp(`${producerProjects.length} projects`))).toBeTruthy();
  });

  it('renders tab navigation with Map and Future Production tabs', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByText('Project Map')).toBeTruthy();
    expect(screen.getByText('Future Production')).toBeTruthy();
  });

  it('renders filter sidebar with fuel type checkboxes', () => {
    renderWithRouter(<ProducerMapPage />);
    // Each fuel type appears in both the checkbox filter and legend sections
    expect(screen.getAllByText('E-Methanol').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Bio Methanol|Biomethanol/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Low-Carbon Methanol|E-Methanol/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders map container', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(screen.getByTestId('map-container')).toBeTruthy();
  });

  it('renders correct number of markers for default filters', () => {
    renderWithRouter(<ProducerMapPage />);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers.length).toBe(3);
  });

  it('renders status filter options', () => {
    renderWithRouter(<ProducerMapPage />);
    // Status labels appear in filter buttons and may appear in popup badges
    expect(screen.getAllByText('All').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Operational').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Under Construction').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Engineering').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pre-Feasibility').length).toBeGreaterThanOrEqual(1);
  });

  it('renders showing count', () => {
    renderWithRouter(<ProducerMapPage />);
    expect(
      screen.getByText(/Showing 3 of 6/)
    ).toBeTruthy();
  });

  it('renders the current-project count in natural Chinese', async () => {
    await loadNamespace('public');
    await i18n.changeLanguage('zh');

    try {
      renderWithRouter(<ProducerMapPage />);
      expect(screen.getByText('共 6 个项目，当前显示 3 个')).toBeTruthy();
    } finally {
      cleanup();
      await i18n.changeLanguage('en');
    }
  });

  it('updates native Leaflet control labels for Chinese', async () => {
    await loadNamespace('public');
    leafletMockState.popupProps.length = 0;
    const view = renderWithRouter(<ProducerMapPage />);

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeTruthy();

    try {
      await act(async () => {
        await i18n.changeLanguage('zh');
      });

      expect(screen.getByRole('button', { name: '放大' }).getAttribute('title')).toBe('放大');
      expect(screen.getByRole('button', { name: '缩小' }).getAttribute('title')).toBe('缩小');

      const popupElement = document.createElement('div');
      const closeButton = document.createElement('a');
      closeButton.className = 'leaflet-popup-close-button';
      popupElement.append(closeButton);
      const popupProps = leafletMockState.popupProps.at(-1);
      popupProps.eventHandlers.add({ target: { getElement: () => popupElement } });

      expect(closeButton.getAttribute('aria-label')).toBe('关闭弹出窗口');
      expect(closeButton.getAttribute('title')).toBe('关闭弹出窗口');
    } finally {
      view.unmount();
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
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

describe('ProducerMapPage - Future Production tab', () => {
  it('shows future production marketplace when tab is clicked', () => {
    renderWithRouter(<ProducerMapPage />);

    const futureTab = screen.getByText('Future Production');
    fireEvent.click(futureTab);

    expect(screen.getByText('Future Production Marketplace')).toBeTruthy();
    expect(screen.getAllByText(/upcoming/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows future project count badge on tab', () => {
    renderWithRouter(<ProducerMapPage />);
    const futureProjectsList = producerProjects.filter(
      (p) => p.status !== 'Operational'
    );
    // The badge shows the count number (may appear in multiple places)
    expect(screen.getAllByText(String(futureProjectsList.length)).length).toBeGreaterThanOrEqual(1);
  });

  it('shows express interest buttons for future projects', () => {
    renderWithRouter(<ProducerMapPage />);

    fireEvent.click(screen.getByText('Future Production'));

    const expressButtons = screen.getAllByText('Express Interest');
    expect(expressButtons.length).toBeGreaterThan(0);
  });

  it('uses the singular project label for one project', () => {
    renderWithRouter(<ProducerMapPage />);

    fireEvent.click(screen.getByText('Future Production'));

    expect(screen.getByText(/1 project · 57 ktpa/)).toBeTruthy();
  });

  it('shows contextual CTA when on futures tab', () => {
    renderWithRouter(<ProducerMapPage />);

    fireEvent.click(screen.getByText('Future Production'));

    expect(screen.getByText(/have future production to offer/i)).toBeTruthy();
    const ctaLink = screen.getByRole('link', { name: /list your production/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/pilot');
  });
});
