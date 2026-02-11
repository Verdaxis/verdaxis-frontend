import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowItWorksPage } from '../HowItWorksPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/how-it-works' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('HowItWorksPage', () => {
  it('renders page title', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/how verdaxis works/i)).toBeTruthy();
  });

  it('renders all 5 flow steps', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getAllByText(/fuel is produced/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/registered/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/verified.*locked/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/trades occur/i)).toBeTruthy();
    expect(screen.getAllByText(/audit trail/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders key principles', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/physical-first/i)).toBeTruthy();
    expect(screen.getAllByText(/no decoupled paper credits/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/chain-of-custody/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders comparison table', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getAllByText(/traditional/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/eliminated/i)).toBeTruthy();
  });

  it('renders CTA with link to fuels page', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/explore fuel coverage/i)).toBeTruthy();
    const link = screen.getByRole('link', { name: /explore fuel coverage/i });
    expect(link.getAttribute('href')).toBe('/fuels');
  });

  it('renders step descriptions', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getAllByText(/physical low-carbon fuel is produced/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/third-party verification/i)).toBeTruthy();
    expect(screen.getByText(/every transfer, every claim/i)).toBeTruthy();
  });

  it('renders comparison table rows', () => {
    renderWithRouter(<HowItWorksPage />);
    expect(screen.getByText(/paper-based, manual/i)).toBeTruthy();
    expect(screen.getByText(/digital, automated/i)).toBeTruthy();
    expect(screen.getByText(/end-to-end/i)).toBeTruthy();
  });
});
