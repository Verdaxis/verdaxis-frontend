import { describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n, { loadNamespace } from '../../../i18n';
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
    expect(screen.getByRole('heading', { name: /fuel coverage/i })).toBeTruthy();
  });

  it('renders sector tabs and default maritime fuels', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByRole('button', { name: /maritime/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /aviation/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /land/i })).toBeTruthy();
    expect(screen.getAllByText(/methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ethanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bio-lng/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/B30 \/ B100/i)).toBeTruthy();
    expect(screen.getAllByText(/ammonia/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders CI ranges', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/3–94 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/8–65 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/15–55 gCO₂e\/MJ/)).toBeTruthy();
    expect(screen.getByText(/0\.5–30 gCO₂e\/MJ/)).toBeTruthy();
  });

  it('renders attribute definitions', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/carbon intensity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/feedstock pathway/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/price discovery/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/^Geography & Price Discovery$/)).toBeTruthy();
    expect(screen.getByText(/^Certification Scheme$/)).toBeTruthy();
  });

  it('renders energy density values', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/19\.9 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/26\.8 MJ\/kg/)).toBeTruthy();
    expect(screen.getByText(/37\.0 MJ\/kg/)).toBeTruthy();
  });

  it('renders key markets for each fuel', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/maritime bunkering/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/drop-in blending/i)).toBeTruthy();
    expect(screen.getAllByText(/power generation/i).length).toBeGreaterThanOrEqual(1);
  });

  it('labels the ammonia card as informational', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/^informational$/i)).toBeTruthy();
  });

  it('renders CTA with link to producer map', () => {
    render(
      <MemoryRouter initialEntries={['/zh/fuels']}>
        <Routes>
          <Route path="/:lang/fuels" element={<FuelCoveragePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/explore producer map/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore producer map/i });
    expect(link.getAttribute('href')).toBe('/zh/map/producers');
  });

  it('renders fuel-card content in Chinese', async () => {
    await loadNamespace('public');
    await i18n.changeLanguage('zh');

    try {
      render(
        <MemoryRouter initialEntries={['/zh/fuels']}>
          <Routes>
            <Route path="/:lang/fuels" element={<FuelCoveragePage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: '甲醇' })).toBeTruthy();
      expect(screen.getByText('生物甲醇')).toBeTruthy();
      expect(screen.getByText('船用燃料加注、化工原料')).toBeTruthy();
      expect(screen.getByText(/生物甲醇和 e-甲醇分别作为船用市场产品提供/)).toBeTruthy();
      expect(screen.queryByText('Bio-methanol (waste/biomass)')).toBeNull();
      expect(screen.queryByText('Maritime bunkering, chemical feedstock')).toBeNull();
      expect(screen.queryByText(/∼2M mt expected production/)).toBeNull();
    } finally {
      cleanup();
      await i18n.changeLanguage('en');
    }
  });

  it('renders subtitle text', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getByText(/current marine orderbooks cover B30, B100/i)).toBeTruthy();
  });

  it('renders fuel pathway information', () => {
    renderWithRouter(<FuelCoveragePage />);
    expect(screen.getAllByText(/e-methanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/synthetic ethanol/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/UCOME/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/green ammonia/i)).toBeTruthy();
  });
});
